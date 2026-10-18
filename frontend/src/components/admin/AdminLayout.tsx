import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ORIGENES, type ContextoAdmin, type Resumen, type SlugEncuesta } from '../../lib/admin'
import logoUmss from '../../assets/logo-umss.png'
import { DATOS_DE_DEMOSTRACION } from '../../lib/datos'
import { TOTAL_DEMO } from '../../lib/demo'
import { useSesion } from '../../lib/sesion'
import { fetchAdmin } from '../../services/api'
import {
  IconoAlerta, IconoCerrar, IconoComparar, IconoDatos, IconoEscenarios, IconoExterno, IconoGrafico, IconoMenu,
  IconoResumen, IconoSalir, IconoTabla,
} from '../Iconos'

const MENU: { to: string; texto: string; icono: ReactNode }[] = [
  { to: '/admin', texto: 'Resumen', icono: <IconoResumen /> },
  { to: '/admin/respuestas', texto: 'Respuestas', icono: <IconoTabla /> },
  { to: '/admin/datos', texto: 'Datos', icono: <IconoDatos /> },
  { to: '/admin/analisis', texto: 'Análisis', icono: <IconoGrafico /> },
  { to: '/admin/escenarios', texto: 'Escenarios', icono: <IconoEscenarios /> },
  { to: '/admin/comparacion', texto: 'Empleadores vs. Titulados', icono: <IconoComparar /> },
]

// La demostración solo se ofrece mientras el panel use datos ficticios.
const ORIGENES_DISPONIBLES = ORIGENES.filter((o) => o.valor !== 'demo' || DATOS_DE_DEMOSTRACION)

function iniciales(email: string) {
  return email.slice(0, 2).toUpperCase()
}

export default function AdminLayout() {
  const { admin, token, cerrarSesion } = useSesion()
  const [encuesta, setEncuesta] = useState<SlugEncuesta>('titulados')
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  // Orígenes de respuestas que se muestran (filtro de la barra superior; varios a la vez).
  const [origenes, setOrigenes] = useState<string[]>(() => ORIGENES_DISPONIBLES.map((o) => o.valor))
  const alternarOrigen = (valor: string) =>
    setOrigenes((sel) => (sel.includes(valor) ? sel.filter((v) => v !== valor) : [...sel, valor]))
  // Menú lateral en celular (en escritorio siempre está visible).
  const [lateralAbierto, setLateralAbierto] = useState(false)
  const cerrarLateral = () => setLateralAbierto(false)

  useEffect(() => {
    if (!lateralAbierto) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setLateralAbierto(false)
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [lateralAbierto])

  useEffect(() => {
    if (!token) return
    fetchAdmin(token, '/admin/resumen')
      .then((r) => (r.ok ? r.json() : null))
      .then(setResumen)
      .catch(() => setResumen(null))
  }, [token])

  const conteo = (valor: string) =>
    valor === 'demo' ? TOTAL_DEMO[encuesta] : resumen?.[encuesta]?.por_origen[valor] ?? 0

  return (
    <div className="admin">
      {lateralAbierto && <div className="admin__fondo" onClick={cerrarLateral} aria-hidden="true" />}
      <aside id="menu-lateral" className={`admin__lateral${lateralAbierto ? ' admin__lateral--abierto' : ''}`}>
        <button type="button" className="admin__cerrar" onClick={cerrarLateral} aria-label="Cerrar menú">
          <IconoCerrar />
        </button>
        <div className="admin__marca">
          <span className="admin__logo">
            <img src={logoUmss} alt="Universidad Mayor de San Simón" />
          </span>
          <div>
            <strong>Autoevaluación ARCUSUR</strong>
            <span>Ingeniería de Sistemas</span>
          </div>
        </div>
        <nav className="admin__menu" aria-label="Secciones del panel">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.to === '/admin'} onClick={cerrarLateral}
              className={({ isActive }) => `admin__enlace${isActive ? ' admin__enlace--activo' : ''}`}>
              {m.icono}<span>{m.texto}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="admin__enlace admin__publicas"><IconoExterno /><span>Ver encuestas públicas</span></Link>
      </aside>

      <div className="admin__principal">
        <header className="admin__barra">
          <button type="button" className="admin__hamburguesa" onClick={() => setLateralAbierto(true)}
            aria-label="Abrir menú" aria-controls="menu-lateral" aria-expanded={lateralAbierto}>
            <IconoMenu />
          </button>
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
            <span className="admin__rotulo" id="rotulo-origen">Origen</span>
            <div className="origenes" role="group" aria-labelledby="rotulo-origen">
              {ORIGENES_DISPONIBLES.map((o) => {
                const activo = origenes.includes(o.valor)
                return (
                  <button key={o.valor} type="button" aria-pressed={activo}
                    className={`origen origen--boton ${o.clase}${activo ? '' : ' origen--inactivo'}`}
                    title={activo ? `Ocultar respuestas de ${o.texto}` : `Mostrar respuestas de ${o.texto}`}
                    onClick={() => alternarOrigen(o.valor)}>
                    {o.texto} <b>{conteo(o.valor)}</b>
                  </button>
                )
              })}
            </div>
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

        {DATOS_DE_DEMOSTRACION && (
          <div className="aviso-demo" role="note">
            <IconoAlerta />
            <p><strong>Estás viendo datos de demostración.</strong> Las cifras son ficticias y no representan a titulados ni empleadores reales.</p>
            <Link to="/admin/datos" onClick={cerrarLateral}>Gestionar datos</Link>
          </div>
        )}

        <main className="admin__contenido">
          <Outlet context={{ encuesta, resumen, origenes, alternarOrigen } satisfies ContextoAdmin} />
        </main>
      </div>
    </div>
  )
}
