import { IconoInfo } from '../Iconos'

/** Página provisional de una sección del panel que aún no está implementada. */
export default function SeccionPendiente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <>
      <div className="admin__titulo">
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
      <div className="aviso-panel">
        <IconoInfo />
        <p>Esta sección está en desarrollo.</p>
      </div>
    </>
  )
}
