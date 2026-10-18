import { useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import type { Categoria } from '../../lib/resumen'

const total = (datos: Categoria[]) => datos.reduce((a, d) => a + d.valor, 0)
const porcentaje = (v: number, t: number) =>
  `${(t ? (v / t) * 100 : 0).toLocaleString('es-BO', { maximumFractionDigits: 0 })}%`

/** Colores categóricos en orden fijo (validados para daltonismo y contraste). */
const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)']

interface Punto { x: number; y: number; d: Categoria }

/** Recuadro al pasar el mouse o enfocar una marca: el valor primero, la categoría después. */
function Tooltip({ punto, t }: { punto: Punto | null; t: number }) {
  if (!punto) return null
  return (
    <div className="tooltip" style={{ left: punto.x, top: punto.y }} role="status">
      <strong>{punto.d.valor}</strong> <span>({porcentaje(punto.d.valor, t)})</span>
      <small>{punto.d.etiqueta}</small>
    </div>
  )
}

/** Maneja la posición del tooltip relativa al contenedor del gráfico. */
function useTooltip() {
  const caja = useRef<HTMLDivElement>(null)
  const [punto, setPunto] = useState<Punto | null>(null)
  const mostrar = (el: Element, d: Categoria) => {
    const c = caja.current?.getBoundingClientRect()
    const m = el.getBoundingClientRect()
    if (c) setPunto({ x: m.left - c.left + m.width / 2, y: m.top - c.top, d })
  }
  const props = (d: Categoria) => ({
    tabIndex: 0,
    'aria-label': `${d.etiqueta}: ${d.valor}`,
    onPointerEnter: (e: PointerEvent) => mostrar(e.currentTarget, d),
    onFocus: (e: FocusEvent) => mostrar(e.currentTarget, d),
    onPointerLeave: () => setPunto(null),
    onBlur: () => setPunto(null),
  })
  return { caja, punto, props }
}

