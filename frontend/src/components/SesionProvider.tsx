import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SesionContext, type Admin } from '../lib/sesion'
import { errorConfiguracion, supabase } from '../lib/supabase'
import { obtenerAdmin } from '../services/api'

export default function SesionProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Al abrir la app: si quedó una sesión guardada, se vuelve a verificar el rol.
  useEffect(() => {
    let activo = true
    supabase.auth.getSession()
      .then(async ({ data }) => {
        const t = data.session?.access_token
        if (!t) return
        try {
          const a = await obtenerAdmin(t)
          if (activo) { setAdmin(a); setToken(t) }
        } catch {
          await supabase.auth.signOut()
        }
      })
      .finally(() => activo && setCargando(false))

    // Supabase renueva el token solo; aquí se mantiene actualizado.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT') { setAdmin(null); setToken(null) }
      if (evento === 'TOKEN_REFRESHED' && s) setToken(s.access_token)
    })
    return () => { activo = false; subscription.unsubscribe() }
  }, [])

  const iniciarSesion = useCallback(async (email: string, clave: string) => {
    if (errorConfiguracion) throw new Error(errorConfiguracion)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error?.code === 'invalid_credentials') throw new Error('Correo o contraseña incorrectos.')
    if (error?.code === 'email_not_confirmed') throw new Error('La cuenta aún no fue confirmada.')
    if (error || !data.session) {
      throw new Error(`No se pudo conectar con Supabase${error ? `: ${error.message}` : '.'}`)
    }
    try {
      const a = await obtenerAdmin(data.session.access_token)
      setAdmin(a)
      setToken(data.session.access_token)
    } catch (e) {
      await supabase.auth.signOut()
      throw e
    }
  }, [])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const valor = useMemo(
    () => ({ cargando, admin, token, iniciarSesion, cerrarSesion }),
    [cargando, admin, token, iniciarSesion, cerrarSesion],
  )
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
