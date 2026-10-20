\set ON_ERROR_STOP on
set role service_role;

do $$
declare
  r jsonb;
  valid_rows jsonb := $json$[{
    "fila": 2,
    "estado": "aceptada",
    "submitted_at": "2025-03-25T10:30:00-04:00",
    "answers": [
      {"question_id":"00000000-0000-0000-0000-000000000010","text_value":null,"numeric_value":null},
      {"question_id":"00000000-0000-0000-0000-000000000020","text_value":null,"numeric_value":null},
      {"question_id":"00000000-0000-0000-0000-000000000030","text_value":"8","numeric_value":null}
    ],
    "choices": {
      "00000000-0000-0000-0000-000000000010":["00000000-0000-0000-0000-000000000011"],
      "00000000-0000-0000-0000-000000000020":["00000000-0000-0000-0000-000000000021","00000000-0000-0000-0000-000000000022"]
    },
    "contact":{"email":"persona@invalid.test","allow_contact":true}
  }]$json$::jsonb;
begin
  r := public.tss_import_csv(repeat('a',64), 'valido.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', valid_rows);
  assert r = '{"importadas":1,"rechazadas":[]}'::jsonb, r::text;

  -- Reintento exacto: debe devolver el mismo resultado sin insertar otra respuesta.
  r := public.tss_import_csv(repeat('a',64), 'valido.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', valid_rows);
  assert r = '{"importadas":1,"rechazadas":[]}'::jsonb, r::text;

  -- Archivo vacío y archivo renombrado con el mismo contenido.
  r := public.tss_import_csv(repeat('b',64), 'vacio.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', '[]'::jsonb);
  assert r = '{"importadas":0,"rechazadas":[]}'::jsonb, r::text;
  r := public.tss_import_csv(repeat('c',64), 'renombrado.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', valid_rows);
  assert r = '{"importadas":1,"rechazadas":[]}'::jsonb, r::text;

  -- Rechazos producidos por validación previa de FastAPI.
  r := public.tss_import_csv(repeat('d',64), 'rechazos.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099',
    '[{"fila":2,"estado":"rechazada","errores":["fecha no válida"]},
      {"fila":3,"estado":"rechazada","errores":["valor fuera de rango"]},
      {"fila":4,"estado":"rechazada","errores":["pregunta desconocida"]},
      {"fila":5,"estado":"rechazada","errores":["fila repetida"]}]'::jsonb);
  assert (r->>'importadas')::integer = 0 and jsonb_array_length(r->'rechazadas') = 4, r::text;

  -- Fallo de respuesta y de opción: rechazo atómico, sin submission parcial.
  r := public.tss_import_csv(repeat('e',64), 'pregunta-invalida.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099',
    '[{"fila":2,"estado":"aceptada","submitted_at":null,
      "answers":[{"question_id":"00000000-0000-0000-0000-000000009999","text_value":"x","numeric_value":null}],
      "choices":{},"contact":null}]'::jsonb);
  assert (r->>'importadas')::integer = 0 and jsonb_array_length(r->'rechazadas') = 1, r::text;

  r := public.tss_import_csv(repeat('f',64), 'opcion-invalida.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099',
    '[{"fila":2,"estado":"aceptada","submitted_at":null,
      "answers":[{"question_id":"00000000-0000-0000-0000-000000000010","text_value":null,"numeric_value":null}],
      "choices":{"00000000-0000-0000-0000-000000000010":["00000000-0000-0000-0000-000000009999"]},"contact":null}]'::jsonb);
  assert (r->>'importadas')::integer = 0 and jsonb_array_length(r->'rechazadas') = 1, r::text;

  -- Simula que la respuesta se confirmó pero la red perdió la respuesta; el reintento no duplica.
  perform public.tss_import_csv(repeat('9',64), 'red-perdida.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', valid_rows);
  r := public.tss_import_csv(repeat('9',64), 'red-perdida.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099', valid_rows);
  assert r = '{"importadas":1,"rechazadas":[]}'::jsonb, r::text;
end $$;

reset role;

-- Los contactos no aparecen en respuestas analíticas y la fecha histórica se conserva.
do $$ begin
  assert (select count(*) from public.tss_submissions) = 3;
  assert (select count(*) from public.tss_answers) = 9;
  assert (select count(*) from public.tss_answer_choices) = 9;
  assert (select count(*) from public.tss_submission_contacts) = 3;
  assert not exists (select 1 from public.tss_answers where text_value like '%@%');
  assert (select count(*) from public.tss_submissions
          where submitted_at = '2025-03-25T10:30:00-04:00'::timestamptz) = 3;
end $$;

-- Un analyst no puede ser atribuido como importador aunque la llamada use service_role.
set role service_role;
do $$ begin
  begin
    perform public.tss_import_csv(repeat('8',64), 'analyst.csv',
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000098', '[]'::jsonb);
    raise exception 'se esperaba rechazo del analyst';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from public.tss_imports where import_key = repeat('8',64));
end $$;
reset role;

-- Un trigger de contacto que falla debe revertir submission y answers de esa fila.
create function public.test_fail_contact() returns trigger language plpgsql as $$
begin
  if new.email = 'fail@invalid.test' then raise exception 'fallo de contacto'; end if;
  return new;
end $$;
create trigger test_fail_contact before insert on public.tss_submission_contacts
for each row execute function public.test_fail_contact();
set role service_role;
do $$ declare r jsonb; before_count bigint; begin
  select count(*) into before_count from public.tss_submissions;
  r := public.tss_import_csv(repeat('7',64), 'contacto-falla.csv',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000099',
    '[{"fila":2,"estado":"aceptada","submitted_at":null,
      "answers":[{"question_id":"00000000-0000-0000-0000-000000000030","text_value":"9","numeric_value":null}],
      "choices":{},"contact":{"email":"fail@invalid.test","allow_contact":true}}]'::jsonb);
  assert (r->>'importadas')::integer = 0 and jsonb_array_length(r->'rechazadas') = 1, r::text;
  assert (select count(*) from public.tss_submissions) = before_count;
end $$;
reset role;
drop trigger test_fail_contact on public.tss_submission_contacts;
drop function public.test_fail_contact();

-- Un error inesperado (42501) debe escapar y revertir incluso la cabecera de importación.
create function public.test_fail_unexpected() returns trigger language plpgsql as $$
begin raise insufficient_privilege using message = 'fallo inesperado'; end $$;
create trigger test_fail_unexpected before insert on public.tss_submissions
for each row execute function public.test_fail_unexpected();
set role service_role;
do $$ begin
  begin
    perform public.tss_import_csv(repeat('6',64), 'inesperado.csv',
      '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000099',
      '[{"fila":2,"estado":"aceptada","submitted_at":null,"answers":[],"choices":{},"contact":null}]'::jsonb);
    raise exception 'se esperaba fallo inesperado';
  exception when insufficient_privilege then null;
  end;
  assert not exists (select 1 from public.tss_imports where import_key = repeat('6',64));
end $$;
reset role;
drop trigger test_fail_unexpected on public.tss_submissions;
drop function public.test_fail_unexpected();

select 'functional_cases_ok' as result,
       (select count(*) from public.tss_imports) as imports,
       (select count(*) from public.tss_submissions) as submissions,
       (select count(*) from public.tss_import_rows where status='accepted') as accepted,
       (select count(*) from public.tss_import_rows where status='rejected') as rejected;