export function Dona({ datos, unidad = 'respuestas' }: { datos: Categoria[]; unidad?: string }) {
  const [activo, setActivo] = useState<number | null>(null)
  const t = total(datos)
  const r = 62
  const C = 2 * Math.PI * r
  const hueco = t > 0 && datos.filter((d) => d.valor > 0).length > 1 ? 3 : 0 // separación entre segmentos
  // Largo y punto de inicio de cada segmento sobre la circunferencia.
  const largos = datos.map((d) => (t ? (d.valor / t) * C : 0))
  const inicios = largos.map((_, i) => largos.slice(0, i).reduce((a, b) => a + b, 0))
  const centro = activo === null ? null : datos[activo]

  return (
    <div className="dona">
      <svg viewBox="0 0 160 160" className="dona__svg" role="img"
        aria-label={datos.map((d) => `${d.etiqueta} ${porcentaje(d.valor, t)}`).join(', ')}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--borde-suave)" strokeWidth="22" />
        {datos.map((d, i) => {
          const largo = largos[i]
          return (
            <circle key={d.clave} cx="80" cy="80" r={r} fill="none" stroke={SERIES[i % SERIES.length]}
              strokeWidth={activo === i ? 26 : 22}
              strokeDasharray={`${Math.max(largo - hueco, 0)} ${C}`} strokeDashoffset={-inicios[i]}
              transform="rotate(-90 80 80)" opacity={activo === null || activo === i ? 1 : 0.45}
              tabIndex={0} aria-label={`${d.etiqueta}: ${d.valor}`} className="dona__seg"
              onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} />
          )
        })}
        <text x="80" y="78" textAnchor="middle" className="dona__valor">
          {centro ? porcentaje(centro.valor, t) : t}
        </text>
        <text x="80" y="96" textAnchor="middle" className="dona__rotulo">
          {centro ? `${centro.valor} ${unidad}` : unidad}
        </text>
      </svg>
      <ul className="leyenda">
        {datos.map((d, i) => (
          <li key={d.clave} onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)}>
            <span className="leyenda__marca" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="leyenda__texto">{d.etiqueta}</span>
            <strong>{porcentaje(d.valor, t)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Barras({ datos, leyenda }: { datos: Categoria[]; leyenda?: [string, string] }) {
  const { caja, punto, props } = useTooltip()
  const max = Math.max(1, ...datos.map((d) => d.valor))
  const t = total(datos)
  // Con leyenda, "destacado" separa dos grupos; sin ella, resalta la categoría líder.
  const color = (d: Categoria) =>
    leyenda ? (d.destacado ? 'var(--barra)' : 'var(--barra-claro)') : (d.destacado ? 'var(--rojo)' : 'var(--barra)')

  return (
    <div className="barras" ref={caja}>
      {leyenda && (
        <ul className="leyenda leyenda--fila">
          <li><span className="leyenda__marca" style={{ background: 'var(--barra)' }} />{leyenda[0]}</li>
          <li><span className="leyenda__marca" style={{ background: 'var(--barra-claro)' }} />{leyenda[1]}</li>
        </ul>
      )}
      {datos.map((d) => (
        <div key={d.clave} className="barras__fila">
          <span className="barras__etiqueta">{d.etiqueta}</span>
          <div className="barras__pista">
            <div className="barras__barra" style={{ width: `${(d.valor / max) * 100}%`, background: color(d) }} {...props(d)} />
            <span className="barras__valor">{d.valor}</span>
          </div>
        </div>
      ))}
      <Tooltip punto={punto} t={t} />
    </div>
  )
}

/** Máximo "redondo" del eje y sus marcas (0, 10, 20...). */
function escala(max: number): number[] {
  const paso = [1, 2, 5, 10, 20, 25, 50, 100].find((p) => max / p <= 5) ?? Math.ceil(max / 5)
  const tope = Math.max(paso, Math.ceil(max / paso) * paso)
  return Array.from({ length: tope / paso + 1 }, (_, i) => i * paso)
}

export function Columnas({ datos }: { datos: Categoria[] }) {
  const { caja, punto, props } = useTooltip()
  const marcas = escala(Math.max(1, ...datos.map((d) => d.valor)))
  const tope = marcas[marcas.length - 1]
  const t = total(datos)

  return (
    <div className="columnas" ref={caja}>
      <div className="columnas__eje" aria-hidden="true">
        {[...marcas].reverse().map((m) => <span key={m}>{m}</span>)}
      </div>
      <div className="columnas__area">
        {marcas.map((m) => (
          <div key={m} className="columnas__guia" style={{ bottom: `${(m / tope) * 100}%` }} aria-hidden="true" />
        ))}
        {datos.map((d) => (
          <div key={d.clave} className="columnas__banda">
            <div className="columnas__col" style={{ height: `${(d.valor / tope) * 100}%`, background: d.destacado ? 'var(--rojo)' : 'var(--barra)' }} {...props(d)}>
              <span className="columnas__valor">{d.valor}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="columnas__etiquetas" aria-hidden="true">
        {datos.map((d) => <span key={d.clave}>{d.etiqueta}</span>)}
      </div>
      <Tooltip punto={punto} t={t} />
    </div>
  )
}

/** Vista de tabla: la misma información sin depender del color ni del mouse. */
export function TablaDatos({ datos }: { datos: Categoria[] }) {
  const t = total(datos)
  return (
    <table className="tabla-datos">
      <thead><tr><th>Categoría</th><th>Cantidad</th><th>%</th></tr></thead>
      <tbody>
        {datos.map((d) => (
          <tr key={d.clave}><td>{d.etiqueta}</td><td>{d.valor}</td><td>{porcentaje(d.valor, t)}</td></tr>
        ))}
      </tbody>
      <tfoot><tr><td>Total</td><td>{t}</td><td>100%</td></tr></tfoot>
    </table>
  )
}

export function Nota({ children }: { children: ReactNode }) {
  return <p className="grafico__hallazgo">{children}</p>
}
