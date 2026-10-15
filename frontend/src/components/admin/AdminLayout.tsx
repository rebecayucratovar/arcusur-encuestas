import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import type { ContextoAdmin, Resumen, SlugEncuesta } from '../../lib/admin'
import { useSesion } from '../../lib/sesion'
import { fetchAdmin } from '../../services/api'
import {
  EscudoUMSS, IconoComparar, IconoDatos, IconoEscenarios, IconoExterno, IconoGrafico, IconoResumen,
  IconoSalir, IconoTabla,
} from '../Iconos'

const MENU: { to: string; texto: string; icono: ReactNode }[] = [
  { to: '/admin', texto: 'Resumen', icono: <IconoResumen /> },
  { to: '/admin/respuestas', texto: 'Respuestas', icono: <IconoTabla /> },
  { to: '/admin/datos', texto: 'Datos', icono: <IconoDatos /> },
  { to: '/admin/analisis', texto: 'Análisis', icono: <IconoGrafico /> },
  { to: '/admin/escenarios', texto: 'Escenarios', icono: <IconoEscenarios /> },
  { to: '/admin/comparacion', texto: 'Empleadores vs. Titulados', icono: <IconoComparar /> },
]

// Cómo se muestra cada valor de tss_submissions.source.
const ORIGENES: Record<string, { texto: string; clase: string }> = {
  public_link: { texto: 'Formulario', clase: 'origen--formulario' },
  csv_import: { texto: 'CSV', clase: 'origen--csv' },
}

function iniciales(email: string) {
  return email.slice(0, 2).toUpperCase()
}

export default function AdminLayout() {
  const { admin, token, cerrarSesion } = useSesion()
  const [encuesta, setEncuesta] = useState<SlugEncuesta>('titulados')
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchAdmin(token, '/admin/resumen')
      .then((r) => (r.ok ? r.json() : null))
      .then(setResumen)
      .catch(() => setResumen(null))
  }, [token])

  const porOrigen = resumen?.[encuesta]?.por_origen ?? {}
  const origenes = { public_link: 0, csv_import: 0, ...porOrigen }

  return (
    <div className="admin">
      <aside className="admin__lateral">
        <div className="admin__marca">
          <EscudoUMSS />
          <div>
            <strong>Autoevaluación ARCUSUR</strong>
            <span>Ing. de Sistemas · UMSS</span>
          </div>
        </div>
        <nav className="admin__menu" aria-label="Secciones del panel">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.to === '/admin'}
              className={({ isActive }) => `admin__enlace${isActive ? ' admin__enlace--activo' : ''}`}>
              {m.icono}<span>{m.texto}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="admin__enlace admin__publicas"><IconoExterno /><span>Ver encuestas públicas</span></Link>
      </aside>

      <div className="admin__principal">
        <header className="admin__barra">
          <div className="admin__filtros">
            <span className="admin__rotulo">Encuesta</span>
            <div className="selector" role="tablist" aria-label="Encuesta">
              {(['titulados', 'empleadores'] as const).map((s) => (
                <button key={s} type="button" role="tab" aria-selected={encuesta === s}
                  className={`selector__opcion${encuesta === s ? ' selector__opcion--activa' : ''}`}
                  onClick={() => setEncuesta(s)}>
                  {s === 'titulados' ? 'Titulados' : 'Empleadores'}
                </button>
              ))}
            </div>
            <span className="admin__rotulo">Origen</span>
            {Object.entries(origenes).map(([origen, n]) => {
              const info = ORIGENES[origen] ?? { texto: origen, clase: '' }
              return <span key={origen} className={`origen ${info.clase}`}>{info.texto} <b>{n}</b></span>
            })}
          </div>

          <div className="usuario">
            <button type="button" className="usuario__boton" aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((v) => !v)}>
              <span className="usuario__avatar">{iniciales(admin?.email ?? '?')}</span>
              <span className="usuario__texto">
                <strong>Comité de Evaluación</strong>
                <small>{admin?.email}</small>
              </span>
            </button>
            {menuAbierto && (
              <div className="usuario__menu">
                <button type="button" onClick={cerrarSesion}><IconoSalir /> Cerrar sesión</button>
              </div>
            )}
          </div>
        </header>

        <main className="admin__contenido">
          <Outlet context={{ encuesta, resumen } satisfies ContextoAdmin} />
        </main>
      </div>
    </div>
  )
}
