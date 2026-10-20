import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import EstadoDatos from '../components/admin/EstadoDatos'
import { ColumnasAgrupadas, Lineas } from '../components/graficos/GraficosAvanzados'
import { IconoCerrar, IconoIdea } from '../components/Iconos'
import { useContextoAdmin } from '../lib/admin'
import { useDatosEncuesta } from '../lib/datos'
import {
  borrarEscenario, guardarEscenario, lecturaCobertura, listarEscenarios, PRESETS, simular, SUPUESTOS,
  type EscenarioGuardado, type Parametros,
} from '../lib/escenarios'
import { num, pct } from '../lib/formato'
import { useSesion } from '../lib/sesion'

const MAXIMO_COMPARADOS = 3
const LETRAS = 'ABC'

function Deslizador({ etiqueta, ayuda, valor, max, onChange }: {
  etiqueta: string; ayuda: string; valor: number; max: number; onChange: (v: number) => void
}) {
  const id = `deslizador-${etiqueta.replace(/\W+/g, '-')}`
  return (
    <div className="deslizador">
      <div className="deslizador__cabecera">
        <label htmlFor={id}>{etiqueta}</label>
        <output htmlFor={id}>{valor}%</output>
      </div>
      <p>{ayuda}</p>
      <input id={id} type="range" min={0} max={max} step={5} value={valor}
        style={{ '--avance': `${(valor / max) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))} />
      <div className="deslizador__limites"><span>0%</span><span>{max}%</span></div>
    </div>
  )
}

export default function Escenarios() {
  const { origenes } = useContextoAdmin()
  const { token } = useSesion()
  const datos = useDatosEncuesta('titulados', origenes)

  const [presetId, setPresetId] = useState('becas')
  const [p, setP] = useState<Parametros>(PRESETS[1].p)
  const resultado = useMemo(() => simular(datos.encuesta, datos.filas, p), [datos.encuesta, datos.filas, p])

  const [guardados, setGuardados] = useState<EscenarioGuardado[]>([])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!token) return
    listarEscenarios(token).then(setGuardados).catch((e: Error) => setMensaje(e.message))
  }, [token])

  const cambiar = (campo: keyof Parametros, valor: number) => {
    setP((x) => ({ ...x, [campo]: valor }))
    setPresetId('personalizado')
  }
  const elegirPreset = (id: string) => {
    setPresetId(id)
    const preset = PRESETS.find((x) => x.id === id)
    if (preset) setP(preset.p)
  }

  const nombreActual = PRESETS.find((x) => x.id === presetId)?.nombre ?? 'Personalizado'
  const comparados = guardados.slice(0, MAXIMO_COMPARADOS).reverse() // del más antiguo al más reciente

  const guardar = async () => {
    if (!token) return
    setGuardando(true)
    setMensaje(null)
    try {
      const nuevo = await guardarEscenario(token, nombreActual, p, resultado, origenes)
      setGuardados((g) => [nuevo, ...g])
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar el escenario.')
    } finally {
      setGuardando(false)
    }
  }
  const quitar = async (id: string) => {
    if (!token) return
    try {
      await borrarEscenario(token, id)
      setGuardados((g) => g.filter((x) => x.id !== id))
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo borrar el escenario.')
    }
  }

  const r = resultado
  const subio = r.variacion >= 0

  return (
    <>
      <div className="admin__titulo">
        <h1>Escenarios</h1>
        <p>
          Simule políticas de posgrado y observe su efecto proyectado sobre la demanda de los titulados. La línea base
          proviene de las respuestas sobre formación complementaria, interés en posgrado, área e institución preferida.
        </p>
      </div>

      <EstadoDatos cargando={datos.cargando} error={datos.error} origenes={origenes} total={datos.filas.length}>
        <div className="escenarios">
          <aside className="escenarios__controles">
            <label className="filtros__campo">
              <span>Escenario</span>
              <select className="campo campo--select" value={presetId} onChange={(e) => elegirPreset(e.target.value)}>
                {PRESETS.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                <option value="personalizado">Personalizado</option>
              </select>
            </label>
            <Deslizador etiqueta="% de titulados sin posgrado que obtiene beca" max={100} valor={p.beca}
              ayuda={`Aplica a ${r.sinInteres} titulados sin posgrado ni interés declarado`} onChange={(v) => cambiar('beca', v)} />
            <Deslizador etiqueta="% de crecimiento de interés en IA" max={100} valor={p.crecimientoIA}
              ayuda="Incremento adicional sobre el área de Inteligencia Artificial" onChange={(v) => cambiar('crecimientoIA', v)} />
            <Deslizador etiqueta="Aumento de plazas de posgrado FCyT" max={150} valor={p.aumentoPlazas}
              ayuda={`Sobre una referencia de ${SUPUESTOS.plazasReferencia} plazas anuales en programas afines`} onChange={(v) => cambiar('aumentoPlazas', v)} />
            <div className="escenarios__botones">
              <button type="button" className="boton" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar escenario'}
              </button>
              <button type="button" className="boton boton--secundario" onClick={() => elegirPreset('base')}>Restablecer</button>
            </div>
            {mensaje && <p className="pregunta__error" role="alert">{mensaje}</p>}
          </aside>

          <div className="escenarios__resultados">
            <div className="kpis">
              <div className="kpi kpi--destacado">
                <span>Variación de la demanda total</span>
                <strong>{subio ? '+' : ''}{num(r.variacion)}%</strong>
                <small>{num(r.totalBase, 0)} → {num(r.totalEscenario)} titulados interesados</small>
              </div>
              <div className="kpi">
                <span>Cobertura de plazas FCyT</span>
                <strong>{r.coberturaEscenario === null ? '—' : pct(r.coberturaEscenario, 0)}</strong>
                <small>
                  Base: {r.coberturaBase === null ? '—' : pct(r.coberturaBase, 0)} · {num(r.plazasEscenario, 0)} plazas para{' '}
                  {num(r.demandaFcytEscenario)} interesados que prefieren la FCyT
                </small>
              </div>
              <div className="kpi">
                <span>Área con mayor demanda</span>
                <strong className="kpi__texto">{r.areaLider?.etiqueta ?? '—'}</strong>
                <small>Preferencia por la FCyT: {pct(r.preferenciaFcyt * 100, 0)} de los interesados</small>
              </div>
            </div>

            <section className="grafico">
              <header className="grafico__cabecera"><div><h2>Demanda proyectada por área</h2><p>Titulados interesados · línea base vs. escenario</p></div></header>
              <div className="grafico__cuerpo">
                <ColumnasAgrupadas categorias={r.areas.map((a) => a.etiqueta)} decimales={1} series={[
                  { nombre: 'Línea base', color: 'var(--serie-1)', valores: r.areas.map((a) => a.base) },
                  { nombre: 'Escenario', color: 'var(--serie-2)', valores: r.areas.map((a) => a.escenario) },
                ]} />
              </div>
            </section>

            <section className="grafico">
              <header className="grafico__cabecera">
                <div>
                  <h2>Línea base vs. escenario, {SUPUESTOS.anios[0]}–{SUPUESTOS.anios[SUPUESTOS.anios.length - 1]}</h2>
                  <p>Crecimiento vegetativo de {num(SUPUESTOS.crecimientoAnual * 100, 0)}% anual; el efecto del escenario se incorpora gradualmente</p>
                </div>
              </header>
              <div className="grafico__cuerpo">
                <Lineas etiquetas={r.proyeccion.map((x) => x.anio)} series={[
                  { nombre: 'Línea base', color: 'var(--serie-1)', valores: r.proyeccion.map((x) => x.base), discontinua: true },
                  { nombre: 'Escenario', color: 'var(--serie-2)', valores: r.proyeccion.map((x) => x.escenario) },
                ]} />
              </div>
            </section>

            <section className="grafico escenarios__lectura">
              <h2 className="analisis__titulo-tarjeta"><IconoIdea /> Interpretación para la toma de decisiones</h2>
              <p className="analisis__texto">
                Con estos supuestos, la demanda de posgrado {subio ? 'crecería' : 'variaría'} un {num(Math.abs(r.variacion))}%
                respecto a la línea base, liderada por {r.areaLider?.etiqueta ?? '—'}.
                {p.beca > 0 && ` Las becas activarían a unos ${num(r.nuevosPorBecas)} titulados que hoy no planean estudiar.`}
                {' '}La cobertura de plazas de la FCyT ({r.coberturaEscenario === null ? '—' : pct(r.coberturaEscenario, 0)}) {lecturaCobertura(r.coberturaEscenario)}.
              </p>
              <p className="analisis__nota">
                Modelo simplificado sobre {r.n} respuestas de los orígenes elegidos: las becas reparten la nueva demanda según las
                preferencias actuales por área, y la proporción que prefiere la FCyT se mantiene constante.
              </p>
            </section>
          </div>
        </div>

        <section className="tabla-panel escenarios__comparacion">
          <header className="analisis__cabecera-tabla analisis__cabecera-tabla--fila">
            <h2>Comparación de escenarios guardados</h2>
            <span>{comparados.length}/{MAXIMO_COMPARADOS} escenarios{guardados.length > MAXIMO_COMPARADOS && ` (se muestran los ${MAXIMO_COMPARADOS} más recientes)`}</span>
          </header>
          {comparados.length === 0 ? (
            <p className="analisis__nota escenarios__vacio">Guarde un escenario para compararlo con otros. Se guardan en la base de datos y los ve todo el Comité.</p>
          ) : (
            <div className="tabla-panel__desplazable">
              <table className="tabla-datos tabla-datos--grande">
                <thead>
                  <tr>
                    <th scope="col">Indicador</th>
                    {comparados.map((g, i) => (
                      <th key={g.id} scope="col">
                        <span className="escenarios__titulo-col">
                          Escenario {LETRAS[i]} · {g.title}
                          <button type="button" className="escenarios__quitar" aria-label={`Borrar escenario ${LETRAS[i]}`} onClick={() => quitar(g.id)}><IconoCerrar /></button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Titulados sin posgrado con beca</td>{comparados.map((g) => <td key={g.id}>{g.parameters.beca}%</td>)}</tr>
                  <tr><td>Crecimiento de interés en IA</td>{comparados.map((g) => <td key={g.id}>{g.parameters.crecimientoIA}%</td>)}</tr>
                  <tr><td>Aumento de plazas FCyT</td>{comparados.map((g) => <td key={g.id}>{g.parameters.aumentoPlazas}%</td>)}</tr>
                  <tr><td>Demanda total proyectada</td>{comparados.map((g) => <td key={g.id}><strong>{num(g.results.totalEscenario)}</strong></td>)}</tr>
                  <tr><td>Variación vs. línea base</td>{comparados.map((g) => <td key={g.id}><strong>{g.results.variacion >= 0 ? '+' : ''}{num(g.results.variacion)}%</strong></td>)}</tr>
                  <tr><td>Área de mayor demanda</td>{comparados.map((g) => <td key={g.id}>{g.results.areaLider ?? '—'}</td>)}</tr>
                  <tr><td>Cobertura de plazas FCyT</td>{comparados.map((g) => <td key={g.id}>{g.results.coberturaEscenario === null ? '—' : pct(g.results.coberturaEscenario, 0)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </EstadoDatos>
    </>
  )
}
