// Vista previa de la importación de CSV (pestaña Datos): lee el archivo, propone el
// mapeo de columnas a preguntas del catálogo y limpia los valores ANTES de enviarlos.
//
// El backend vuelve a validar cada fila al guardar (guardar_respuesta, igual que el
// formulario); esto solo permite revisar el mapeo y los problemas en pantalla.
//
// PARA CONECTAR: `importar` envía las filas válidas a POST /admin/importar/{slug}
// (lo implementa P2). Cuerpo: { archivo, filas: [{ fila, submitted_at, answers }] }.
// Respuesta esperada: { importadas: number, rechazadas: [{ fila, errores }] }.

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

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/^\s*\d+\s*[).-]\s*/, '').replace(/[^a-z0-9ñ]+/g, ' ').trim()

const METADATOS: Record<string, { origen: string; fecha?: boolean }> = {
  'id': { origen: 'Microsoft Forms' },
  'hora de inicio': { origen: 'Microsoft Forms' },
  'hora de finalizacion': { origen: 'Microsoft Forms', fecha: true },
  'hora de la ultima modificacion': { origen: 'Microsoft Forms' },
  'correo electronico': { origen: 'Microsoft Forms' },
  'nombre': { origen: 'Microsoft Forms' },
  'marca temporal': { origen: 'Google Forms', fecha: true },
  'direccion de correo electronico': { origen: 'Google Forms' },
  'puntuacion': { origen: 'Google Forms' },
}

/** Preguntas a las que se puede asignar una columna (los "Otro" van en la misma celda que la opción). */
export const preguntasImportables = (encuesta: Survey) =>
  encuesta.sections.flatMap((s) => s.questions).filter((q) => !q.configuration.other_for)

