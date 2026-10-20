// Datos de contacto (tss_submission_contacts). Se guardan aparte de las respuestas
// y no entran en ningún análisis; solo los ve el Comité.
//
// PARA CONECTAR: cuando DATOS_DE_DEMOSTRACION sea false se pide
// GET /admin/contactos/{slug} → Contacto[] (ver lib/demo.ts), ordenados por fecha.

import { fetchAdmin } from '../services/api'
import type { Survey } from '../types'
import { DATOS_DE_DEMOSTRACION } from './datos'
import { contactosDemo, type Contacto } from './demo'

export async function cargarContactos(token: string, encuesta: Survey): Promise<Contacto[]> {
  if (DATOS_DE_DEMOSTRACION) return contactosDemo(encuesta)
  const r = await fetchAdmin(token, `/admin/contactos/${encuesta.slug}`)
  if (!r.ok) throw new Error(`No se pudieron cargar los contactos (${r.status}).`)
  return r.json()
}
