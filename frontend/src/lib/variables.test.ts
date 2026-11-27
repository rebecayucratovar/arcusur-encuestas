// Variables agrupadas y cruce de tres variables: reproducen las tablas del informe.
import { describe, expect, it } from 'vitest'
import type { Question, Survey } from '../types'
import type { Fila } from './demo'
import { categoriaDe, categoricas, tablaCruzada, tablasPorCapa, variables } from './variables'

const acuerdo = ['totalmente_desacuerdo', 'en_desacuerdo', 'de_acuerdo', 'totalmente_acuerdo']
const pregunta = (code: string, question_type: Question['question_type'], valores: string[], configuration = {}): Question => ({
  id: code, code, prompt: code, help_text: null, question_type, required: true, position: 0, configuration,
  display_condition: null, options: valores.map((value, position) => ({ id: value, value, label: value, position })),
})
const encuesta = {
  sections: [{
    id: 's', title: 's', description: null, position: 0, questions: [
      pregunta('nombre', 'short_text', [], { store: 'contact' }),
      pregunta('anios_profesional', 'short_text', [], { input: 'decimal' }),
      pregunta('area_trabajo', 'multiple_choice', ['a', 'b']),
      pregunta('remuneracion', 'single_choice', ['menos_2500', '2500_3500', '3501_5000', '5001_7000', '7001_10000', 'mas_10000']),
      pregunta('satisfaccion_carrera', 'likert', acuerdo),
      pregunta('concordancia_formacion', 'likert', acuerdo),
    ],
  }],
} as unknown as Survey

const cats = categoricas(variables(encuesta))
const v = (codigo: string) => cats.find((x) => x.codigo === codigo)!

describe('variables agrupadas', () => {
  it('VA-01 cada pregunta va seguida de sus agrupaciones; las múltiples no se cruzan pero sí sus agrupaciones', () => {
    expect(cats.map((x) => x.codigo)).toEqual([
      'experiencia', 'remuneracion', 'remuneracion_3', 'remuneracion_2',
      'satisfaccion_carrera', 'satisfaccion_2', 'concordancia_formacion', 'concordancia_2',
    ])
    expect(v('experiencia').etiqueta).toBe('P1 · Experiencia (junior / consolidado)')
    expect(v('remuneracion_3').opciones.map((o) => o.label)).toEqual(['Hasta Bs 5.000', 'Bs 5.001 – 10.000', 'Más de Bs 10.000'])
  })

  it('VA-02 experiencia: menos de 5 años es junior; vacío, texto o lista no tiene categoría', () => {
    const e = v('experiencia')
    expect(['0', '4.9', '5', '23', '', ' ', 'n/a'].map((x) => categoriaDe({ anios_profesional: x }, e)))
      .toEqual(['junior', 'junior', 'consolidado', 'consolidado', undefined, undefined, undefined])
    expect(categoriaDe({ anios_profesional: ['3'] }, e)).toBeUndefined()
    expect(categoriaDe({}, e)).toBeUndefined()
  })

  it('VA-03 remuneración y escalas agrupadas; las preguntas originales leen su valor tal cual', () => {
    expect(['3501_5000', '5001_7000', 'mas_10000', 'x'].map((x) => categoriaDe({ remuneracion: x }, v('remuneracion_3'))))
      .toEqual(['hasta_5000', '5001_10000', 'mas_10000', undefined])
    expect(categoriaDe({ remuneracion: '7001_10000' }, v('remuneracion_2'))).toBe('mas_5000')
    expect(categoriaDe({ satisfaccion_carrera: 'totalmente_acuerdo' }, v('satisfaccion_2'))).toBe('acuerdo')
    expect(categoriaDe({ remuneracion: 'mas_10000' }, v('remuneracion'))).toBe('mas_10000')
    expect(categoriaDe({ remuneracion: '' }, v('remuneracion'))).toBeUndefined()
    expect(categoriaDe({ remuneracion: ['mas_10000'] }, v('remuneracion'))).toBeUndefined()
  })
})

describe('cruce de tres variables', () => {
  // Reconstruye las frecuencias de la Tabla 50 del informe (n = 179 con años y ambas escalas).
  const filas: Fila[] = []
  const agregar = (anios: string, sat: string, con: string, veces: number) => {
    for (let i = 0; i < veces; i++) filas.push({ anios_profesional: anios, satisfaccion_carrera: sat, concordancia_formacion: con })
  }
  agregar('2', 'de_acuerdo', 'totalmente_acuerdo', 40); agregar('2', 'de_acuerdo', 'en_desacuerdo', 12)
  agregar('3', 'en_desacuerdo', 'de_acuerdo', 4); agregar('3', 'totalmente_desacuerdo', 'en_desacuerdo', 15)
  agregar('8', 'totalmente_acuerdo', 'de_acuerdo', 60); agregar('8', 'de_acuerdo', 'totalmente_desacuerdo', 23)
  agregar('12', 'en_desacuerdo', 'de_acuerdo', 5); agregar('12', 'en_desacuerdo', 'en_desacuerdo', 20)
  agregar('', 'de_acuerdo', 'de_acuerdo', 1) // sin años: no entra en ninguna capa

  it('VA-04 una tabla por categoría de control, con los totales del informe', () => {
    const capas = tablasPorCapa(filas, v('satisfaccion_2'), v('concordancia_2'), v('experiencia'))
    expect(capas.map((c) => [c.capa.value, c.tabla.matriz, c.tabla.n])).toEqual([
      ['junior', [[40, 12], [4, 15]], 71],
      ['consolidado', [[60, 23], [5, 20]], 108],
    ])
    expect(tablaCruzada(filas, v('satisfaccion_2'), v('concordancia_2')).n).toBe(180)
  })
})
