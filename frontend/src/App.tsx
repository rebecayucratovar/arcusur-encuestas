import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { IconoFlechaIzq } from './components/Iconos'
import RutaAdmin from './components/RutaAdmin'
import SesionProvider from './components/SesionProvider'
import { useSesion } from './lib/sesion'
import EncuestaEmpleadores from './pages/EncuestaEmpleadores'
import EncuestaTitulados from './pages/EncuestaTitulados'
import Inicio from './pages/Inicio'
import Login from './pages/Login'

function Pendiente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="estado">
      <div className="estado__tarjeta">
        <h1>{titulo}</h1>
        <p>{texto}</p>
        <Link to="/" className="enlace"><IconoFlechaIzq /> Volver al inicio</Link>
      </div>
    </main>
  )
}

// Provisional: P3 reemplaza esta página por el panel de análisis.
function PanelProvisional() {
  const { admin, cerrarSesion } = useSesion()
  return (
    <main className="estado">
      <div className="estado__tarjeta">
        <h1>Panel del Comité</h1>
        <p>Sesión iniciada como <strong>{admin?.email}</strong>. El panel de análisis está en desarrollo.</p>
        <button type="button" className="boton boton--secundario estado__accion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/encuestas/titulados" element={<EncuestaTitulados />} />
          <Route path="/encuestas/empleadores" element={<EncuestaEmpleadores />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RutaAdmin><PanelProvisional /></RutaAdmin>} />
          <Route path="*" element={<Pendiente titulo="Página no encontrada" texto="La dirección no existe." />} />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  )
}
