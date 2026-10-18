import type { Categoria } from './resumen'

/** Descarga las categorías de un gráfico como CSV (abre bien en Excel). */
export function exportarCSV(nombre: string, datos: Categoria[]) {
  const total = datos.reduce((a, d) => a + d.valor, 0)
  const celda = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`
  const filas = [
    ['Categoría', 'Cantidad', 'Porcentaje'],
    ...datos.map((d) => [d.etiqueta, d.valor, total ? ((d.valor / total) * 100).toFixed(1) : '0']),
  ]
  // BOM para que Excel reconozca los acentos; ";" porque Excel en español usa coma decimal.
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
