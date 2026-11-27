// Pruebas de caja blanca de estadistica.ts: cada caso recorre un camino
// concreto del código (rama, condición o bucle), indicado en su nombre.
import { describe, expect, it } from 'vitest'
import {
  chiCuadrado, cuantil, descriptivos, evitarCero, intensidad, pValorChi2, resumen, tablaIntervalos, tablaValores,
} from './estadistica'

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

describe('cuantil (CUARTIL.INC de Excel)', () => {
  it('CB-18 posición entera, interpolada y en el último dato', () => {
    const v = [1, 2, 3, 4, 5]
    expect(cuantil(v, 0.5)).toBe(3) // posición 3
    expect(cuantil([1, 2, 3, 4], 0.25)).toBe(1.75) // posición 1,75
    expect(cuantil(v, 1)).toBe(5) // posición n: no hay dato siguiente
  })
})

describe('resumen', () => {
  it('CB-19 lista vacía devuelve null', () => {
    expect(resumen([Number.NaN])).toBeNull()
  })

  it('CB-20 datos del pizarrón: moda, varianza, CV, cuartiles, vallas y atípicos', () => {
    const r = resumen([2, 4, 4, 4, 5, 5, 7, 9, 40])!
    expect(r.suma).toBe(80)
    expect(r.modas).toEqual([4])
    expect(r.frecuenciaModa).toBe(3)
    expect(r.rango).toBe(38)
    expect(r.q1).toBe(4)
    expect(r.q3).toBe(7)
    expect(r.ric).toBe(3)
    expect(r.vallaSuperior).toBe(11.5)
    expect(r.atipicos).toEqual([40])
    expect(r.varianza).toBeCloseTo(r.sumaCuadrados / 8, 10)
    expect(r.cv).toBeCloseTo((r.de / r.media) * 100, 10)
    expect(r.asimetria!).toBeGreaterThan(2) // cola larga a la derecha
  })

  it('CB-21 sin valores repetidos no hay moda; con dos datos no hay asimetría', () => {
    const r = resumen([3, 8])!
    expect(r.modas).toEqual([])
    expect(r.asimetria).toBeNull()
  })

  it('CB-22 todos iguales: varianza 0 y asimetría 0; media 0 deja el CV sin definir', () => {
    expect(resumen([5, 5, 5])!.asimetria).toBe(0)
    const ceros = resumen([0, 0, 0])!
    expect(ceros.cv).toBeNull()
    expect(ceros.modas).toEqual([0])
    expect(resumen([7])!.varianza).toBe(0)
  })

  it('CB-23 coincide con Excel en los 180 años de vida profesional (medias del informe)', () => {
    // Distribución de la Tabla 1 del informe (n = 180 con «Dos años» = 2).
    const tabla: [number, number][] = [[0, 2], [1, 25], [1.5, 1], [2, 22], [3, 12], [4, 9], [5, 13], [6, 7], [7, 6],
      [8, 6], [9, 2], [10, 4], [11, 2], [12, 9], [13, 6], [14, 10], [15, 10], [16, 3], [17, 3], [18, 1], [19, 1],
      [20, 10], [21, 2], [22, 3], [23, 3], [25, 4], [26, 1], [28, 2], [35, 1]]
    const datos = tabla.flatMap(([x, f]) => Array<number>(f).fill(x))
    const r = resumen(datos)!
    expect(r.n).toBe(180)
    expect(r.media).toBeCloseTo(9.0306, 4)
    expect(r.mediana).toBe(6)
    expect(r.varianza).toBeCloseTo(58.531, 3)
    expect(r.de).toBeCloseTo(7.6506, 4)
    expect([r.q1, r.q3, r.p90]).toEqual([2, 14, 20])
    expect(r.asimetria!).toBeCloseTo(0.8144, 4)
  })
})

describe('tablas de frecuencia', () => {
  it('CB-24 intervalos [a, b): cada dato cae en un solo intervalo y Fi termina en n', () => {
    const t = tablaIntervalos([0, 4.9, 5, 12, 35], 5)
    expect(t.map((f) => f.fi)).toEqual([2, 1, 1, 0, 0, 0, 0, 1])
    expect(t.at(-1)).toMatchObject({ etiqueta: '[35, 40)', Fi: 5, Hi: 1, marca: 37.5 })
  })

  it('CB-25 sin datos o con ancho inválido devuelve una tabla vacía', () => {
    expect(tablaIntervalos([], 5)).toEqual([])
    expect(tablaIntervalos([1, 2], 0)).toEqual([])
  })

  it('CB-26 tabla por valor: un renglón por valor distinto', () => {
    const t = tablaValores([2, 1, 2, Number.NaN])
    expect(t.map((f) => [f.desde, f.fi, f.Fi])).toEqual([[1, 1, 1], [2, 2, 3]])
    expect(t[1].Hi).toBe(1)
  })
})
