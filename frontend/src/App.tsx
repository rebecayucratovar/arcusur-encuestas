import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'
import { IconoFlechaIzq } from './components/Iconos'
import RutaAdmin from './components/RutaAdmin'
import SesionProvider from './components/SesionProvider'
import Analisis from './pages/Analisis'
import Comparacion from './pages/Comparacion'
import Dashboard from './pages/Dashboard'
import Datos from './pages/Datos'
import EncuestaEmpleadores from './pages/EncuestaEmpleadores'
import EncuestaTitulados from './pages/EncuestaTitulados'
import Escenarios from './pages/Escenarios'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import Respuestas from './pages/Respuestas'
import VistaPreviaEncuesta from './pages/VistaPreviaEncuesta'

function NoEncontrada() {
  return (
    <main className="estado">
      <div className="estado__tarjeta">
        <h1>Página no encontrada</h1>
        <p>La dirección no existe.</p>
        <Link to="/" className="enlace"><IconoFlechaIzq /> Volver al inicio</Link>
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
          <Route path="/admin/encuestas/:slug/vista-previa"
            element={<RutaAdmin><VistaPreviaEncuesta /></RutaAdmin>} />

          {/* Panel del Comité: P2 (Datos: importar/exportar) y P3 (Resumen, Análisis, Escenarios...). */}
          <Route path="/admin" element={<RutaAdmin><AdminLayout /></RutaAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="respuestas" element={<Respuestas />} />
            <Route path="datos" element={<Datos />} />
            <Route path="analisis" element={<Analisis />} />
            <Route path="escenarios" element={<Escenarios />} />
            <Route path="comparacion" element={<Comparacion />} />
          </Route>

          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  )
}
