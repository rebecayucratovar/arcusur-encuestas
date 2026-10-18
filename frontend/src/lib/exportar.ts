import type { Categoria } from './resumen'

type Celda = string | number | null | undefined

function celda(v: Celda): string {
  let s = v === null || v === undefined ? '' : String(v)
  // Evita que Excel interprete como fórmula un texto escrito por un encuestado.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** Descarga `filas` (la primera es el encabezado) como CSV que abre bien en Excel. */
export function exportarTablaCSV(nombre: string, filas: Celda[][]) {
  // BOM para que Excel reconozca los acentos; ";" porque Excel en español usa coma decimal.
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Descarga las categorías de un gráfico como CSV. */
export function exportarCSV(nombre: string, datos: Categoria[]) {
  const total = datos.reduce((a, d) => a + d.valor, 0)
  exportarTablaCSV(nombre, [
    ['Categoría', 'Cantidad', 'Porcentaje'],
    ...datos.map((d) => [d.etiqueta, d.valor, total ? ((d.valor / total) * 100).toFixed(1) : '0']),
  ])
}
