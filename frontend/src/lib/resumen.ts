// Datos de la pestaña Resumen del panel.
//
// CONTRATO para conectar con la base de datos: el backend debe devolver un
// `DatosResumen` (GET /admin/resumen/{slug}?filtro=valor...). Mientras tanto,
// `resumenDemo` genera respuestas ficticias y calcula lo mismo en el navegador.

import type { SlugEncuesta } from './admin'

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
  ancho?: boolean
  /** Barras: leyenda de lo que significa `destacado`. */
  leyendaDestacado?: [string, string]
}

export interface DatosResumen {
  total: number
  totalSinFiltros: number
  indicadores: Indicador[]
  graficos: Grafico[]
}

export interface Filtro {
  codigo: string
  etiqueta: string
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

const lider = (datos: Categoria[]) => [...datos].sort((a, b) => b.valor - a.valor)[0]

// ---------------------------------------------------------------- generador ficticio

type Fila = Record<string, string | number | undefined>

/** Generador pseudoaleatorio con semilla: los datos de demo son siempre los mismos. */
function aleatorio(semilla: number) {
  return () => {
    semilla |= 0
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function elegir(r: () => number, pesos: Record<string, number>): string {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0)
  let x = r() * total
  for (const [clave, peso] of Object.entries(pesos)) {
    x -= peso
    if (x <= 0) return clave
  }
  return Object.keys(pesos)[0]
}

function generarTitulados(n: number): Fila[] {
  const r = aleatorio(2026)
  return Array.from({ length: n }, () => {
    const situacion = elegir(r, { trabaja: 80, no_trabaja: 7, emprende: 13 })
    const interes = elegir(r, { si: 72, no: 28 })
    const tuvoTrabajo = situacion !== 'no_trabaja' || r() < 0.6
    return {
      edad: elegir(r, { '19_22': 3, '23_26': 30, '27_30': 30, '31_34': 20, '35_mas': 17 }),
      genero: elegir(r, { hombre: 72, mujer: 28 }),
      situacion_laboral: situacion,
      interes_posgrado: interes,
      area_posgrado: interes === 'si'
        ? elegir(r, { ia: 34, ing_software: 29, redes_seguridad: 17, base_datos: 14, robotica: 6 }) : undefined,
      satisfaccion: Number(elegir(r, { 1: 5, 2: 20, 3: 55, 4: 20 })),
      remuneracion: situacion === 'trabaja'
        ? elegir(r, { menos_2500: 8, '2500_3500': 27, '3501_5000': 40, '5001_7000': 38, '7001_10000': 22, mas_10000: 13 })
        : undefined,
      tiempo_primer_trabajo: tuvoTrabajo
        ? elegir(r, { ya_trabajaba: 32, menos_1_mes: 31, '1_4_meses': 48, '4_8_meses': 37, '8_12_meses': 17, mas_12_meses: 15 })
        : undefined,
    }
  })
}

function generarEmpleadores(n: number): Fila[] {
  const r = aleatorio(1832)
  return Array.from({ length: n }, () => ({
    tipo_organizacion: elegir(r, { privado: 70, publico: 30 }),
    tamano_organizacion: elegir(r, { grande: 35, mediana: 15, pequena: 20, micro: 30 }),
    rubro: elegir(r, {
      desarrollo_software: 40, servicios_ti: 8, telecomunicaciones: 9, sector_publico: 7, startups: 8,
      salud: 6, consultoria: 5, soporte_tecnico: 5, industria: 4, otros: 8,
    }),
    contrataciones_cinco_anios: elegir(r, { si: 79, no: 21 }),
    probabilidad_contratar: elegir(r, { alta: 34, depende_crecimiento: 49, no_prevista: 17 }),
    nivel_formacion: elegir(r, { licenciatura: 70, diplomado: 9, especialidad: 15, maestria: 6 }),
    perfil_01: elegir(r, { totalmente_acuerdo: 50, parcialmente_acuerdo: 38, totalmente_desacuerdo: 8, no_sabe: 4 }),
  }))
}

const DEMO: Record<SlugEncuesta, Fila[]> = {
  titulados: generarTitulados(186),
  empleadores: generarEmpleadores(53),
}

// ---------------------------------------------------------------- filtros

export const FILTROS: Record<SlugEncuesta, Filtro[]> = {
  titulados: [
    { codigo: 'edad', etiqueta: 'Edad', opciones: [
      { valor: '19_22', etiqueta: '19 - 22 años' }, { valor: '23_26', etiqueta: '23 - 26 años' },
      { valor: '27_30', etiqueta: '27 - 30 años' }, { valor: '31_34', etiqueta: '31 - 34 años' },
      { valor: '35_mas', etiqueta: '35 años o más' }] },
    { codigo: 'genero', etiqueta: 'Género', opciones: [
      { valor: 'hombre', etiqueta: 'Hombre' }, { valor: 'mujer', etiqueta: 'Mujer' }] },
    { codigo: 'situacion_laboral', etiqueta: 'Situación laboral', opciones: [
      { valor: 'trabaja', etiqueta: 'Trabaja en una organización' }, { valor: 'no_trabaja', etiqueta: 'No trabaja' },
      { valor: 'emprende', etiqueta: 'Emprendimiento propio' }] },
  ],
  empleadores: [
    { codigo: 'tipo_organizacion', etiqueta: 'Tipo de organización', opciones: [
      { valor: 'publico', etiqueta: 'Público' }, { valor: 'privado', etiqueta: 'Privado' }] },
    { codigo: 'tamano_organizacion', etiqueta: 'Tamaño', opciones: [
      { valor: 'grande', etiqueta: 'Grande (100 o más)' }, { valor: 'mediana', etiqueta: 'Mediana (31 a 99)' },
      { valor: 'pequena', etiqueta: 'Pequeña (11 a 30)' }, { valor: 'micro', etiqueta: 'Micro (hasta 10)' }] },
  ],
}

// ---------------------------------------------------------------- cálculo

function resumenTitulados(f: Fila[], totalSinFiltros: number): DatosResumen {
  const n = f.length
  const ocupados = f.filter((x) => x.situacion_laboral !== 'no_trabaja').length
  const interesados = f.filter((x) => x.interes_posgrado === 'si')
  const satisfaccion = n ? f.reduce((a, x) => a + Number(x.satisfaccion), 0) / n : 0

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
        datos: areas, ancho: true,
        hallazgo: a1 && a1.valor > 0
          ? `${a1.etiqueta} concentra el mayor interés (${fmtPct(pct(a1.valor, interesados.length))} de los interesados), seguida de ${a2.etiqueta}. Es un insumo directo para priorizar la oferta de posgrado.`
          : 'No hay titulados interesados con los filtros elegidos.' },
      { id: 'remuneracion', titulo: 'Remuneración mensual (Bs.)', subtitulo: 'Titulados que trabajan en una organización',
        tipo: 'columnas', datos: destacarMayor(remuneracion), ancho: true,
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

  const probabilidad = contar(f, 'probabilidad_contratar', [
    ['alta', 'Alta probabilidad'], ['depende_crecimiento', 'Depende del crecimiento'], ['no_prevista', 'No prevista']])

  const opinan = f.filter((x) => x.perfil_01 !== 'no_sabe')
  const confian = opinan.filter((x) => x.perfil_01 !== 'totalmente_desacuerdo').length

  // Rubros: los 6 más frecuentes y el resto agrupado en "Otros".
  const rubros = contar(f, 'rubro', [
    ['desarrollo_software', 'Desarrollo de software'], ['telecomunicaciones', 'Telecomunicaciones y redes'],
    ['servicios_ti', 'Servicios de TI'], ['startups', 'Startups'], ['sector_publico', 'Instituciones públicas'],
    ['salud', 'Salud'], ['consultoria', 'Consultoría'], ['soporte_tecnico', 'Soporte técnico'],
    ['industria', 'Industria'], ['otros', 'Otros']]).sort((a, b) => b.valor - a.valor)
  const principales = rubros.filter((r) => r.clave !== 'otros').slice(0, 6)
  const resto = rubros.filter((r) => !principales.includes(r)).reduce((a, r) => a + r.valor, 0)
  const rubrosFinal = destacarMayor([...principales, { clave: 'otros', etiqueta: 'Otros', valor: resto }])

  const nivel = destacarMayor(contar(f, 'nivel_formacion', [
    ['licenciatura', 'Licenciatura'], ['diplomado', 'Diplomado'], ['especialidad', 'Especialidad'], ['maestria', 'Maestría']]))

  const tamano = destacarMayor(contar(f, 'tamano_organizacion', [
    ['grande', 'Grande'], ['mediana', 'Mediana'], ['pequena', 'Pequeña'], ['micro', 'Micro']]))

  const [pAlta, pDepende, pNo] = probabilidad.map((p) => fmtPct(pct(p.valor, n)))

  return {
    total: n,
    totalSinFiltros,
    indicadores: [
      { titulo: 'Total de respuestas', valor: String(n), detalle: 'Organizaciones que respondieron' },
      { titulo: 'Contrataron titulados', valor: fmtPct(pct(contrataron, n)), detalle: 'En los últimos 5 años' },
      { titulo: 'Alta probabilidad de contratar', valor: pAlta, detalle: 'En los próximos años' },
      { titulo: 'Confianza en la Carrera', valor: fmtPct(pct(confian, opinan.length)), detalle: 'Total o parcialmente de acuerdo (sin "No sabe")' },
    ],
    graficos: [
      { id: 'probabilidad', titulo: 'Posibilidad de contratar', subtitulo: 'Ingenieros de Sistemas en los próximos años',
        tipo: 'dona', datos: probabilidad,
        hallazgo: `El ${pAlta} prevé contratar con alta probabilidad y el ${pDepende} según su crecimiento; ${pNo} no lo tiene previsto.` },
      { id: 'rubro', titulo: 'Rubro de las organizaciones', subtitulo: 'Sector principal donde trabajan los titulados',
        tipo: 'barras', datos: rubrosFinal, ancho: true,
        hallazgo: n ? `${lider(rubrosFinal).etiqueta} es el rubro con más empleadores (${fmtPct(pct(lider(rubrosFinal).valor, n))}).` : 'Sin respuestas con los filtros elegidos.' },
      { id: 'nivel', titulo: 'Nivel de formación demandado', subtitulo: 'Para contratar nuevos profesionales del área',
        tipo: 'columnas', datos: nivel, ancho: true,
        hallazgo: n ? `El ${fmtPct(pct(lider(nivel).valor, n))} solicita ${lider(nivel).etiqueta.toLowerCase()}; los posgrados aún son un requisito minoritario.` : 'Sin respuestas con los filtros elegidos.' },
      { id: 'tamano', titulo: 'Tamaño de la organización', subtitulo: 'Cantidad de funcionarios', tipo: 'barras', datos: tamano,
        hallazgo: n ? `Predominan las organizaciones de tamaño ${lider(tamano).etiqueta.toLowerCase()} (${fmtPct(pct(lider(tamano).valor, n))}).` : 'Sin respuestas con los filtros elegidos.' },
    ],
  }
}

/** Resumen calculado sobre los datos ficticios, aplicando los filtros elegidos. */
export function resumenDemo(encuesta: SlugEncuesta, filtros: Record<string, string>): DatosResumen {
  const todas = DEMO[encuesta]
  const filas = todas.filter((x) => Object.entries(filtros).every(([c, v]) => !v || x[c] === v))
  return encuesta === 'titulados'
    ? resumenTitulados(filas, todas.length)
    : resumenEmpleadores(filas, todas.length)
}
