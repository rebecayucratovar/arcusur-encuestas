// Indicadores y gráficos de la pestaña Resumen, calculados a partir de las
// respuestas (ver lib/datos.ts: hoy ficticias, luego las de la base de datos).

import type { SlugEncuesta } from './admin'
import type { Fila } from './demo'

export interface Categoria {
  clave: string
  etiqueta: string
  valor: number
  /** Resalta la barra (p. ej. la categoría líder). */
  destacado?: boolean
}

export interface Indicador {
  titulo: string
  valor: string
  detalle: string
}

export interface Grafico {
  id: string
  titulo: string
  subtitulo: string
  tipo: 'dona' | 'barras' | 'columnas'
  datos: Categoria[]
  /** Lectura en una frase, para el Comité. */
  hallazgo: string
  /** Ancho de la tarjeta: normal = 1/3, ancho = 2/3, mitad = 1/2 de la fila. */
  tamano?: 'normal' | 'ancho' | 'mitad'
  /** Barras: leyenda de lo que significa `destacado`. */
  leyendaDestacado?: [string, string]
}

export interface DatosResumen {
  /** Cómo se llama cada respuesta en el conteo ("respuestas", "organizaciones"). */
  unidad: string
  total: number
  totalSinFiltros: number
  indicadores: Indicador[]
  graficos: Grafico[]
}

export interface Filtro {
  codigo: string
  etiqueta: string
  /** Texto de la opción sin filtro ("Todas" por defecto). */
  todos?: string
  opciones: { valor: string; etiqueta: string }[]
}

// ---------------------------------------------------------------- utilidades

const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100)
const fmtPct = (n: number) => `${n.toLocaleString('es-BO', { maximumFractionDigits: 0 })}%`
const fmt1 = (n: number) => n.toLocaleString('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function contar(filas: Fila[], codigo: string, opciones: [string, string][]): Categoria[] {
  return opciones.map(([clave, etiqueta]) => ({
    clave, etiqueta, valor: filas.filter((f) => f[codigo] === clave).length,
  }))
}

function destacarMayor(datos: Categoria[]): Categoria[] {
  const max = Math.max(...datos.map((d) => d.valor))
  return datos.map((d) => ({ ...d, destacado: max > 0 && d.valor === max }))
}

/** Escala de acuerdo de titulados (catálogo: configuration.scores). */
const PUNTAJE_ACUERDO: Record<string, number> = {
  totalmente_desacuerdo: 1, en_desacuerdo: 2, de_acuerdo: 3, totalmente_acuerdo: 4,
}

const lider = (datos: Categoria[]) => [...datos].sort((a, b) => b.valor - a.valor)[0]

// ---------------------------------------------------------------- filtros

export const FILTROS: Record<SlugEncuesta, Filtro[]> = {
  titulados: [
    { codigo: 'edad', etiqueta: 'Edad', opciones: [
      { valor: '19_22', etiqueta: '19 - 22 años' }, { valor: '23_26', etiqueta: '23 - 26 años' },
      { valor: '27_30', etiqueta: '27 - 30 años' }, { valor: '31_34', etiqueta: '31 - 34 años' },
      { valor: '35_mas', etiqueta: '35 años o más' }] },
    { codigo: 'genero', etiqueta: 'Género', todos: 'Todos', opciones: [
      { valor: 'hombre', etiqueta: 'Hombre' }, { valor: 'mujer', etiqueta: 'Mujer' }] },
    { codigo: 'situacion_laboral', etiqueta: 'Situación laboral', opciones: [
      { valor: 'trabaja', etiqueta: 'Trabaja en una organización' }, { valor: 'no_trabaja', etiqueta: 'No trabaja' },
      { valor: 'emprende', etiqueta: 'Emprendimiento propio' }] },
  ],
  empleadores: [
    { codigo: 'tipo_organizacion', etiqueta: 'Tipo de organización', todos: 'Todos', opciones: [
      { valor: 'publico', etiqueta: 'Público' }, { valor: 'privado', etiqueta: 'Privado' }] },
    { codigo: 'tamano_organizacion', etiqueta: 'Tamaño', todos: 'Todos', opciones: [
      { valor: 'grande', etiqueta: 'Grande (100 o más)' }, { valor: 'mediana', etiqueta: 'Mediana (31 a 99)' },
      { valor: 'pequena', etiqueta: 'Pequeña (11 a 30)' }, { valor: 'micro', etiqueta: 'Micro (hasta 10)' }] },
  ],
}

// ---------------------------------------------------------------- cálculo

