-- Solo lectura. Ejecutar después de la migración en el entorno objetivo.
-- Estado: la migración sigue PENDIENTE; no hay resultado VERIFY de un entorno aplicado.

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
    'tss_answer_choices', 'tss_submission_contacts', 'tss_imports', 'tss_import_rows'
  )
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.tss_imports'::regclass, 'public.tss_import_rows'::regclass)
order by conrelid::regclass::text, conname;

select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('tss_imports', 'tss_import_rows')
order by c.relname;

select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'tss_import_csv';

select
  has_function_privilege('anon',
    'public.tss_import_csv(text,text,uuid,uuid,uuid,jsonb)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated',
    'public.tss_import_csv(text,text,uuid,uuid,uuid,jsonb)', 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role',
    'public.tss_import_csv(text,text,uuid,uuid,uuid,jsonb)', 'EXECUTE') as service_role_can_execute;

select
  has_table_privilege('anon', 'public.tss_imports', 'SELECT') as anon_reads_imports,
  has_table_privilege('authenticated', 'public.tss_imports', 'SELECT') as authenticated_reads_imports,
  has_table_privilege('service_role', 'public.tss_imports', 'SELECT,INSERT,UPDATE') as service_role_imports,
  has_table_privilege('service_role', 'public.tss_import_rows', 'SELECT,INSERT,UPDATE') as service_role_rows;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('tss_imports', 'tss_import_rows')
order by tablename, indexname;

select
  (select count(*) from public.tss_imports) as imports,
  (select count(*) from public.tss_import_rows where status = 'accepted') as accepted_rows,
  (select count(*) from public.tss_import_rows where status = 'rejected') as rejected_rows,
  (select count(*) from public.tss_import_rows r
   left join public.tss_imports i on i.id = r.import_id where i.id is null) as orphan_import_rows,
  (select count(*) from public.tss_import_rows r
   left join public.tss_submissions s on s.id = r.submission_id
   where r.status = 'accepted' and s.id is null) as accepted_without_submission;
