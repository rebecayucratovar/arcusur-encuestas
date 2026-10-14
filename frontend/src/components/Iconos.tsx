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

export const EscudoUMSS = () => (
  <svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true">
    <path d="M22 1 2 8v16c0 13 9 22 20 27 11-5 20-14 20-27V8L22 1Z" fill="#b0122d" />
    <path d="M22 6 7 11.5v12.5c0 10 6.5 17 15 21 8.5-4 15-11 15-21V11.5L22 6Z" fill="#14213d" />
    <text x="22" y="28" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700"
      fontFamily="Inter, sans-serif">UMSS</text>
  </svg>
)
