import type { ReactNode } from 'react'
import type { Variable } from '../../lib/variables'
import { IconoDescargar } from '../Iconos'

export function SelectorVariable({ etiqueta, variables, valor, onChange }: {
  etiqueta: string; variables: Variable[]; valor: string; onChange: (codigo: string) => void
}) {
  const actual = variables.find((v) => v.codigo === valor)
  return (
    <label className="filtros__campo analisis__selector">
      <span>{etiqueta}</span>
      <select className="campo campo--select" value={valor} title={actual?.enunciado}
        onChange={(e) => onChange(e.target.value)}>
        {variables.map((v) => <option key={v.codigo} value={v.codigo}>{v.etiqueta}</option>)}
      </select>
    </label>
  )
}

export function BotonExportar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="boton boton--secundario" onClick={onClick}>
      <IconoDescargar /> Exportar matriz
    </button>
  )
}

/** Fila de controles de cada subpestaña: selectores a la izquierda, acciones a la derecha. */
export function Controles({ children, acciones }: { children: ReactNode; acciones: ReactNode }) {
  return (
    <div className="analisis__controles">
      <div className="analisis__selectores">{children}</div>
      <div className="analisis__acciones">{acciones}</div>
    </div>
  )
}

export function Aviso({ children, grave }: { children: ReactNode; grave?: boolean }) {
  return <div className={`analisis__aviso${grave ? ' analisis__aviso--grave' : ''}`} role="note">{children}</div>
}

export function Vacio({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <div className="estado-panel"><strong>{titulo}</strong>{children}</div>
}
