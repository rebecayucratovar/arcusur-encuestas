import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { IconoArchivo, IconoBuscar, IconoCandado, IconoDescargar, IconoFlechaDer, IconoSubir } from '../components/Iconos'
import { infoOrigen, useContextoAdmin } from '../lib/admin'
import { cargarContactos } from '../lib/contactos'
import { DATOS_DE_DEMOSTRACION, useDatosEncuesta } from '../lib/datos'
import { archivoEjemplo, TOTAL_DEMO, type Contacto } from '../lib/demo'
import { exportarTablaCSV } from '../lib/exportar'
import {
  FECHA, importar, leerCsv, mapearColumnas, nombresPreguntas, preguntasImportables, revisar,
  type ColumnaCsv, type EstadoColumna, type ResultadoImportacion,
} from '../lib/importacion'
import { useSesion } from '../lib/sesion'
import type { Survey } from '../types'

const ESTADOS: Record<EstadoColumna, string> = { coincide: 'coincide', revisar: 'revisar', sin_mapear: 'sin mapear' }
const CONTACTOS_INICIALES = 8

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })

const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Lee el archivo como UTF-8; si trae caracteres inválidos, prueba con Windows-1252 (Excel en español). */
async function leerTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(bytes) : utf8
}

interface Archivo { nombre: string; encabezados: string[]; filas: string[][] }

// ---------------------------------------------------------------- importación

