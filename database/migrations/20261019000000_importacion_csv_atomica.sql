-- Importación CSV atómica e idempotente.
-- PENDIENTE: no aplicar remotamente sin autorización expresa.

create table if not exists public.tss_imports (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique check (import_key ~ '^[0-9a-f]{64}$'),
  survey_id uuid not null references public.tss_surveys(id),
  survey_version_id uuid not null references public.tss_survey_versions(id),
  file_name text not null check (char_length(file_name) between 1 and 255),
  imported_by uuid references auth.users(id) on delete set null,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.tss_import_rows (
  import_id uuid not null references public.tss_imports(id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  status text not null check (status in ('accepted', 'rejected')),
  submission_id uuid references public.tss_submissions(id) on delete set null,
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_at timestamptz not null default now(),
  primary key (import_id, row_number),
  check ((status = 'accepted' and submission_id is not null and errors = '[]'::jsonb)
      or (status = 'rejected' and submission_id is null and jsonb_array_length(errors) > 0))
);

create index if not exists tss_imports_survey_created_idx
  on public.tss_imports (survey_id, created_at desc);
create index if not exists tss_imports_survey_version_idx
  on public.tss_imports (survey_version_id);
create index if not exists tss_imports_imported_by_idx
  on public.tss_imports (imported_by);
create index if not exists tss_import_rows_submission_idx
  on public.tss_import_rows (submission_id) where submission_id is not null;

alter table public.tss_imports enable row level security;
alter table public.tss_import_rows enable row level security;

revoke all on table public.tss_imports, public.tss_import_rows from anon, authenticated;
grant select, insert, update on table public.tss_imports, public.tss_import_rows to service_role;

create or replace function public.tss_import_csv(
  p_import_key text,
  p_file_name text,
  p_survey_id uuid,
  p_survey_version_id uuid,
  p_imported_by uuid,
  p_rows jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_import_id uuid;
  v_new_import boolean := false;
  v_row jsonb;
  v_answer jsonb;
  v_option jsonb;
  v_contact jsonb;
  v_submission_id uuid;
  v_answer_id uuid;
  v_question_id uuid;
  v_option_id uuid;
  v_row_number integer;
  v_accepted integer;
  v_rejected integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'invalid import row collection' using errcode = '22023';
  end if;

  -- La identidad de extremo a extremo se valida en FastAPI antes de usar la clave
  -- service_role. Este parámetro conserva la atribución y exige que siga siendo
  -- un administrador activo, pero no sustituye esa autenticación: auth.uid() no
  -- representa al usuario final en una llamada realizada con credenciales servidor.
  if not exists (
    select 1 from public.tss_admin_roles r
    where r.user_id = p_imported_by and r.active and r.role = 'admin'
  ) then
    raise exception 'administrator required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.tss_survey_versions v
    where v.id = p_survey_version_id and v.survey_id = p_survey_id
      and v.status in ('draft', 'published')
  ) then
    raise exception 'invalid survey version' using errcode = '23503';
  end if;

  insert into public.tss_imports
    (import_key, survey_id, survey_version_id, file_name, imported_by)
  values
    (p_import_key, p_survey_id, p_survey_version_id, p_file_name, p_imported_by)
  on conflict (import_key) do nothing
  returning id into v_import_id;

  if v_import_id is null then
    select id into v_import_id
    from public.tss_imports
    where import_key = p_import_key
      and survey_id = p_survey_id
      and survey_version_id = p_survey_version_id;
    if v_import_id is null then
      raise exception 'import key collision' using errcode = '23505';
    end if;
  else
    v_new_import := true;
  end if;

  if v_new_import then
    for v_row in select value from jsonb_array_elements(p_rows)
    loop
      v_row_number := (v_row ->> 'fila')::integer;

      if v_row ->> 'estado' = 'rechazada' then
        insert into public.tss_import_rows (import_id, row_number, status, errors)
        values (v_import_id, v_row_number, 'rejected', v_row -> 'errores');
        continue;
      end if;

      -- Cada bloque BEGIN/EXCEPTION es una subtransacción: una fila nunca queda a medias.
      begin
        insert into public.tss_submissions
          (survey_id, survey_version_id, submitted_at, source, consent_given)
        values
          (p_survey_id, p_survey_version_id,
           coalesce((v_row ->> 'submitted_at')::timestamptz, now()),
           'csv_import', true)
        returning id into v_submission_id;

        for v_answer in select value from jsonb_array_elements(v_row -> 'answers')
        loop
          v_question_id := (v_answer ->> 'question_id')::uuid;
          if not exists (
            select 1
            from public.tss_questions q
            join public.tss_sections s on s.id = q.section_id
            where q.id = v_question_id and s.survey_version_id = p_survey_version_id
          ) then
            raise exception 'question does not belong to survey version' using errcode = '23503';
          end if;

          insert into public.tss_answers
            (submission_id, question_id, text_value, numeric_value)
          values
            (v_submission_id, v_question_id,
             v_answer ->> 'text_value', (v_answer ->> 'numeric_value')::numeric)
          returning id into v_answer_id;

          for v_option in
            select value from jsonb_array_elements(coalesce(v_row -> 'choices' -> (v_question_id::text), '[]'::jsonb))
          loop
            v_option_id := (v_option #>> '{}')::uuid;
            if not exists (
              select 1 from public.tss_question_options o
              where o.id = v_option_id and o.question_id = v_question_id
            ) then
              raise exception 'option does not belong to question' using errcode = '23503';
            end if;
            insert into public.tss_answer_choices (answer_id, question_id, option_id)
            values (v_answer_id, v_question_id, v_option_id);
          end loop;
        end loop;

        v_contact := v_row -> 'contact';
        if v_contact is not null and v_contact <> 'null'::jsonb and v_contact <> '{}'::jsonb then
          insert into public.tss_submission_contacts
            (submission_id, full_name, email, phone, linkedin_url, allow_contact)
          values
            (v_submission_id, v_contact ->> 'full_name', v_contact ->> 'email', v_contact ->> 'phone',
             v_contact ->> 'linkedin_url', coalesce((v_contact ->> 'allow_contact')::boolean, false));
        end if;

        insert into public.tss_import_rows (import_id, row_number, status, submission_id)
        values (v_import_id, v_row_number, 'accepted', v_submission_id);
      exception
        when integrity_constraint_violation or data_exception or raise_exception then
        insert into public.tss_import_rows (import_id, row_number, status, errors)
        values (v_import_id, v_row_number, 'rejected', '["No se pudo guardar la fila."]'::jsonb);
      end;
    end loop;

    select count(*) filter (where status = 'accepted'),
           count(*) filter (where status = 'rejected')
      into v_accepted, v_rejected
    from public.tss_import_rows where import_id = v_import_id;

    update public.tss_imports
    set accepted_count = v_accepted, rejected_count = v_rejected, completed_at = now()
    where id = v_import_id;
  end if;

  return jsonb_build_object(
    'importadas', (select accepted_count from public.tss_imports where id = v_import_id),
    'rechazadas', coalesce((
      select jsonb_agg(jsonb_build_object('fila', row_number, 'errores', errors) order by row_number)
      from public.tss_import_rows where import_id = v_import_id and status = 'rejected'
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.tss_import_csv(text, text, uuid, uuid, uuid, jsonb) from public;
revoke execute on function public.tss_import_csv(text, text, uuid, uuid, uuid, jsonb) from anon;
revoke execute on function public.tss_import_csv(text, text, uuid, uuid, uuid, jsonb) from authenticated;
grant execute on function public.tss_import_csv(text, text, uuid, uuid, uuid, jsonb) to service_role;
