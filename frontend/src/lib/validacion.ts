import type { Answers, AnswerValue, Errors, Question, Survey } from '../types'
import { evaluar } from './condiciones'

// Reglas equivalentes a backend/app/validacion.py. El backend vuelve a validar
// al guardar; esto solo evita que el usuario avance con errores evidentes.

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const RE_TELEFONO = /^\+?[\d\s-]{6,20}$/
const RE_URL = /^https?:\/\/\S+\.\S+$/i

export const OBLIGATORIA = 'Esta pregunta es obligatoria.'

export function vacio(valor: AnswerValue | undefined): boolean {
  if (valor === undefined) return true
  return Array.isArray(valor) ? valor.length === 0 : valor.trim() === ''
}

/** Respuestas solo de las preguntas visibles, evaluadas en orden (como el backend). */
export function respuestasVisibles(encuesta: Survey, respuestas: Answers): Answers {
  const visibles: Answers = {}
  for (const s of encuesta.sections) {
    for (const q of s.questions) {
      if (!evaluar(q.display_condition, visibles)) continue
      const valor = respuestas[q.code]
      if (!vacio(valor)) visibles[q.code] = valor
    }
  }
  return visibles
}

export function esVisible(q: Question, visibles: Answers): boolean {
  return evaluar(q.display_condition, visibles)
}

function validarValor(q: Question, valor: AnswerValue, visibles: Answers): string | null {
  const cfg = q.configuration
  if (q.question_type === 'multiple_choice') {
    const n = Array.isArray(valor) ? valor.length : 1
    const { min_selected: mn, max_selected: mx } = cfg
    if (mn !== undefined && mn === mx && n !== mn) return `Seleccione exactamente ${mn} opciones.`
    if (mn !== undefined && n < mn) return `Seleccione al menos ${mn} opciones.`
    if (mx !== undefined && n > mx) return `Seleccione como máximo ${mx} opciones.`
    return null
  }
  if (Array.isArray(valor)) return null
  const texto = valor.trim()

  if (q.question_type === 'email') return RE_EMAIL.test(texto) ? null : 'Correo electrónico no válido.'
  if (cfg.input === 'integer') {
    if (!/^\d+$/.test(texto)) return 'Introduzca solo un número entero, sin espacios.'
    const n = Number(texto)
    if (cfg.min !== undefined && n < cfg.min) return `El valor mínimo es ${cfg.min}.`
    if (cfg.max !== undefined && n > cfg.max) return `El valor máximo es ${cfg.max}.`
    const tope = cfg.max_question ? visibles[cfg.max_question] : undefined
    if (typeof tope === 'string' && /^\d+$/.test(tope.trim()) && n > Number(tope)) {
      return `No puede ser mayor que ${Number(tope)}.`
    }
  }
  if (cfg.input === 'phone' && !RE_TELEFONO.test(texto)) return 'Número de teléfono no válido.'
  if (cfg.input === 'url' && !RE_URL.test(texto)) {
    return 'Enlace no válido (debe empezar con http:// o https://).'
  }
  return null
}

/** Errores de las preguntas visibles de una sección (o de toda la encuesta si no se indica). */
export function validar(encuesta: Survey, respuestas: Answers, seccionId?: string): Errors {
  const visibles = respuestasVisibles(encuesta, respuestas)
  const errores: Errors = {}
  for (const s of encuesta.sections) {
    if (seccionId && s.id !== seccionId) continue
    for (const q of s.questions) {
      if (!esVisible(q, visibles)) continue
      const valor = respuestas[q.code]
      if (vacio(valor)) {
        const grupo = q.configuration.require_one_of
        if (grupo && !grupo.some((c) => !vacio(visibles[c]))) {
          errores[q.code] = "Seleccione una opción o complete el campo 'Otro'."
        } else if (q.required) {
          errores[q.code] = OBLIGATORIA
        }
        continue
      }
      const error = validarValor(q, valor, visibles)
      if (error) errores[q.code] = error
    }
  }
  return errores
}
