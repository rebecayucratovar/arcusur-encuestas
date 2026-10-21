// Vista previa de la importación (pestaña Datos; .csv aquí, .xlsx en lib/xlsx.ts): propone el
// mapeo de columnas a preguntas del catálogo y limpia los valores ANTES de enviarlos.
//
// El backend vuelve a validar cada fila y las envía a la RPC `tss_import_csv`.
// Esa RPC depende de una migración PENDIENTE de validación y aplicación remota;
// hasta entonces la importación no está operativa en producción.
//
// `importar` llama POST /admin/importar/{slug}.
// Cuerpo: { archivo, filas: [{ fila, submitted_at, answers }] }.
// Respuesta: { importadas: number, rechazadas: [{ fila, errores }] }.

import { fetchAdmin } from '../services/api'
import type { Answers, Question, Survey } from '../types'
import { respuestasVisibles, validar } from './validacion'
import { variables } from './variables'

// ---------------------------------------------------------------- lectura del CSV

/** Separa un CSV (coma o punto y coma, comillas, saltos de línea dentro de comillas). */
export function leerCsv(texto: string): string[][] {
  texto = texto.replace(/^\uFEFF/, '')
  const primera = texto.slice(0, texto.search(/\r?\n|$/))
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ','
  const filas: string[][] = []
  let fila: string[] = [], campo = '', comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  return filas.filter((f) => f.some((x) => x.trim() !== ''))
}

// ---------------------------------------------------------------- mapeo de columnas

/** Valor especial del mapeo: la columna con la fecha de envío (tss_submissions.submitted_at). */
export const FECHA = '__fecha'

export type EstadoColumna = 'coincide' | 'revisar' | 'sin_mapear'

export interface ColumnaCsv {
  indice: number
  encabezado: string
  /** "Metadato de Microsoft Forms" / "Metadato de Google Forms" si no es una pregunta. */
  metadato: string | null
  /** Código de pregunta, FECHA, o null si no se importa. */
  destino: string | null
  estado: EstadoColumna
}

/** Minúsculas, sin tildes ni signos, sin numeración inicial ("12) ", ".¿"). */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/^[^a-z0-9]*\d+\s*[).-]\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim()

const METADATOS: Record<string, { origen: string; fecha?: boolean }> = {
  'id': { origen: 'Microsoft Forms' },
  'hora de inicio': { origen: 'Microsoft Forms' },
  'hora de finalizacion': { origen: 'Microsoft Forms', fecha: true },
  'hora de la ultima modificacion': { origen: 'Microsoft Forms' },
  'correo electronico': { origen: 'Microsoft Forms' },
  'nombre': { origen: 'Microsoft Forms' },
  'total de puntos': { origen: 'Microsoft Forms' },
  'comentarios del cuestionario': { origen: 'Microsoft Forms' },
  'hora de publicacion de la calificacion': { origen: 'Microsoft Forms' },
  'marca temporal': { origen: 'Google Forms', fecha: true },
  'direccion de correo electronico': { origen: 'Google Forms' },
  'puntuacion': { origen: 'Google Forms' },
}

function metadato(encabezado: string): { texto: string; fecha?: boolean } | null {
  const n = normalizar(encabezado)
  const fijo = METADATOS[n]
  if (fijo) return { texto: `Metadato de ${fijo.origen}`, fecha: fijo.fecha }
  // Formularios en modo cuestionario: cada pregunta trae "Puntos: …" y "Comentarios: …".
  if (/^(puntos|comentarios) /.test(n)) return { texto: 'Puntaje de Microsoft Forms (modo cuestionario)' }
  if (/^column ?\d*$/.test(n)) return { texto: 'Columna auxiliar de Excel' }
  return null
}

/** Preguntas a las que se puede asignar una columna (incluye los campos "Otro"). */
export const preguntasImportables = (encuesta: Survey) => encuesta.sections.flatMap((s) => s.questions)