/** "P12 · Años de vida profesional", o "Contacto · Email" para los datos de contacto. */
export function nombresPreguntas(encuesta: Survey): Record<string, string> {
  const mapa: Record<string, string> = {}
  for (const v of variables(encuesta)) mapa[v.codigo] = v.etiqueta
  for (const q of encuesta.sections.flatMap((s) => s.questions)) {
    if (mapa[q.code]) continue
    const texto = q.prompt.replace(/^\d+\)\s*/, '').replace(/:$/, '')
    mapa[q.code] = q.configuration.store === 'contact' ? `Contacto · ${texto}` : texto.length > 46 ? `${texto.slice(0, 45)}…` : texto
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
  const columnas: ColumnaCsv[] = encabezados.map((encabezado, indice) => {
    const meta = METADATOS[normalizar(encabezado)]
    return {
      indice, encabezado, metadato: meta ? `Metadato de ${meta.origen}` : null,
      destino: meta?.fecha ? FECHA : null, estado: meta?.fecha ? 'coincide' : 'sin_mapear',
    }
  })
  if (columnas.filter((c) => c.destino === FECHA).length > 1) {
    columnas.filter((c) => c.destino === FECHA).slice(1).forEach((c) => { c.destino = null; c.estado = 'sin_mapear' })
  }

  // Todos los pares columna–pregunta, del más parecido al menos; cada pregunta se usa una vez.
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

export interface Problema { fila: number | null; texto: string; tipo: 'aviso' | 'anulado' | 'descartada' | 'atipico' }

export interface VistaPrevia {
  filasLeidas: number
  validas: Envio[]
  descartadas: number
  atipicos: number
  problemas: Problema[]
}

const cortar = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Convierte una celda al valor que espera el backend; `error` si no es válido. */
function convertir(q: Question, celda: string, answers: Answers): { valor?: string | string[]; error?: string } {
  const texto = celda.trim()
  const cfg = q.configuration
  if (q.options.length) {
    const porTexto = new Map(q.options.flatMap((o) => [[normalizar(o.label), o.value], [normalizar(o.value), o.value]]))
    const directa = porTexto.get(normalizar(texto))
    if (q.question_type !== 'multiple_choice') {
      if (directa) return { valor: directa }
      if (cfg.other_question) { answers[cfg.other_question] = texto; return {} }
      return { error: `"${cortar(texto)}" no coincide con las opciones` }
    }
    // Selección múltiple: MS Forms separa con ";" y Google Forms con ", " (y las
    // opciones pueden tener comas), así que se buscan las etiquetas dentro del texto.
    let resto = ` ${normalizar(texto)} `
    const elegidas: string[] = []
    for (const o of [...q.options].sort((a, b) => b.label.length - a.label.length)) {
      const n = ` ${normalizar(o.label)} `
      if (n.trim() && resto.includes(n)) { elegidas.push(o.value); resto = resto.replace(n, ' ') }
    }
    if (resto.trim()) {
      const otro = texto.split(/;/).map((x) => x.trim()).filter((x) => x && !porTexto.has(normalizar(x))).join('; ')
      if (cfg.other_question) answers[cfg.other_question] = otro || resto.trim()
      else if (!elegidas.length) return { error: `"${cortar(texto)}" no coincide con las opciones` }
    }
    return elegidas.length ? { valor: elegidas } : {}
  }
  if (cfg.input === 'integer') {
    if (!/^\d+$/.test(texto)) return { error: `"${cortar(texto)}" no es un número entero` }
    const n = Number(texto)
    if ((cfg.min !== undefined && n < cfg.min) || (cfg.max !== undefined && n > cfg.max)) {
      return { error: `${n} fuera de rango (${cfg.min ?? '…'}–${cfg.max ?? '…'})` }
    }
    return { valor: String(n) }
  }
  return { valor: texto }
}

function cuartiles(xs: number[]): [number, number] {
  const o = [...xs].sort((a, b) => a - b)
  const q = (p: number) => { const i = (o.length - 1) * p, b = Math.floor(i); return o[b] + (o[Math.min(b + 1, o.length - 1)] - o[b]) * (i - b) }
  return [q(0.25), q(0.75)]
}

/** Limpia todas las filas con el mapeo elegido. `filas` no incluye el encabezado. */
export function revisar(encuesta: Survey, columnas: ColumnaCsv[], filas: string[][]): VistaPrevia {
  const preguntas = new Map(encuesta.sections.flatMap((s) => s.questions).map((q) => [q.code, q]))
  const nombres = nombresPreguntas(encuesta)
  const corto = (codigo: string) => nombres[codigo]?.split(' · ')[0] ?? codigo
  const problemas: Problema[] = []
  const mapeadas = columnas.filter((c) => c.destino && c.destino !== FECHA)
  const sinMapear = columnas.filter((c) => !c.destino).length
  if (sinMapear) problemas.push({ fila: null, tipo: 'aviso', texto: `${sinMapear} ${sinMapear === 1 ? 'columna sin mapear no se importará' : 'columnas sin mapear no se importarán'}.` })

  const obligatorias = preguntasImportables(encuesta).filter((q) => q.required && !q.display_condition && !mapeadas.some((c) => c.destino === q.code))
  for (const q of obligatorias) problemas.push({ fila: null, tipo: 'aviso', texto: `Ninguna columna corresponde a ${corto(q.code)} (obligatoria): las filas se descartarán.` })

  const colFecha = columnas.find((c) => c.destino === FECHA)
  const { orden, ambiguo } = ordenFechas(colFecha ? filas.map((f) => f[colFecha.indice] ?? '') : [])
  if (!colFecha) problemas.push({ fila: null, tipo: 'aviso', texto: 'Sin columna de fecha: se usará la fecha de importación.' })
  else if (ambiguo) problemas.push({ fila: null, tipo: 'aviso', texto: 'Las fechas no permiten distinguir día y mes; se asumió día/mes/año.' })

  const colId = columnas.find((c) => normalizar(c.encabezado) === 'id')
  const ids = new Set<string>()
  const validas: Envio[] = []
  let descartadas = 0

  filas.forEach((celdas, i) => {
    const fila = i + 2 // como en Excel: la fila 1 es el encabezado
    const id = colId ? celdas[colId.indice]?.trim() : ''
    if (id && ids.has(id)) {
      descartadas++
      problemas.push({ fila, tipo: 'descartada', texto: `ID ${id} repetido; fila descartada.` })
      return
    }
    if (id) ids.add(id)

    const answers: Answers = {}
    // Índice del aviso "valor anulado" de cada pregunta, por si luego la fila se descarta por ella.
    const anulados = new Map<string, number>()
    const anular = (codigo: string, texto: string) => {
      anulados.set(codigo, problemas.length)
      problemas.push({ fila, tipo: 'anulado', texto })
    }
    for (const c of mapeadas) {
      const celda = celdas[c.indice] ?? ''
      if (!celda.trim()) continue
      const q = preguntas.get(c.destino!)!
      const { valor, error } = convertir(q, celda, answers)
      if (error) anular(q.code, `${corto(q.code)} = ${error}; valor anulado.`)
      else if (valor !== undefined) answers[q.code] = valor
    }
    // Topes entre preguntas (años desempleado ≤ años de vida profesional).
    for (const q of preguntas.values()) {
      const tope = q.configuration.max_question
      const v = answers[q.code], t = tope ? answers[tope] : undefined
      if (typeof v === 'string' && typeof t === 'string' && Number(v) > Number(t)) {
        anular(q.code, `${corto(q.code)} (${v}) supera a ${corto(tope!)} (${t}); ${corto(q.code)} anulado.`)
        delete answers[q.code]
      }
    }
    // Lo que sigue inválido (teléfono, correo…) se anula si es opcional; si falta algo obligatorio, se descarta.
    let visibles = respuestasVisibles(encuesta, answers)
    for (const [codigo, mensaje] of Object.entries(validar(encuesta, visibles))) {
      if (visibles[codigo] !== undefined && !preguntas.get(codigo)?.required) {
        anular(codigo, `${corto(codigo)}: ${mensaje.replace(/\.$/, '')}; valor anulado.`)
        delete visibles[codigo]
      }
    }
    visibles = respuestasVisibles(encuesta, visibles)
    const errores = Object.entries(validar(encuesta, visibles))
    if (errores.length) {
      descartadas++
      const [codigo, mensaje] = errores[0]
      const mas = errores.length > 1 ? ` (y ${errores.length - 1} más)` : ''
      const previo = anulados.get(codigo)
      if (previo !== undefined) {
        // Se anuló un valor obligatorio: un solo aviso en lugar de dos.
        const p = problemas[previo]
        problemas[previo] = { ...p, tipo: 'descartada', texto: p.texto.replace(/(valor )?anulado\.$/, `anulado; es obligatoria${mas}, fila descartada.`) }
      } else {
        problemas.push({ fila, tipo: 'descartada', texto: `${corto(codigo)}: ${mensaje.replace(/\.$/, '')}${mas}; fila descartada.` })
      }
      return
    }

    let submitted_at: string | null = null
    const textoFecha = colFecha ? celdas[colFecha.indice]?.trim() : ''
    if (textoFecha) {
      submitted_at = aIso(textoFecha, orden)
      if (!submitted_at) problemas.push({ fila, tipo: 'aviso', texto: `Fecha "${cortar(textoFecha)}" no reconocida; se usará la de importación.` })
    }
    validas.push({ fila, submitted_at, answers: visibles })
  })

  // Atípicos (regla de 1,5 × rango intercuartílico) en las preguntas numéricas: se marcan pero se conservan.
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
        problemas.push({ fila: e.fila, tipo: 'atipico', texto: `${corto(q.code)} = ${v} es atípico (habitual ${Math.max(0, Math.ceil(desde))}–${Math.floor(hasta)}); se conserva.` })
      }
    }
  }

  problemas.sort((a, b) => (a.fila ?? 0) - (b.fila ?? 0))
  return { filasLeidas: filas.length, validas, descartadas, atipicos, problemas }
}

// ---------------------------------------------------------------- envío al backend

export interface ResultadoImportacion { importadas: number; rechazadas: { fila: number; errores: Record<string, string> }[] }

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
