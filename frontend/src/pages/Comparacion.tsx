import { useMemo, useState } from 'react'
import EstadoDatos from '../components/admin/EstadoDatos'
import { NubeTerminos, Radar } from '../components/graficos/GraficosAvanzados'
import { IconoDescargar, IconoTabla } from '../components/Iconos'
import { useContextoAdmin } from '../lib/admin'
import {
  contarMenciones, DIMENSIONES, indiceEmpleadores, indiceTitulados, lecturaBrecha, semaforo, type Semaforo,
} from '../lib/brechas'
import { useDatosEncuesta } from '../lib/datos'
import { exportarExcel } from '../lib/excel'
import { num } from '../lib/formato'
import { variables } from '../lib/variables'

const SEMAFORO: Record<Semaforo, string> = { alineado: 'Alineado', moderada: 'Brecha moderada', critica: 'Brecha crítica' }

export default function Comparacion() {
  const { origenes } = useContextoAdmin()
  const emp = useDatosEncuesta('empleadores', origenes)
  const tit = useDatosEncuesta('titulados', origenes)
  const [verTablaTerminos, setVerTablaTerminos] = useState(false)

  // Número de pregunta de cada código ("P13"), para citar las fuentes.
  const numeros = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const v of variables(emp.encuesta)) mapa[`e:${v.codigo}`] = `Emp. P${v.numero}`
    for (const v of variables(tit.encuesta)) mapa[`t:${v.codigo}`] = `Tit. P${v.numero}`
    return mapa
  }, [emp.encuesta, tit.encuesta])

  const filas = useMemo(() => DIMENSIONES.map((d) => {
    const e = indiceEmpleadores(emp.filas, d.empleadores.codigo)
    const t = indiceTitulados(tit.filas, d.titulados)
    const brecha = e.valor !== null && t.valor !== null ? e.valor - t.valor : null
    return { d, e, t, brecha }
  }), [emp.filas, tit.filas])

  const terminos = useMemo(() => contarMenciones(emp.filas.flatMap((f) =>
    [f.nuevas_areas, f.nuevas_herramientas].filter((x): x is string => typeof x === 'string' && x.trim() !== ''))), [emp.filas])
  const respuestasAbiertas = emp.filas.filter((f) => f.nuevas_areas || f.nuevas_herramientas).length

  const conBrecha = filas.filter((x) => x.brecha !== null)
  const mayores = [...conBrecha].sort((a, b) => Math.abs(b.brecha!) - Math.abs(a.brecha!)).slice(0, 2)

  const exportar = () => exportarExcel('empleadores-vs-titulados', 'Brechas', [
    ['Dimensión', 'Pregunta empleadores', 'Índice empleadores', 'n', 'Pregunta titulados', 'Índice titulados', 'n', 'Brecha', 'Semáforo', 'Lectura'],
    ...filas.map(({ d, e, t, brecha }) => [
      d.nombre, `${numeros[`e:${d.empleadores.codigo}`] ?? ''} ${d.empleadores.descripcion}`, e.valor === null ? null : Number(e.valor.toFixed(1)), e.n,
      `${numeros[`t:${d.titulados.codigo}`] ?? ''} ${d.titulados.descripcion}`, t.valor === null ? null : Number(t.valor.toFixed(1)), t.n,
      brecha === null ? null : Number(brecha.toFixed(1)), brecha === null ? '' : SEMAFORO[semaforo(brecha)], brecha === null ? '' : lecturaBrecha(brecha),
    ]),
    [],
    ['Término mencionado por empleadores', 'Tipo', 'Respuestas que lo mencionan'],
    ...terminos.map((t) => [t.termino, t.tipo === 'area' ? 'Área de conocimiento' : 'Herramienta', t.menciones]),
  ])

  const cargando = emp.cargando || tit.cargando
  const error = emp.error ?? tit.error

  return (
    <>
      <div className="admin__titulo admin__titulo--acciones">
        <div>
          <h1>Empleadores vs. Titulados</h1>
          <p>Contraste entre la valoración de los empleadores y la percepción de los titulados, normalizadas a un índice de 0 a 100.</p>
        </div>
        <div className="admin__acciones">
          <button type="button" className="boton boton--oscuro" onClick={exportar} disabled={cargando}>
            <IconoDescargar /> Exportar informe
          </button>
        </div>
      </div>

      <EstadoDatos cargando={cargando} error={error} origenes={origenes} total={Math.min(emp.filas.length, tit.filas.length)}>
        <div className="analisis__dos comparacion__arriba">
          <section className="grafico">
            <header className="grafico__cabecera">
              <div><h2>Competencias valoradas vs. satisfacción de titulados</h2><p>{emp.filas.length} empleadores · {tit.filas.length} titulados</p></div>
            </header>
            <div className="grafico__cuerpo">
              <Radar ejes={filas.map((x) => x.d.nombre)} series={[
                { nombre: 'Empleadores', color: 'var(--serie-1)', valores: filas.map((x) => x.e.valor ?? 0) },
                { nombre: 'Titulados', color: 'var(--serie-2)', valores: filas.map((x) => x.t.valor ?? 0), discontinua: true },
              ]} />
            </div>
          </section>

          <section className="grafico">
            <h2 className="analisis__titulo-tarjeta">Lectura rápida</h2>
            <p className="analisis__nota">Las dos brechas más amplias</p>
            {mayores.map(({ d, brecha }) => (
              <div key={d.id} className={`brecha-destacada brecha-destacada--${semaforo(brecha!)}`}>
                <h3>{d.nombre}</h3>
                <strong>{brecha! > 0 ? '+' : ''}{num(brecha!, 0)} pts</strong>
                <p>{lecturaBrecha(brecha!)}</p>
              </div>
            ))}
            <p className="analisis__nota comparacion__metodo">
              Empleadores: Totalmente de acuerdo = 100, Parcialmente = 50, Desacuerdo = 0 («No sabe» se excluye).
              Titulados: escala Likert reescalada a 0–100, o porcentaje que marca el aspecto. Las dimensiones que usan
              selección múltiple comparan un porcentaje con un grado de acuerdo: interprételas con cautela.
            </p>
          </section>
        </div>

        <section className="tabla-panel comparacion__tabla">
          <header className="analisis__cabecera-tabla"><h2>Tabla de brechas</h2></header>
          <div className="tabla-panel__desplazable">
            <table className="tabla-datos tabla-datos--grande">
              <thead>
                <tr><th scope="col">Dimensión</th><th scope="col" className="num">Empleadores</th><th scope="col" className="num">Titulados</th>
                  <th scope="col" className="num">Brecha</th><th scope="col">Semáforo</th><th scope="col">Lectura</th></tr>
              </thead>
              <tbody>
                {filas.map(({ d, e, t, brecha }) => (
                  <tr key={d.id}>
                    <td>
                      <strong className="comparacion__dimension">{d.nombre}</strong>
                      <small className="comparacion__fuentes">
                        {numeros[`e:${d.empleadores.codigo}`]} {d.empleadores.descripcion} · {numeros[`t:${d.titulados.codigo}`]} {d.titulados.descripcion}
                      </small>
                    </td>
                    <td className="num">{e.valor === null ? '—' : num(e.valor)}</td>
                    <td className="num">{t.valor === null ? '—' : num(t.valor)}</td>
                    <td className="num"><strong>{brecha === null ? '—' : `${brecha > 0 ? '+' : ''}${num(brecha)}`}</strong></td>
                    <td>{brecha !== null && <span className={`semaforo semaforo--${semaforo(brecha)}`}>{SEMAFORO[semaforo(brecha)]}</span>}</td>
                    <td className="comparacion__lectura">{brecha === null ? 'Sin datos suficientes.' : lecturaBrecha(brecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="calor__nota">Semáforo: alineado si |brecha| &lt; 10 pts · moderada de 10 a 19 pts · crítica desde 20 pts.</p>
        </section>

        <section className="grafico comparacion__nube">
          <header className="grafico__cabecera">
            <div>
              <h2>Áreas y herramientas emergentes</h2>
              <p>Menciones en las respuestas abiertas 10 y 11 de {respuestasAbiertas} empleadores (texto libre)</p>
            </div>
            <div className="grafico__acciones">
              <button type="button" className="boton-chico" aria-pressed={verTablaTerminos} onClick={() => setVerTablaTerminos((v) => !v)}>
                <IconoTabla /> {verTablaTerminos ? 'Nube' : 'Tabla'}
              </button>
            </div>
          </header>
          <div className="grafico__cuerpo">
            {terminos.length === 0 ? <p className="analisis__nota">Todavía no hay respuestas abiertas.</p>
              : verTablaTerminos ? (
                <table className="tabla-datos">
                  <thead><tr><th>Término</th><th>Tipo</th><th>Respuestas que lo mencionan</th></tr></thead>
                  <tbody>{terminos.map((t) => <tr key={t.termino}><td>{t.termino}</td><td>{t.tipo === 'area' ? 'Área de conocimiento' : 'Herramienta'}</td><td>{t.menciones}</td></tr>)}</tbody>
                </table>
              ) : <NubeTerminos terminos={terminos} />}
          </div>
          <p className="analisis__nota">
            Se cuentan términos de un diccionario (lib/brechas.ts), sin distinguir tildes ni mayúsculas; cada respuesta cuenta una vez por término.
          </p>
        </section>
      </EstadoDatos>
    </>
  )
}
