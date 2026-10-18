import { useState } from 'react'
import { escala } from '../../lib/escala'
import { num } from '../../lib/formato'

export interface Serie {
  nombre: string
  color: string
  valores: number[]
  /** Línea punteada (segunda señal además del color). */
  discontinua?: boolean
}

function Leyenda({ series, linea }: { series: Serie[]; linea?: boolean }) {
  return (
    <ul className="leyenda leyenda--fila leyenda--centro">
      {series.map((s) => (
        <li key={s.nombre}>
          {linea
            ? <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke={s.color} strokeWidth="2" strokeDasharray={s.discontinua ? '4 3' : undefined} /></svg>
            : <span className="leyenda__marca" style={{ background: s.color }} />}
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------- columnas agrupadas

export function ColumnasAgrupadas({ categorias, series, decimales = 0 }: {
  categorias: string[]; series: Serie[]; decimales?: number
}) {
  const [activa, setActiva] = useState<number | null>(null)
  const marcas = escala(Math.max(1, ...series.flatMap((s) => s.valores)))
  const tope = marcas[marcas.length - 1]

  return (
    <div className="agrupadas">
      <div className="columnas">
        <div className="columnas__eje" aria-hidden="true">{[...marcas].reverse().map((m) => <span key={m}>{m}</span>)}</div>
        <div className="columnas__area">
          {marcas.map((m) => <div key={m} className="columnas__guia" style={{ bottom: `${(m / tope) * 100}%` }} aria-hidden="true" />)}
          {categorias.map((c, i) => (
            <div key={c} className={`columnas__banda agrupadas__banda${activa === i ? ' agrupadas__banda--activa' : ''}`}
              tabIndex={0} onPointerEnter={() => setActiva(i)} onPointerLeave={() => setActiva(null)}
              onFocus={() => setActiva(i)} onBlur={() => setActiva(null)}
              aria-label={`${c}: ${series.map((s) => `${s.nombre} ${num(s.valores[i], decimales)}`).join(', ')}`}>
              {series.map((s) => (
                <div key={s.nombre} className="columnas__col agrupadas__col" style={{ height: `${(s.valores[i] / tope) * 100}%`, background: s.color }} />
              ))}
              {activa === i && (
                <div className="tooltip agrupadas__tooltip" role="status">
                  {series.map((s) => <span key={s.nombre} className="tooltip__fila"><i style={{ background: s.color }} /><strong>{num(s.valores[i], decimales)}</strong> {s.nombre}</span>)}
                  <small>{c}</small>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="columnas__etiquetas" aria-hidden="true">{categorias.map((c) => <span key={c}>{c}</span>)}</div>
      </div>
      <Leyenda series={series} />
    </div>
  )
}

// ---------------------------------------------------------------- líneas

export function Lineas({ etiquetas, series }: { etiquetas: (string | number)[]; series: Serie[] }) {
  const [activo, setActivo] = useState<number | null>(null)
  const W = 640, H = 240, izq = 44, der = 16, arr = 12, aba = 28
  const valores = series.flatMap((s) => s.valores)
  // Eje Y ajustado al rango de los datos (no empieza en 0 para que se vea la evolución).
  const minimo = Math.floor(Math.min(...valores) * 0.9 / 10) * 10
  const marcasBrutas = escala(Math.max(1, Math.max(...valores) - minimo))
  const marcas = marcasBrutas.map((m) => m + minimo)
  const tope = marcas[marcas.length - 1]
  const x = (i: number) => izq + (i * (W - izq - der)) / Math.max(1, etiquetas.length - 1)
  const y = (v: number) => arr + (1 - (v - minimo) / (tope - minimo || 1)) * (H - arr - aba)

  return (
    <div className="lineas">
      <svg viewBox={`0 0 ${W} ${H}`} className="lineas__svg" role="img"
        aria-label={series.map((s) => `${s.nombre}: ${s.valores.map((v, i) => `${etiquetas[i]} ${num(v)}`).join(', ')}`).join('. ')}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={izq} x2={W - der} y1={y(m)} y2={y(m)} className="lineas__guia" />
            <text x={izq - 8} y={y(m) + 4} textAnchor="end" className="lineas__eje">{m}</text>
          </g>
        ))}
        {etiquetas.map((e, i) => <text key={String(e)} x={x(i)} y={H - 8} textAnchor="middle" className="lineas__eje">{e}</text>)}
        {activo !== null && <line x1={x(activo)} x2={x(activo)} y1={arr} y2={H - aba} className="lineas__cursor" />}
        {series.map((s) => (
          <g key={s.nombre}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.discontinua ? '6 4' : undefined} points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.valores.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={activo === i ? 5 : 4} fill={s.color} stroke="var(--blanco)" strokeWidth="2" />
            ))}
          </g>
        ))}
        {/* Zonas de hover: el cursor busca el año más cercano, no hace falta apuntar a la línea. */}
        {etiquetas.map((e, i) => {
          const ancho = (W - izq - der) / Math.max(1, etiquetas.length - 1)
          return (
            <rect key={String(e)} x={x(i) - ancho / 2} y={arr} width={ancho} height={H - arr - aba} fill="transparent"
              onPointerEnter={() => setActivo(i)} onPointerLeave={() => setActivo(null)} />
          )
        })}
      </svg>
      {activo !== null && (
        <div className="tooltip lineas__tooltip" style={{ left: `${(x(activo) / W) * 100}%` }} role="status">
          {series.map((s) => <span key={s.nombre} className="tooltip__fila"><i style={{ background: s.color }} /><strong>{num(s.valores[activo])}</strong> {s.nombre}</span>)}
          <small>{etiquetas[activo]}</small>
        </div>
      )}
      <Leyenda series={series} linea />
    </div>
  )
}

// ---------------------------------------------------------------- radar

export function Radar({ ejes, series }: { ejes: string[]; series: Serie[] }) {
  const R = 100, cx = 260, cy = 150
  const angulo = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / ejes.length
  const punto = (i: number, v: number) => [cx + Math.cos(angulo(i)) * R * (v / 100), cy + Math.sin(angulo(i)) * R * (v / 100)]
  const anillos = [25, 50, 75, 100]

  return (
    <div className="radar">
      <svg viewBox="0 0 520 300" className="radar__svg" role="img"
        aria-label={series.map((s) => `${s.nombre}: ${ejes.map((e, i) => `${e} ${num(s.valores[i])}`).join(', ')}`).join('. ')}>
        {anillos.map((a) => (
          <polygon key={a} points={ejes.map((_, i) => punto(i, a).join(',')).join(' ')} className="radar__anillo" />
        ))}
        {anillos.map((a) => <text key={a} x={cx + 4} y={cy - (R * a) / 100 + 4} className="radar__marca">{a}</text>)}
        {ejes.map((e, i) => {
          const [x2, y2] = punto(i, 100)
          const [tx, ty] = punto(i, 118)
          const ancla = Math.abs(tx - cx) < 10 ? 'middle' : tx > cx ? 'start' : 'end'
          return (
            <g key={e}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} className="radar__eje" />
              <text x={tx} y={ty + (ty > cy ? 10 : ty < cy - R ? -2 : 4)} textAnchor={ancla} className="radar__etiqueta">{e}</text>
            </g>
          )
        })}
        {series.map((s) => (
          <g key={s.nombre}>
            <polygon points={s.valores.map((v, i) => punto(i, v).join(',')).join(' ')}
              fill={s.color} fillOpacity="0.1" stroke={s.color} strokeWidth="2" strokeLinejoin="round"
              strokeDasharray={s.discontinua ? '6 4' : undefined} />
            {s.valores.map((v, i) => {
              const [px, py] = punto(i, v)
              return <circle key={i} cx={px} cy={py} r="4" fill={s.color} stroke="var(--blanco)" strokeWidth="2"><title>{`${s.nombre} · ${ejes[i]}: ${num(v)}`}</title></circle>
            })}
          </g>
        ))}
      </svg>
      <Leyenda series={series} linea />
    </div>
  )
}

// ---------------------------------------------------------------- nube de términos

export interface Termino { termino: string; tipo: 'area' | 'herramienta'; menciones: number }

export function NubeTerminos({ terminos }: { terminos: Termino[] }) {
  const max = Math.max(1, ...terminos.map((t) => t.menciones))
  return (
    <div className="nube">
      <ul className="leyenda leyenda--fila">
        <li><span className="leyenda__marca" style={{ background: 'var(--serie-1)' }} />Área de conocimiento</li>
        <li><span className="leyenda__marca" style={{ background: 'var(--serie-2)' }} />Herramienta</li>
      </ul>
      <p className="nube__terminos">
        {terminos.map((t) => (
          <span key={t.termino} className={`nube__termino nube__termino--${t.tipo}`}
            style={{ fontSize: `${14 + Math.sqrt(t.menciones / max) * 22}px` }}
            title={`${t.termino}: ${t.menciones} ${t.menciones === 1 ? 'mención' : 'menciones'}`}>
            {t.termino}
          </span>
        ))}
      </p>
    </div>
  )
}
