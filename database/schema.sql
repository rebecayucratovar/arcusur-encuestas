-- Esquema aditivo para TSS - ARCUSUR.
-- Referencia local. NO ejecutarlo contra el proyecto remoto de ARCUSUR:
-- la base real ya tiene 12 tablas tss_* (incluye tss_audit_events, ausente aquí).
-- La importación CSV atómica NO forma parte de este archivo; está en
-- database/migrations/20261019000000_importacion_csv_atomica.sql (PENDIENTE).
-- Es seguro ejecutarlo sobre una base vacía o con estas tablas ya creadas:
-- no elimina tablas, columnas ni datos, y los registros base usan ON CONFLICT.

create extension if not exists pgcrypto;

create table if not exists public.tss_surveys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tss_survey_versions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.tss_surveys(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  unique (survey_id, version_number)
);

create table if not exists public.tss_sections (
  id uuid primary key default gen_random_uuid(),
  survey_version_id uuid not null references public.tss_survey_versions(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position > 0),
  unique (survey_version_id, position)
);

create table if not exists public.tss_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.tss_sections(id) on delete cascade,
  code text not null,
  prompt text not null,
  help_text text,
  question_type text not null check (question_type in
    ('short_text', 'long_text', 'email', 'single_choice', 'multiple_choice', 'likert')),
  required boolean not null default false,
  position integer not null check (position > 0),
  configuration jsonb not null default '{}'::jsonb,
  display_condition jsonb,
  unique (section_id, code),
  unique (section_id, position)
);

create table if not exists public.tss_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.tss_questions(id) on delete cascade,
  value text not null,
  label text not null,
  position integer not null check (position > 0),
  unique (question_id, value),
  unique (question_id, position)
);

create table if not exists public.tss_submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.tss_surveys(id),
  survey_version_id uuid not null references public.tss_survey_versions(id),
  submitted_at timestamptz not null default now(),
  source text not null default 'public_link' check (source in ('public_link', 'csv_import', 'demo')),
  consent_given boolean not null default false,
  excluded_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.tss_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.tss_submissions(id) on delete cascade,
  question_id uuid not null references public.tss_questions(id),
  text_value text,
  numeric_value numeric,
  unique (submission_id, question_id)
);

create table if not exists public.tss_answer_choices (
  answer_id uuid not null references public.tss_answers(id) on delete cascade,
  question_id uuid not null references public.tss_questions(id),
  option_id uuid not null references public.tss_question_options(id),
  primary key (answer_id, option_id)
);

create table if not exists public.tss_submission_contacts (
  submission_id uuid primary key references public.tss_submissions(id) on delete cascade,
  email text,
  phone text,
  linkedin_url text,
  allow_contact boolean not null default false
);

create table if not exists public.tss_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tss_simulation_runs (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  title text not null,
  model_version text not null default '1',
  parameters jsonb not null,
  assumptions jsonb not null default '{}'::jsonb,
  results jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tss_submissions_survey_submitted_idx
  on public.tss_submissions (survey_id, submitted_at);
create index if not exists tss_answers_submission_idx on public.tss_answers (submission_id);
create index if not exists tss_answers_question_idx on public.tss_answers (question_id);
create index if not exists tss_answer_choices_question_idx on public.tss_answer_choices (question_id);
create index if not exists tss_simulation_runs_model_created_idx
  on public.tss_simulation_runs (model_key, created_at desc);

insert into public.tss_surveys (slug, name, description)
values
  ('titulados', 'Encuesta a titulados', 'Encuesta de seguimiento a titulados de Ingeniería de Sistemas.'),
  ('empleadores', 'Encuesta a empleadores', 'Encuesta a empleadores de titulados de Ingeniería de Sistemas.')
on conflict (slug) do nothing;

insert into public.tss_survey_versions (survey_id, version_number, status)
select id, 1, 'draft' from public.tss_surveys where slug in ('titulados', 'empleadores')
on conflict (survey_id, version_number) do nothing;

-- El backend usa una clave secreta y no necesita políticas para operar. Al activar
-- RLS se evita que la clave publicable del navegador lea respuestas directamente.
alter table public.tss_surveys enable row level security;
alter table public.tss_survey_versions enable row level security;
alter table public.tss_sections enable row level security;
alter table public.tss_questions enable row level security;
alter table public.tss_question_options enable row level security;
alter table public.tss_submissions enable row level security;
alter table public.tss_answers enable row level security;
alter table public.tss_answer_choices enable row level security;
alter table public.tss_submission_contacts enable row level security;
alter table public.tss_admin_roles enable row level security;
alter table public.tss_simulation_runs enable row level security;
