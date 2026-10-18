import type { ReactNode } from 'react'

function Icono({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconoBirrete = () => (
  <Icono size={22}>
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </Icono>
)

export const IconoEdificio = () => (
  <Icono size={22}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
  </Icono>
)

export const IconoReloj = () => (
  <Icono size={14}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icono>
)

export const IconoFlecha = () => (
  <Icono size={16}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icono>
)

export const IconoFlechaIzq = () => (
  <Icono size={16}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icono>
)

export const IconoEscudo = () => (
  <Icono size={22}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icono>
)

export const IconoCandado = () => (
  <Icono size={14}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icono>
)

export const IconoCheck = () => (
  <Icono size={32}>
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </Icono>
)

export const IconoOjo = ({ tachado }: { tachado?: boolean }) => (
  <Icono size={18}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {tachado && <path d="M3 3l18 18" />}
  </Icono>
)

export const IconoResumen = () => (
  <Icono size={18}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icono>
)
export const IconoTabla = () => (
  <Icono size={18}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></Icono>
)
export const IconoDatos = () => (
  <Icono size={18}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icono>
)
export const IconoGrafico = () => (
  <Icono size={18}><path d="M3 3v18h18M8 17v-5M12 17V8M16 17v-8M20 17v-3" /></Icono>
)
export const IconoEscenarios = () => (
  <Icono size={18}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icono>
)
export const IconoComparar = () => (
  <Icono size={18}><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9" /></Icono>
)
export const IconoExterno = () => (
  <Icono size={16}><path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Icono>
)
export const IconoSalir = () => (
  <Icono size={16}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></Icono>
)
export const IconoInfo = () => (
  <Icono size={18}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></Icono>
)
export const IconoMenu = () => (
  <Icono size={22}><path d="M4 6h16M4 12h16M4 18h16" /></Icono>
)
export const IconoCerrar = () => (
  <Icono size={20}><path d="M6 6l12 12M18 6 6 18" /></Icono>
)
export const IconoAlerta = () => (
  <Icono size={18}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></Icono>
)
export const IconoDescargar = () => (
  <Icono size={15}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icono>
)
export const IconoIdea = () => (
  <Icono size={16}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></Icono>
)
