// Lectura de la primera hoja de un .xlsx (Microsoft Forms y Google Forms exportan así),
// sin librerías: un .xlsx es un ZIP con XML adentro. Devuelve las filas como texto,
// igual que leerCsv, para que el mapeo y la limpieza no cambien.

const FIRMA_FIN_DIRECTORIO = 0x06054b50
const FIRMA_ENTRADA = 0x02014b50

interface EntradaZip { nombre: string; metodo: number; tamano: number; desplazamiento: number }

function entradasZip(datos: DataView): EntradaZip[] {
  // El directorio central se encuentra desde el final del archivo.
  let fin = -1
  for (let i = datos.byteLength - 22; i >= Math.max(0, datos.byteLength - 65557); i--) {
    if (datos.getUint32(i, true) === FIRMA_FIN_DIRECTORIO) { fin = i; break }
  }
  if (fin < 0) throw new Error('El archivo no es un .xlsx válido.')
  const total = datos.getUint16(fin + 10, true)
  let p = datos.getUint32(fin + 16, true)
  const entradas: EntradaZip[] = []
  const texto = new TextDecoder()
  for (let i = 0; i < total; i++) {
    if (datos.getUint32(p, true) !== FIRMA_ENTRADA) throw new Error('El archivo .xlsx está dañado.')
    const largoNombre = datos.getUint16(p + 28, true)
    entradas.push({
      metodo: datos.getUint16(p + 10, true),
      tamano: datos.getUint32(p + 20, true),
      desplazamiento: datos.getUint32(p + 42, true),
      nombre: texto.decode(new Uint8Array(datos.buffer, datos.byteOffset + p + 46, largoNombre)),
    })
    p += 46 + largoNombre + datos.getUint16(p + 30, true) + datos.getUint16(p + 32, true)
  }
  return entradas
}

async function extraer(datos: DataView, e: EntradaZip): Promise<string> {
  const inicio = e.desplazamiento + 30 + datos.getUint16(e.desplazamiento + 26, true) + datos.getUint16(e.desplazamiento + 28, true)
  const comprimido = new Uint8Array(datos.buffer, datos.byteOffset + inicio, e.tamano)
  if (e.metodo === 0) return new TextDecoder().decode(comprimido)
  if (e.metodo !== 8) throw new Error('El .xlsx usa una compresión no admitida.')
  const flujo = new Blob([comprimido.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(flujo).text()
}

// ---------------------------------------------------------------- XML

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Entidades XML y los escapes de Excel para caracteres de control (_x000D_). */
function texto(xml: string): string {
  return xml
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e.toLowerCase()])
    .replace(/_x([0-9a-f]{4})_/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
}

const atributo = (etiqueta: string, nombre: string) =>
  etiqueta.match(new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`))?.[1]

/** Texto de un <si> o <is>: une los fragmentos <t> (texto con formato) y omite la fonética. */
const textoRico = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => texto(m[1])).join('')

// ---------------------------------------------------------------- fechas

// Formatos de fecha integrados de Excel (los personalizados se detectan por su código).
const FORMATOS_FECHA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57])

function estilosFecha(estilos: string | undefined): Set<number> {
  const fechas = new Set<number>()
  if (!estilos) return fechas
  const propios = new Map([...estilos.matchAll(/<numFmt\b([^>]*)\/?>/g)].map((m) => [Number(atributo(m[1], 'numFmtId')), atributo(m[1], 'formatCode') ?? '']))
  const xfs = estilos.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? ''
  ;[...xfs.matchAll(/<xf\b([^>]*)/g)].forEach((m, indice) => {
    const id = Number(atributo(m[1], 'numFmtId') ?? 0)
    const codigo = texto(propios.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
    if (FORMATOS_FECHA.has(id) || /[dmyhs]/i.test(codigo)) fechas.add(indice)
  })
  return fechas
}

/** Número de serie de Excel (días desde 1899-12-30) → "2026-04-29 18:50:00". */
function fechaExcel(serie: number): string {
  const d = new Date(Math.round((serie - 25569) * 86400) * 1000)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}:${dos(d.getUTCSeconds())}`
}

// ---------------------------------------------------------------- hoja

/** "AB" → 27 (desde 0). */
function columna(ref: string): number {
  let n = 0
  for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

/** Filas de la primera hoja como texto; quita las filas vacías. */
export async function leerXlsx(contenido: ArrayBuffer): Promise<string[][]> {
  const datos = new DataView(contenido)
  const entradas = new Map(entradasZip(datos).map((e) => [e.nombre, e]))
  const leer = async (nombre: string) => {
    const e = entradas.get(nombre)
    return e ? extraer(datos, e) : undefined
  }

  // Primera hoja según el libro (no siempre se llama sheet1.xml).
  const libro = (await leer('xl/workbook.xml')) ?? ''
  const relaciones = (await leer('xl/_rels/workbook.xml.rels')) ?? ''
  const idHoja = atributo(libro.match(/<sheet\b([^>]*)/)?.[1] ?? '', 'r:id')
  const destino = [...relaciones.matchAll(/<Relationship\b([^>]*)/g)].map((m) => m[1])
    .find((r) => atributo(r, 'Id') === idHoja)
  const ruta = destino ? atributo(destino, 'Target')!.replace(/^\/?(xl\/)?/, 'xl/') : 'xl/worksheets/sheet1.xml'
  const hoja = await leer(ruta)
  if (!hoja) throw new Error('El .xlsx no tiene hojas con datos.')

  const compartidos = [...((await leer('xl/sharedStrings.xml')) ?? '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textoRico(m[1]))
  const fechas = estilosFecha(await leer('xl/styles.xml'))

  const filas: string[][] = []
  for (const fila of hoja.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const celdas: string[] = []
    let siguiente = 0
    for (const c of fila[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], interior = c[2] ?? ''
      const ref = atributo(attrs, 'r')
      const indice = ref ? columna(ref) : siguiente
      siguiente = indice + 1
      const tipo = atributo(attrs, 't')
      const v = interior.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let valor = ''
      if (tipo === 's') valor = compartidos[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = textoRico(interior)
      else if (tipo === 'b') valor = v === '1' ? 'VERDADERO' : 'FALSO'
      else if (tipo === 'e') valor = ''
      else if (v !== undefined) {
        const numero = Number(v)
        valor = tipo !== 'str' && fechas.has(Number(atributo(attrs, 's') ?? -1)) && Number.isFinite(numero) ? fechaExcel(numero) : texto(v)
      }
      celdas[indice] = valor
    }
    const completa = Array.from(celdas, (x) => x ?? '')
    if (completa.some((x) => x.trim() !== '')) filas.push(completa)
  }
  return filas
}
