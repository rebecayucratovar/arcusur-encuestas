import type { Fila } from '../../lib/demo'
import { descriptivos, type Descriptivos as Desc } from '../../lib/estadistica'
import { exportarExcel } from '../../lib/excel'
import { num, pct } from '../../lib/formato'
import { valoresDe, type Variable } from '../../lib/variables'
import { Columnas } from '../graficos/Graficos'
import { IconoIdea } from '../Iconos'
import { BotonExportar } from './Comunes'

const UMBRAL_JUNIOR = 5 // años de vida profesional: junior < 5 ≤ consolidado

const RANGOS: { etiqueta: string; desde: number; hasta: number }[] = [
  { etiqueta: '0–2', desde: 0, hasta: 2 }, { etiqueta: '3–4', desde: 3, hasta: 4 },
  { etiqueta: '5–7', desde: 5, hasta: 7 }, { etiqueta: '8–10', desde: 8, hasta: 10 },
  { etiqueta: '11–15', desde: 11, hasta: 15 }, { etiqueta: '16+', desde: 16, hasta: Infinity },
]

const numero = (f: Fila, codigo: string) => {
  const v = f[codigo]
  return v === undefined || v === '' ? NaN : Number(v)
}

interface Segmento { nombre: string; d: Desc | null; desempleo: Desc | null }

function segmento(nombre: string, filas: Fila[]): Segmento {
  return {
    nombre,
    d: descriptivos(filas.map((f) => numero(f, 'anios_profesional'))),
    desempleo: descriptivos(filas.map((f) => numero(f, 'anios_desempleado'))),
  }
}

interface ItemLikert { v: Variable; d: Desc | null; maximo: number; sinPuntaje: number }

function likert(variables: Variable[], filas: Fila[]): ItemLikert[] {
  return variables.filter((v) => v.tipo === 'likert' && v.puntajes).map((v) => {
    const puntajes = v.puntajes!
    const respuestas = filas.flatMap((f) => valoresDe(f, v.codigo))
    return {
      v,
      d: descriptivos(respuestas.filter((x) => x in puntajes).map((x) => puntajes[x])),
      maximo: Math.max(...Object.values(puntajes)),
      sinPuntaje: respuestas.filter((x) => !(x in puntajes)).length, // p. ej. "No sabe"
    }
  })
}

