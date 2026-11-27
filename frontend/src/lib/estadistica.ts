// Estadística descriptiva y prueba chi-cuadrada de independencia.

// ---------------------------------------------------------------- descriptivos

export interface Descriptivos {
  n: number
  media: number
  mediana: number
  /** Desviación estándar muestral (n − 1). */
  de: number
  min: number
  max: number
}

export function descriptivos(valores: number[]): Descriptivos | null {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  const n = v.length
  if (n === 0) return null
  const media = v.reduce((a, x) => a + x, 0) / n
  const mediana = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2
  const de = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - media) ** 2, 0) / (n - 1)) : 0
  return { n, media, mediana, de, min: v[0], max: v[n - 1] }
}

/**
 * Cuantil por interpolación lineal, igual que CUARTIL.INC / PERCENTIL.INC de Excel:
 * posición = 1 + p·(n − 1) sobre los datos ordenados.
 */
export function cuantil(ordenados: number[], p: number): number {
  const n = ordenados.length
  const pos = 1 + p * (n - 1)
  const k = Math.floor(pos)
  const d = pos - k
  return k >= n ? ordenados[n - 1] : ordenados[k - 1] + d * (ordenados[k] - ordenados[k - 1])
}

export interface Resumen extends Descriptivos {
  suma: number
  /** Valor o valores que más se repiten (vacío si ninguno se repite). */
  modas: number[]
  frecuenciaModa: number
  rango: number
  /** Suma de cuadrados Σ(x − media)², numerador de la varianza. */
  sumaCuadrados: number
  varianza: number
  /** Coeficiente de variación en %; null si la media es 0. */
  cv: number | null
  q1: number
  q3: number
  p90: number
  ric: number
  vallaInferior: number
  vallaSuperior: number
  atipicos: number[]
  /** Asimetría muestral (COEFICIENTE.ASIMETRIA de Excel); null con menos de 3 datos. */
  asimetria: number | null
}

/** Todas las medidas de tendencia central, dispersión, posición y forma. */
export function resumen(valores: number[]): Resumen | null {
  const d = descriptivos(valores)
  if (!d) return null
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  const n = v.length
  const suma = v.reduce((a, x) => a + x, 0)
  const conteo = new Map<number, number>()
  for (const x of v) conteo.set(x, (conteo.get(x) ?? 0) + 1)
  const frecuenciaModa = Math.max(...conteo.values())
  const modas = frecuenciaModa > 1 ? [...conteo].filter(([, f]) => f === frecuenciaModa).map(([x]) => x) : []
  const sumaCuadrados = v.reduce((a, x) => a + (x - d.media) ** 2, 0)
  const varianza = n > 1 ? sumaCuadrados / (n - 1) : 0
  const q1 = cuantil(v, 0.25)
  const q3 = cuantil(v, 0.75)
  const ric = q3 - q1
  const vallaInferior = q1 - 1.5 * ric
  const vallaSuperior = q3 + 1.5 * ric
  let asimetria: number | null = null
  if (n >= 3) {
    asimetria = d.de === 0 ? 0 : (n / ((n - 1) * (n - 2))) * v.reduce((a, x) => a + ((x - d.media) / d.de) ** 3, 0)
  }
  return {
    ...d, suma, modas, frecuenciaModa, rango: d.max - d.min, sumaCuadrados, varianza,
    cv: d.media === 0 ? null : (d.de / d.media) * 100,
    q1, q3, p90: cuantil(v, 0.9), ric, vallaInferior, vallaSuperior,
    atipicos: v.filter((x) => x < vallaInferior || x > vallaSuperior), asimetria,
  }
}

export interface FilaFrecuencia {
  etiqueta: string
  desde: number
  /** Límite superior (excluido) del intervalo; igual a `desde` en la tabla por valor. */
  hasta: number
  marca: number
  fi: number
  hi: number
  Fi: number
  Hi: number
}

/** Tabla de frecuencias absoluta, relativa y acumuladas, por intervalos [a, b) de ancho fijo. */
export function tablaIntervalos(valores: number[], ancho: number): FilaFrecuencia[] {
  const v = valores.filter((x) => Number.isFinite(x))
  if (v.length === 0 || !(ancho > 0)) return []
  const inicio = Math.floor(Math.min(...v) / ancho) * ancho
  const fin = Math.floor(Math.max(...v) / ancho) * ancho + ancho
  const filas: FilaFrecuencia[] = []
  let F = 0
  for (let a = inicio; a < fin; a += ancho) {
    const fi = v.filter((x) => x >= a && x < a + ancho).length
    F += fi
    filas.push({ etiqueta: `[${a}, ${a + ancho})`, desde: a, hasta: a + ancho, marca: a + ancho / 2,
      fi, hi: fi / v.length, Fi: F, Hi: F / v.length })
  }
  return filas
}

