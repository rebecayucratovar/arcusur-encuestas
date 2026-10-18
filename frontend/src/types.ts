// Forma de la respuesta de GET /encuestas/{slug} (backend/app/encuestas.py).

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'likert'
  | 'short_text'
  | 'long_text'
  | 'email'

export type Condition =
  | { q: string; eq: string }
  | { q: string; in: string[] }
  | { q: string; answered: boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }

export interface Option {
  id: string
  value: string
  label: string
  position: number
}

export interface QuestionConfig {
  widget?: 'dropdown'
  min_selected?: number
  max_selected?: number
  other_question?: string
  other_for?: string
  require_one_of?: string[]
  input?: 'integer' | 'phone' | 'url'
  min?: number
  max?: number
  max_question?: string
  scores?: Record<string, number>
  store?: 'contact'
  contact_field?: string
}

export interface Question {
  id: string
  code: string
  prompt: string
  help_text: string | null
  question_type: QuestionType
  required: boolean
  position: number
  configuration: QuestionConfig
  display_condition: Condition | null
  options: Option[]
}

export interface Section {
  id: string
  title: string
  description: string | null
  position: number
  questions: Question[]
}

export interface Survey {
  survey_id: string
  slug: string
  name: string
  description: string | null
  is_active: boolean
  version_id: string
  version_number: number
  version_status: string
  sections: Section[]
}

export type AnswerValue = string | string[]
export type Answers = Record<string, AnswerValue>
export type Errors = Record<string, string>
