import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'

/** Envuelve las páginas del Comité: sin sesión de administrador, redirige al login. */
export default function RutaAdmin({ children }: { children: ReactNode }) {
  const { admin, cargando } = useSesion()
  const { pathname } = useLocation()

  if (cargando) {
    return <main className="estado"><p className="estado__cargando">Verificando sesión…</p></main>
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ desde: pathname }} />
  return children
}
