import { useState } from 'react'
import type { Fila } from '../../lib/demo'
import { chiCuadrado, intensidad } from '../../lib/estadistica'
import { exportarExcel } from '../../lib/excel'
import { num, pct, pValor } from '../../lib/formato'
import { tablaCruzada, type Variable } from '../../lib/variables'
import { IconoAlerta, IconoIdea } from '../Iconos'
import { Aviso, BotonExportar, Controles, SelectorVariable, Vacio } from './Comunes'

const ALFA = 0.05

export default function ChiCuadrada({ variables, filas, inicial }: {
  variables: Variable[]; filas: Fila[]; inicial: [string, string]
}) {
  const valido = (c: string) => variables.some((v) => v.codigo === c)
  const [codFila, setCodFila] = useState(valido(inicial[0]) ? inicial[0] : variables[0]?.codigo)
  const [codCol, setCodCol] = useState(valido(inicial[1]) ? inicial[1] : variables[1]?.codigo)
  const vf = variables.find((v) => v.codigo === codFila)
  const vc = variables.find((v) => v.codigo === codCol)
  if (!vf || !vc) return null

  const t = tablaCruzada(filas, vf, vc)
  const r = vf.codigo === vc.codigo ? null : chiCuadrado(t.matriz)
  const proporcionBaja = r ? r.celdasBajas / r.totalCeldas : 0
  const significativo = r ? r.p < ALFA : false

  const exportar = () => r && exportarExcel(`chi2-${vf.codigo}-${vc.codigo}`, 'Chi-cuadrada', [
    [`Prueba chi-cuadrada: ${vf.etiqueta} × ${vc.etiqueta}`],
    ['Chi-cuadrada', Number(r.chi2.toFixed(4))], ['Grados de libertad', r.gl], ['p-valor', Number(r.p.toFixed(6))],
    ['V de Cramér', Number(r.v.toFixed(4))], ['n', r.n], ['Celdas con esperada < 5', `${r.celdasBajas} de ${r.totalCeldas}`],
    [],
    ['Observadas / esperadas', ...r.columnas.map((j) => t.columnas[j].label)],
    ...r.filas.map((i, a) => [t.filas[i].label, ...r.columnas.map((j, b) => `${t.matriz[i][j]} / ${r.esperadas[a][b].toFixed(2)}`)]),
  ])

  return (
    <>
      <Controles acciones={<BotonExportar onClick={exportar} />}>
        <SelectorVariable etiqueta="Variable en filas" variables={variables} valor={vf.codigo} onChange={setCodFila} />
        <SelectorVariable etiqueta="Variable en columnas" variables={variables} valor={vc.codigo} onChange={setCodCol} />
      </Controles>

      {vf.codigo === vc.codigo ? (
        <Vacio titulo="Elija dos variables distintas">La prueba compara si dos variables están relacionadas.</Vacio>
      ) : !r ? (
        <Vacio titulo="No se puede calcular la prueba">
          Se necesitan al menos dos categorías con respuestas en cada variable entre quienes respondieron ambas preguntas (n = {t.n}).
        </Vacio>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><span>χ² (chi-cuadrada)</span><strong>{num(r.chi2, 2)}</strong></div>
            <div className="kpi"><span>Grados de libertad</span><strong>{r.gl}</strong></div>
            <div className="kpi"><span>p-valor</span><strong>{pValor(r.p)}</strong></div>
            <div className="kpi"><span>V de Cramér</span><strong>{num(r.v, 3)}</strong></div>
          </div>

          {r.celdasBajas > 0 && (
            <Aviso grave={proporcionBaja > 0.2 || r.esperadaMinima < 1}>
              <IconoAlerta />
              <p>
                <strong>{r.celdasBajas} de {r.totalCeldas} celdas ({pct(proporcionBaja * 100, 0)}) tienen frecuencias esperadas menores a 5.</strong>{' '}
                {proporcionBaja > 0.2 || r.esperadaMinima < 1
                  ? 'Supera lo recomendado (criterio de Cochran: como máximo 20% y ninguna menor a 1): el resultado es poco fiable. Considere agrupar categorías o ampliar la muestra.'
                  : 'Está dentro del 20% tolerado (criterio de Cochran), pero interprete el resultado con cautela.'}
              </p>
            </Aviso>
          )}

          <div className="analisis__dos analisis__dos--chi">
            <section className="grafico">
              <h2 className="analisis__titulo-tarjeta"><IconoIdea /> Interpretación</h2>
              <p className="analisis__texto">
                {significativo
                  ? <>Hay evidencia estadística de que «{vf.etiqueta}» y «{vc.etiqueta}» están relacionadas
                    (p = {pValor(r.p)} &lt; {num(ALFA, 2)}). La intensidad de la asociación es <strong>{intensidad(r.v)}</strong> (V de Cramér = {num(r.v, 3)}).</>
                  : <>No hay evidencia suficiente para afirmar que «{vf.etiqueta}» y «{vc.etiqueta}» estén relacionadas
                    (p = {pValor(r.p)} ≥ {num(ALFA, 2)}). Las diferencias observadas pueden deberse al azar del muestreo.</>}
              </p>
              <p className="analisis__nota">Nivel de significancia α = {num(ALFA, 2)} · n = {r.n} · categorías sin respuestas excluidas</p>
            </section>

            <section className="grafico">
              <h2 className="analisis__titulo-tarjeta">Frecuencias observadas / esperadas</h2>
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
              <p className="analisis__nota">Las esperadas menores a 5 se marcan en ámbar.</p>
            </section>
          </div>
        </>
      )}
    </>
  )
}
