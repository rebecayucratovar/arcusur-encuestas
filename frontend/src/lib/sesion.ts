import { createContext, useContext } from 'react'

export interface Admin {
  id: string
  email: string
  role: string
}

export interface EstadoSesion {
  cargando: boolean
  admin: Admin | null
  /** Token para llamar a rutas protegidas del backend (Authorization: Bearer). */
  token: string | null
  iniciarSesion: (email: string, clave: string) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const SesionContext = createContext<EstadoSesion | null>(null)

export function useSesion(): EstadoSesion {
  const sesion = useContext(SesionContext)
  if (!sesion) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return sesion
}
