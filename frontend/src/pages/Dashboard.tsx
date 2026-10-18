import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Barras, Columnas, Dona, TablaDatos } from '../components/graficos/Graficos'
import { IconoAlerta, IconoDescargar, IconoIdea, IconoTabla } from '../components/Iconos'
import { useContextoAdmin, type SlugEncuesta } from '../lib/admin'
import { exportarCSV } from '../lib/exportar'
import { FILTROS, resumenDemo, type Grafico } from '../lib/resumen'

// Por ahora el Resumen usa datos ficticios. Para conectarlo a la base de datos,
// reemplazar `resumenDemo(...)` por una llamada a GET /admin/resumen/{slug}
// que devuelva un `DatosResumen` (ver lib/resumen.ts).
const DATOS_DE_DEMOSTRACION = true

function TarjetaGrafico({ g }: { g: Grafico }) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className={`grafico${g.ancho ? ' grafico--ancho' : ''}`}>
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
          : g.tipo === 'dona' ? <Dona datos={g.datos} />
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
            : 'Percepción del sector empleador sobre la demanda y la formación de los titulados.'}
        </p>
      </div>

      <div className="filtros">
        {FILTROS[encuesta].map((f) => (
          <label key={f.codigo} className="filtros__campo">
            <span>{f.etiqueta}</span>
            <select className="campo campo--select" value={filtros[f.codigo] ?? ''}
              onChange={(e) => setFiltros((x) => ({ ...x, [f.codigo]: e.target.value }))}>
              <option value="">{f.codigo === 'genero' ? 'Todos' : 'Todas'}</option>
              {f.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
          </label>
        ))}
        {Object.values(filtros).some(Boolean) && (
          <button type="button" className="boton-chico" onClick={() => setFiltros({})}>Limpiar filtros</button>
        )}
        <span className="filtros__conteo">{datos.total} de {datos.totalSinFiltros} respuestas</span>
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
            {datos.graficos.map((g) => <TarjetaGrafico key={g.id} g={g} />)}
          </div>
        </>
      )}
    </>
  )
}

export default function Dashboard() {
  const { encuesta } = useContextoAdmin()
  return (
    <>
      {DATOS_DE_DEMOSTRACION && (
        <div className="aviso-demo" role="note">
          <IconoAlerta />
          <p><strong>Estás viendo datos de demostración.</strong> Las cifras son ficticias y no representan a titulados ni empleadores reales.</p>
          <Link to="/admin/datos">Gestionar datos</Link>
        </div>
      )}
      {/* key: al cambiar de encuesta se reinician los filtros. */}
      <Resumen key={encuesta} encuesta={encuesta} />
    </>
  )
}