/** "P12 · Años de vida profesional", "P20 · Rubro (Otro)" o "Contacto · Email". */
export function nombresPreguntas(encuesta: Survey): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const v of variables(encuesta)) mapa[v.codigo] = v.etiqueta
  const todas = encuesta.sections.flatMap((s) => s.questions)
  for (const q of todas) {
    if (mapa[q.code]) continue
    const texto = q.prompt.replace(/^\d+\)\s*/, '').replace(/:$/, '')
    const padre = q.configuration.other_for
    mapa[q.code] = padre ? `${mapa[padre] ?? padre} (Otro)`
      : q.configuration.store === 'contact' ? `Contacto · ${texto}`
        : texto.length > 46 ? `${texto.slice(0, 45)}…` : texto
  }
  return mapa
}

const palabras = (s: string) => new Set(s.split(' ').filter((w) => w.length > 2))

function parecido(a: string, b: string): number {
  if (a === b) return 1
  if (a.length > 20 && b.length > 20 && (a.startsWith(b) || b.startsWith(a))) return 0.95
  const x = palabras(a), y = palabras(b)
  if (!x.size || !y.size) return 0
  const comunes = [...x].filter((w) => y.has(w)).length
  return comunes / Math.max(x.size, y.size)
}

/** Propone a qué pregunta corresponde cada encabezado. */
export function mapearColumnas(encuesta: Survey, encabezados: string[]): ColumnaCsv[] {
  const preguntas = preguntasImportables(encuesta).map((q) => ({ q, n: normalizar(q.prompt) }))
  let hayFecha = false
  const columnas: ColumnaCsv[] = encabezados.map((encabezado, indice) => {
    const meta = metadato(encabezado)
    const esFecha = !!meta?.fecha && !hayFecha
    if (esFecha) hayFecha = true
    return {
      indice, encabezado, metadato: meta?.texto ?? null,
      destino: esFecha ? FECHA : null, estado: esFecha ? 'coincide' : 'sin_mapear',
    }
  })

  // Pares columna–pregunta del más parecido al menos; cada pregunta se usa una vez. El orden
  // es estable: con encabezados repetidos ("Otra asignatura:") gana la columna anterior.
  const pares = columnas.filter((c) => !c.metadato).flatMap((c) => {
    const n = normalizar(c.encabezado)
    return preguntas.map(({ q, n: p }) => ({ c, q, puntaje: parecido(n, p) }))
  }).filter((x) => x.puntaje >= 0.5).sort((a, b) => b.puntaje - a.puntaje)
  const usadas = new Set<string>()
  for (const { c, q, puntaje } of pares) {
    if (c.destino || usadas.has(q.code)) continue
    c.destino = q.code
    c.estado = puntaje >= 0.9 ? 'coincide' : 'revisar'
    usadas.add(q.code)
  }
  return columnas
}

// ---------------------------------------------------------------- fechas

interface PartesFecha { a: number; b: number; c: number; h: number; mi: number; s: number; zona: string | null }

function partesFecha(texto: string): PartesFecha | null {
  const m = texto.trim().match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:([ap])\.?\s*m\.?)?)?(?:\s*(?:GMT|UTC)\s*([+-]\d{1,2}))?/i)
  if (!m) return null
  let h = Number(m[4] ?? 0)
  if (m[7]?.toLowerCase() === 'p' && h < 12) h += 12
  if (m[7]?.toLowerCase() === 'a' && h === 12) h = 0
  const zona = m[8] ? `${m[8][0]}${m[8].slice(1).padStart(2, '0')}:00` : null
  return { a: Number(m[1]), b: Number(m[2]), c: Number(m[3]), h, mi: Number(m[5] ?? 0), s: Number(m[6] ?? 0), zona }
}

type OrdenFecha = 'amd' | 'dma' | 'mda'

/** Decide el orden día/mes mirando toda la columna (p. ej. 25/03 solo puede ser día/mes). */
function ordenFechas(textos: string[]): { orden: OrdenFecha; ambiguo: boolean } {
  const partes = textos.map(partesFecha).filter((p): p is PartesFecha => p !== null)
  if (partes.some((p) => p.a > 31)) return { orden: 'amd', ambiguo: false }
  if (partes.some((p) => p.a > 12)) return { orden: 'dma', ambiguo: false }
  if (partes.some((p) => p.b > 12)) return { orden: 'mda', ambiguo: false }
  return { orden: 'dma', ambiguo: partes.length > 0 }
}

