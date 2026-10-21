// Datos de contacto (tss_submission_contacts). Se guardan aparte de las respuestas
// y no entran en ningún análisis; solo los ve el Comité.
//
// GET /admin/contactos/{slug} → Contacto[] (ver lib/demo.ts), del más reciente al más
// antiguo. Solo el rol admin puede verlos.

import { fetchAdmin } from '../services/api'
import type { Survey } from '../types'
import { DATOS_DE_DEMOSTRACION } from './datos'
import { contactosDemo, type Contacto } from './demo'

export async function cargarContactos(token: string, encuesta: Survey): Promise<Contacto[]> {
  if (DATOS_DE_DEMOSTRACION) return contactosDemo(encuesta)
  const r = await fetchAdmin(token, `/admin/contactos/${encuesta.slug}`)
  if (r.status === 403) throw new Error('Solo el rol administrador puede ver los datos de contacto.')
  if (!r.ok) throw new Error(`No se pudieron cargar los contactos (${r.status}).`)
  return r.json()
}
