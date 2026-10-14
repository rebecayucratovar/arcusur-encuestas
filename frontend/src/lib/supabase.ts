import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !clave) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env')
}

// Solo se usa para iniciar y cerrar sesión; los datos se piden al backend.
export const supabase = createClient(url ?? 'http://localhost', clave ?? 'sin-clave')