/** ISO 8601 con zona (Bolivia, UTC−4, si el archivo no la indica), o null si no es válida. */
function aIso(texto: string, orden: OrdenFecha): string | null {
  const p = partesFecha(texto)
  if (!p) return null
  const [a, mes, dia] = orden === 'amd' ? [p.a, p.b, p.c] : orden === 'dma' ? [p.c, p.b, p.a] : [p.c, p.a, p.b]
  const anio = a < 100 ? a + 2000 : a
  const dos = (n: number) => String(n).padStart(2, '0')
  const iso = `${anio}-${dos(mes)}-${dos(dia)}T${dos(p.h)}:${dos(p.mi)}:${dos(p.s)}${p.zona ?? '-04:00'}`
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes || p.h > 23 || p.mi > 59) return null
  if (new Date(iso).getTime() > Date.now()) return null
  return iso
}

// ---------------------------------------------------------------- limpieza

export interface Envio { fila: number; submitted_at: string | null; answers: Answers }

export type TipoProblema = 'descartada' | 'anulado' | 'corregido' | 'aviso' | 'atipico'

/** Un problema y las filas donde aparece (los repetidos se agrupan en un solo aviso). */
export interface Problema { tipo: TipoProblema; texto: string; filas: number[] }

export interface VistaPrevia {
  filasLeidas: number
  validas: Envio[]
  descartadas: number
  atipicos: number
  problemas: Problema[]
}

/** "Fila 6", "Filas 6, 9 y 12", "Filas 6, 9, 12, 15 y 40 más". */
export function textoFilas(filas: number[]): string {
  if (filas.length === 1) return `Fila ${filas[0]}`
  if (filas.length <= 4) return `Filas ${filas.slice(0, -1).join(', ')} y ${filas[filas.length - 1]}`
  return `Filas ${filas.slice(0, 4).join(', ')} y ${filas.length - 4} más`
}

const ORDEN_TIPOS: TipoProblema[] = ['descartada', 'anulado', 'corregido', 'aviso', 'atipico']

class Problemas {
  private grupos = new Map<string, Problema>()
  /** `clave` agrupa: el mismo problema en otra fila se suma al aviso existente. */
  agregar(tipo: TipoProblema, clave: string, texto: string, fila?: number) {
    const g = this.grupos.get(`${tipo}|${clave}`) ?? { tipo, texto, filas: [] }
    if (fila !== undefined) g.filas.push(fila)
    this.grupos.set(`${tipo}|${clave}`, g)
  }
  lista(): Problema[] {
    return [...this.grupos.values()].sort((a, b) =>
      ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo) || (a.filas[0] ?? 0) - (b.filas[0] ?? 0))
  }
}

const cortar = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Respuestas de relleno en campos de texto ("-", ".", "N/a", "ninguno"). */
const RELLENO = /^(n ?a|na|s ?n|x+|no|nada|ninguno|ninguna|ningun|no tengo|sin respuesta|prefiero no responder)$/

/** "2 años" → 2, "1.5" → 1, "6 meses" → 0, "ninguno" → 0; null si no hay un número. */
function interpretarEntero(texto: string): number | null {
  const n = normalizar(texto)
  if (/^\d+$/.test(texto.trim())) return Number(texto.trim())
  if (/^(ninguno|ninguna|nada|cero)\b/.test(n)) return 0
  const m = texto.trim().toLowerCase().match(/^(?:unos?\s+|aprox\.?\s*)?(\d+(?:[.,]\d+)?)\s*(meses|mes)?/)
  if (!m) return null
  const valor = Number(m[1].replace(',', '.'))
  return Math.floor(m[2] ? valor / 12 : valor)
}

interface Conversion { valor?: string | string[]; error?: string; nota?: string }

