import { useState } from 'react'
import type { Fila } from '../../lib/demo'
import {
  chiPorCapas, chiYates, fallaCochran, intensidad, probarTabla, tablaUsada,
  type CapaChi2, type ResultadoChi2,
} from '../../lib/estadistica'
import { exportarExcel, type Celda } from '../../lib/excel'
import { num, pct, pValor } from '../../lib/formato'
import { tablaCruzada, tablasPorCapa, type TablaCruzada, type Variable } from '../../lib/variables'
import { IconoAlerta, IconoIdea } from '../Iconos'
import { Aviso, BotonExportar, Controles, SelectorVariable, Vacio } from './Comunes'

const ALFA = 0.05

/** «p = 0,042» o «p < 0,001» (evita «p = < 0,001»). */
const pTexto = (p: number) => (p < 0.001 ? 'p < 0,001' : `p = ${pValor(p)}`)

/** Observadas / esperadas de una tabla (las esperadas menores a 5 en ámbar). */
function TablaEsperadas({ t, r }: { t: TablaCruzada; r: ResultadoChi2 }) {
  return (
    <div className="tabla-panel__desplazable">
      <table className="tabla-esperadas">
        <thead>
          <tr><th />{r.columnas.map((j) => <th key={j} scope="col" title={t.columnas[j].label}><span>{t.columnas[j].label}</span></th>)}</tr>
        </thead>
        <tbody>
          {r.filas.map((i, a) => (
            <tr key={i}>
              <th scope="row" title={t.filas[i].label}><span>{t.filas[i].label}</span></th>
              {r.columnas.map((j, b) => {
                const e = r.esperadas[a][b]
                return (
                  <td key={j}>
                    <strong>{t.matriz[i][j]}</strong>
                    <span className={e < 5 ? 'tabla-esperadas__baja' : undefined} title={e < 5 ? 'Esperada menor a 5' : undefined}> / {num(e)}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Yates y Fisher de una tabla 2×2, con cuál decide. */
function Exactas({ t, c }: { t: TablaCruzada; c: CapaChi2 }) {
  if (!c.resultado || !c.fisher) return null
  const yates = chiYates(tablaUsada(t.matriz, c.resultado))
  return (
    <p className="analisis__nota">
      Tabla 2×2: χ² con corrección de Yates = {yates === null ? '—' : num(yates, 2)} · prueba exacta de Fisher {pTexto(c.fisher.p)}
      {c.metodo === 'fisher'
        ? <> · <strong>se decide con Fisher</strong> porque falla la regla de Cochran.</>
        : <> · se decide con χ² porque se cumple la regla de Cochran.</>}
    </p>
  )
}

function filasExcel(t: TablaCruzada, c: CapaChi2): Celda[][] {
  const r = c.resultado
  if (!r) return [['Sin datos suficientes para la prueba', `n = ${t.n}`]]
  return [
    ['Chi-cuadrada', Number(r.chi2.toFixed(4))], ['Grados de libertad', r.gl], ['p-valor (χ²)', Number(r.p.toFixed(6))],
    ['V de Cramér', Number(r.v.toFixed(4))], ['n', r.n], ['Celdas con esperada < 5', `${r.celdasBajas} de ${r.totalCeldas}`],
    ...(c.fisher ? [
      ['χ² con corrección de Yates', Number((chiYates(tablaUsada(t.matriz, r)) ?? 0).toFixed(4))],
      ['p exacta de Fisher', Number(c.fisher.p.toFixed(6))],
    ] : []),
    ['Prueba con que se decide', c.metodo === 'fisher' ? 'Fisher (falla Cochran)' : 'Chi-cuadrada'],
    ['Observadas / esperadas', ...r.columnas.map((j) => t.columnas[j].label)],
    ...r.filas.map((i, a) => [t.filas[i].label, ...r.columnas.map((j, b) => `${t.matriz[i][j]} / ${r.esperadas[a][b].toFixed(2)}`)]),
  ]
}

export default function ChiCuadrada({ variables, filas, inicial }: {
  variables: Variable[]; filas: Fila[]; inicial: [string, string]
}) {
  const valido = (c: string) => variables.some((v) => v.codigo === c)
  const [codFila, setCodFila] = useState(valido(inicial[0]) ? inicial[0] : variables[0]?.codigo)
  const [codCol, setCodCol] = useState(valido(inicial[1]) ? inicial[1] : variables[1]?.codigo)
  const [codControl, setCodControl] = useState('')
  const vf = variables.find((v) => v.codigo === codFila)
  const vc = variables.find((v) => v.codigo === codCol)
  if (!vf || !vc) return null
  const vz = variables.find((v) => v.codigo === codControl && v.codigo !== vf.codigo && v.codigo !== vc.codigo)

  const t = tablaCruzada(filas, vf, vc)
  const prueba = vf.codigo === vc.codigo ? null : probarTabla(t.matriz)
  const r = prueba?.resultado ?? null
  const proporcionBaja = r ? r.celdasBajas / r.totalCeldas : 0
  const significativo = prueba ? prueba.pDecision < ALFA : false

  const capas = vz && r ? tablasPorCapa(filas, vf, vc, vz) : []
  const estratos = capas.length ? chiPorCapas(capas.map((c) => c.tabla.matriz), ALFA) : null

  const exportar = () => {
    if (!prueba) return
    const hojas: Celda[][] = [
      [`Prueba chi-cuadrada: ${vf.etiqueta} × ${vc.etiqueta}`], ...filasExcel(t, prueba),
    ]
    if (vz && estratos) {
      hojas.push([], [`Cruce de tres variables: control = ${vz.etiqueta}`],
        ['χ² por capas (suma)', Number(estratos.chi2.toFixed(4))], ['gl (suma)', estratos.gl], ['p-valor', Number(estratos.p.toFixed(6))],
        ['Capas significativas', `${estratos.significativas} de ${estratos.calculadas}`])
      capas.forEach((c, k) => hojas.push([], [`Capa: ${c.capa.label}`], ...filasExcel(c.tabla, estratos.capas[k])))
    }
    exportarExcel(`chi2-${vf.codigo}-${vc.codigo}${vz ? `-por-${vz.codigo}` : ''}`, 'Chi-cuadrada', hojas)
  }

  const nombresSignificativas = estratos
    ? capas.filter((_, k) => estratos.capas[k].pDecision < ALFA).map((c) => `«${c.capa.label}»`).join(', ')
    : ''

  const sinDatos = estratos
    ? capas.filter((_, k) => !estratos.capas[k].resultado).map((c) => `«${c.capa.label}»`).join(', ')
    : ''

  return (
    <>
      <Controles acciones={<BotonExportar onClick={exportar} />}>
        <SelectorVariable etiqueta="Variable en filas" variables={variables} valor={vf.codigo} onChange={setCodFila} />
        <SelectorVariable etiqueta="Variable en columnas" variables={variables} valor={vc.codigo} onChange={setCodCol} />
        <SelectorVariable etiqueta="Variable de control (tercera variable)" variables={variables} valor={vz?.codigo ?? ''}
          onChange={setCodControl} ninguna="Ninguna: cruce de dos variables" />
      </Controles>

      {vf.codigo === vc.codigo ? (
        <Vacio titulo="Elija dos variables distintas">La prueba compara si dos variables están relacionadas.</Vacio>
      ) : !r || !prueba ? (
        <Vacio titulo="No se puede calcular la prueba">
          Se necesitan al menos dos categorías con respuestas en cada variable entre quienes respondieron ambas preguntas (n = {t.n}).
        </Vacio>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><span>χ² (chi-cuadrada)</span><strong>{num(r.chi2, 2)}</strong></div>
            <div className="kpi"><span>Grados de libertad</span><strong>{r.gl}</strong></div>
            <div className="kpi">
              <span>{prueba.metodo === 'fisher' ? 'p-valor (Fisher exacta)' : 'p-valor'}</span>
              <strong>{pValor(prueba.pDecision)}</strong>
              {prueba.metodo === 'fisher' && <small>χ²: {pTexto(r.p)}</small>}
            </div>
            <div className="kpi"><span>V de Cramér</span><strong>{num(r.v, 3)}</strong></div>
          </div>

          {r.celdasBajas > 0 && (
            <Aviso grave={fallaCochran(r) && prueba.metodo !== 'fisher'}>
              <IconoAlerta />
              <p>
                <strong>{r.celdasBajas} de {r.totalCeldas} celdas ({pct(proporcionBaja * 100, 0)}) tienen frecuencias esperadas menores a 5.</strong>{' '}
                {!fallaCochran(r)
                  ? 'Está dentro del 20% tolerado (criterio de Cochran), pero interprete el resultado con cautela.'
                  : prueba.metodo === 'fisher'
                    ? 'Supera lo recomendado (criterio de Cochran), así que la decisión se toma con la prueba exacta de Fisher, que no depende de esa aproximación.'
                    : 'Supera lo recomendado (criterio de Cochran: como máximo 20% y ninguna menor a 1): el resultado es poco fiable. Considere usar una variable agrupada (las que dicen «agrupada» o «rangos») o ampliar la muestra.'}
              </p>
            </Aviso>
          )}

          <div className="analisis__dos analisis__dos--chi">
            <section className="grafico">
              <h2 className="analisis__titulo-tarjeta"><IconoIdea /> Interpretación</h2>
              <p className="analisis__texto">
                {significativo
                  ? <>Hay evidencia estadística de que «{vf.etiqueta}» y «{vc.etiqueta}» están relacionadas
                    ({pTexto(prueba.pDecision)} &lt; {num(ALFA, 2)}). La intensidad de la asociación es <strong>{intensidad(r.v)}</strong> (V de Cramér = {num(r.v, 3)}).</>
                  : <>No hay evidencia suficiente para afirmar que «{vf.etiqueta}» y «{vc.etiqueta}» estén relacionadas
                    ({pTexto(prueba.pDecision)} ≥ {num(ALFA, 2)}). Las diferencias observadas pueden deberse al azar del muestreo.</>}
              </p>
              <Exactas t={t} c={prueba} />
              <p className="analisis__nota">Nivel de significancia α = {num(ALFA, 2)} · n = {r.n} · categorías sin respuestas excluidas</p>
            </section>

            <section className="grafico">
              <h2 className="analisis__titulo-tarjeta">Frecuencias observadas / esperadas</h2>
              <TablaEsperadas t={t} r={r} />
              <p className="analisis__nota">Las esperadas menores a 5 se marcan en ámbar.</p>
            </section>
          </div>

          {vz && estratos && (
            <section className="capas" aria-label="Cruce de tres variables">
              <h2 className="capas__titulo">Cruce de tres variables: controlando por «{vz.etiqueta}»</h2>
              <p className="analisis__nota capas__explicacion">
                Se repite la prueba dentro de cada grupo de la variable de control. Si la relación se mantiene en todos los grupos,
                no la explica la tercera variable; si desaparece, la relación del total se debía a ella.
                El χ² por capas suma los χ² y los gl de cada grupo, porque son muestras independientes.
              </p>
              <div className="kpis">
                <div className="kpi"><span>χ² por capas (Σ)</span><strong>{num(estratos.chi2, 2)}</strong></div>
                <div className="kpi"><span>gl (Σ)</span><strong>{estratos.gl}</strong></div>
                <div className="kpi"><span>p-valor conjunto</span><strong>{estratos.calculadas ? pValor(estratos.p) : '—'}</strong></div>
                <div className="kpi"><span>Capas con relación</span><strong>{estratos.significativas} <small>de {estratos.calculadas}</small></strong></div>
              </div>

              <section className="grafico capas__lectura">
                <h3 className="analisis__titulo-tarjeta"><IconoIdea /> Lectura del cruce de tres variables</h3>
                <p className="analisis__texto">
                  {estratos.calculadas === 0
                    ? <>Ningún grupo de «{vz.nombre}» tiene datos suficientes para la prueba.</>
                    : estratos.significativas === estratos.calculadas && significativo
                      ? <>La relación se <strong>mantiene en todos los grupos</strong> de «{vz.nombre}»: no se explica por esa variable.</>
                      : estratos.significativas === estratos.calculadas
                        ? <>La relación <strong>aparece dentro de cada grupo</strong> aunque no en el total: «{vz.nombre}» la ocultaba (efecto de supresión).</>
                        : estratos.significativas === 0 && significativo
                          ? <>La relación <strong>desaparece al separar por «{vz.nombre}»</strong>: la asociación del total podría deberse a esa variable (relación espuria o mediada), o los grupos son muy pequeños para detectarla.</>
                          : estratos.significativas === 0
                            ? <>No hay relación ni en el total ni dentro de los grupos de «{vz.nombre}».</>
                            : <>La relación <strong>depende del grupo</strong> (interacción): es significativa solo en {nombresSignificativas}.</>}
                  {estratos.calculadas > 0 && sinDatos && <> Sin datos suficientes para la prueba en {sinDatos}, que no entra en la lectura.</>}
                </p>
              </section>

              <div className="capas__lista">
                {capas.map((c, k) => {
                  const e = estratos.capas[k]
                  const rc = e.resultado
                  return (
                    <section key={c.capa.value} className="grafico capas__capa">
                      <h3 className="analisis__titulo-tarjeta">{c.capa.label} <span className="capas__n">n = {c.tabla.n}</span></h3>
                      {!rc ? (
                        <p className="analisis__texto">Sin datos suficientes: se necesitan al menos dos categorías con respuestas en cada variable.</p>
                      ) : (
                        <>
                          <p className="capas__cifras">
                            χ² = <strong>{num(rc.chi2, 2)}</strong> · gl = {rc.gl} · <strong>{pTexto(e.pDecision)}</strong>
                            {e.metodo === 'fisher' && ' (Fisher)'} · V = {num(rc.v, 3)}
                            <span className={`capas__decision${e.pDecision < ALFA ? ' capas__decision--si' : ''}`}>
                              {e.pDecision < ALFA ? 'Relacionadas' : 'Sin evidencia'}
                            </span>
                          </p>
                          {rc.celdasBajas > 0 && (
                            <p className="analisis__nota">
                              {rc.celdasBajas} de {rc.totalCeldas} esperadas &lt; 5 (mínima {num(rc.esperadaMinima, 2)})
                              {fallaCochran(rc) ? (e.fisher ? ': falla Cochran, decide Fisher.' : ': falla Cochran, resultado poco fiable.') : ': dentro del 20% tolerado.'}
                            </p>
                          )}
                          <TablaEsperadas t={c.tabla} r={rc} />
                          <Exactas t={c.tabla} c={e} />
                        </>
                      )}
                    </section>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
