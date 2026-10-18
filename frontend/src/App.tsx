import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'
import SeccionPendiente from './components/admin/SeccionPendiente'
import { IconoFlechaIzq } from './components/Iconos'
import RutaAdmin from './components/RutaAdmin'
import SesionProvider from './components/SesionProvider'
import Dashboard from './pages/Dashboard'
import EncuestaEmpleadores from './pages/EncuestaEmpleadores'
import EncuestaTitulados from './pages/EncuestaTitulados'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import Respuestas from './pages/Respuestas'

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

          {/* Panel del Comité: P2 (Datos: importar/exportar) y P3 (Resumen, Análisis, Escenarios...). */}
          <Route path="/admin" element={<RutaAdmin><AdminLayout /></RutaAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="respuestas" element={<Respuestas />} />
            <Route path="datos" element={
              <SeccionPendiente titulo="Datos" descripcion="Importación de CSV/Excel y exportación de resultados." />} />
            <Route path="analisis" element={
              <SeccionPendiente titulo="Análisis" descripcion="Estadística descriptiva, tablas cruzadas y pruebas χ²." />} />
            <Route path="escenarios" element={
              <SeccionPendiente titulo="Escenarios" descripcion="Simulación de escenarios para la toma de decisiones." />} />
            <Route path="comparacion" element={
              <SeccionPendiente titulo="Empleadores vs. Titulados" descripcion="Contraste entre la percepción de empleadores y titulados." />} />
          </Route>

          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  )
}
