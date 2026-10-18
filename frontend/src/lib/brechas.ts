// Comparación empleadores vs. titulados (pestaña "Empleadores vs. Titulados").
//
// Cada dimensión enfrenta una pregunta de empleadores con una de titulados,
// llevadas a un índice común de 0 a 100:
//   - Empleadores (Totalmente / Parcialmente de acuerdo / Totalmente desacuerdo):
//     100 / 50 / 0; "No sabe" se excluye.
//   - Titulados, escala Likert 1–4: (puntaje − 1) / 3 × 100.
//   - Titulados, selección múltiple: % que marcó la opción (o 100 − % si marcarla
//     significa una carencia, como "Mayor relacionamiento con empresas" en aspectos a mejorar).

import type { Fila } from './demo'
import { valoresDe } from './variables'

type FuenteTitulados =
  | { codigo: string; tipo: 'likert' }
  | { codigo: string; tipo: 'marca' | 'marca-inversa'; opcion: string }

export interface Dimension {
  id: string
  nombre: string
  empleadores: { codigo: string; descripcion: string }
  titulados: FuenteTitulados & { descripcion: string }
}

export const DIMENSIONES: Dimension[] = [
  { id: 'confianza', nombre: 'Confianza y satisfacción global',
    empleadores: { codigo: 'perfil_01', descripcion: 'Confianza en la Carrera' },
    titulados: { codigo: 'satisfaccion_carrera', tipo: 'likert', descripcion: 'Satisfacción con la carrera' } },
  { id: 'coherencia', nombre: 'Coherencia perfil–mercado',
    empleadores: { codigo: 'perfil_05', descripcion: 'Perfil coherente con el desempeño' },
    titulados: { codigo: 'concordancia_formacion', tipo: 'likert', descripcion: 'Concordancia formación–requerimientos' } },
  { id: 'desempeno', nombre: 'Desempeño y pertinencia',
    empleadores: { codigo: 'perfil_06', descripcion: 'Formación para un desempeño destacado' },
    titulados: { codigo: 'pertinencia_trabajo', tipo: 'likert', descripcion: 'Pertinencia del trabajo' } },
  { id: 'transversales', nombre: 'Competencias transversales',
    empleadores: { codigo: 'perfil_08', descripcion: 'Competencias laborales evidentes' },
    titulados: { codigo: 'aspectos_utiles', tipo: 'marca', opcion: 'habilidades_analiticas', descripcion: 'Habilidades analíticas útiles' } },
  { id: 'practica', nombre: 'Formación práctica',
    empleadores: { codigo: 'perfil_07', descripcion: 'Incorpora necesidades del sector (prácticas, pasantías)' },
    titulados: { codigo: 'aspectos_utiles', tipo: 'marca', opcion: 'pasantias', descripcion: 'Pasantías útiles' } },
  { id: 'vinculacion', nombre: 'Vinculación con empresas',
    empleadores: { codigo: 'relacion_01', descripcion: 'Vínculos con organizaciones' },
    titulados: { codigo: 'aspectos_mejorar', tipo: 'marca-inversa', opcion: 'relacion_empresas', descripcion: 'Relacionamiento con empresas (inverso)' } },
]

const PUNTAJE_EMPLEADOR: Record<string, number> = { totalmente_acuerdo: 100, parcialmente_acuerdo: 50, totalmente_desacuerdo: 0 }
const PUNTAJE_TITULADO: Record<string, number> = { totalmente_desacuerdo: 1, en_desacuerdo: 2, de_acuerdo: 3, totalmente_acuerdo: 4 }

export interface Indice { valor: number | null; n: number }

function promedio(xs: number[]): Indice {
  return { valor: xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null, n: xs.length }
}

export function indiceEmpleadores(filas: Fila[], codigo: string): Indice {
  return promedio(filas.map((f) => PUNTAJE_EMPLEADOR[String(f[codigo])]).filter((x) => x !== undefined))
}

export function indiceTitulados(filas: Fila[], fuente: FuenteTitulados): Indice {
  if (fuente.tipo === 'likert') {
    return promedio(filas.map((f) => PUNTAJE_TITULADO[String(f[fuente.codigo])]).filter((x) => x !== undefined)
      .map((s) => ((s - 1) / 3) * 100))
  }
  const respondieron = filas.filter((f) => valoresDe(f, fuente.codigo).length > 0)
  const marcaron = respondieron.filter((f) => valoresDe(f, fuente.codigo).includes(fuente.opcion)).length
  const porcentaje = respondieron.length ? (marcaron / respondieron.length) * 100 : null
  return {
    valor: porcentaje === null ? null : fuente.tipo === 'marca-inversa' ? 100 - porcentaje : porcentaje,
    n: respondieron.length,
  }
}

export type Semaforo = 'alineado' | 'moderada' | 'critica'

/** |brecha| < 10 alineado · 10–19 moderada · ≥ 20 crítica. */
export function semaforo(brecha: number): Semaforo {
  const a = Math.abs(brecha)
  return a < 10 ? 'alineado' : a < 20 ? 'moderada' : 'critica'
}

export function lecturaBrecha(brecha: number): string {
  if (brecha >= 10) return 'Empleadores valoran más que los propios titulados.'
  if (brecha <= -10) return 'Titulados valoran más de lo que perciben los empleadores.'
  return 'Percepciones coherentes entre ambos grupos.'
}

