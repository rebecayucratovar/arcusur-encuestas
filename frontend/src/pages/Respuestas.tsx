import { useMemo, useState } from 'react'
import { IconoBuscar, IconoDescargar } from '../components/Iconos'
import { useContextoAdmin, type SlugEncuesta } from '../lib/admin'
import { exportarExcel } from '../lib/excel'
import { exportarTablaCSV } from '../lib/exportar'
import {
  COLUMNAS, FILTRO_TABLA, ORIGENES, respuestasDemo, textoCelda, type FilaRespuesta,
} from '../lib/respuestas'

// Por ahora la tabla usa respuestas ficticias. Para conectarla a la base de datos,
// reemplazar `respuestasDemo(...)` por GET /admin/respuestas/{slug} (ver lib/respuestas.ts).

const POR_PAGINA = 25

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })

const fechaCompleta = (iso: string) => {
  const d = new Date(iso)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`
}

/** Minúsculas y sin tildes, para que "educacion" encuentre "Educación". */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Tabla({ encuesta }: { encuesta: SlugEncuesta }) {
  const columnas = COLUMNAS[encuesta]
  const filtro = columnas.find((c) => c.codigo === FILTRO_TABLA[encuesta])!
  const todas = useMemo(
    () => [...respuestasDemo(encuesta)].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [encuesta],
  )

  const [busqueda, setBusqueda] = useState('')
  const [valorFiltro, setValorFiltro] = useState('')
  const [pagina, setPagina] = useState(0)

  const filas = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return todas.filter((f) => {
      if (valorFiltro && String(f.valores[filtro.codigo]) !== valorFiltro) return false
      if (!q) return true
      const textos = [f.id, ...columnas.map((c) => textoCelda(c, f.valores[c.codigo]))]
      return textos.some((t) => normalizar(t).includes(q))
    })
  }, [todas, busqueda, valorFiltro, filtro.codigo, columnas])

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = filas.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA)

  const tablaExportable = () => [
    ['ID', 'Fecha', 'Origen', ...columnas.map((c) => c.titulo)],
    ...filas.map((f: FilaRespuesta) => [
      f.id, fechaCompleta(f.fecha), ORIGENES[f.origen]?.texto ?? f.origen,
      ...columnas.map((c) => textoCelda(c, f.valores[c.codigo])),
    ]),
  ]
  const nombreArchivo = `respuestas-${encuesta}`

  return (
    <>
      <div className="admin__titulo admin__titulo--acciones">
        <div>
          <h1>Respuestas</h1>
          <p>Registro individual de respuestas. Los datos de contacto de la red de titulados se gestionan por separado en Datos.</p>
        </div>
        <div className="admin__acciones">
          <button type="button" className="boton boton--secundario" onClick={() => exportarTablaCSV(nombreArchivo, tablaExportable())}>
            <IconoDescargar /> Exportar CSV
          </button>
          <button type="button" className="boton boton--oscuro"
            onClick={() => exportarExcel(nombreArchivo, encuesta === 'titulados' ? 'Titulados' : 'Empleadores', tablaExportable())}>
            <IconoDescargar /> Exportar Excel
          </button>
        </div>
      </div>

      <section className="tabla-panel">
        <div className="tabla-panel__filtros">
          <label className="filtros__campo filtros__campo--busqueda">
            <span>Buscar</span>
            <span className="busqueda">
              <IconoBuscar />
              <input type="search" className="campo" value={busqueda}
                placeholder={encuesta === 'titulados' ? 'ID, edad, situación…' : 'ID, organización, rubro…'}
                onChange={(e) => { setBusqueda(e.target.value); setPagina(0) }} />
            </span>
          </label>
          <label className="filtros__campo">
            <span>{encuesta === 'titulados' ? 'Situación laboral' : 'Tipo de organización'}</span>
            <select className="campo campo--select" value={valorFiltro}
              onChange={(e) => { setValorFiltro(e.target.value); setPagina(0) }}>
              <option value="">Todos</option>
              {Object.entries(filtro.etiquetas ?? {}).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          <span className="filtros__conteo"><strong>{filas.length}</strong> respuestas</span>
        </div>

        <div className="tabla-panel__desplazable">
          <table className="tabla-respuestas">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Fecha</th>
                <th scope="col">Origen</th>
                {columnas.map((c) => <th key={c.codigo} scope="col">{c.titulo}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const origen = ORIGENES[f.origen] ?? { texto: f.origen, clase: '' }
                return (
                  <tr key={f.id}>
                    <th scope="row">{f.id}</th>
                    <td className="tabla-respuestas__fecha">{fechaCorta(f.fecha)}</td>
                    <td><span className={`origen origen--fila ${origen.clase}`}>{origen.texto}</span></td>
                    {columnas.map((c) => {
                      const t = textoCelda(c, f.valores[c.codigo])
                      return <td key={c.codigo} className={c.recortar ? 'tabla-respuestas__recortar' : undefined} title={c.recortar ? t : undefined}>{t}</td>
                    })}
                  </tr>
                )
              })}
              {visibles.length === 0 && (
                <tr><td colSpan={columnas.length + 3} className="tabla-respuestas__vacio">Ninguna respuesta coincide con la búsqueda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filas.length > POR_PAGINA && (
          <div className="paginacion">
            <span>Mostrando {actual * POR_PAGINA + 1}–{Math.min((actual + 1) * POR_PAGINA, filas.length)} de {filas.length}</span>
            <div>
              <button type="button" className="boton-chico" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button>
              <span className="paginacion__pagina">Página {actual + 1} de {paginas}</span>
              <button type="button" className="boton-chico" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default function Respuestas() {
  const { encuesta } = useContextoAdmin()
  // key: al cambiar de encuesta se reinician la búsqueda, el filtro y la página.
  return <Tabla key={encuesta} encuesta={encuesta} />
}
