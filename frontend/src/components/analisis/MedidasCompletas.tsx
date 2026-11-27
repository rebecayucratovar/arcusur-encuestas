import { useState } from 'react'
import type { Fila } from '../../lib/demo'
import { resumen, tablaIntervalos, type Resumen } from '../../lib/estadistica'
import { exportarExcel } from '../../lib/excel'
import { num, pct } from '../../lib/formato'
import { Columnas } from '../graficos/Graficos'
import { DiagramaCaja, Lineas } from '../graficos/GraficosAvanzados'
import { BotonExportar } from './Comunes'

type Codigo = 'anios_profesional' | 'anios_desempleado'

const VARIABLES: Record<Codigo, { etiqueta: string; ancho: number }> = {
  anios_profesional: { etiqueta: 'Años de vida profesional', ancho: 5 },
  anios_desempleado: { etiqueta: 'Años desempleado', ancho: 1 },
}

const numero = (f: Fila, codigo: string) => {
  const v = f[codigo]
  return v === undefined || v === '' ? NaN : Number(v)
}

/** Valores válidos de la variable. El desempleo solo cuenta en filas con años de vida profesional válidos. */
function valoresDe(filas: Fila[], codigo: Codigo): number[] {
  const conAnios = filas.filter((f) => Number.isFinite(numero(f, 'anios_profesional')))
  return conAnios.map((f) => numero(f, codigo)).filter((x) => Number.isFinite(x))
}

const n2 = (x: number) => num(x, 2)
const posicion = (p: number, n: number) => 1 + p * (n - 1)

function lecturaAsimetria(a: number | null) {
  if (a === null) return 'Se necesitan al menos 3 datos.'
  if (Math.abs(a) < 0.5) return 'Aproximadamente simétrica.'
  return a > 0 ? 'Asimétrica a la derecha: unos pocos valores altos alargan la cola y elevan la media.'
    : 'Asimétrica a la izquierda: unos pocos valores bajos alargan la cola.'
}

function filasMedidas(r: Resumen) {
  const modas = r.modas.length ? `${r.modas.map((m) => num(m)).join(' y ')} (${r.frecuenciaModa} veces)` : 'No hay (ningún valor se repite)'
  return {
    central: [
      ['Media', 'x̄ = Σxᵢ / n', `${num(r.suma, 2)} / ${r.n} = ${n2(r.media)}`, 'Promedio; sensible a los valores extremos.'],
      ['Mediana', 'Dato en la posición (n + 1) / 2', `Posición ${num((r.n + 1) / 2, 1)}: ${num(r.mediana)}`, `El 50% tiene ${num(r.mediana)} o menos. Representa mejor al caso típico si la distribución es asimétrica.`],
      ['Moda', 'Valor con mayor frecuencia', modas, 'El valor más común.'],
    ],
    dispersion: [
      ['Rango', 'Máx − Mín', `${num(r.max)} − ${num(r.min)} = ${num(r.rango)}`, 'Amplitud total; depende solo de dos datos.'],
      ['Varianza', 's² = Σ(xᵢ − x̄)² / (n − 1)', `${num(r.sumaCuadrados, 2)} / ${r.n - 1} = ${n2(r.varianza)}`, 'Se divide entre n − 1 porque es una muestra (estimador insesgado).'],
      ['Desviación estándar', 's = √s²', `√${n2(r.varianza)} = ${n2(r.de)}`, 'Distancia típica de los datos a la media, en la misma unidad.'],
      ['Coeficiente de variación', 'CV = (s / x̄) × 100', r.cv === null ? 'No definido (media 0)' : `${n2(r.de)} / ${n2(r.media)} × 100 = ${pct(r.cv)}`,
        r.cv === null ? '—' : r.cv > 30 ? 'Mayor que 30%: datos heterogéneos; la media sola no los resume.' : 'Hasta 30%: datos relativamente homogéneos.'],
    ],
    posicion: [
      ['Q1 (percentil 25)', 'Posición 1 + 0,25(n − 1)', `Posición ${num(posicion(0.25, r.n), 2)}: ${num(r.q1, 2)}`, `El 25% tiene ${num(r.q1, 2)} o menos.`],
      ['Q2 (mediana)', 'Posición 1 + 0,50(n − 1)', `Posición ${num(posicion(0.5, r.n), 2)}: ${num(r.mediana, 2)}`, 'Divide los datos en dos mitades.'],
      ['Q3 (percentil 75)', 'Posición 1 + 0,75(n − 1)', `Posición ${num(posicion(0.75, r.n), 2)}: ${num(r.q3, 2)}`, `El 25% supera ${num(r.q3, 2)}.`],
      ['P90', 'Posición 1 + 0,90(n − 1)', `Posición ${num(posicion(0.9, r.n), 2)}: ${num(r.p90, 2)}`, `El 90% tiene ${num(r.p90, 2)} o menos.`],
      ['Rango intercuartílico', 'RIC = Q3 − Q1', `${num(r.q3, 2)} − ${num(r.q1, 2)} = ${num(r.ric, 2)}`, 'Amplitud del 50% central; no la afectan los extremos.'],
      ['Vallas de Tukey', 'Q1 − 1,5·RIC y Q3 + 1,5·RIC', `${num(r.vallaInferior, 2)} y ${num(r.vallaSuperior, 2)}`,
        r.atipicos.length ? `${r.atipicos.length} atípico(s): ${r.atipicos.map((x) => num(x)).join(', ')}` : 'Sin valores atípicos.'],
    ],
    forma: [
      ['Asimetría', 'Coeficiente muestral (como Excel)', r.asimetria === null ? '—' : n2(r.asimetria), lecturaAsimetria(r.asimetria)],
    ],
  }
}

