// Pestaña Respuestas: una fila por envío.
//
// Contrato de GET /admin/respuestas/{slug}: `FilaRespuesta[]`, con los valores
// como CÓDIGOS de opción (los mismos de tss_question_options.value); aquí se
// traducen a texto.
// No incluye datos de contacto (tss_submission_contacts).

import type { Survey } from '../types'
import type { SlugEncuesta } from './admin'
import type { Fila } from './demo'

export interface FilaRespuesta {
  id: string
  /** Fecha ISO de envío (tss_submissions.submitted_at). */
  fecha: string
  /** tss_submissions.source: 'public_link' | 'csv_import' | 'demo'. */
  origen: string
  /** Respuestas por código de pregunta (selección múltiple: lista de códigos). */
  valores: Record<string, string | string[] | undefined>
}

export interface Columna {
  codigo: string
  titulo: string
  /** Texto de cada código de opción. */
  etiquetas?: Record<string, string>
  /** Ancho máximo: los textos largos se recortan con "…". */
  recortar?: boolean
}

const SI_NO = { si: 'SI', no: 'NO' }

export const COLUMNAS: Record<SlugEncuesta, Columna[]> = {
  titulados: [
    { codigo: 'edad', titulo: 'Edad', etiquetas: {
      '15_18': '15 - 18 años', '19_22': '19 - 22 años', '23_26': '23 - 26 años', '27_30': '27 - 30 años',
      '31_34': '31 - 34 años', '35_mas': '35 años o más' } },
    { codigo: 'genero', titulo: 'Género', etiquetas: { hombre: 'Hombre', mujer: 'Mujer' } },
    { codigo: 'situacion_laboral', titulo: 'Situación', etiquetas: {
      trabaja: 'Trabaja', no_trabaja: 'No trabaja', emprende: 'Emprende' } },
    { codigo: 'interes_posgrado', titulo: 'Interés posgrado', etiquetas: SI_NO },
    { codigo: 'satisfaccion_carrera', titulo: 'Satisfacción con la carrera' },
  ],
  empleadores: [
    { codigo: 'nombre_empresa', titulo: 'Organización', recortar: true },
    { codigo: 'tipo_organizacion', titulo: 'Tipo', etiquetas: { publico: 'Público', privado: 'Privado' } },
    { codigo: 'tamano_organizacion', titulo: 'Tamaño', etiquetas: {
      grande: 'Grande', mediana: 'Mediana', pequena: 'Pequeña', micro: 'Micro' } },
    { codigo: 'rubro', titulo: 'Rubro', recortar: true, etiquetas: {
      desarrollo_software: 'Desarrollo de software', servicios_ti: 'Servicios de tecnologías de información (TI)',
      telecomunicaciones: 'Telecomunicaciones y redes', soporte_tecnico: 'Soporte técnico y mantenimiento de sistemas',
      consultoria: 'Consultoría en sistemas / transformación digital', banca: 'Banca y servicios financieros',
      sector_publico: 'Instituciones públicas / gobierno', educacion: 'Educación e investigación',
      industria: 'Industria y manufactura', comercio: 'Comercio y comercio electrónico', salud: 'Salud',
      ciberseguridad: 'Seguridad informática / ciberseguridad', datos_bi: 'Análisis de datos / inteligencia de negocios',
      startups: 'Startups o emprendimientos tecnológicos', otros: 'Otros' } },
  ],
}

/** Filtro de la tabla (además de la búsqueda de texto). */
export const FILTRO_TABLA: Record<SlugEncuesta, string> = {
  titulados: 'situacion_laboral',
  empleadores: 'tipo_organizacion',
}

/** Texto de cada opción según el catálogo: {codigo: {valor: etiqueta}}. */
export function etiquetasCatalogo(encuesta: Survey | null): Record<string, Record<string, string>> {
  const mapa: Record<string, Record<string, string>> = {}
  for (const q of encuesta?.sections.flatMap((s) => s.questions) ?? []) {
    mapa[q.code] = Object.fromEntries(q.options.map((o) => [o.value, o.label]))
  }
  return mapa
}

/** Texto que se muestra para un valor: etiqueta propia de la columna, o la del catálogo. */
export function textoCelda(col: Columna, valor: Fila[string], catalogo: Record<string, Record<string, string>> = {}): string {
  if (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0)) return '—'
  const texto = (v: string) => col.etiquetas?.[v] ?? catalogo[col.codigo]?.[v] ?? v
  return Array.isArray(valor) ? valor.map(texto).join(', ') : texto(String(valor))
}

/** Una fila aplanada (ver lib/datos.ts) con la forma de `FilaRespuesta`. */
export function aFilaRespuesta({ id, fecha, origen, ...valores }: Fila): FilaRespuesta {
  return { id: String(id), fecha: String(fecha), origen: String(origen), valores }
}
