// Datos que usan las pestañas del panel: el catálogo de la encuesta y sus respuestas.
//
// PARA CONECTAR LA BASE DE DATOS: en `cargar`, cuando DATOS_DE_DEMOSTRACION sea
// false, pedir GET /admin/respuestas/{slug} (FilaRespuesta[], ver lib/respuestas.ts)
// y aplanar cada una con `{ id, fecha, origen, ...valores }`. Las estadísticas de
// Resumen y Análisis se calculan a partir de esas filas.

import { useEffect, useMemo, useState } from 'react'
import { obtenerEncuesta } from '../services/api'
import type { Survey } from '../types'
import { generarDemo, type Fila } from './demo'

/** Mientras sea true, el panel muestra respuestas ficticias y el aviso de demostración. */
export const DATOS_DE_DEMOSTRACION = true

interface Datos { encuesta: Survey; filas: Fila[] }

// Una sola carga por encuesta mientras la página esté abierta.
const cache = new Map<string, Promise<Datos>>()

function cargar(slug: string): Promise<Datos> {
  let p = cache.get(slug)
  if (!p) {
    p = obtenerEncuesta(slug).then((encuesta) => ({ encuesta, filas: generarDemo(encuesta) }))
    p.catch(() => cache.delete(slug)) // permitir reintentar si falló
    cache.set(slug, p)
  }
  return p
}

interface Estado { slug: string; datos?: Datos; error?: string }

/** Catálogo y respuestas de `slug`, solo de los `origenes` elegidos. */
export function useDatosEncuesta(slug: string, origenes: string[]) {
  const [estado, setEstado] = useState<Estado>({ slug })

  useEffect(() => {
    let activo = true
    cargar(slug)
      .then((datos) => activo && setEstado({ slug, datos }))
      .catch((e: Error) => activo && setEstado({ slug, error: e.message }))
    return () => { activo = false }
  }, [slug])

  const vigente = estado.slug === slug ? estado : { slug }
  const filas = useMemo(
    () => (vigente.datos?.filas ?? []).filter((f) => origenes.includes(String(f.origen))),
    [vigente.datos, origenes],
  )

  return {
    encuesta: vigente.datos?.encuesta ?? null,
    filas,
    cargando: !vigente.datos && !vigente.error,
    error: vigente.error ?? null,
  }
}