/** Convierte una celda al valor que espera el backend. */
function convertir(q: Question, celda: string, answers: Answers): Conversion {
  const texto = celda.trim()
  const cfg = q.configuration
  if (q.options.length) {
    const porTexto = new Map(q.options.flatMap((o) => [[normalizar(o.label), o.value], [normalizar(o.value), o.value]]))
    const directa = porTexto.get(normalizar(texto))
    if (directa && q.question_type !== 'multiple_choice') return { valor: directa }
    // Busca las etiquetas dentro del texto: MS Forms separa con ";" (o '["A","B"]'),
    // Google Forms con ", ", y algunas opciones llevan comas.
    let resto = ` ${normalizar(texto)} `
    const elegidas: string[] = []
    for (const o of [...q.options].sort((a, b) => b.label.length - a.label.length)) {
      const n = ` ${normalizar(o.label)} `
      if (n.trim() && resto.includes(n)) { elegidas.push(o.value); resto = resto.replace(n, ' ') }
    }
    const sobra = resto.trim()
    if (q.question_type !== 'multiple_choice') {
      if (elegidas.length && !sobra) {
        // Versión anterior del formulario con varias opciones en una pregunta de una sola.
        const n = normalizar(texto)
        const posicion = (v: string) => n.indexOf(normalizar(q.options.find((o) => o.value === v)!.label))
        const escrita = [...elegidas].sort((x, y) => posicion(x) - posicion(y))[0]
        return { valor: escrita, nota: elegidas.length > 1 ? 'varias opciones en una pregunta de una sola; se conservó la primera' : undefined }
      }
      if (cfg.other_question) { answers[cfg.other_question] = texto; return { nota: 'texto que no es una opción; se guardó como "Otro"' } }
      return { error: `"${cortar(texto)}" no coincide con las opciones` }
    }
    if (sobra) {
      if (cfg.other_question) answers[cfg.other_question] = texto.split(';').map((x) => x.trim())
        .filter((x) => x && !porTexto.has(normalizar(x))).join('; ') || sobra
      else if (!elegidas.length) return { error: `"${cortar(texto)}" no coincide con las opciones` }
    }
    const n = normalizar(texto)
    const posicion = (v: string) => n.indexOf(normalizar(q.options.find((o) => o.value === v)!.label))
    return elegidas.length ? { valor: elegidas.sort((x, y) => posicion(x) - posicion(y)) } : {}
  }
  if (cfg.input === 'integer') {
    const n = interpretarEntero(texto)
    if (n === null) return { error: `"${cortar(texto)}" no es un número` }
    if ((cfg.min !== undefined && n < cfg.min) || (cfg.max !== undefined && n > cfg.max)) {
      return { error: `${n} fuera de rango (${cfg.min ?? '…'}–${cfg.max ?? '…'})` }
    }
    return { valor: String(n), nota: String(n) !== texto ? 'textos como "2 años" o "6 meses" se convirtieron a años enteros' : undefined }
  }
  if (cfg.input === 'url' && /^(www\.|[a-z]{2}\.)?linkedin\.com\//i.test(texto)) {
    return { valor: `https://${texto}`, nota: 'enlaces sin "https://" se completaron' }
  }
  return { valor: texto }
}

function cuartiles(xs: number[]): [number, number] {
  const o = [...xs].sort((a, b) => a - b)
  const q = (p: number) => { const i = (o.length - 1) * p, b = Math.floor(i); return o[b] + (o[Math.min(b + 1, o.length - 1)] - o[b]) * (i - b) }
  return [q(0.25), q(0.75)]
}

/**
 * Limpia todas las filas con el mapeo elegido. `filas` no incluye el encabezado.
 *
 * Criterio (los formularios cambiaron durante la recolección, así que no se pierde una
 * respuesta entera por un dato): un valor inválido se ANULA y el resto de la fila se
 * conserva; solo se DESCARTA la fila repetida (mismo ID) o sin ningún dato.
 */
