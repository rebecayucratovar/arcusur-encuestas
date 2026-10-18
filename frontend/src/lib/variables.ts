// Variables analizables de una encuesta, tomadas de su catálogo real.

import type { Option, QuestionType, Survey } from '../types'
import type { Fila } from './demo'

export interface Variable {
  codigo: string
  /** Número de pregunta en el orden del formulario (sin contactos ni campos "Otro"). */
  numero: number
  nombre: string
  /** "P14 · Situación laboral" */
  etiqueta: string
  enunciado: string
  tipo: QuestionType
  opciones: Option[]
  /** Puntaje de cada opción en las Likert (las opciones sin puntaje, como "No sabe", no cuentan). */
  puntajes?: Record<string, number>
  multiple: boolean
  numerica: boolean
}

// Nombres cortos para listas y tablas (el enunciado completo se ve como ayuda).
const NOMBRES: Record<string, string> = {
  // titulados
  edad: 'Edad', genero: 'Género', formacion: 'Formación complementaria', nivel_formacion: 'Nivel del programa cursado',
  donde_programa: 'Institución del programa', financiamiento: 'Financiamiento del programa',
  interes_posgrado: 'Interés en posgrado', area_posgrado: 'Área de posgrado de interés',
  organizacion_posgrado: 'Institución preferida para posgrado', opinion_posgrado_fcyt: 'Posgrado FCyT afín a Sistemas',
  anios_profesional: 'Años de vida profesional', anios_desempleado: 'Años desempleado',
  situacion_laboral: 'Situación laboral', rubro_trabajo: 'Rubro de la organización', pertinencia_trabajo: 'Pertinencia del trabajo',
  sector_trabajo: 'Sector', departamento_trabajo: 'Departamento', area_trabajo: 'Área de trabajo', cargo_trabajo: 'Cargo',
  antiguedad_trabajo: 'Antigüedad en el trabajo', medio_obtencion: 'Medio de obtención del empleo',
  remuneracion: 'Remuneración mensual', razon_no_trabaja: 'Razón de no trabajar', trabajo_antes: 'Trabajó antes',
  origen_emprendimiento: 'Origen del emprendimiento', entregable_negocio: 'Entregable del negocio',
  financiamiento_negocio: 'Financiamiento del negocio', satisfaccion_negocio: 'Satisfacción con el negocio',
  importancia_formacion_negocio: 'Formación útil para el negocio', primer_empleo: 'Es su primer empleo',
  tiempo_primer_trabajo: 'Tiempo al primer empleo', numero_empleos: 'Número de empleos',
  satisfaccion_carrera: 'Satisfacción con la carrera', concordancia_formacion: 'Concordancia formación–requerimientos',
  aspectos_utiles: 'Aspectos útiles de la carrera', aspectos_mejorar: 'Aspectos a mejorar',
  asignaturas_ventaja: 'Asignaturas con ventaja competitiva', asignaturas_no_utiles: 'Asignaturas poco útiles',
  interes_red: 'Interés en la red de contactos',
  // empleadores
  tipo_organizacion: 'Tipo de organización', tamano_organizacion: 'Tamaño de la organización', rubro: 'Rubro',
  contrataciones_cinco_anios: 'Contrató en los últimos 5 años', probabilidad_contratar: 'Probabilidad de contratación',
  medio_convocatoria: 'Medio de convocatoria', cargos: 'Cargos que desempeñan',
  perfil_01: 'Confianza en la Carrera', perfil_02: 'Título consistente con competencias',
  perfil_03: 'Consulta regular a empleadores', perfil_04: 'Conoce el perfil de egreso',
  perfil_05: 'Perfil coherente con el desempeño', perfil_06: 'Formación para un desempeño destacado',
  perfil_07: 'Incorpora necesidades del sector', perfil_08: 'Competencias laborales evidentes',
  perfil_09: 'Valores y ética profesional', perfil_10: 'Participó en retroalimentación',
  relacion_01: 'Vínculos con organizaciones', relacion_02: 'Participó en vinculación',
  relacion_03: 'Participó en difusión de oportunidades', relacion_04: 'Vinculación entre profesionales',
  relacion_05: 'Consultado sobre el desempeño', relacion_06: 'Consultado sobre la pertinencia',
  relacion_07: 'Recurre a la UMSS por talento', relacion_08: 'Consultado en la autoevaluación',
}

const recortar = (s: string, n = 48) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Todas las variables con opciones o numéricas, en el orden del formulario. */
export function variables(encuesta: Survey | null): Variable[] {
  const lista: Variable[] = []
  let numero = 0
  for (const q of encuesta?.sections.flatMap((s) => s.questions) ?? []) {
    if (q.configuration.store === 'contact' || q.configuration.other_for) continue
    numero++
    const numerica = q.configuration.input === 'integer'
    if (!q.options.length && !numerica) continue // textos libres: no se tabulan
    const nombre = NOMBRES[q.code] ?? recortar(q.prompt.replace(/^\d+\)\s*/, ''))
    lista.push({
      codigo: q.code, numero, nombre, etiqueta: `P${numero} · ${nombre}`, enunciado: q.prompt,
      tipo: q.question_type, opciones: q.options, puntajes: q.configuration.scores,
      multiple: q.question_type === 'multiple_choice', numerica,
    })
  }
  return lista
}

/** Variables categóricas de una sola respuesta (sirven para cruzar y para chi-cuadrada). */
export const categoricas = (vs: Variable[]) => vs.filter((v) => v.opciones.length > 0 && !v.multiple)

/** Valores elegidos por una fila en una variable (lista vacía si no respondió). */
export function valoresDe(fila: Fila, codigo: string): string[] {
  const v = fila[codigo]
  if (v === undefined || v === '') return []
  return Array.isArray(v) ? v : [String(v)]
}

export interface TablaCruzada {
  filas: Option[]
  columnas: Option[]
  /** Frecuencias observadas [fila][columna]. */
  matriz: number[][]
  totalFila: number[]
  totalColumna: number[]
  /** Personas que respondieron ambas preguntas. */
  n: number
}

/** Cruce de dos variables categóricas (solo quienes respondieron ambas). */
export function tablaCruzada(datos: Fila[], vf: Variable, vc: Variable): TablaCruzada {
  const matriz = vf.opciones.map(() => vc.opciones.map(() => 0))
  let n = 0
  for (const f of datos) {
    const i = vf.opciones.findIndex((o) => o.value === f[vf.codigo])
    const j = vc.opciones.findIndex((o) => o.value === f[vc.codigo])
    if (i < 0 || j < 0) continue
    matriz[i][j]++
    n++
  }
  return {
    filas: vf.opciones, columnas: vc.opciones, matriz, n,
    totalFila: matriz.map((fila) => fila.reduce((a, x) => a + x, 0)),
    totalColumna: vc.opciones.map((_, j) => matriz.reduce((a, fila) => a + fila[j], 0)),
  }
}