function TablaMedidas({ titulo, filas }: { titulo: string; filas: string[][] }) {
  return (
    <section className="tabla-panel medidas__bloque">
      <header className="analisis__cabecera-tabla"><h2>{titulo}</h2></header>
      <div className="tabla-panel__desplazable">
        <table className="tabla-datos tabla-datos--grande medidas__tabla">
          <thead><tr><th scope="col">Medida</th><th scope="col">Fórmula</th><th scope="col">Cálculo</th><th scope="col">Lectura</th></tr></thead>
          <tbody>
            {filas.map(([m, f, c, l]) => (
              <tr key={m}><th scope="row">{m}</th><td className="medidas__formula">{f}</td><td><strong>{c}</strong></td><td className="tabla-datos__suave">{l}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function MedidasCompletas({ filas, slug }: { filas: Fila[]; slug: string }) {
  const [codigo, setCodigo] = useState<Codigo>('anios_profesional')
  const variable = VARIABLES[codigo]
  const valores = valoresDe(filas, codigo)
  const r = resumen(valores)
  if (!r) return null
  const tabla = tablaIntervalos(valores, variable.ancho)
  const m = filasMedidas(r)
  const ordenados = [...valores].sort((a, b) => a - b)
  const bigoteInf = ordenados.find((x) => x >= r.vallaInferior) ?? r.min
  const bigoteSup = [...ordenados].reverse().find((x) => x <= r.vallaSuperior) ?? r.max

  const exportar = () => exportarExcel(`medidas-${codigo}-${slug}`, 'Medidas', [
    [variable.etiqueta, `n = ${r.n}`],
    ['Medida', 'Fórmula', 'Cálculo', 'Lectura'],
    ...[...m.central, ...m.dispersion, ...m.posicion, ...m.forma],
    [],
    ['Intervalo', 'Marca de clase', 'fi', 'hi', 'Fi', 'Hi'],
    ...tabla.map((t) => [t.etiqueta, t.marca, t.fi, Number(t.hi.toFixed(4)), t.Fi, Number(t.Hi.toFixed(4))]),
    ['Total', '', r.n, 1, '', ''],
  ])

  return (
    <div className="medidas">
      <div className="analisis__controles">
        <div className="selector" role="group" aria-label="Variable cuantitativa">
          {(Object.keys(VARIABLES) as Codigo[]).map((c) => (
            <button key={c} type="button" aria-pressed={codigo === c}
              className={`selector__opcion${codigo === c ? ' selector__opcion--activa' : ''}`} onClick={() => setCodigo(c)}>
              {VARIABLES[c].etiqueta}
            </button>
          ))}
        </div>
        <BotonExportar onClick={exportar} />
      </div>
      <p className="analisis__nota">
        {variable.etiqueta}: n = {r.n} valores válidos. Cuartiles y percentiles con interpolación lineal, igual que CUARTIL.INC y PERCENTIL.INC de Excel.
        {codigo === 'anios_desempleado' && ' Solo cuentan las filas que también tienen años de vida profesional válidos.'}
      </p>

      <TablaMedidas titulo="Medidas de tendencia central" filas={m.central} />
      <TablaMedidas titulo="Medidas de dispersión" filas={m.dispersion} />
      <TablaMedidas titulo="Medidas de posición" filas={m.posicion} />
      <TablaMedidas titulo="Forma de la distribución" filas={m.forma} />

      <div className="analisis__dos">
        <section className="tabla-panel">
          <header className="analisis__cabecera-tabla"><h2>Tabla de frecuencias por intervalos</h2><p>Intervalos [a, b) de {variable.ancho} {variable.ancho === 1 ? 'año' : 'años'}</p></header>
          <div className="tabla-panel__desplazable">
            <table className="tabla-datos">
              <thead><tr><th scope="col">Intervalo</th><th scope="col">Marca</th><th scope="col">fi</th><th scope="col">hi</th><th scope="col">Fi</th><th scope="col">Hi</th></tr></thead>
              <tbody>
                {tabla.map((t) => (
                  <tr key={t.etiqueta}><td>{t.etiqueta}</td><td>{num(t.marca)}</td><td>{t.fi}</td><td>{pct(t.hi * 100)}</td><td>{t.Fi}</td><td>{pct(t.Hi * 100)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td /><td>{r.n}</td><td>100%</td><td /><td /></tr></tfoot>
            </table>
          </div>
        </section>
        <section className="grafico">
          <header className="grafico__cabecera"><div><h2>Histograma</h2><p>Frecuencia absoluta por intervalo</p></div></header>
          <div className="grafico__cuerpo">
            <Columnas datos={tabla.map((t) => ({ clave: t.etiqueta, etiqueta: t.etiqueta, valor: t.fi }))} />
          </div>
        </section>
      </div>

      <div className="analisis__dos analisis__dos--parejo">
        <section className="grafico">
          <header className="grafico__cabecera"><div><h2>Ojiva</h2><p>Frecuencia relativa acumulada (%) en el límite superior de cada intervalo</p></div></header>
          <div className="grafico__cuerpo">
            <Lineas etiquetas={[tabla[0].desde, ...tabla.map((t) => t.hasta)]}
              series={[{ nombre: 'Hi (%)', color: 'var(--serie-1)', valores: [0, ...tabla.map((t) => Math.round(t.Hi * 1000) / 10)] }]} />
          </div>
        </section>
        <section className="grafico">
          <header className="grafico__cabecera"><div><h2>Diagrama de caja</h2><p>Valla superior = Q3 + 1,5 × RIC = {num(r.vallaSuperior, 2)}</p></div></header>
          <div className="grafico__cuerpo">
            <DiagramaCaja min={bigoteInf} q1={r.q1} mediana={r.mediana} q3={r.q3} max={bigoteSup}
              media={r.media} atipicos={r.atipicos} valla={r.vallaSuperior} />
          </div>
        </section>
      </div>
    </div>
  )
}
