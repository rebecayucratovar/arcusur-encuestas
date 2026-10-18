import { useOutletContext } from 'react-router-dom'

export type SlugEncuesta = 'titulados' | 'empleadores'

/** Respuesta de GET /admin/resumen. */
export type Resumen = Record<SlugEncuesta, { name: string; total: number; por_origen: Record<string, number> }>

/** Valores de tss_submissions.source y cómo se muestran. */
export const ORIGENES: { valor: string; texto: string; clase: string }[] = [
  { valor: 'public_link', texto: 'Formulario', clase: 'origen--formulario' },
  { valor: 'csv_import', texto: 'CSV', clase: 'origen--csv' },
  { valor: 'demo', texto: 'Demostración', clase: 'origen--demo' },
]

export const infoOrigen = (valor: string) =>
  ORIGENES.find((o) => o.valor === valor) ?? { valor, texto: valor, clase: '' }

export interface ContextoAdmin {
  encuesta: SlugEncuesta
  resumen: Resumen | null
  /** Orígenes elegidos en la barra superior: cada pestaña muestra solo esas respuestas. */
  origenes: string[]
}

/** Para las páginas del panel: encuesta y orígenes elegidos arriba, y conteos reales. */
export const useContextoAdmin = () => useOutletContext<ContextoAdmin>()
