/** Número con coma decimal (formato de Bolivia). */
export const num = (n: number, decimales = 1) =>
  n.toLocaleString('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

/** Porcentaje a partir de un valor ya expresado en % (30 → "30,0%"). */
export const pct = (valor: number, decimales = 1) => `${num(valor, decimales)}%`

/** p-valor legible: "0,352" o "< 0,001". */
export const pValor = (p: number) => (p < 0.001 ? '< 0,001' : num(p, 3))

/**
 * Color de una celda del mapa de calor: una sola tonalidad (rojo institucional),
 * de clara a oscura según `t` (0 a 1). Devuelve fondo y color de texto legible.
 */
export function colorCalor(t: number): { background: string; color: string } {
  const claro = [251, 236, 239]
  const oscuro = [176, 18, 45]
  const k = Math.max(0, Math.min(1, t))
  const [r, g, b] = claro.map((c, i) => Math.round(c + (oscuro[i] - c) * k))
  return { background: `rgb(${r}, ${g}, ${b})`, color: k > 0.55 ? '#ffffff' : 'var(--texto)' }
}
