// Modelo de simulación de demanda de posgrado (pestaña Escenarios).
//
// Línea base: titulados que declaran interés en un posgrado (pregunta de interés),
// repartidos por el área que eligieron. Sobre ella se aplican tres palancas:
//   1. Becas: un % de los titulados SIN posgrado y SIN interés pasa a interesarse,
//      repartido en las áreas con la misma proporción que la línea base.
//   2. Interés en IA: crecimiento adicional (%) del área de Inteligencia Artificial.
//   3. Plazas FCyT: aumento (%) sobre una referencia de plazas anuales.
// La cobertura compara plazas con la demanda que prefiere la Dirección de Posgrado FCyT.

import { fetchAdmin } from '../services/api'
import type { Survey } from '../types'
import type { Fila } from './demo'

export interface Parametros {
  /** % de titulados sin posgrado ni interés que, con beca, se interesaría (0–100). */
  beca: number
  /** % de crecimiento adicional del interés en IA (0–100). */
  crecimientoIA: number
  /** % de aumento de plazas de posgrado FCyT (0–150). */
  aumentoPlazas: number
}

export const SUPUESTOS = {
  plazasReferencia: 30,
  crecimientoAnual: 0.04,
  anios: [2026, 2027, 2028, 2029, 2030],
  /** Proporción del efecto del escenario que ya se observa cada año. */
  incorporacion: [0.2, 0.4, 0.6, 0.8, 1],
}

export const PRESETS: { id: string; nombre: string; p: Parametros }[] = [
  { id: 'base', nombre: 'Línea base', p: { beca: 0, crecimientoIA: 0, aumentoPlazas: 0 } },
  { id: 'becas', nombre: 'Programa de becas ampliado', p: { beca: 35, crecimientoIA: 10, aumentoPlazas: 20 } },
  { id: 'ia', nombre: 'Impulso a la Inteligencia Artificial', p: { beca: 10, crecimientoIA: 60, aumentoPlazas: 30 } },
  { id: 'plazas', nombre: 'Ampliación de plazas FCyT', p: { beca: 0, crecimientoIA: 0, aumentoPlazas: 80 } },
]

export interface Area { valor: string; etiqueta: string; base: number; escenario: number }

export interface Resultado {
  n: number
  areas: Area[]
  totalBase: number
  totalEscenario: number
  /** Variación % de la demanda total respecto a la línea base. */
  variacion: number
  areaLider: Area | null
  /** Titulados sin posgrado ni interés: sobre ellos actúan las becas. */
  sinInteres: number
  nuevosPorBecas: number
  /** Proporción de interesados que prefiere la Dirección de Posgrado FCyT. */
  preferenciaFcyt: number
  plazasBase: number
  plazasEscenario: number
  demandaFcytBase: number
  demandaFcytEscenario: number
  /** Plazas / demanda FCyT (%). null si nadie prefiere la FCyT. */
  coberturaBase: number | null
  coberturaEscenario: number | null
  proyeccion: { anio: number; base: number; escenario: number }[]
}

const AREA_IA = 'ia'
const FCYT = 'posgrado_fcyt'

