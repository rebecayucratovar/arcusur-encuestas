import { useState } from 'react'
import type { Fila } from '../../lib/demo'
import { exportarExcel } from '../../lib/excel'
import { num, pct } from '../../lib/formato'
import { valoresDe, type Variable } from '../../lib/variables'
import { Barras } from '../graficos/Graficos'
import { BotonExportar, Controles, SelectorVariable } from './Comunes'

export default function Frecuencias({ variables, filas, inicial }: {
  variables: Variable[]; filas: Fila[]; inicial: string
}) {
  const conOpciones = variables.filter((v) => v.opciones.length > 0)
  const [codigo, setCodigo] = useState(conOpciones.some((v) => v.codigo === inicial) ? inicial : conOpciones[0]?.codigo)
  const v = conOpciones.find((x) => x.codigo === codigo)
  if (!v) return null

  // Solo cuentan quienes vieron y respondieron la pregunta (las ramas dejan fuera al resto).
  const respondieron = filas.filter((f) => valoresDe(f, v.codigo).length > 0)
  const n = respondieron.length
  const base = v.opciones.map((o) => {
    const absoluta = respondieron.filter((f) => valoresDe(f, v.codigo).includes(o.value)).length
    return { valor: o.value, etiqueta: o.label, absoluta, relativa: n ? (absoluta / n) * 100 : 0 }
  })
  const tabla = base.map((t, i) => ({ ...t, acumulada: base.slice(0, i + 1).reduce((a, x) => a + x.relativa, 0) }))
  const totalMarcas = tabla.reduce((a, t) => a + t.absoluta, 0)

  const exportar = () => exportarExcel(`frecuencias-${v.codigo}`, `P${v.numero}`, [
    [v.etiqueta],
    ['Categoría', 'Absoluta', 'Relativa (%)', ...(v.multiple ? [] : ['Acumulada (%)'])],
    ...tabla.map((t) => [t.etiqueta, t.absoluta, Number(t.relativa.toFixed(1)), ...(v.multiple ? [] : [Number(t.acumulada.toFixed(1))])]),
    ['Total', v.multiple ? totalMarcas : n, v.multiple ? null : 100],
    [`n = ${n} personas que respondieron`],
  ])

  return (
    <>
      <Controles acciones={<BotonExportar onClick={exportar} />}>
        <SelectorVariable etiqueta="Variable" variables={conOpciones} valor={v.codigo} onChange={setCodigo} />
      </Controles>
      <p className="analisis__nota">
        <strong>n = {n}</strong> que respondieron
        {filas.length > n && <> · {filas.length - n} no la vieron por las ramas del formulario o la dejaron en blanco</>}
        {v.multiple && <> · Selección múltiple: los porcentajes son sobre las personas y pueden sumar más de 100%.</>}
      </p>

      <div className="analisis__dos">
        <div className="tabla-panel analisis__tabla">
          <table className="tabla-datos tabla-datos--grande">
            <thead>
              <tr>
                <th scope="col">Categoría</th><th scope="col">Absoluta</th><th scope="col">Relativa</th>
                {!v.multiple && <th scope="col">Acumulada</th>}
              </tr>
            </thead>
            <tbody>
              {tabla.map((t) => (
                <tr key={t.valor}>
                  <td>{t.etiqueta}</td>
                  <td><strong>{t.absoluta}</strong></td>
                  <td>{pct(t.relativa)}</td>
                  {!v.multiple && <td className="tabla-datos__suave">{pct(t.acumulada)}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{v.multiple ? totalMarcas : n}</td>
                <td>{v.multiple ? `${num(n ? totalMarcas / n : 0)} por persona` : pct(100)}</td>
                {!v.multiple && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
        <section className="grafico">
          <header className="grafico__cabecera"><div><h2>Distribución</h2><p>{v.nombre}</p></div></header>
          <div className="grafico__cuerpo">
            <Barras datos={tabla.map((t) => ({ clave: t.valor, etiqueta: t.etiqueta, valor: t.absoluta }))} />
          </div>
        </section>
      </div>
    </>
  )
}