export function revisar(encuesta: Survey, columnas: ColumnaCsv[], filas: string[][]): VistaPrevia {
  const preguntas = new Map(encuesta.sections.flatMap((s) => s.questions).map((q) => [q.code, q]))
  const nombres = nombresPreguntas(encuesta)
  const p = new Problemas()
  const mapeadas = columnas.filter((c) => c.destino && c.destino !== FECHA)

  const sinMapear = columnas.filter((c) => !c.destino && !c.metadato).length
  if (sinMapear) p.agregar('aviso', 'sin-mapear', `${sinMapear} ${sinMapear === 1 ? 'columna con una pregunta no reconocida no se importará' : 'columnas con preguntas no reconocidas no se importarán'}; revise el mapeo.`)
  const faltan = [...preguntas.values()].filter((q) => q.required && !q.display_condition && !mapeadas.some((c) => c.destino === q.code))
  for (const q of faltan) p.agregar('aviso', `falta-${q.code}`, `Ninguna columna corresponde a ${nombres[q.code]} (obligatoria).`)

  const colFecha = columnas.find((c) => c.destino === FECHA)
  const { orden, ambiguo } = ordenFechas(colFecha ? filas.map((f) => f[colFecha.indice] ?? '') : [])
  if (!colFecha) p.agregar('aviso', 'sin-fecha', 'Sin columna de fecha: se usará la fecha de importación.')
  else if (ambiguo) p.agregar('aviso', 'fecha-ambigua', 'Las fechas no permiten distinguir día y mes; se asumió día/mes/año.')

  const colId = columnas.find((c) => normalizar(c.encabezado) === 'id')
  const ids = new Map<string, number>()
  const correos = new Map<string, number[]>()
  const validas: Envio[] = []
  let descartadas = 0

  filas.forEach((celdas, i) => {
    const fila = i + 2 // como en Excel: la fila 1 es el encabezado
    const id = colId ? celdas[colId.indice]?.trim() : ''
    if (id && ids.has(id)) {
      descartadas++
      p.agregar('descartada', `id-${id}`, `ID ${id} repetido (igual que la fila ${ids.get(id)}); se descarta la copia.`, fila)
      return
    }
    if (id) ids.set(id, fila)

    const answers: Answers = {}
    const anuladas = new Set<string>()
    for (const c of mapeadas) {
      const q = preguntas.get(c.destino!)!
      const celda = (celdas[c.indice] ?? '').trim()
      if (!celda) continue
      if (!q.options.length && !q.configuration.input && q.question_type !== 'email'
        && (!/[\p{L}\p{N}]/u.test(celda) || (q.configuration.other_for && RELLENO.test(normalizar(celda))))) {
        p.agregar('corregido', `relleno-${q.code}`, `${nombres[q.code]}: respuestas de relleno ("-", ".", "N/a") se tomaron como vacías.`, fila)
        continue
      }
      const { valor, error, nota } = convertir(q, celda, answers)
      if (error) {
        anuladas.add(q.code)
        p.agregar('anulado', `valor-${q.code}`, `${nombres[q.code]}: ${error}; valor anulado.`, fila)
      } else if (valor !== undefined) answers[q.code] = valor
      if (nota) p.agregar('corregido', `nota-${q.code}-${nota}`, `${nombres[q.code]}: ${nota}.`, fila)
    }
    // Topes entre preguntas (años desempleado ≤ años de vida profesional).
    for (const q of preguntas.values()) {
      const tope = q.configuration.max_question
      const v = answers[q.code], t = tope ? answers[tope] : undefined
      if (typeof v === 'string' && typeof t === 'string' && Number(v) > Number(t)) {
        anuladas.add(q.code)
        p.agregar('anulado', `tope-${q.code}`, `${nombres[q.code]} mayor que ${nombres[tope!]}; valor anulado.`, fila)
        delete answers[q.code]
      }
    }
    // Lo que sigue inválido (correo, teléfono, enlace…) se anula; el resto de la fila se conserva.
    let visibles = respuestasVisibles(encuesta, answers)
    for (const [codigo, mensaje] of Object.entries(validar(encuesta, visibles, undefined, true))) {
      const ejemplo = typeof visibles[codigo] === 'string' ? ` (p. ej. "${cortar(visibles[codigo] as string, 24)}")` : ''
      p.agregar('anulado', `invalido-${codigo}`, `${nombres[codigo]}: ${mensaje.replace(/\.$/, '').toLowerCase()}${ejemplo}; valor anulado.`, fila)
      anuladas.add(codigo)
      delete visibles[codigo]
    }
    visibles = respuestasVisibles(encuesta, visibles)
    if (Object.keys(visibles).length === 0) {
      descartadas++
      p.agregar('descartada', 'vacia', 'Fila sin respuestas válidas; se descarta.', fila)
      return
    }
    // Lo que el formulario actual exigiría y la fila no tiene: se importa igual, pero se avisa.
    for (const [codigo, mensaje] of Object.entries(validar(encuesta, visibles))) {
      if (anuladas.has(codigo)) continue // ya avisado como valor anulado
      p.agregar('aviso', `exigida-${codigo}-${mensaje}`, `${nombres[codigo]}: ${mensaje.replace(/\.$/, '').toLowerCase()} según el formulario actual (versión anterior o pregunta añadida después); se importa igual.`, fila)
    }
    for (const q of preguntas.values()) {
      if (q.question_type === 'email' && typeof visibles[q.code] === 'string') {
        const correo = (visibles[q.code] as string).toLowerCase()
        correos.set(correo, [...(correos.get(correo) ?? []), fila])
      }
    }

    let submitted_at: string | null = null
    const textoFecha = colFecha ? celdas[colFecha.indice]?.trim() : ''
    if (textoFecha) {
      submitted_at = aIso(textoFecha, orden)
      if (!submitted_at) p.agregar('aviso', 'fecha-invalida', 'Fecha no reconocida; se usará la de importación.', fila)
    }
    validas.push({ fila, submitted_at, answers: visibles })
  })

  for (const [correo, filasCorreo] of correos) {
    if (filasCorreo.length > 1) {
      p.agregar('aviso', `correo-${correo}`, `Mismo correo de contacto en ${filasCorreo.length} filas: posible envío repetido (se conservan; revíselas).`)
      filasCorreo.forEach((f) => p.agregar('aviso', `correo-${correo}`, '', f))
    }
  }

  // Atípicos (regla de 1,5 × rango intercuartílico) en las preguntas numéricas: se señalan pero se conservan.
  let atipicos = 0
  for (const q of preguntas.values()) {
    if (q.configuration.input !== 'integer') continue
    const valores = validas.map((e) => e.answers[q.code]).filter((v): v is string => typeof v === 'string').map(Number)
    if (valores.length < 8) continue
    const [q1, q3] = cuartiles(valores)
    const desde = q1 - 1.5 * (q3 - q1), hasta = q3 + 1.5 * (q3 - q1)
    for (const e of validas) {
      const v = Number(e.answers[q.code])
      if (e.answers[q.code] !== undefined && (v < desde || v > hasta)) {
        atipicos++
        p.agregar('atipico', `atipico-${q.code}`, `${nombres[q.code]}: valores atípicos (lo habitual es ${Math.max(0, Math.ceil(desde))}–${Math.floor(hasta)}); se conservan.`, e.fila)
      }
    }
  }

  return { filasLeidas: filas.length, validas, descartadas, atipicos, problemas: p.lista() }
}

// ---------------------------------------------------------------- envío al backend

export interface ResultadoImportacion { importadas: number; rechazadas: { fila: number; errores: string[] }[] }

export async function importar(token: string, slug: string, archivo: string, filas: Envio[]): Promise<ResultadoImportacion> {
  const r = await fetchAdmin(token, `/admin/importar/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archivo, filas }),
  })
  if (r.status === 404 || r.status === 405) {
    throw new Error('El importador del backend todavía no está disponible (POST /admin/importar/{slug}).')
  }
  if (!r.ok) {
    const { detail } = await r.json().catch(() => ({ detail: null }))
    throw new Error(typeof detail === 'string' ? detail : `No se pudo importar (${r.status}).`)
  }
  return r.json()
}
