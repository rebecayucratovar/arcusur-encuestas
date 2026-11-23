// Pruebas de caja blanca de estadistica.ts: cada caso recorre un camino
// concreto del código (rama, condición o bucle), indicado en su nombre.
import { describe, expect, it } from 'vitest'
import { chiCuadrado, descriptivos, evitarCero, intensidad, pValorChi2 } from './estadistica'

describe('descriptivos', () => {
  it('CB-01 lista vacía: n === 0 devuelve null', () => {
    expect(descriptivos([])).toBeNull()
  })

  it('CB-02 filtro: descarta NaN e infinitos antes de calcular', () => {
    expect(descriptivos([Number.NaN, Infinity, -Infinity])).toBeNull()
    expect(descriptivos([3, Number.NaN, 1])?.n).toBe(2)
  })

  it('CB-03 n impar: la mediana es el dato central', () => {
    const r = descriptivos([9, 1, 5])!
    expect(r.mediana).toBe(5)
    expect([r.min, r.max]).toEqual([1, 9])
  })

  it('CB-04 n par: la mediana promedia los dos centrales', () => {
    expect(descriptivos([4, 1, 3, 2])!.mediana).toBe(2.5)
  })

  it('CB-05 n = 1: la desviación estándar es 0 (rama n > 1 falsa)', () => {
    expect(descriptivos([7])).toEqual({ n: 1, media: 7, mediana: 7, de: 0, min: 7, max: 7 })
  })

  it('CB-06 n > 1: desviación estándar muestral con n − 1', () => {
    const r = descriptivos([2, 4, 4, 4, 5, 5, 7, 9])!
    expect(r.media).toBe(5)
    expect(r.de).toBeCloseTo(Math.sqrt(32 / 7), 10)
  })
})

describe('pValorChi2', () => {
  it('CB-07 gl <= 0 devuelve NaN', () => {
    expect(pValorChi2(3, 0)).toBeNaN()
  })

  it('CB-08 χ² = 0 devuelve p = 1 (rama x <= 0 de gammaQ)', () => {
    expect(pValorChi2(0, 2)).toBe(1)
  })

  it('CB-09 serie de la gamma incompleta (x < a + 1)', () => {
    expect(pValorChi2(1, 1)).toBeCloseTo(0.3173, 4)
    expect(pValorChi2(3.841, 1)).toBeCloseTo(0.05, 3)
  })

  it('CB-10 fracción continua de Lentz (x >= a + 1)', () => {
    expect(pValorChi2(5.991, 2)).toBeCloseTo(0.05, 3)
    // gl = 2 tiene forma cerrada: p = e^(−χ²/2)
    expect(pValorChi2(41.69, 2)).toBeCloseTo(Math.exp(-41.69 / 2), 12)
  })
})

describe('chiCuadrado', () => {
  it('CB-11 menos de dos filas o columnas con datos devuelve null', () => {
    expect(chiCuadrado([[5, 3]])).toBeNull()
    expect(chiCuadrado([[5, 0], [3, 0]])).toBeNull()
    expect(chiCuadrado([])).toBeNull()
  })

  it('CB-12 excluye filas y columnas sin observaciones', () => {
    const r = chiCuadrado([[10, 0, 5], [0, 0, 0], [4, 0, 9]])!
    expect(r.filas).toEqual([0, 2])
    expect(r.columnas).toEqual([0, 2])
    expect(r.gl).toBe(1)
    expect(r.totalCeldas).toBe(4)
  })

  it('CB-13 experiencia × remuneración del informe (2 × 3, cumple Cochran)', () => {
    const r = chiCuadrado([[32, 13, 4], [11, 43, 33]])!
    expect(r.n).toBe(136)
    expect(r.chi2).toBeCloseTo(41.69, 2)
    expect(r.gl).toBe(2)
    expect(r.p).toBeLessThan(0.001)
    expect(r.v).toBeCloseTo(0.554, 3)
    expect(r.celdasBajas).toBe(0)
    expect(r.esperadaMinima).toBeCloseTo(13.33, 2)
  })

  it('CB-14 formación × interés del informe (2 × 2)', () => {
    const r = chiCuadrado([[105, 14], [50, 15]])!
    expect(r.chi2).toBeCloseTo(4.05, 2)
    expect(r.p).toBeCloseTo(0.044, 3)
    expect(r.v).toBeCloseTo(0.148, 3)
  })

  it('CB-15 cuenta las frecuencias esperadas menores que 5 (Cochran)', () => {
    const r = chiCuadrado([[3, 1], [1, 3]])!
    expect(r.celdasBajas).toBe(4)
    expect(r.esperadaMinima).toBe(2)
  })
})

describe('intensidad', () => {
  it('CB-16 recorre las cuatro ramas y sus límites', () => {
    expect(intensidad(0.05)).toBe('despreciable')
    expect(intensidad(0.1)).toBe('débil')
    expect(intensidad(0.3)).toBe('moderada')
    expect(intensidad(0.5)).toBe('fuerte')
  })
})

describe('evitarCero (protección de la fracción continua de Lentz)', () => {
  it('CB-17 rama verdadera: un valor casi cero se reemplaza; rama falsa: se conserva', () => {
    expect(evitarCero(0)).toBe(1e-300)
    expect(evitarCero(-1e-320)).toBe(1e-300)
    expect(evitarCero(2.5)).toBe(2.5)
    expect(evitarCero(-3)).toBe(-3)
  })
})
