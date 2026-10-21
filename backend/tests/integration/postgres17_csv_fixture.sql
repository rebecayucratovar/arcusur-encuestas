-- Esquema ficticio que reproduce las columnas remotas observadas por OpenAPI.
-- Exclusivo para el clúster local de Fase 12; no contiene datos reales.

create extension if not exists pgcrypto;
create schema if not exists auth;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create table auth.users (id uuid primary key, email text not null unique);

create table public.tss_surveys (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  audience text not null, description text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tss_survey_versions (
  id uuid primary key default gen_random_uuid(), survey_id uuid not null references public.tss_surveys(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null check (status in ('draft', 'published', 'archived')),
  published_at timestamptz, created_at timestamptz not null default now(), unique (survey_id, version_number)
);
create table public.tss_sections (
  id uuid primary key default gen_random_uuid(), survey_version_id uuid not null references public.tss_survey_versions(id) on delete cascade,
  title text not null, description text, position integer not null check (position > 0), unique (survey_version_id, position)
);
create table public.tss_questions (
  id uuid primary key default gen_random_uuid(), section_id uuid not null references public.tss_sections(id) on delete cascade,
  code text not null, prompt text not null, help_text text,
  question_type text not null check (question_type in ('short_text','long_text','email','single_choice','multiple_choice','likert')),
  required boolean not null default false, position integer not null check (position > 0),
  configuration jsonb not null default '{}'::jsonb, display_condition jsonb,
  unique (section_id, code), unique (section_id, position)
);
create table public.tss_question_options (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.tss_questions(id) on delete cascade,
  value text not null, label text not null, position integer not null check (position > 0),
  unique (question_id, value), unique (question_id, position)
);
create table public.tss_submissions (
  id uuid primary key default gen_random_uuid(), survey_id uuid not null references public.tss_surveys(id),
  survey_version_id uuid not null references public.tss_survey_versions(id), status text not null default 'submitted',
  submitted_at timestamptz not null default now(), consent_given boolean not null,
  source text not null default 'public_link' check (source in ('public_link','csv_import','demo')), excluded_reason text
);
create table public.tss_answers (
  id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.tss_submissions(id) on delete cascade,
  question_id uuid not null references public.tss_questions(id), text_value text, numeric_value numeric, date_value date,
  unique (submission_id, question_id), check (num_nonnulls(text_value, numeric_value, date_value) <= 1)
);
create table public.tss_answer_choices (
  answer_id uuid not null references public.tss_answers(id) on delete cascade,
  question_id uuid not null references public.tss_questions(id), option_id uuid not null references public.tss_question_options(id),
  primary key (answer_id, option_id)
);
create table public.tss_submission_contacts (
  submission_id uuid primary key references public.tss_submissions(id) on delete cascade,
  full_name text, email text, phone text, linkedin_url text, allow_contact boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.tss_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','analyst')), active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.tss_audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
  event_type text not null, entity_type text not null, entity_id uuid,
  details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
create table public.tss_simulation_runs (
  id uuid primary key default gen_random_uuid(), created_by uuid references auth.users(id) on delete set null,
  title text not null, model_key text not null, model_version text not null, parameters jsonb not null,
  assumptions jsonb not null, results jsonb not null, input_data_cutoff timestamptz,
  created_at timestamptz not null default now()
);

do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename like 'tss_%'
  loop execute format('alter table public.%I enable row level security', r.tablename); end loop;
end $$;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000099','admin@invalid.test'),
  ('00000000-0000-0000-0000-000000000098','analyst@invalid.test'),
  ('00000000-0000-0000-0000-000000000097','admin2@invalid.test');
insert into public.tss_admin_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000099','admin'),
  ('00000000-0000-0000-0000-000000000098','analyst'),
  ('00000000-0000-0000-0000-000000000097','admin');
insert into public.tss_surveys (id, slug, name, audience)
values ('00000000-0000-0000-0000-000000000001','titulados','Encuesta ficticia','graduates');
insert into public.tss_survey_versions (id, survey_id, version_number, status)
values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',1,'draft');
insert into public.tss_sections (id, survey_version_id, title, position)
values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Datos ficticios',1);
insert into public.tss_questions (id, section_id, code, prompt, question_type, required, position, configuration) values
  ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003','sector','Sector','single_choice',true,1,'{}'),
  ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000003','areas','Áreas','multiple_choice',false,2,'{}'),
  ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000003','experiencia','Experiencia','short_text',false,3,'{"input":"integer","min":0,"max":60}'),
  ('00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-000000000003','email','Correo','email',false,4,'{"store":"contact","contact_field":"email"}');
insert into public.tss_question_options (id, question_id, value, label, position) values
  ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000010','publico','Público',1),
  ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000010','privado','Privado',2),
  ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000020','datos','Datos',1),
  ('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000020','redes','Redes',2);
