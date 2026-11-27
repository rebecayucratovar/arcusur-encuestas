// Pruebas de caja blanca de estadistica.ts: cada caso recorre un camino
// concreto del código (rama, condición o bucle), indicado en su nombre.
import { describe, expect, it } from 'vitest'
import {
  chiCuadrado, chiPorCapas, chiYates, cuantil, descriptivos, evitarCero, fallaCochran, fisherExacto, intensidad, probarTabla,
  pValorChi2, resumen, tablaIntervalos, tablaUsada, tablaValores,
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

describe('prueba exacta de Fisher y cruce de tres variables', () => {
  it('CB-27 Fisher bilateral coincide con scipy (formación × interés y sector × remuneración de los junior)', () => {
    const a = fisherExacto([[105, 14], [50, 15]])!
    expect(a.p).toBeCloseTo(0.056672, 6)
    expect(a.razonMomios).toBeCloseTo(2.25, 10)
    expect(fisherExacto([[23, 15], [10, 2]])!.p).toBeCloseTo(0.181113, 6)
    expect(fisherExacto([[0, 5], [5, 0]])).toEqual({ p: expect.closeTo(0.0079365, 7), razonMomios: 0 })
    expect(fisherExacto([[3, 0], [1, 4]])!.razonMomios).toBe(Infinity)
  })

  it('CB-28 Fisher no se calcula si la tabla no es 2×2 o un total es cero', () => {
    expect(fisherExacto([[1, 2, 3], [4, 5, 6]])).toBeNull()
    expect(fisherExacto([[1, 2]])).toBeNull()
    expect(fisherExacto([[0, 0], [3, 4]])).toBeNull()
    expect(fisherExacto([[2, 0], [3, 0]])).toBeNull()
  })

  it('CB-29 Yates: corrige |ad − bc| en n/2 y no baja de cero', () => {
    expect(chiYates([[105, 14], [50, 15]])).toBeCloseTo(3.244527, 6)
    expect(chiYates([[5, 5], [5, 6]])).toBe(0)
    expect(chiYates([[1, 2, 3], [4, 5, 6]])).toBeNull()
    expect(chiYates([[0, 0], [3, 4]])).toBeNull()
  })

  it('CB-30 χ² por capas: satisfacción × concordancia controlando experiencia (Tabla 50 del informe)', () => {
    const r = chiPorCapas([[[40, 12], [4, 15]], [[60, 23], [5, 20]]])
    expect(r.capas[0].resultado!.chi2).toBeCloseTo(18.4316, 4)
    expect(r.capas[1].resultado!.chi2).toBeCloseTo(21.9222, 4)
    expect(r.capas[0].fisher!.p).toBeCloseTo(4.5565e-5, 8)
    expect([r.chi2, r.gl, r.calculadas, r.significativas]).toEqual([expect.closeTo(40.3538, 4), 2, 2, 2])
    expect(r.capas.map((c) => c.metodo)).toEqual(['chi2', 'chi2']) // esperadas mínimas 7,23 y 9,95
    expect(r.p).toBeCloseTo(Math.exp(-40.353762 / 2), 14) // gl = 2: p = e^(−χ²/2) = 1,727·10⁻⁹
  })

  it('CB-31 capas sin datos suficientes no suman; una capa 3×2 no lleva Fisher', () => {
    const r = chiPorCapas([[[5, 0], [0, 0]], [[10, 2], [3, 9], [4, 4]]])
    expect(r.capas[0]).toEqual({ resultado: null, fisher: null, pDecision: NaN, metodo: 'chi2' })
    expect(r.capas[1].fisher).toBeNull()
    expect(r.capas[1].metodo).toBe('chi2') // falla Cochran (2 de 6 esperadas < 5) pero no es 2×2
    expect([r.calculadas, r.gl]).toEqual([1, 2])
    expect(Number.isNaN(chiPorCapas([[[1, 0], [0, 0]]]).p)).toBe(true)
  })

  it('CB-32 con esperadas < 5 en una 2×2 se decide con Fisher (sector × remuneración, consolidados y junior)', () => {
    const c = probarTabla([[23, 15], [10, 2]])
    expect(fallaCochran(c.resultado!)).toBe(true)
    expect(c.metodo).toBe('fisher')
    expect(c.pDecision).toBeCloseTo(0.181113, 6)
    const sinVacias = probarTabla([[23, 0, 15], [10, 0, 2]])
    expect(tablaUsada([[23, 0, 15], [10, 0, 2]], sinVacias.resultado!)).toEqual([[23, 15], [10, 2]])
    expect(sinVacias.pDecision).toBeCloseTo(0.181113, 6)
    expect(probarTabla([[105, 14], [50, 15]]).metodo).toBe('chi2')
  })
})
