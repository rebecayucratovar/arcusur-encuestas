/** Marcas "redondas" de un eje que empieza en 0 y cubre `max` (0, 10, 20...). */
export function escala(max: number): number[] {
  const paso = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((p) => max / p <= 5) ?? Math.ceil(max / 5)
  const tope = Math.max(paso, Math.ceil(max / paso) * paso)
  return Array.from({ length: tope / paso + 1 }, (_, i) => i * paso)
}