export function simular(encuesta: Survey | null, filas: Fila[], p: Parametros): Resultado {
  const opciones = encuesta?.sections.flatMap((s) => s.questions).find((q) => q.code === 'area_posgrado')?.options ?? []
  const interesados = filas.filter((f) => f.interes_posgrado === 'si')
  const conArea = interesados.filter((f) => f.area_posgrado)
  const sinInteres = filas.filter((f) => f.formacion === 'no' && f.interes_posgrado === 'no').length
  const nuevosPorBecas = (sinInteres * p.beca) / 100

  const totalConArea = conArea.length
  const areas = opciones.map((o) => {
    const base = conArea.filter((f) => f.area_posgrado === o.value).length
    const parte = totalConArea ? base / totalConArea : 1 / Math.max(1, opciones.length)
    let escenario = base + nuevosPorBecas * parte
    if (o.value === AREA_IA) escenario *= 1 + p.crecimientoIA / 100
    return { valor: o.value, etiqueta: o.label, base, escenario }
  })

  const totalBase = areas.reduce((a, x) => a + x.base, 0)
  const totalEscenario = areas.reduce((a, x) => a + x.escenario, 0)
  const conPreferencia = interesados.filter((f) => f.organizacion_posgrado)
  const preferenciaFcyt = conPreferencia.length
    ? conPreferencia.filter((f) => f.organizacion_posgrado === FCYT).length / conPreferencia.length
    : 0

  const plazasBase = SUPUESTOS.plazasReferencia
  const plazasEscenario = plazasBase * (1 + p.aumentoPlazas / 100)
  const demandaFcytBase = totalBase * preferenciaFcyt
  const demandaFcytEscenario = totalEscenario * preferenciaFcyt

  const proyeccion = SUPUESTOS.anios.map((anio, i) => {
    const crecimiento = (1 + SUPUESTOS.crecimientoAnual) ** i
    return {
      anio,
      base: totalBase * crecimiento,
      escenario: (totalBase + (totalEscenario - totalBase) * SUPUESTOS.incorporacion[i]) * crecimiento,
    }
  })

  return {
    n: filas.length,
    areas,
    totalBase,
    totalEscenario,
    variacion: totalBase ? ((totalEscenario - totalBase) / totalBase) * 100 : 0,
    areaLider: [...areas].sort((a, b) => b.escenario - a.escenario)[0] ?? null,
    sinInteres,
    nuevosPorBecas,
    preferenciaFcyt,
    plazasBase,
    plazasEscenario,
    demandaFcytBase,
    demandaFcytEscenario,
    coberturaBase: demandaFcytBase ? (plazasBase / demandaFcytBase) * 100 : null,
    coberturaEscenario: demandaFcytEscenario ? (plazasEscenario / demandaFcytEscenario) * 100 : null,
    proyeccion,
  }
}

/** Lectura de la cobertura de plazas FCyT. */
export function lecturaCobertura(c: number | null): string {
  if (c === null) return 'no puede estimarse (nadie eligió la FCyT como institución preferida)'
  if (c < 90) return 'sería insuficiente frente a la demanda proyectada'
  if (c <= 120) return 'quedaría equilibrada con la demanda proyectada'
  return 'superaría la demanda proyectada (habría plazas sin cubrir)'
}

// ---------------------------------------------------------------- escenarios guardados

export interface EscenarioGuardado {
  id: string
  title: string
  parameters: Parametros
  results: { totalBase: number; totalEscenario: number; variacion: number; areaLider: string | null; coberturaEscenario: number | null }
  created_at: string
}

export async function listarEscenarios(token: string): Promise<EscenarioGuardado[]> {
  const r = await fetchAdmin(token, '/admin/simulaciones')
  if (!r.ok) throw new Error(`No se pudieron cargar los escenarios (${r.status}).`)
  return r.json()
}

export async function guardarEscenario(token: string, titulo: string, p: Parametros, r: Resultado, origenes: string[]) {
  const respuesta = await fetchAdmin(token, '/admin/simulaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: titulo,
      parameters: p,
      assumptions: { ...SUPUESTOS, origenes, n: r.n, preferenciaFcyt: r.preferenciaFcyt },
      results: {
        totalBase: r.totalBase, totalEscenario: r.totalEscenario, variacion: r.variacion,
        areaLider: r.areaLider?.etiqueta ?? null, coberturaEscenario: r.coberturaEscenario,
      },
    }),
  })
  if (!respuesta.ok) throw new Error(`No se pudo guardar el escenario (${respuesta.status}).`)
  return (await respuesta.json()) as EscenarioGuardado
}

export async function borrarEscenario(token: string, id: string) {
  const r = await fetchAdmin(token, `/admin/simulaciones/${id}`, { method: 'DELETE' })
  if (!r.ok && r.status !== 404) throw new Error(`No se pudo borrar el escenario (${r.status}).`)
}
