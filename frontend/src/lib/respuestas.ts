// Pestaña Respuestas: una fila por envío.
//
// CONTRATO para conectar con la base de datos: GET /admin/respuestas/{slug}
// debe devolver `FilaRespuesta[]`, con los valores como CÓDIGOS de opción
// (los mismos de tss_question_options.value); aquí se traducen a texto.
// No incluye datos de contacto (tss_submission_contacts).

import type { SlugEncuesta } from './admin'
import { filasDemo, type Fila } from './resumen'

export interface FilaRespuesta {
  id: string
  /** Fecha ISO de envío (tss_submissions.submitted_at). */
  fecha: string
  /** tss_submissions.source: 'public_link' | 'csv_import' | 'demo'. */
  origen: string
  /** Respuestas por código de pregunta. */
  valores: Record<string, string | number | undefined>
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
    { codigo: 'satisfaccion', titulo: 'Satisfacción', etiquetas: {
      1: 'Nada satisfecho', 2: 'Poco satisfecho', 3: 'Satisfecho', 4: 'Muy satisfecho' } },
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

export const ORIGENES: Record<string, { texto: string; clase: string }> = {
  public_link: { texto: 'Formulario', clase: 'origen--formulario' },
  csv_import: { texto: 'CSV', clase: 'origen--csv' },
  demo: { texto: 'Demostración', clase: 'origen--demo' },
}

/** Texto que se muestra para un valor de una columna. */
export function textoCelda(col: Columna, valor: string | number | undefined): string {
  if (valor === undefined || valor === null || valor === '') return '—'
  return col.etiquetas?.[String(valor)] ?? String(valor)
}

/** Respuestas ficticias con la forma de `FilaRespuesta`. */
export function respuestasDemo(encuesta: SlugEncuesta): FilaRespuesta[] {
  return filasDemo(encuesta).map(({ id, fecha, origen, ...valores }: Fila) => ({
    id: String(id), fecha: String(fecha), origen: String(origen), valores,
  }))
}
