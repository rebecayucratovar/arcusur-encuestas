// Datos reales que usan las pestañas del panel: catálogo y respuestas de Supabase
// obtenidas a través de las rutas protegidas de FastAPI.

import { useEffect, useMemo, useState } from 'react'
import { obtenerCatalogoAdmin, obtenerRespuestas } from '../services/api'
import type { Survey } from '../types'
import type { Fila } from './demo'
import { useSesion } from './sesion'

/** Compatibilidad temporal con las demás vistas; el panel nunca carga datos ficticios. */
export const DATOS_DE_DEMOSTRACION = false

interface Datos { encuesta: Survey; filas: Fila[] }

async function cargar(slug: string, token: string): Promise<Datos> {
  const [encuesta, respuestas] = await Promise.all([
    obtenerCatalogoAdmin(token, slug),
    obtenerRespuestas(token, slug),
  ])
  const filas: Fila[] = respuestas.map(({ id, fecha, origen, valores }) => ({ id, fecha, origen, ...valores }))
  return { encuesta, filas }
}

interface Estado { slug: string; datos?: Datos; error?: string }

/** Catálogo y respuestas de `slug`, solo de los `origenes` elegidos. */
export function useDatosEncuesta(slug: string, origenes: string[]) {
  const { token } = useSesion()
  const [estado, setEstado] = useState<Estado>({ slug })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let activo = true
    if (!token) return
    cargar(slug, token)
      .then((datos) => activo && setEstado({ slug, datos }))
      .catch((e: Error) => activo && setEstado({ slug, error: e.message }))
    return () => { activo = false }
  }, [slug, token, revision])

  const vigente = estado.slug === slug ? estado : { slug }
  const filas = useMemo(
    () => (vigente.datos?.filas ?? []).filter((f) => origenes.includes(String(f.origen))),
    [vigente.datos, origenes],
  )

  return {
    encuesta: vigente.datos?.encuesta ?? null,
    filas,
    cargando: Boolean(token) && !vigente.datos && !vigente.error,
    error: !token ? 'No hay una sesión administrativa activa.' : vigente.error ?? null,
    recargar: () => setRevision((valor) => valor + 1),
  }
}
