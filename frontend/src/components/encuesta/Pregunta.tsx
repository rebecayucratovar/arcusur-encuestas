import type { AnswerValue, Question } from '../../types'
import { Desplegable, LikertFichas, OpcionUnica, SeleccionMultiple, Texto } from './Controles'

interface Props {
  q: Question
  numero: number
  valor: AnswerValue | undefined
  error?: string
  onChange: (codigo: string, valor: AnswerValue) => void
  /** Campo "Otro" asociado (configuration.other_question), si está visible. */
  otro?: { q: Question; valor: AnswerValue | undefined; error?: string }
}

function Control({ q, valor, error, onChange }: Pick<Props, 'q' | 'valor' | 'error' | 'onChange'>) {
  const comun = { q, invalido: Boolean(error) }
  const texto = typeof valor === 'string' ? valor : undefined
  const fijar = (v: AnswerValue) => onChange(q.code, v)

  switch (q.question_type) {
    case 'single_choice':
      return q.configuration.widget === 'dropdown'
        ? <Desplegable {...comun} valor={texto} onChange={fijar} />
        : <OpcionUnica {...comun} valor={texto} onChange={fijar} />
    case 'likert':
      return <LikertFichas {...comun} valor={texto} onChange={fijar} />
    case 'multiple_choice':
      return <SeleccionMultiple {...comun} valor={Array.isArray(valor) ? valor : undefined} onChange={fijar} />
    default:
      return <Texto {...comun} valor={texto} onChange={fijar} />
  }
}

export function MensajeError({ codigo, mensaje }: { codigo: string; mensaje?: string }) {
  if (!mensaje) return null
  return <p className="pregunta__error" id={`e-${codigo}`} role="alert">{mensaje}</p>
}

export default function Pregunta({ q, numero, valor, error, onChange, otro }: Props) {
  return (
    <div className={`pregunta${error ? ' pregunta--error' : ''}`} id={`pregunta-${q.code}`}>
      <p className="pregunta__enunciado" id={`p-${q.code}`}>
        <span className="pregunta__numero">{numero}.</span>
        <span>
          {q.prompt.replace(/:\s*$/, '')}
          {(q.required || q.configuration.require_one_of) && (
            <span className="obligatorio" aria-label="obligatoria"> *</span>
          )}
        </span>
      </p>
      {q.help_text && <p className="pregunta__ayuda">{q.help_text}</p>}
      <Control q={q} valor={valor} error={error} onChange={onChange} />
      <MensajeError codigo={q.code} mensaje={error} />

      {otro && (
        <div className="pregunta__otro">
          <label htmlFor={`c-${otro.q.code}`} id={`p-${otro.q.code}`}>{otro.q.prompt}</label>
          <Control q={otro.q} valor={otro.valor} error={otro.error} onChange={onChange} />
          <MensajeError codigo={otro.q.code} mensaje={otro.error} />
        </div>
      )}
    </div>
  )
}