// ---------------------------------------------------------------- menciones en texto libre

export interface DefTermino { termino: string; tipo: 'area' | 'herramienta'; patron: RegExp }

/** Términos que se buscan en las respuestas 10 y 11 de empleadores (sin tildes, en minúsculas). */
export const TERMINOS: DefTermino[] = [
  { termino: 'Inteligencia artificial', tipo: 'area', patron: /\b(ia|ai|inteligencia artificial|inteligente artificial)\b/ },
  { termino: 'IA generativa', tipo: 'area', patron: /\b(generativa|llms?|prompts?|chatgpt)\b/ },
  { termino: 'Agentes de IA', tipo: 'area', patron: /\bagent(es|ic[oa]s?|ica)\b/ },
  { termino: 'Machine learning', tipo: 'area', patron: /\b(machine learning|maching learning|aprendizaje automatico|ml|mlops|deep learning)\b/ },
  { termino: 'Ciberseguridad', tipo: 'area', patron: /\b(ciber ?seguridad|seguridad (informatica|de (la )?informacion|de sistemas)|devsecops)\b/ },
  { termino: 'Computación en la nube', tipo: 'area', patron: /\b(nube|cloud|serverless)\b/ },
  { termino: 'Análisis de datos', tipo: 'area', patron: /\b(analisis de datos|analitica de datos|business intelligence|inteligencia de negocios)\b/ },
  { termino: 'Ciencia de datos', tipo: 'area', patron: /\b(ciencia de datos|data science|ingenier(ia|os) de datos|big data|data warehouse)\b/ },
  { termino: 'Internet de las cosas', tipo: 'area', patron: /\b(iot|internet de las cosas)\b/ },
  { termino: 'Automatización', tipo: 'area', patron: /\bautomatiza(cion|ciones|r)\b/ },
  { termino: 'DevOps', tipo: 'area', patron: /\b(devops|ci\/cd)\b/ },
  { termino: 'Desarrollo móvil', tipo: 'area', patron: /\b(movil(es)?|apps? moviles|programacion movil)\b/ },
  { termino: 'Arquitectura de software', tipo: 'area', patron: /\b(arquitectura de software|microservicios|sistemas distribuidos)\b/ },
  { termino: 'Blockchain', tipo: 'area', patron: /\b(blockchain|solidity)\b/ },
  { termino: 'Transformación digital', tipo: 'area', patron: /\btransformacion digital\b/ },
  { termino: 'Python', tipo: 'herramienta', patron: /\b(python|phyton|pandas|numpy)\b/ },
  { termino: 'Git / GitHub', tipo: 'herramienta', patron: /\bgit(hub|lab)?\b/ },
  { termino: 'Docker', tipo: 'herramienta', patron: /\b(docker|contenedores)\b/ },
  { termino: 'Kubernetes', tipo: 'herramienta', patron: /\bkubernetes\b/ },
  { termino: 'AWS', tipo: 'herramienta', patron: /\baws\b/ },
  { termino: 'Azure', tipo: 'herramienta', patron: /\bazure\b/ },
  { termino: 'Google Cloud', tipo: 'herramienta', patron: /\b(google cloud|gcp)\b/ },
  { termino: 'Power BI', tipo: 'herramienta', patron: /\bpower ?bi\b/ },
  { termino: 'SQL / bases de datos', tipo: 'herramienta', patron: /\b(sql|postgresql|postgres|mysql|oracle|sql server)\b/ },
  { termino: 'Linux', tipo: 'herramienta', patron: /\blinux\b/ },
  { termino: 'Jira / Trello', tipo: 'herramienta', patron: /\b(jira|trello|clickup)\b/ },
  { termino: 'React', tipo: 'herramienta', patron: /\breact\b/ },
  { termino: 'Node.js', tipo: 'herramienta', patron: /\bnode(\.?js)?\b/ },
  { termino: 'Java / Kotlin', tipo: 'herramienta', patron: /\b(java|kotlin|spring)\b/ },
  { termino: 'Flutter', tipo: 'herramienta', patron: /\bflutter\b/ },
  { termino: 'Claude / asistentes de código', tipo: 'herramienta', patron: /\b(claude|copilot|codex|antigravity|kiro|cursor)\b/ },
  { termino: 'TensorFlow', tipo: 'herramienta', patron: /\btensorflow\b/ },
  { termino: 'Postman', tipo: 'herramienta', patron: /\bpostman\b/ },
  { termino: 'Grafana', tipo: 'herramienta', patron: /\bgrafana\b/ },
  { termino: 'Terraform', tipo: 'herramienta', patron: /\bterraform\b/ },
]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Cuántas respuestas mencionan cada término (cada respuesta cuenta una vez por término). */
export function contarMenciones(textos: string[]): { termino: string; tipo: 'area' | 'herramienta'; menciones: number }[] {
  const normalizados = textos.map(normalizar)
  return TERMINOS
    .map((t) => ({ termino: t.termino, tipo: t.tipo, menciones: normalizados.filter((x) => t.patron.test(x)).length }))
    .filter((t) => t.menciones > 0)
    .sort((a, b) => b.menciones - a.menciones)
}
