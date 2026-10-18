import { useState } from 'react'
import type { Fila } from '../../lib/demo'
import { exportarExcel } from '../../lib/excel'
import { colorCalor, num } from '../../lib/formato'
import { tablaCruzada, type Variable } from '../../lib/variables'
import { BotonExportar, Controles, SelectorVariable, Vacio } from './Comunes'

type Modo = 'frecuencias' | 'porcentaje'

export default function TablasCruzadas({ variables, filas, inicial }: {
  variables: Variable[]; filas: Fila[]; inicial: [string, string]
}) {
  const valido = (c: string) => variables.some((v) => v.codigo === c)
  const [codFila, setCodFila] = useState(valido(inicial[0]) ? inicial[0] : variables[0]?.codigo)
  const [codCol, setCodCol] = useState(valido(inicial[1]) ? inicial[1] : variables[1]?.codigo)
  const [modo, setModo] = useState<Modo>('frecuencias')
  const vf = variables.find((v) => v.codigo === codFila)
  const vc = variables.find((v) => v.codigo === codCol)
  if (!vf || !vc) return null

  const t = tablaCruzada(filas, vf, vc)
  const valor = (i: number, j: number) =>
    modo === 'frecuencias' ? t.matriz[i][j] : t.totalFila[i] ? (t.matriz[i][j] / t.totalFila[i]) * 100 : 0
  const maximo = Math.max(1, ...t.filas.flatMap((_, i) => t.columnas.map((_, j) => valor(i, j))))
  const mostrar = (x: number) => (modo === 'frecuencias' ? String(x) : `${num(x, 0)}%`)

  const exportar = () => exportarExcel(`cruce-${vf.codigo}-${vc.codigo}`, 'Tabla cruzada', [
    [`${vf.etiqueta} (filas) × ${vc.etiqueta} (columnas)`, modo === 'frecuencias' ? 'Frecuencias' : '% por fila'],
    ['', ...t.columnas.map((c) => c.label), 'Total'],
    ...t.filas.map((f, i) => [f.label, ...t.columnas.map((_, j) => Number(valor(i, j).toFixed(1))), t.totalFila[i]]),
    ['Total', ...t.totalColumna, t.n],
  ])

  return (
    <>
      <Controles acciones={<>
        <div className="selector" role="group" aria-label="Valores">
          {(['frecuencias', 'porcentaje'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m}
              className={`selector__opcion${modo === m ? ' selector__opcion--activa' : ''}`} onClick={() => setModo(m)}>
              {m === 'frecuencias' ? 'Frecuencias' : '% por fila'}
            </button>
          ))}
        </div>
        <BotonExportar onClick={exportar} />
      </>}>
        <SelectorVariable etiqueta="Variable en filas" variables={variables} valor={vf.codigo} onChange={setCodFila} />
        <SelectorVariable etiqueta="Variable en columnas" variables={variables} valor={vc.codigo} onChange={setCodCol} />
      </Controles>

      {vf.codigo === vc.codigo ? (
        <Vacio titulo="Elija dos variables distintas">Una variable cruzada consigo misma no aporta información.</Vacio>
      ) : t.n === 0 ? (
        <Vacio titulo="Sin respuestas en común">Ninguna persona respondió ambas preguntas (pertenecen a ramas distintas del formulario).</Vacio>
      ) : (
        <section className="tabla-panel">
          <div className="tabla-panel__desplazable">
            <table className="calor">
              <thead>
                <tr>
                  <th scope="col" className="calor__esquina">P{vf.numero} ↓ · P{vc.numero} →</th>
                  {t.columnas.map((c) => <th key={c.value} scope="col" title={c.label}><span>{c.label}</span></th>)}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {t.filas.map((f, i) => (
                  <tr key={f.value}>
                    <th scope="row" title={f.label}><span>{f.label}</span></th>
                    {t.columnas.map((c, j) => {
                      const x = valor(i, j)
                      return (
                        <td key={c.value} style={colorCalor(x / maximo)}
                          title={`${f.label} × ${c.label}: ${t.matriz[i][j]} (${num(t.totalFila[i] ? (t.matriz[i][j] / t.totalFila[i]) * 100 : 0, 1)}% de la fila)`}>
                          {mostrar(x)}
                        </td>
                      )
                    })}
                    <td className="calor__total">{t.totalFila[i]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {t.totalColumna.map((x, j) => <td key={j} className="calor__total">{x}</td>)}
                  <td className="calor__gran-total">{t.n}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="calor__nota">
            La intensidad del color indica la magnitud de cada celda frente a la mayor de la tabla.
            {modo === 'porcentaje' && ' En "% por fila", cada fila suma 100%.'} n = {t.n} personas que respondieron ambas preguntas.
          </p>
        </section>
      )}
    </>
  )
}