function Importador({ encuesta, slug }: { encuesta: Survey; slug: string }) {
  const { token } = useSesion()
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<Archivo | null>(null)
  const [columnas, setColumnas] = useState<ColumnaCsv[]>([])
  const [filtro, setFiltro] = useState<EstadoColumna | 'todas'>('todas')
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)

  const origenForms = slug === 'titulados' ? 'Microsoft Forms' : 'Google Forms'
  const nombres = useMemo(() => nombresPreguntas(encuesta), [encuesta])
  const opciones = useMemo(() => preguntasImportables(encuesta), [encuesta])
  const vista = useMemo(() => (archivo ? revisar(encuesta, columnas, archivo.filas) : null), [encuesta, columnas, archivo])

  const abrir = (nombre: string, texto: string) => {
    const tabla = leerCsv(texto)
    if (tabla.length < 2) {
      setError('El archivo no tiene filas de respuestas (o no es un CSV).')
      return
    }
    const [encabezados, ...filas] = tabla
    setArchivo({ nombre, encabezados, filas })
    setColumnas(mapearColumnas(encuesta, encabezados))
    setFiltro('todas')
    setError(null)
    setResultado(null)
  }
  const elegir = async (f: File | undefined) => {
    if (!f) return
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setError('Solo se aceptan archivos .csv. Si tiene un .xlsx, ábralo en Excel y guárdelo como "CSV UTF-8".')
      return
    }
    abrir(f.name, await leerTexto(f))
  }
  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegir(e.dataTransfer.files[0])
  }
  const cancelar = () => {
    setArchivo(null)
    setColumnas([])
    if (entrada.current) entrada.current.value = ''
  }

  const asignar = (indice: number, destino: string) => setColumnas((cs) => cs.map((c) => {
    if (c.indice === indice) return { ...c, destino: destino || null, estado: destino ? 'coincide' : 'sin_mapear' }
    // Cada pregunta (y la fecha) va en una sola columna: la anterior queda sin mapear.
    if (destino && c.destino === destino) return { ...c, destino: null, estado: 'sin_mapear' }
    return c
  }))

  const enviar = async () => {
    if (!token || !archivo || !vista) return
    setImportando(true)
    setError(null)
    try {
      setResultado(await importar(token, slug, archivo.nombre, vista.validas))
      cancelar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar el archivo.')
    } finally {
      setImportando(false)
    }
  }

  const conteo = (e: EstadoColumna) => columnas.filter((c) => c.estado === e).length
  const visibles = filtro === 'todas' ? columnas : columnas.filter((c) => c.estado === filtro)

  if (!archivo || !vista) {
    return (
      <>
        <div className={`carga${arrastrando ? ' carga--activa' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
          <span className="carga__icono"><IconoSubir /></span>
          <h2>Arrastre aquí el archivo CSV de la encuesta de {slug}</h2>
          <p>Compatible con exportaciones de {origenForms} · separador coma o punto y coma · UTF-8</p>
          <div className="carga__botones">
            <button type="button" className="boton boton--oscuro" onClick={() => entrada.current?.click()}>Seleccionar archivo</button>
            {DATOS_DE_DEMOSTRACION && (
              <button type="button" className="boton boton--secundario" onClick={() => { const e = archivoEjemplo(encuesta); abrir(e.nombre, e.texto) }}>
                <IconoArchivo /> Probar con archivo de ejemplo
              </button>
            )}
          </div>
          <input ref={entrada} type="file" accept=".csv,text/csv" hidden onChange={(e) => elegir(e.target.files?.[0])} />
        </div>
        {error && <p className="aviso-error" role="alert">{error}</p>}
        {resultado && (
          <p className="aviso-exito" role="status">
            Se importaron {resultado.importadas} respuestas.
            {resultado.rechazadas.length > 0 && ` El servidor rechazó ${resultado.rechazadas.length} (filas ${resultado.rechazadas.map((r) => r.fila).join(', ')}).`}
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <div className="archivo">
        <IconoArchivo />
        <div>
          <strong>{archivo.nombre}</strong>
          <span>{archivo.encabezados.length} columnas · {archivo.filas.length} filas · destino: encuesta de {slug}</span>
        </div>
        <button type="button" className="boton-texto" onClick={cancelar}>Cancelar</button>
      </div>

      <div className="importacion">
        <section className="tabla-panel importacion__mapeo">
          <header className="importacion__cabecera">
            <h2>Mapeo de columnas</h2>
            <div className="pildoras" role="group" aria-label="Filtrar columnas">
              {(['todas', 'coincide', 'revisar', 'sin_mapear'] as const).map((e) => (
                <button key={e} type="button" aria-pressed={filtro === e} className="pildora" onClick={() => setFiltro(e)}>
                  {e === 'todas' ? 'Todas' : e === 'coincide' ? 'Coincide' : e === 'revisar' ? 'Revisar' : 'Sin mapear'}{' '}
                  ({e === 'todas' ? columnas.length : conteo(e)})
                </button>
              ))}
            </div>
          </header>
          <div className="importacion__desplazable">
            <table className="tabla-datos mapeo">
              <thead>
                <tr><th scope="col">Encabezado del CSV</th><th aria-hidden="true" /><th scope="col">Variable</th><th scope="col">Estado</th></tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.indice}>
                    <td className="mapeo__encabezado" title={c.encabezado}>
                      <span>{c.encabezado || <em>(sin encabezado)</em>}</span>
                      {c.metadato && <small>{c.metadato}</small>}
                    </td>
                    <td className="mapeo__flecha" aria-hidden="true"><IconoFlechaDer /></td>
                    <td>
                      <select className="campo campo--select mapeo__select" value={c.destino ?? ''}
                        aria-label={`Variable para la columna ${c.encabezado}`} onChange={(e) => asignar(c.indice, e.target.value)}>
                        <option value="">— No importar —</option>
                        <option value={FECHA}>Fecha de envío</option>
                        {opciones.map((q) => <option key={q.code} value={q.code}>{nombres[q.code]}</option>)}
                      </select>
                    </td>
                    <td><span className={`estado-columna estado-columna--${c.estado}`}>{ESTADOS[c.estado]}</span></td>
                  </tr>
                ))}
                {visibles.length === 0 && <tr><td colSpan={4} className="tabla-respuestas__vacio">Ninguna columna en este estado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grafico importacion__reporte">
          <h2 className="analisis__titulo-tarjeta">Reporte de limpieza</h2>
          <div className="limpieza">
            <div><span>Filas leídas</span><strong>{vista.filasLeidas}</strong></div>
            <div><span>Válidas</span><strong className="limpieza--valida">{vista.validas.length}</strong></div>
            <div><span>Descartadas</span><strong className="limpieza--descartada">{vista.descartadas}</strong></div>
            <div><span>Atípicos</span><strong className="limpieza--atipico">{vista.atipicos}</strong></div>
          </div>
          <h3 className="limpieza__titulo">Problemas detectados</h3>
          {vista.problemas.length === 0 ? <p className="analisis__nota">Ninguno.</p> : (
            <ul className="problemas">
              {vista.problemas.map((p, i) => (
                <li key={i} className={`problema problema--${p.tipo}`}>{p.fila !== null && <b>Fila {p.fila}: </b>}{p.texto}</li>
              ))}
            </ul>
          )}
          <p className="analisis__nota">Las filas se numeran como en Excel (la 1 es el encabezado). Los atípicos se conservan; solo se señalan.</p>
          <button type="button" className="boton importacion__boton" onClick={enviar} disabled={importando || vista.validas.length === 0}>
            {importando ? 'Importando…' : `Importar ${vista.validas.length} ${vista.validas.length === 1 ? 'fila válida' : 'filas válidas'}`}
          </button>
          {error && <p className="pregunta__error" role="alert">{error}</p>}
        </section>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- contactos

function Contactos({ encuesta, slug }: { encuesta: Survey; slug: string }) {
  const { token } = useSesion()
  const [estado, setEstado] = useState<{ slug: string; lista?: Contacto[]; error?: string }>({ slug })
  const [busqueda, setBusqueda] = useState('')
  const [todos, setTodos] = useState(false)

  useEffect(() => {
    if (!token) return
    let activo = true
    cargarContactos(token, encuesta)
      .then((lista) => activo && setEstado({ slug, lista }))
      .catch((e: Error) => activo && setEstado({ slug, error: e.message }))
    return () => { activo = false }
  }, [token, encuesta, slug])

  const lista = useMemo(() => (estado.slug === slug ? estado.lista ?? [] : []), [estado, slug])
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return q ? lista.filter((c) => [c.email, c.phone, c.linkedin_url].some((x) => x && normalizar(x).includes(q))) : lista
  }, [lista, busqueda])
  const conTelefono = lista.some((c) => c.phone)
  const conLinkedin = lista.some((c) => c.linkedin_url)
  const visibles = todos ? filtrados : filtrados.slice(0, CONTACTOS_INICIALES)

  const exportar = () => {
    if (!window.confirm('El archivo contendrá datos personales. Úselo solo dentro del Comité y no lo comparta. ¿Descargar?')) return
    exportarTablaCSV(`contactos-${slug}`, [
      ['Email', ...(conTelefono ? ['Teléfono'] : []), ...(conLinkedin ? ['LinkedIn'] : []), 'Fecha', 'Origen'],
      ...filtrados.map((c) => [c.email, ...(conTelefono ? [c.phone] : []), ...(conLinkedin ? [c.linkedin_url] : []),
        fechaCorta(c.submitted_at), infoOrigen(c.source).texto]),
    ])
  }

  return (
    <section className="tabla-panel contactos">
      <header className="contactos__cabecera">
        <div>
          <h2>Datos de contacto {slug === 'titulados' ? '(red de contactos)' : '(empleadores)'}</h2>
          <p><IconoCandado /> Almacenados por separado de las respuestas; no se usan en ningún análisis.</p>
        </div>
        <div className="contactos__acciones">
          <span className="busqueda">
            <IconoBuscar />
            <input type="search" className="campo" placeholder="Buscar contacto" aria-label="Buscar contacto"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </span>
          <button type="button" className="boton boton--secundario" onClick={exportar} disabled={filtrados.length === 0}>
            <IconoDescargar /> Exportar contactos
          </button>
        </div>
      </header>
      {estado.error ? <p className="contactos__vacio">{estado.error}</p> : lista.length === 0 ? (
        <p className="contactos__vacio">Todavía no hay datos de contacto.</p>
      ) : (
        <>
          <div className="tabla-panel__desplazable">
            <table className="tabla-datos tabla-datos--grande">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  {conTelefono && <th scope="col">Teléfono</th>}
                  {conLinkedin && <th scope="col">LinkedIn</th>}
                  <th scope="col">Fecha</th><th scope="col">Origen</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const origen = infoOrigen(c.source)
                  return (
                    <tr key={c.submission_id}>
                      <td className="contactos__email">{c.email ?? '—'}</td>
                      {conTelefono && <td>{c.phone ?? '—'}</td>}
                      {conLinkedin && <td className="contactos__enlace" title={c.linkedin_url ?? undefined}>{c.linkedin_url ?? '—'}</td>}
                      <td>{fechaCorta(c.submitted_at)}</td>
                      <td><span className={`origen origen--fila ${origen.clase}`}>{origen.texto}</span></td>
                    </tr>
                  )
                })}
                {visibles.length === 0 && <tr><td colSpan={5} className="tabla-respuestas__vacio">Ningún contacto coincide con la búsqueda.</td></tr>}
              </tbody>
            </table>
          </div>
          {filtrados.length > CONTACTOS_INICIALES && (
            <button type="button" className="contactos__mas" onClick={() => setTodos((v) => !v)}>
              {todos ? 'Ver menos' : `Ver los ${filtrados.length} contactos`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- página

export default function Datos() {
  const { encuesta: slug, origenes, alternarOrigen } = useContextoAdmin()
  const datos = useDatosEncuesta(slug, origenes)
  const demoVisible = origenes.includes('demo')

  return (
    <>
      <div className="admin__titulo">
        <h1>Datos</h1>
        <p>
          Importe respuestas exportadas desde {slug === 'titulados' ? 'Microsoft Forms' : 'Google Forms'}, revise el mapeo
          de columnas y controle la calidad antes de incorporarlas al análisis.
        </p>
      </div>

      {datos.error ? <div className="estado-panel"><strong>No se pudo cargar la encuesta</strong>{datos.error}</div>
        : !datos.encuesta ? <div className="estado-panel">Cargando…</div> : (
          <>
            <Importador key={slug} encuesta={datos.encuesta} slug={slug} />

            {/* Temporal: quitar junto con DATOS_DE_DEMOSTRACION cuando el panel use datos reales. */}
            {DATOS_DE_DEMOSTRACION && (
              <section className="demo-tarjeta">
                <div>
                  <h2>Datos de demostración</h2>
                  <p>
                    Hay {TOTAL_DEMO[slug]} respuestas ficticias de {slug}, generadas en el navegador: no están en la base de
                    datos. Para quitarlas del todo, ponga <code>DATOS_DE_DEMOSTRACION = false</code> en <code>lib/datos.ts</code>.
                  </p>
                </div>
                <button type="button" className="boton boton--secundario" onClick={() => alternarOrigen('demo')}>
                  {demoVisible ? 'Ocultar en el panel' : 'Mostrar en el panel'}
                </button>
              </section>
            )}

            <Contactos encuesta={datos.encuesta} slug={slug} />
          </>
        )}
    </>
  )
}