function resumenTitulados(f: Fila[], totalSinFiltros: number): DatosResumen {
  const n = f.length
  const ocupados = f.filter((x) => x.situacion_laboral !== 'no_trabaja').length
  const interesados = f.filter((x) => x.interes_posgrado === 'si')
  const conSatisfaccion = f.filter((x) => PUNTAJE_ACUERDO[String(x.satisfaccion_carrera)])
  const satisfaccion = conSatisfaccion.length
    ? conSatisfaccion.reduce((a, x) => a + PUNTAJE_ACUERDO[String(x.satisfaccion_carrera)], 0) / conSatisfaccion.length
    : 0

  const situacion = contar(f, 'situacion_laboral', [
    ['trabaja', 'Trabaja en una organización'], ['no_trabaja', 'No trabaja actualmente'], ['emprende', 'Emprendimiento propio']])
  const [sTrab, sNo, sEmp] = situacion.map((s) => fmtPct(pct(s.valor, n)))

  const areas = destacarMayor(contar(interesados, 'area_posgrado', [
    ['ia', 'Inteligencia Artificial'], ['ing_software', 'Ing. de Software'], ['redes_seguridad', 'Redes y Seguridad'],
    ['base_datos', 'Base de Datos'], ['robotica', 'Robótica']]).sort((a, b) => b.valor - a.valor))
  const [a1, a2] = areas

  const trabajan = f.filter((x) => x.situacion_laboral === 'trabaja')
  const remuneracion = contar(trabajan, 'remuneracion', [
    ['menos_2500', '< 2.500'], ['2500_3500', '2.500–3.500'], ['3501_5000', '3.501–5.000'],
    ['5001_7000', '5.001–7.000'], ['7001_10000', '7.001–10.000'], ['mas_10000', '> 10.000']])
  const masDe5000 = remuneracion.slice(3).reduce((a, x) => a + x.valor, 0)

  const conTiempo = f.filter((x) => x.tiempo_primer_trabajo)
  const rapidos = new Set(['ya_trabajaba', 'menos_1_mes', '1_4_meses'])
  const tiempo = contar(conTiempo, 'tiempo_primer_trabajo', [
    ['ya_trabajaba', 'Antes de titularse'], ['menos_1_mes', '< 1 mes'], ['1_4_meses', '1–4 meses'],
    ['4_8_meses', '4–8 meses'], ['8_12_meses', '8–12 meses'], ['mas_12_meses', '> 12 meses']])
    .map((t) => ({ ...t, destacado: rapidos.has(t.clave) }))
  const pctRapidos = pct(tiempo.filter((t) => t.destacado).reduce((a, t) => a + t.valor, 0), conTiempo.length)

  return {
    unidad: 'respuestas',
    total: n,
    totalSinFiltros,
    indicadores: [
      { titulo: 'Tasa de empleabilidad', valor: `${fmt1(pct(ocupados, n))}%`, detalle: 'Trabaja en una organización o emprende' },
      { titulo: 'Total de respuestas', valor: String(n), detalle: 'Titulados que completaron la encuesta' },
      { titulo: 'Satisfacción media con la carrera', valor: `${fmt1(satisfaccion)}/4`, detalle: 'Escala de 1 (nada) a 4 (muy satisfecho)' },
      { titulo: 'Interés en posgrado', valor: fmtPct(pct(interesados.length, n)), detalle: 'Respondió SI a la pregunta de interés' },
    ],
    graficos: [
      { id: 'situacion', titulo: 'Situación laboral actual', subtitulo: 'Todos los titulados', tipo: 'dona', datos: situacion,
        hallazgo: `El ${sTrab} trabaja en una organización y el ${sEmp} emprende; ${sNo} no trabaja actualmente.` },
      { id: 'areas', titulo: 'Áreas de posgrado de interés', subtitulo: 'Titulados interesados en un posgrado', tipo: 'barras',
        datos: areas, tamano: 'ancho',
        hallazgo: a1 && a1.valor > 0
          ? `${a1.etiqueta} concentra el mayor interés (${fmtPct(pct(a1.valor, interesados.length))} de los interesados), seguida de ${a2.etiqueta}. Es un insumo directo para priorizar la oferta de posgrado.`
          : 'No hay titulados interesados con los filtros elegidos.' },
      { id: 'remuneracion', titulo: 'Remuneración mensual (Bs.)', subtitulo: 'Titulados que trabajan en una organización',
        tipo: 'columnas', datos: destacarMayor(remuneracion), tamano: 'ancho',
        hallazgo: trabajan.length
          ? `El rango más frecuente es Bs. ${lider(remuneracion).etiqueta}; el ${fmtPct(pct(masDe5000, trabajan.length))} percibe más de Bs. 5.000 mensuales.`
          : 'No hay titulados que trabajen en una organización con los filtros elegidos.' },
      { id: 'tiempo', titulo: 'Tiempo para el primer empleo', subtitulo: 'Empleo relacionado con la formación', tipo: 'barras',
        datos: tiempo, leyendaDestacado: ['Menos de 4 meses', '4 meses o más'],
        hallazgo: `El ${fmtPct(pctRapidos)} consiguió empleo afín en menos de 4 meses o ya trabajaba antes de titularse.` },
    ],
  }
}

