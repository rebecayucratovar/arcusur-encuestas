import { useMemo, useState } from 'react'
import { Barras, Columnas, Dona, TablaDatos } from '../components/graficos/Graficos'
import { IconoDescargar, IconoIdea, IconoTabla } from '../components/Iconos'
import { useContextoAdmin, type SlugEncuesta } from '../lib/admin'
import { exportarCSV } from '../lib/exportar'
import { FILTROS, resumenDemo, type Grafico } from '../lib/resumen'

// Por ahora el Resumen usa datos ficticios. Para conectarlo a la base de datos,
// reemplazar `resumenDemo(...)` por una llamada a GET /admin/resumen/{slug}
// que devuelva un `DatosResumen` (ver lib/resumen.ts) y poner
// DATOS_DE_DEMOSTRACION = false en ese archivo.

function TarjetaGrafico({ g, unidad }: { g: Grafico; unidad: string }) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className={`grafico grafico--${g.tamano ?? 'normal'}`}>
      <header className="grafico__cabecera">
        <div>
          <h2>{g.titulo}</h2>
          <p>{g.subtitulo}</p>
        </div>
        <div className="grafico__acciones">
          <button type="button" className="boton-chico" aria-pressed={verTabla} onClick={() => setVerTabla((v) => !v)}>
            <IconoTabla /> {verTabla ? 'Gráfico' : 'Tabla'}
          </button>
          <button type="button" className="boton-chico" onClick={() => exportarCSV(g.id, g.datos)}>
            <IconoDescargar /> Exportar
          </button>
        </div>
      </header>
      <div className="grafico__cuerpo">
        {verTabla ? <TablaDatos datos={g.datos} />
          : g.tipo === 'dona' ? <Dona datos={g.datos} unidad={unidad} />
            : g.tipo === 'columnas' ? <Columnas datos={g.datos} />
              : <Barras datos={g.datos} leyenda={g.leyendaDestacado} />}
      </div>
      <p className="grafico__hallazgo"><IconoIdea /> {g.hallazgo}</p>
    </section>
  )
}

function Resumen({ encuesta }: { encuesta: SlugEncuesta }) {
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const datos = useMemo(() => resumenDemo(encuesta, filtros), [encuesta, filtros])

  return (
    <>
      <div className="admin__titulo">
        <h1>Resumen</h1>
        <p>
          {encuesta === 'titulados'
            ? 'Indicadores clave de empleabilidad, satisfacción e interés en posgrado de los titulados.'
            : 'Indicadores clave de contratación y valoración de la Carrera por parte de los empleadores.'}
        </p>
      </div>

      <div className="filtros">
        {FILTROS[encuesta].map((f) => (
          <label key={f.codigo} className="filtros__campo">
            <span>{f.etiqueta}</span>
            <select className="campo campo--select" value={filtros[f.codigo] ?? ''}
              onChange={(e) => setFiltros((x) => ({ ...x, [f.codigo]: e.target.value }))}>
              <option value="">{f.todos ?? 'Todas'}</option>
              {f.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
          </label>
        ))}
        {Object.values(filtros).some(Boolean) && (
          <button type="button" className="boton-chico" onClick={() => setFiltros({})}>Limpiar filtros</button>
        )}
        <span className="filtros__conteo">{datos.total} de {datos.totalSinFiltros} {datos.unidad}</span>
      </div>

      {datos.total === 0 ? (
        <div className="aviso-panel"><p>Ninguna respuesta coincide con los filtros elegidos.</p></div>
      ) : (
        <>
          <div className="kpis">
            {datos.indicadores.map((k, i) => (
              <div key={k.titulo} className={`kpi${i === 0 ? ' kpi--destacado' : ''}`}>
                <span>{k.titulo}</span>
                <strong>{k.valor}</strong>
                <small>{k.detalle}</small>
              </div>
            ))}
          </div>
          <div className="graficos">
            {datos.graficos.map((g) => <TarjetaGrafico key={g.id} g={g} unidad={datos.unidad} />)}
          </div>
        </>
      )}
    </>
  )
}

export default function Dashboard() {
  const { encuesta } = useContextoAdmin()
  // key: al cambiar de encuesta se reinician los filtros.
  return <Resumen key={encuesta} encuesta={encuesta} />
}
