import type { Question } from '../../types'

interface Props<T> {
  q: Question
  valor: T | undefined
  onChange: (valor: T) => void
  invalido: boolean
}

export function OpcionUnica({ q, valor, onChange, invalido }: Props<string>) {
  return (
    <div className="opciones" role="radiogroup" aria-labelledby={`p-${q.code}`} aria-invalid={invalido}>
      {q.options.map((o) => (
        <label key={o.value} className={`opcion${valor === o.value ? ' opcion--activa' : ''}`}>
          <input type="radio" name={q.code} value={o.value} checked={valor === o.value}
            onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

export function Desplegable({ q, valor, onChange, invalido }: Props<string>) {
  return (
    <select className="campo campo--select" id={`c-${q.code}`} aria-labelledby={`p-${q.code}`}
      aria-invalid={invalido} value={valor ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Selecciona la respuesta</option>
      {q.options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function SeleccionMultiple({ q, valor = [], onChange, invalido }: Props<string[]>) {
  const max = q.configuration.max_selected
  const lleno = max !== undefined && valor.length >= max
  const alternar = (v: string) =>
    onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v])

  return (
    <div className="opciones" role="group" aria-labelledby={`p-${q.code}`} aria-invalid={invalido}>
      {q.options.map((o) => {
        const marcada = valor.includes(o.value)
        return (
          <label key={o.value}
            className={`opcion${marcada ? ' opcion--activa' : ''}${lleno && !marcada ? ' opcion--deshabilitada' : ''}`}>
            <input type="checkbox" checked={marcada} disabled={lleno && !marcada}
              onChange={() => alternar(o.value)} />
            <span>{o.label}</span>
          </label>
        )
      })}
      {max !== undefined && (
        <p className="contador" aria-live="polite">{valor.length} de {max} seleccionadas</p>
      )}
    </div>
  )
}

export function LikertFichas({ q, valor, onChange, invalido }: Props<string>) {
  return (
    <div className="likert" role="radiogroup" aria-labelledby={`p-${q.code}`} aria-invalid={invalido}
      style={{ gridTemplateColumns: `repeat(${q.options.length}, minmax(0, 1fr))` }}>
      {q.options.map((o) => (
        <label key={o.value} className={`likert__ficha${valor === o.value ? ' likert__ficha--activa' : ''}`}>
          <span>{o.label}</span>
          <input type="radio" name={q.code} value={o.value} checked={valor === o.value}
            onChange={() => onChange(o.value)} />
        </label>
      ))}
    </div>
  )
}

export function Texto({ q, valor, onChange, invalido }: Props<string>) {
  const cfg = q.configuration
  const comun = {
    id: `c-${q.code}`,
    className: 'campo',
    'aria-labelledby': `p-${q.code}`,
    'aria-invalid': invalido,
    value: valor ?? '',
    placeholder: 'Escriba su respuesta',
  }
  if (q.question_type === 'long_text') {
    return <textarea {...comun} rows={4} onChange={(e) => onChange(e.target.value)} />
  }
  const tipo = q.question_type === 'email' ? 'email' : cfg.input === 'url' ? 'url' : cfg.input === 'phone' ? 'tel' : 'text'
  return (
    <input {...comun} type={tipo} inputMode={cfg.input === 'integer' ? 'numeric' : undefined}
      onChange={(e) => onChange(e.target.value)} />
  )
}
