-- Solo lectura. Ejecutar antes de la migración en el entorno objetivo.
-- Estado: la migración 20261019000000_importacion_csv_atomica.sql sigue PENDIENTE
-- de validación y aplicación. Este archivo no aplica cambios.

select current_setting('server_version') as postgres_version;

select table_name
from information_schema.tables
where table_schema = 'public' and table_name like 'tss_%'
order by table_name;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'tss_admin_roles', 'tss_surveys', 'tss_survey_versions', 'tss_sections',
    'tss_questions', 'tss_question_options', 'tss_submissions', 'tss_answers',
    'tss_answer_choices', 'tss_submission_contacts', 'tss_audit_events', 'tss_simulation_runs'
  )
order by table_name, ordinal_position;

select
  to_regclass('public.tss_imports') as existing_imports_table,
  to_regclass('public.tss_import_rows') as existing_import_rows_table,
  to_regprocedure('public.tss_import_csv(text,text,uuid,uuid,uuid,jsonb)') as existing_import_function;

select
  (select count(*) from public.tss_submissions) as submissions,
  (select count(*) from public.tss_answers) as answers,
  (select count(*) from public.tss_answer_choices) as answer_choices,
  (select count(*) from public.tss_submission_contacts) as contacts;
