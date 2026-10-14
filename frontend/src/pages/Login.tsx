import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { EscudoUMSS, IconoFlechaIzq, IconoOjo } from '../components/Iconos'
import { useSesion } from '../lib/sesion'

export default function Login() {
  const { admin, cargando, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const destino = (useLocation().state as { desde?: string } | null)?.desde ?? '/admin'

  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && admin) return <Navigate to={destino} replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(email.trim(), clave)
      navegar(destino, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <form className="login__tarjeta" onSubmit={enviar} noValidate>
        <div className="login__marca">
          <EscudoUMSS />
          <h1>Comité de Evaluación</h1>
          <p>Sistema de encuestas y análisis · ARCUSUR</p>
        </div>

        <label className="login__etiqueta" htmlFor="login-email">Correo electrónico</label>
        <input id="login-email" className="campo" type="email" autoComplete="username" required
          placeholder="nombre@umss.edu" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="login__etiqueta" htmlFor="login-clave">Contraseña</label>
        <div className="login__clave">
          <input id="login-clave" className="campo" type={verClave ? 'text' : 'password'}
            autoComplete="current-password" required placeholder="••••••••"
            value={clave} onChange={(e) => setClave(e.target.value)} />
          <button type="button" className="login__ojo" onClick={() => setVerClave((v) => !v)}
            aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verClave}>
            <IconoOjo tachado={verClave} />
          </button>
        </div>

        {error && <p className="pregunta__error" role="alert">{error}</p>}

        <button type="submit" className="boton login__boton" disabled={enviando || !email || !clave}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <Link to="/" className="enlace login__volver"><IconoFlechaIzq /> Volver a las encuestas</Link>
    </main>
  )
}