function resumenEmpleadores(f: Fila[], totalSinFiltros: number): DatosResumen {
  const n = f.length
  const contrataron = f.filter((x) => x.contrataciones_cinco_anios === 'si').length
  const confianTotal = f.filter((x) => x.perfil_01 === 'totalmente_acuerdo').length

  const tamano = contar(f, 'tamano_organizacion', [
    ['grande', 'Grande'], ['mediana', 'Mediana'], ['pequena', 'Pequeña'], ['micro', 'Micro']])
  const tamanoLider = lider(tamano)

  // Los siete rubros más frecuentes (sin resaltar: es una sola serie).
  const rubros = contar(f, 'rubro', [
    ['desarrollo_software', 'Desarrollo de software'], ['servicios_ti', 'Servicios de TI'],
    ['telecomunicaciones', 'Telecomunicaciones y redes'], ['soporte_tecnico', 'Soporte técnico y mantenimiento'],
    ['consultoria', 'Consultoría / transformación digital'], ['banca', 'Banca y servicios financieros'],
    ['sector_publico', 'Instituciones públicas / gobierno'], ['educacion', 'Educación e investigación'],
    ['industria', 'Industria y manufactura'], ['comercio', 'Comercio y comercio electrónico'], ['salud', 'Salud'],
    ['ciberseguridad', 'Seguridad informática'], ['datos_bi', 'Análisis de datos / BI'],
    ['startups', 'Startups o emprendimientos'], ['otros', 'Otros']])
    .sort((a, b) => b.valor - a.valor).slice(0, 7)

  // "destacado" = prevé contratar (alta o según crecimiento).
  const perspectiva = contar(f, 'probabilidad_contratar', [
    ['alta', 'Alta probabilidad'], ['depende_crecimiento', 'Según crecimiento'],
    ['no_prevista', 'No prevista'], ['no_requiere', 'No requiere']])
    .map((p) => ({ ...p, destacado: p.clave === 'alta' || p.clave === 'depende_crecimiento' }))
  const preven = perspectiva.filter((p) => p.destacado).reduce((a, p) => a + p.valor, 0)

  const nivel = destacarMayor(contar(f, 'nivel_formacion', [
    ['licenciatura', 'Licenciatura'], ['diplomado', 'Diplomado'], ['especialidad', 'Especialidad'],
    ['maestria', 'Maestría'], ['doctorado', 'Doctorado'], ['posdoctorado', 'Post-doctorado']]))
  const soloLicenciatura = nivel[0].valor

  return {
    unidad: 'organizaciones',
    total: n,
    totalSinFiltros,
    indicadores: [
      { titulo: 'Prevé contratar Ing. de Sistemas', valor: fmtPct(pct(preven, n)), detalle: 'Alta probabilidad o según crecimiento (P6)' },
      { titulo: 'Organizaciones encuestadas', valor: String(n), detalle: 'Empleadores que respondieron' },
      { titulo: 'Contrató en los últimos 5 años', valor: fmtPct(pct(contrataron, n)), detalle: 'Respondió SI a la pregunta 5' },
      { titulo: 'Confianza institucional', valor: fmtPct(pct(confianTotal, n)), detalle: 'Totalmente de acuerdo: la Carrera brinda confianza' },
    ],
    graficos: [
      { id: 'tamano', titulo: 'Tamaño de la organización', subtitulo: 'Cantidad de funcionarios (P3)', tipo: 'dona', datos: tamano,
        hallazgo: `Las organizaciones de tamaño ${tamanoLider.etiqueta.toLowerCase()} representan el ${fmtPct(pct(tamanoLider.valor, n))} de la muestra de empleadores.` },
      { id: 'rubro', titulo: 'Rubro principal de la organización', subtitulo: 'Siete rubros más frecuentes (P4)', tipo: 'barras',
        datos: rubros, tamano: 'ancho',
        hallazgo: `${rubros[0].etiqueta} es el rubro con más empleadores encuestados (${rubros[0].valor}).` },
      { id: 'perspectiva', titulo: 'Perspectiva de contratación', subtitulo: 'Próximos años (P6)', tipo: 'barras',
        datos: perspectiva, tamano: 'mitad', leyendaDestacado: ['Prevé contratar', 'No prevé'],
        hallazgo: `El ${fmtPct(pct(preven, n))} de los empleadores prevé incorporar Ingenieros de Sistemas, de forma segura o condicionada al crecimiento.` },
      { id: 'nivel', titulo: 'Nivel de formación demandado', subtitulo: 'Para contratar nuevos profesionales (P7)', tipo: 'columnas',
        datos: nivel, tamano: 'mitad',
        hallazgo: `La licenciatura basta para el ${fmtPct(pct(soloLicenciatura, n))}; un ${fmtPct(pct(n - soloLicenciatura, n))} demanda alguna formación de posgrado.` },
    ],
  }
}

/** Resumen de `todas` las respuestas (ya filtradas por origen), aplicando los filtros elegidos. */
export function calcularResumen(encuesta: SlugEncuesta, todas: Fila[], filtros: Record<string, string>): DatosResumen {
  const filas = todas.filter((x) => Object.entries(filtros).every(([c, v]) => !v || x[c] === v))
  return encuesta === 'titulados'
    ? resumenTitulados(filas, todas.length)
    : resumenEmpleadores(filas, todas.length)
}
