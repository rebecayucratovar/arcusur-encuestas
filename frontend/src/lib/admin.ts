import { useOutletContext } from 'react-router-dom'

export type SlugEncuesta = 'titulados' | 'empleadores'

/** Respuesta de GET /admin/resumen. */
export type Resumen = Record<SlugEncuesta, { name: string; total: number; por_origen: Record<string, number> }>

export interface ContextoAdmin {
  encuesta: SlugEncuesta
  resumen: Resumen | null
}

/** Para las páginas del panel: encuesta elegida arriba y conteos de respuestas. */
export const useContextoAdmin = () => useOutletContext<ContextoAdmin>()
