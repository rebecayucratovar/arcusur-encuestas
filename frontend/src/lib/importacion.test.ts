// Limpieza de años de vida profesional en la importación (respuestas de texto libre de MS Forms).
import { describe, expect, it } from 'vitest'
import { interpretarAnios } from './importacion'

describe('interpretarAnios', () => {
  it('números con o sin unidad', () => {
    expect(interpretarAnios('7')).toBe(7)
    expect(interpretarAnios('1,5')).toBe(1.5)
    expect(interpretarAnios('20 años ')).toBe(20)
    expect(interpretarAnios('2 anios')).toBe(2)
    expect(interpretarAnios('6 meses')).toBe(0.5)
    expect(interpretarAnios('aprox. 3 años')).toBe(3)
  })

  it('números escritos en letras (caso «Dos años» de la encuesta)', () => {
    expect(interpretarAnios('Dos años')).toBe(2)
    expect(interpretarAnios('un año')).toBe(1)
    expect(interpretarAnios('un año y medio')).toBe(1.5)
    expect(interpretarAnios('seis meses')).toBe(0.5)
    expect(interpretarAnios('medio año')).toBe(0.5)
    expect(interpretarAnios('Quince')).toBe(15)
    expect(interpretarAnios('ninguno')).toBe(0)
  })

  it('sin una cantidad interpretable devuelve null', () => {
    expect(interpretarAnios('Gjvu')).toBeNull()
    expect(interpretarAnios('n/a')).toBeNull()
    expect(interpretarAnios('Más de 10 años')).toBeNull() // intervalo abierto, se informa aparte
    expect(interpretarAnios('')).toBeNull()
  })
})
