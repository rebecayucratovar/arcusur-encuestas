import type { ReactNode } from 'react'

interface Props {
  cargando: boolean
  error: string | null
  origenes: string[]
  total: number
  children: ReactNode
}

/** Muestra el contenido de una pestaña solo cuando hay respuestas que mostrar. */
export default function EstadoDatos({ cargando, error, origenes, total, children }: Props) {
  if (error) {
    return <div className="estado-panel"><strong>No se pudieron cargar los datos</strong>{error}</div>
  }
  if (cargando) {
    return <div className="estado-panel">Cargando respuestas…</div>
  }
  if (origenes.length === 0) {
    return (
      <div className="estado-panel">
        <strong>Ningún origen seleccionado</strong>
        Elija Formulario, CSV o Demostración en la barra superior.
      </div>
    )
  }
  if (total === 0) {
    return (
      <div className="estado-panel">
        <strong>Sin respuestas para los orígenes elegidos</strong>
        Todavía no hay respuestas de ese origen en esta encuesta.
      </div>
    )
  }
  return <>{children}</>
}
