import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Problema de configuración de frontend/.env, o null si está bien. */
export const errorConfiguracion: string | null =
  !url || !clave
    ? 'Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env.'
    : clave.startsWith('sb_secret_')
      ? 'frontend/.env tiene la clave SECRETA de Supabase; use la clave publicable (sb_publishable_…).'
      : null

if (errorConfiguracion) console.error(errorConfiguracion)

// Solo se usa para iniciar y cerrar sesión; los datos se piden al backend.
// Con una clave secreta no se crea el cliente real, para no exponerla en el navegador.
export const supabase = createClient(
  errorConfiguracion ? 'http://localhost' : url,
  errorConfiguracion ? 'sin-clave' : clave,
)
