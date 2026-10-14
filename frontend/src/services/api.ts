import type { Answers, Errors, Survey } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Error 422 del backend: un mensaje por código de pregunta. */
export class ErrorValidacion extends Error {
  errores: Errors

  constructor(errores: Errors) {
    super('Hay respuestas por corregir.')
    this.errores = errores
  }
}

export async function obtenerEncuesta(slug: string): Promise<Survey> {
  const r = await fetch(`${API_URL}/encuestas/${slug}`)
  if (!r.ok) throw new Error(`No se pudo cargar la encuesta (${r.status}).`)
  return r.json()
}

export async function enviarRespuestas(slug: string, answers: Answers): Promise<string> {
  const r = await fetch(`${API_URL}/encuestas/${slug}/respuestas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  if (r.status === 422) {
    const { detail } = await r.json()
    throw new ErrorValidacion(detail?.errores ?? {})
  }
  if (!r.ok) throw new Error(`No se pudo enviar la encuesta (${r.status}).`)
  return (await r.json()).submission_id
}
