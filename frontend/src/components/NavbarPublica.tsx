import { Link } from 'react-router-dom'
import logoFcyt from '../assets/FINALFCYT-HORIZONTAL@2x-scaled.png'
import logoUmss from '../assets/logo-umss.png'

/** Barra superior de las páginas públicas (portada y encuestas). */
export default function NavbarPublica() {
  return (
    <header className="navbar">
      <div className="navbar__contenido">
        <Link to="/" className="navbar__marca" aria-label="Universidad Mayor de San Simón · Inicio">
          <img src={logoUmss} alt="Universidad Mayor de San Simón" className="navbar__logo" />
        </Link>
        <div className="navbar__carrera">
          <span>Carrera de Ingeniería de Sistemas</span>
          <img src={logoFcyt} alt="Facultad de Ciencias y Tecnología" className="navbar__logo navbar__logo--fcyt" />
        </div>
      </div>
    </header>
  )
}
