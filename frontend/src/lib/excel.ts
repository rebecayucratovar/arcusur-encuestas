// Genera un .xlsx real (una hoja) sin dependencias: un .xlsx es un ZIP con
// unos pocos XML. El ZIP va sin compresión ("store"), que Excel acepta.

type Celda = string | number | null | undefined

const texto = new TextEncoder()

// ---------------------------------------------------------------- ZIP

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(archivos: { nombre: string; contenido: string }[]): Blob {
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let desplazamiento = 0

  for (const a of archivos) {
    const nombre = texto.encode(a.nombre)
    const datos = texto.encode(a.contenido)
    const crc = crc32(datos)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // firma de archivo local
    local.setUint16(4, 20, true) // versión necesaria
    local.setUint16(6, 0x0800, true) // nombres en UTF-8
    local.setUint16(8, 0, true) // sin compresión
    local.setUint32(14, crc, true)
    local.setUint32(18, datos.length, true)
    local.setUint32(22, datos.length, true)
    local.setUint16(26, nombre.length, true)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true) // firma del directorio central
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, datos.length, true)
    cd.setUint32(24, datos.length, true)
    cd.setUint16(28, nombre.length, true)
    cd.setUint32(42, desplazamiento, true)

    partes.push(new Uint8Array(local.buffer), nombre, datos)
    central.push(new Uint8Array(cd.buffer), nombre)
    desplazamiento += 30 + nombre.length + datos.length
  }

  const tamCentral = central.reduce((a, p) => a + p.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true) // fin del directorio central
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tamCentral, true)
  fin.setUint32(16, desplazamiento, true)

  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---------------------------------------------------------------- hoja

// Quita los caracteres de control que XML no admite (pueden venir en textos pegados).
const escapar = (s: string) =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function columna(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function hoja(filas: Celda[][]): string {
  const xmlFilas = filas.map((fila, r) => {
    const celdas = fila.map((v, c) => {
      const ref = `${columna(c)}${r + 1}`
      const estilo = r === 0 ? ' s="1"' : '' // encabezado en negrita
      if (v === null || v === undefined || v === '') return ''
      if (typeof v === 'number') return `<c r="${ref}"${estilo}><v>${v}</v></c>`
      return `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escapar(v)}</t></is></c>`
    }).join('')
    return `<row r="${r + 1}">${celdas}</row>`
  }).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<sheetData>${xmlFilas}</sheetData></worksheet>`
}

/** Crea el .xlsx en memoria (la primera fila es el encabezado). */
export function crearXlsx(nombreHoja: string, filas: Celda[][]): Blob {
  const hojaSegura = escapar(nombreHoja.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))
  const archivos = [
    { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>' },
    { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>' },
    { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets><sheet name="${hojaSegura}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>' },
    { nombre: 'xl/styles.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + '</styleSheet>' },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja(filas) },
  ]
  return zip(archivos)
}

/** Descarga `filas` (la primera es el encabezado) como archivo .xlsx. */
export function exportarExcel(nombre: string, nombreHoja: string, filas: Celda[][]) {
  const url = URL.createObjectURL(crearXlsx(nombreHoja, filas))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
