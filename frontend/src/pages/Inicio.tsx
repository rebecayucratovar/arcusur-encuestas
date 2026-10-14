import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconoBirrete, IconoCandado, IconoEdificio, IconoEscudo, IconoFlecha, IconoReloj } from '../components/Iconos'

function TarjetaEncuesta({ to, icono, minutos, titulo, texto }: {
  to: string; icono: ReactNode; minutos: number; titulo: string; texto: string
}) {
  return (
    <Link to={to} className="tarjeta-encuesta">
      <div className="tarjeta-encuesta__arriba">
        <span className="tarjeta-encuesta__icono">{icono}</span>
        <span className="pastilla"><IconoReloj /> ~{minutos} min</span>
      </div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <span className="tarjeta-encuesta__accion">Comenzar encuesta <IconoFlecha /></span>
    </Link>
  )
}

export default function Inicio() {
  return (
    <div className="inicio">
      <main className="inicio__contenido">
        <p className="inicio__antetitulo">Autoevaluación con miras a la acreditación ARCUSUR · Gestión 2026</p>
        <h1>Encuestas de Autoevaluación · Ingeniería en Sistemas</h1>
        <p className="inicio__intro">
          Su opinión alimenta el Plan de Desarrollo Estratégico de la Carrera. Elija el cuestionario que
          corresponde a su perfil.
        </p>

        <div className="inicio__tarjetas">
          <TarjetaEncuesta to="/encuestas/titulados" icono={<IconoBirrete />} minutos={8}
            titulo="Soy titulado/a"
            texto="Cuéntenos sobre su formación complementaria, su trayectoria laboral y su valoración de la Carrera." />
          <TarjetaEncuesta to="/encuestas/empleadores" icono={<IconoEdificio />} minutos={6}
            titulo="Soy empleador/a"
            texto="Evalúe el desempeño de nuestros titulados en su organización y la relación con la Carrera." />
        </div>

        <section className="aviso">
          <span className="aviso__icono"><IconoEscudo /></span>
          <div>
            <h2>Sus respuestas son confidenciales</h2>
            <p>
              No necesita crear una cuenta. La información se usa exclusivamente con fines académicos e
              institucionales del proceso de autoevaluación y se analiza de forma agregada. Si decide compartir
              datos de contacto, se guardan por separado y no forman parte de los análisis.
            </p>
          </div>
        </section>
      </main>

      <footer className="pie">
        <div className="pie__contenido">
          <span>© 2026 Carrera de Ingeniería de Sistemas · FCyT · Universidad Mayor de San Simón · Cochabamba, Bolivia</span>
          <Link to="/admin" className="pie__admin"><IconoCandado /> Acceso administrador</Link>
        </div>
      </footer>
    </div>
  )
}
