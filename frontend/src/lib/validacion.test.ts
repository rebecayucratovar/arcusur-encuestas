// Pruebas de la validación del formulario web (caso de caja negra TC-05 y obligatorias de TC-39).
import { describe, expect, it } from 'vitest'
import type { Question, Survey } from '../types'
import { OBLIGATORIA, validar } from './validacion'

function pregunta(code: string, extra: Partial<Question> = {}): Question {
  return {
    id: code, code, prompt: code, help_text: null, question_type: 'short_text', required: true,
    position: 0, configuration: {}, display_condition: null, options: [], ...extra,
  }
}

const encuesta: Survey = {
  survey_id: 's', slug: 'titulados', name: 'Prueba', description: null, is_active: true,
  version_id: 'v', version_number: 1, version_status: 'published',
  sections: [{
    id: 's1', title: 'Datos', description: null, position: 0,
    questions: [
      pregunta('anios', { configuration: { input: 'decimal', min: 0, max: 60 } }),
      pregunta('desempleo', { configuration: { input: 'decimal', min: 0, max_question: 'anios' } }),
    ],
  }] as Survey['sections'],
}

describe('validar: años de vida profesional (TC-05)', () => {
  it('acepta enteros y decimales con punto o coma', () => {
    expect(validar(encuesta, { anios: '7', desempleo: '0' })).toEqual({})
    expect(validar(encuesta, { anios: '7,5', desempleo: '0.5' })).toEqual({})
  })

  it('rechaza espacios al inicio, al final o en medio', () => {
    for (const anios of [' 7', '7 ', '7 5']) {
      expect(validar(encuesta, { anios, desempleo: '0' }).anios).toMatch(/sin espacios/)
    }
  })

  it('rechaza texto, negativos y valores sobre el máximo', () => {
    expect(validar(encuesta, { anios: 'Dos años', desempleo: '0' }).anios).toMatch(/solo un número/)
    expect(validar(encuesta, { anios: '-3', desempleo: '0' }).anios).toMatch(/solo un número/)
    expect(validar(encuesta, { anios: '61', desempleo: '0' }).anios).toBe('El valor máximo es 60.')
  })

  it('el desempleo no puede superar los años de vida profesional', () => {
    expect(validar(encuesta, { anios: '2', desempleo: '3' }).desempleo).toBe('No puede ser mayor que 2.')
  })

  it('vacío: obligatoria en el formulario, permitido al importar', () => {
    expect(validar(encuesta, {}).anios).toBe(OBLIGATORIA)
    expect(validar(encuesta, {}, undefined, true)).toEqual({})
  })

  it('al importar un CSV los espacios sobrantes se recortan', () => {
    expect(validar(encuesta, { anios: ' 7 ', desempleo: '0' }, undefined, true)).toEqual({})
  })
})
