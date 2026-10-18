// Respuestas ficticias generadas a partir del catálogo REAL (GET /encuestas/{slug}):
// mismas preguntas, opciones y ramas que los formularios. Siempre son las mismas
// (generador con semilla), así Resumen, Respuestas y Análisis cuadran entre sí.

import type { Answers, Question, Survey } from '../types'
import type { SlugEncuesta } from './admin'
import { evaluar } from './condiciones'

/** Una respuesta aplanada: metadatos + valores por código de pregunta. */
export type Fila = Record<string, string | string[] | undefined>

export const TOTAL_DEMO: Record<SlugEncuesta, number> = { titulados: 186, empleadores: 53 }

export function aleatorio(semilla: number) {
  return () => {
    semilla |= 0
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function elegir(r: () => number, pesos: Record<string, number>): string {
  const entradas = Object.entries(pesos).filter(([, p]) => p > 0)
  let x = r() * entradas.reduce((a, [, p]) => a + p, 0)
  for (const [clave, peso] of entradas) {
    x -= peso
    if (x <= 0) return clave
  }
  return entradas[0][0]
}

// Distribuciones verosímiles para las preguntas clave; el resto usa pesos al azar.
const PESOS: Record<SlugEncuesta, Record<string, Record<string, number>>> = {
  titulados: {
    edad: { '15_18': 0, '19_22': 3, '23_26': 30, '27_30': 30, '31_34': 20, '35_mas': 17 },
    genero: { hombre: 72, mujer: 28 },
    formacion: { si: 38, no: 62 },
    nivel_formacion: { diplomado: 55, especialidad: 15, maestria: 27, doctorado: 3, posdoctorado: 0 },
    interes_posgrado: { si: 72, no: 28 },
    area_posgrado: { ia: 34, ing_software: 29, redes_seguridad: 17, base_datos: 14, robotica: 6 },
    situacion_laboral: { trabaja: 80, no_trabaja: 7, emprende: 13 },
    sector_trabajo: { publico: 25, privado: 75 },
    departamento_trabajo: { cochabamba: 62, la_paz: 12, santa_cruz: 14, extranjero: 6, chuquisaca: 2, oruro: 2, tarija: 1, potosi: 1 },
    remuneracion: { menos_2500: 8, '2500_3500': 27, '3501_5000': 40, '5001_7000': 38, '7001_10000': 22, mas_10000: 13 },
    trabajo_antes: { si: 60, no: 40 },
    tiempo_primer_trabajo: { ya_trabajaba: 32, menos_1_mes: 31, '1_4_meses': 48, '4_8_meses': 37, '8_12_meses': 17, mas_12_meses: 15 },
    satisfaccion_carrera: { totalmente_desacuerdo: 5, en_desacuerdo: 20, de_acuerdo: 55, totalmente_acuerdo: 20 },
    concordancia_formacion: { totalmente_desacuerdo: 6, en_desacuerdo: 28, de_acuerdo: 52, totalmente_acuerdo: 14 },
    pertinencia_trabajo: { totalmente_desacuerdo: 4, en_desacuerdo: 14, de_acuerdo: 50, totalmente_acuerdo: 32 },
    interes_red: { si: 70, no: 30 },
  },
  empleadores: {
    tipo_organizacion: { privado: 70, publico: 30 },
    tamano_organizacion: { grande: 35, mediana: 15, pequena: 20, micro: 30 },
    rubro: {
      desarrollo_software: 36, telecomunicaciones: 9, banca: 6, sector_publico: 7, educacion: 5, industria: 5,
      comercio: 4, servicios_ti: 8, startups: 8, salud: 5, consultoria: 4, soporte_tecnico: 3,
    },
    contrataciones_cinco_anios: { si: 79, no: 21 },
    probabilidad_contratar: { alta: 34, depende_crecimiento: 49, no_prevista: 14, no_requiere: 3 },
    nivel_formacion: { licenciatura: 66, diplomado: 10, especialidad: 15, maestria: 8, doctorado: 1 },
    medio_convocatoria: { internet: 55, postulacion: 18, recomendacion: 12, otros: 9, medios_escritos: 4, oferta_personal: 2 },
  },
}

// Años de vida profesional según la edad (mínimo, máximo).
const ANIOS_POR_EDAD: Record<string, [number, number]> = {
  '15_18': [0, 0], '19_22': [0, 1], '23_26': [0, 4], '27_30': [2, 8], '31_34': [5, 12], '35_mas': [8, 22],
}

// Nombres inventados: los datos de demostración no deben atribuirse a organizaciones reales.
const ORGANIZACIONES_FICTICIAS = [
  'Andina Software SRL', 'Valle Telecom S.A.', 'Banco del Tunari', 'Cóndor Logística', 'Kantuta Digital',
  'Illimani Data Lab', 'Servicios Sajama', 'Tecnologías Mizque', 'Clínica Los Pinos', 'Instituto Tiquipaya',
  'Agroindustrias Pairumani', 'Gobierno Municipal de Ejemplo', 'Red Quillacollo', 'Startup Wayra', 'Cooperativa Arani',
  'Consultora Tunari', 'Sistemas Punata', 'Energía Cliza', 'Comercial Aroma', 'Seguros Rocha',
]

function responder(
  slug: SlugEncuesta, q: Question, r: () => number, previas: Answers, pesosAzar: Map<string, Record<string, number>>,
): string | string[] | undefined {
  const pesosEncuesta = PESOS[slug] ?? {}
  const cfg = q.configuration
  if (cfg.store === 'contact' || cfg.other_for) return undefined

  if (q.question_type === 'single_choice' || q.question_type === 'likert') {
    return elegir(r, pesosEncuesta[q.code] ?? pesosAzar.get(q.code)!)
  }
  if (q.question_type === 'multiple_choice') {
    const min = cfg.min_selected ?? 1
    const max = cfg.max_selected ?? Math.min(3, q.options.length)
    const cantidad = min + Math.floor(r() * (max - min + 1))
    const pesos = { ...pesosAzar.get(q.code)! }
    const elegidas: string[] = []
    while (elegidas.length < cantidad && Object.values(pesos).some((p) => p > 0)) {
      const v = elegir(r, pesos)
      elegidas.push(v)
      pesos[v] = 0
    }
    return elegidas
  }
  if (cfg.input === 'integer') {
    if (q.code === 'anios_profesional') {
      const [a, b] = ANIOS_POR_EDAD[String(previas.edad)] ?? [0, 10]
      return String(a + Math.floor(r() * (b - a + 1)))
    }
    if (q.code === 'anios_desempleado') {
      const tope = Number(previas[cfg.max_question ?? ''] ?? 0)
      return String(Math.min(tope, Math.floor(r() * r() * 4)))
    }
    return String(Math.floor(r() * 10))
  }
  if (q.code === 'nombre_empresa' && slug === 'empleadores') {
    return ORGANIZACIONES_FICTICIAS[Math.floor(r() * ORGANIZACIONES_FICTICIAS.length)]
  }
  return undefined // los textos libres quedan vacíos en la demostración
}

/** Genera las respuestas ficticias de una encuesta a partir de su catálogo. */
export function generarDemo(encuesta: Survey): Fila[] {
  const slug = encuesta.slug as SlugEncuesta
  const r = aleatorio(slug === 'titulados' ? 2026 : 1832)
  const preguntas = encuesta.sections.flatMap((s) => s.questions)

  // Pesos al azar (pero fijos) para las preguntas sin distribución definida.
  // En las Likert, las opciones con mayor puntaje pesan más (respuestas algo favorables).
  const pesosAzar = new Map(preguntas.map((q) => [
    q.code, Object.fromEntries(q.options.map((o) => [
      o.value, 1 + Math.floor(r() * (q.question_type === 'likert' ? 3 : 6)) + (q.configuration.scores?.[o.value] ?? 0) * 2,
    ])),
  ]))

  const desde = Date.UTC(2026, 8, 10)
  const hasta = Date.UTC(2026, 9, 17)
  const prefijo = slug === 'titulados' ? 'T' : 'E'

  return Array.from({ length: TOTAL_DEMO[slug] ?? 50 }, (_, i) => {
    const respuestas: Answers = {}
    for (const q of preguntas) {
      if (!evaluar(q.display_condition, respuestas)) continue
      const v = responder(slug, q, r, respuestas, pesosAzar)
      if (v !== undefined) respuestas[q.code] = v
    }
    return {
      ...respuestas,
      id: `DEMO-${prefijo}-${String(i + 1).padStart(3, '0')}`,
      fecha: new Date(desde + r() * (hasta - desde)).toISOString(),
      origen: 'demo',
    }
  })
}