/** Tabla de frecuencias por cada valor distinto, ordenada de menor a mayor. */
export function tablaValores(valores: number[]): FilaFrecuencia[] {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  const filas: FilaFrecuencia[] = []
  let F = 0
  for (const x of new Set(v)) {
    const fi = v.filter((y) => y === x).length
    F += fi
    filas.push({ etiqueta: String(x), desde: x, hasta: x, marca: x, fi, hi: fi / v.length, Fi: F, Hi: F / v.length })
  }
  return filas
}

// ---------------------------------------------------------------- chi-cuadrada

/** Logaritmo de la función gamma (aproximación de Lanczos). */
function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941678, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953]
  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  for (const ci of c) ser += ci / ++y
  return -tmp + Math.log((Math.sqrt(2 * Math.PI) * ser) / x)
}

const DIMINUTO = 1e-300

/**
 * Protección del método de Lentz: un valor casi cero se reemplaza por DIMINUTO para
 * no dividir entre cero. Exportada para probar sus dos ramas (caja blanca).
 */
export function evitarCero(v: number): number {
  return Math.abs(v) < DIMINUTO ? DIMINUTO : v
}

/** Función gamma incompleta regularizada superior Q(a, x). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1
  const gln = lnGamma(a)
  if (x < a + 1) {
    // Serie para P(a, x); Q = 1 − P.
    let suma = 1 / a
    let termino = suma
    for (let n = 1; n < 500; n++) {
      termino *= x / (a + n)
      suma += termino
      if (Math.abs(termino) < Math.abs(suma) * 1e-14) break
    }
    return 1 - suma * Math.exp(-x + a * Math.log(x) - gln)
  }
  // Fracción continua (método de Lentz) para Q(a, x).
  let b = x + 1 - a
  let c = 1 / DIMINUTO
  let d = 1 / b
  let h = d
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a)
    b += 2
    d = evitarCero(an * d + b)
    c = evitarCero(b + an / c)
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 1e-14) break
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h
}

/** p-valor de la prueba chi-cuadrada: P(X ≥ x) con `gl` grados de libertad. */
export function pValorChi2(x: number, gl: number): number {
  if (gl <= 0) return NaN
  return Math.min(1, Math.max(0, gammaQ(gl / 2, x / 2)))
}

export interface ResultadoChi2 {
  chi2: number
  gl: number
  p: number
  /** V de Cramér: intensidad de la asociación (0 a 1). */
  v: number
  n: number
  /** Índices de filas y columnas con al menos una observación (las vacías no entran). */
  filas: number[]
  columnas: number[]
  esperadas: number[][]
  celdasBajas: number
  totalCeldas: number
  esperadaMinima: number
}

/** Prueba de independencia sobre una tabla de frecuencias observadas. */
export function chiCuadrado(observadas: number[][]): ResultadoChi2 | null {
  const totFila = observadas.map((f) => f.reduce((a, x) => a + x, 0))
  const totCol = observadas[0]?.map((_, j) => observadas.reduce((a, f) => a + f[j], 0)) ?? []
  const filas = totFila.map((t, i) => (t > 0 ? i : -1)).filter((i) => i >= 0)
  const columnas = totCol.map((t, j) => (t > 0 ? j : -1)).filter((j) => j >= 0)
  if (filas.length < 2 || columnas.length < 2) return null

  const n = filas.reduce((a, i) => a + totFila[i], 0)
  let chi2 = 0
  let celdasBajas = 0
  let esperadaMinima = Infinity
  const esperadas = filas.map((i) => columnas.map((j) => {
    const e = (totFila[i] * totCol[j]) / n
    chi2 += (observadas[i][j] - e) ** 2 / e
    if (e < 5) celdasBajas++
    esperadaMinima = Math.min(esperadaMinima, e)
    return e
  }))
  const gl = (filas.length - 1) * (columnas.length - 1)
  const v = Math.sqrt(chi2 / (n * (Math.min(filas.length, columnas.length) - 1)))
  return {
    chi2, gl, p: pValorChi2(chi2, gl), v, n, filas, columnas, esperadas,
    celdasBajas, totalCeldas: filas.length * columnas.length, esperadaMinima,
  }
}

/** Intensidad de la asociación según la V de Cramér. */
export function intensidad(v: number): string {
  if (v < 0.1) return 'despreciable'
  if (v < 0.3) return 'débil'
  if (v < 0.5) return 'moderada'
  return 'fuerte'
}