export default function Descriptivos({ variables, filas, slug }: { variables: Variable[]; filas: Fila[]; slug: string }) {
  const tieneAnios = variables.some((v) => v.codigo === 'anios_profesional')
  const conAnios = filas.filter((f) => Number.isFinite(numero(f, 'anios_profesional')))
  const segmentos = tieneAnios ? [
    segmento('Todos los titulados', conAnios),
    segmento(`Junior (< ${UMBRAL_JUNIOR} años)`, conAnios.filter((f) => numero(f, 'anios_profesional') < UMBRAL_JUNIOR)),
    segmento(`Consolidado (≥ ${UMBRAL_JUNIOR} años)`, conAnios.filter((f) => numero(f, 'anios_profesional') >= UMBRAL_JUNIOR)),
  ] : []
  const [todos, junior, consolidado] = segmentos
  const items = likert(variables, filas)

  const histograma = RANGOS.map((r) => ({
    clave: r.etiqueta, etiqueta: r.etiqueta,
    valor: conAnios.filter((f) => numero(f, 'anios_profesional') >= r.desde && numero(f, 'anios_profesional') <= r.hasta).length,
    destacado: r.hasta < UMBRAL_JUNIOR,
  }))

  const exportar = () => exportarExcel(`descriptivos-${slug}`, 'Descriptivos', [
    ...(tieneAnios ? [
      ['Años de vida profesional'],
      ['Segmento', 'n', 'Media', 'Mediana', 'D.E.', 'Mín', 'Máx', 'Desempleo medio (años)'],
      ...segmentos.map((s) => [s.nombre, s.d?.n ?? 0, s.d ? Number(s.d.media.toFixed(2)) : null, s.d?.mediana ?? null,
        s.d ? Number(s.d.de.toFixed(2)) : null, s.d?.min ?? null, s.d?.max ?? null, s.desempleo ? Number(s.desempleo.media.toFixed(2)) : null]),
      [],
    ] : []),
    ['Escalas Likert (puntajes)'],
    ['Pregunta', 'n con puntaje', 'Media', 'D.E.', 'Escala', 'Sin puntaje (No sabe)'],
    ...items.map((it) => [it.v.etiqueta, it.d?.n ?? 0, it.d ? Number(it.d.media.toFixed(2)) : null,
      it.d ? Number(it.d.de.toFixed(2)) : null, `1–${it.maximo}`, it.sinPuntaje]),
  ])

  return (
    <>
      <div className="analisis__controles">
        <p className="analisis__nota">
          {tieneAnios
            ? <>Variable principal: <strong>Años de vida profesional</strong>. Segmentación: junior &lt; {UMBRAL_JUNIOR} años ≤ consolidado.</>
            : <>Esta encuesta no tiene variables numéricas continuas; se describen los puntajes de sus escalas Likert.</>}
        </p>
        <BotonExportar onClick={exportar} />
      </div>

      {tieneAnios && todos.d && (
        <>
          <div className="kpis kpis--tres">
            <div className="kpi kpi--destacado"><span>Media</span><strong>{num(todos.d.media)} <small>años</small></strong></div>
            <div className="kpi"><span>Mediana</span><strong>{num(todos.d.mediana)} <small>años</small></strong></div>
            <div className="kpi"><span>Desviación estándar</span><strong>{num(todos.d.de, 2)} <small>años</small></strong></div>
          </div>

          <div className="analisis__dos">
            <div className="tabla-panel analisis__tabla">
              <table className="tabla-datos tabla-datos--grande">
                <thead>
                  <tr><th scope="col">Segmento</th><th scope="col">n</th><th scope="col">Media</th><th scope="col">Mediana</th>
                    <th scope="col">D.E.</th><th scope="col">Mín–Máx</th><th scope="col">Desempleo medio</th></tr>
                </thead>
                <tbody>
                  {segmentos.map((s) => (
                    <tr key={s.nombre}>
                      <td>{s.nombre}</td>
                      <td>{s.d?.n ?? 0}</td>
                      <td>{s.d ? num(s.d.media) : '—'}</td>
                      <td>{s.d ? num(s.d.mediana) : '—'}</td>
                      <td>{s.d ? num(s.d.de, 2) : '—'}</td>
                      <td className="tabla-datos__suave">{s.d ? `${s.d.min}–${s.d.max}` : '—'}</td>
                      <td>{s.desempleo ? `${num(s.desempleo.media, 2)} años` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {junior.d && consolidado.d && (
                <p className="grafico__hallazgo">
                  <IconoIdea /> El {pct((junior.d.n / todos.d.n) * 100, 0)} de los titulados es junior. Los consolidados suman en promedio{' '}
                  {num(consolidado.d.media)} años de experiencia frente a {num(junior.d.media)} de los junior; la desviación estándar
                  global ({num(todos.d.de)}) {todos.d.de > todos.d.media * 0.6 ? 'indica una población heterogénea en trayectoria' : 'indica trayectorias relativamente homogéneas'}.
                </p>
              )}
            </div>
            <section className="grafico">
              <header className="grafico__cabecera"><div><h2>Distribución de años de vida profesional</h2><p>Titulados por rango de años</p></div></header>
              <ul className="leyenda leyenda--fila">
                <li><span className="leyenda__marca" style={{ background: 'var(--rojo)' }} />Junior</li>
                <li><span className="leyenda__marca" style={{ background: 'var(--barra)' }} />Consolidado</li>
              </ul>
              <div className="grafico__cuerpo"><Columnas datos={histograma} /></div>
            </section>
          </div>
        </>
      )}

      <section className="tabla-panel analisis__likert">
        <header className="analisis__cabecera-tabla">
          <h2>Escalas Likert</h2>
          <p>Puntaje medio por pregunta (1 = más desfavorable). Las respuestas sin puntaje, como "No sabe", no entran en la media.</p>
        </header>
        <div className="tabla-panel__desplazable">
          <table className="tabla-datos tabla-datos--grande">
            <thead>
              <tr><th scope="col">Pregunta</th><th scope="col">n</th><th scope="col">Media</th><th scope="col">D.E.</th>
                <th scope="col" className="analisis__col-medidor">Posición en la escala</th><th scope="col">No sabe</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.v.codigo}>
                  <td title={it.v.enunciado}>{it.v.etiqueta}</td>
                  <td>{it.d?.n ?? 0}</td>
                  <td><strong>{it.d ? num(it.d.media, 2) : '—'}</strong> <span className="tabla-datos__suave">/ {it.maximo}</span></td>
                  <td>{it.d ? num(it.d.de, 2) : '—'}</td>
                  <td>
                    {it.d && (
                      <span className="medidor" role="img" aria-label={`${num(it.d.media, 2)} de ${it.maximo}`}>
                        <span style={{ width: `${((it.d.media - 1) / Math.max(1, it.maximo - 1)) * 100}%` }} />
                      </span>
                    )}
                  </td>
                  <td className="tabla-datos__suave">{it.sinPuntaje || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
