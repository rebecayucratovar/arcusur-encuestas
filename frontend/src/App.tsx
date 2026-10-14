import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { IconoFlechaIzq } from './components/Iconos'
import EncuestaEmpleadores from './pages/EncuestaEmpleadores'
import EncuestaTitulados from './pages/EncuestaTitulados'
import Inicio from './pages/Inicio'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/encuestas/titulados" element={<EncuestaTitulados />} />
        <Route path="/encuestas/empleadores" element={<EncuestaEmpleadores />} />
        {/* Login (P2) y panel de análisis (P3): reemplazar cuando estén listos. */}
        <Route path="/admin" element={
          <Pendiente titulo="Acceso administrador" texto="El panel del Comité de Evaluación está en desarrollo." />
        } />
        <Route path="*" element={<Pendiente titulo="Página no encontrada" texto="La dirección no existe." />} />
      </Routes>
    </BrowserRouter>
  )
}
