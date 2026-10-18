import type { Answers, Condition } from '../types'

// Misma lógica que backend/app/condiciones.py: si cambia una, cambiar la otra.
export function evaluar(cond: Condition | null, respuestas: Answers): boolean {
  if (cond === null) return true
  if ('all' in cond) return cond.all.every((c) => evaluar(c, respuestas))
  if ('any' in cond) return cond.any.some((c) => evaluar(c, respuestas))
  if ('not' in cond) return !evaluar(cond.not, respuestas)

  const valor = respuestas[cond.q]
  const valores = Array.isArray(valor) ? valor : valor ? [valor] : []
  if ('eq' in cond) return valores.includes(cond.eq)
  if ('in' in cond) return valores.some((v) => cond.in.includes(v))
  return (valores.length > 0) === cond.answered
}
