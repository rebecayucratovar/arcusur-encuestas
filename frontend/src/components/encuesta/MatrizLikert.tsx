import type { Answers, Errors, Question } from '../../types'
import { MensajeError } from './Pregunta'

interface Props {
  preguntas: Question[]
  primerNumero: number
  respuestas: Answers
  errores: Errors
  onChange: (codigo: string, valor: string) => void
}

/** Varias preguntas likert seguidas con la misma escala: una fila por enunciado. */
export default function MatrizLikert({ preguntas, primerNumero, respuestas, errores, onChange }: Props) {
  const escala = preguntas[0].options
  const columnas = { gridTemplateColumns: `minmax(0, 3.2fr) repeat(${escala.length}, minmax(0, 1fr))` }

  return (
    <div className="matriz">
      <div className="matriz__cabecera" style={columnas} aria-hidden="true">
        <span />
        {escala.map((o) => <span key={o.value}>{o.label}</span>)}
      </div>
      {preguntas.map((q, i) => {
        const error = errores[q.code]
        return (
          <div key={q.code} id={`pregunta-${q.code}`}
            className={`matriz__fila${error ? ' pregunta--error' : ''}`} style={columnas}
            role="radiogroup" aria-labelledby={`p-${q.code}`} aria-invalid={Boolean(error)}>
            <div className="matriz__enunciado">
              <p id={`p-${q.code}`}>
                <span className="pregunta__numero">{primerNumero + i}.</span>
                {q.prompt}
                {q.required && <span className="obligatorio" aria-label="obligatoria"> *</span>}
              </p>
              <MensajeError codigo={q.code} mensaje={error} />
            </div>
            {q.options.map((o) => {
              const activa = respuestas[q.code] === o.value
              return (
                <label key={o.value} className={`matriz__celda${activa ? ' matriz__celda--activa' : ''}`}>
                  <input type="radio" name={q.code} value={o.value} checked={activa}
                    onChange={() => onChange(q.code, o.value)} />
                  <span className="matriz__etiqueta">{o.label}</span>
                </label>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
