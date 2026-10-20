\set ON_ERROR_STOP on
set role service_role;
select public.tss_import_csv(
  repeat('4',64),
  'concurrente.csv',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  :'actor'::uuid,
  '[{"fila":2,"estado":"aceptada","submitted_at":null,
     "answers":[{"question_id":"00000000-0000-0000-0000-000000000030","text_value":"10","numeric_value":null}],
     "choices":{},"contact":null}]'::jsonb
);
