import { useContextoAdmin, type SlugEncuesta } from '../lib/admin'
import { IconoGrafico, IconoInfo } from '../components/Iconos'

// Indicadores y gráficos previstos por encuesta. P3 reemplaza los "—" y los
// recuadros vacíos con los datos de sus endpoints /admin/... (backend/app/admin.py).
const INDICADORES: Record<SlugEncuesta, { titulo: string; detalle: string }[]> = {
  titulados: [
    { titulo: 'Tasa de empleabilidad', detalle: 'Trabaja en una organización o emprende' },
    { titulo: 'Satisfacción media con la carrera', detalle: 'Escala de 1 a 4' },
    { titulo: 'Interés en posgrado', detalle: 'Respondió SI a la pregunta de interés' },
  ],
  empleadores: [
    { titulo: 'Contrataron titulados', detalle: 'En los últimos 5 años' },
    { titulo: 'Alta probabilidad de contratar', detalle: 'En los próximos años' },
    { titulo: 'Confianza en la Carrera', detalle: 'Totalmente o parcialmente de acuerdo' },
  ],
}

const GRAFICOS: Record<SlugEncuesta, { titulo: string; detalle: string; ancho?: boolean }[]> = {
  titulados: [
    { titulo: 'Situación laboral actual', detalle: 'Trabaja, no trabaja o emprende' },
    { titulo: 'Áreas de posgrado de interés', detalle: 'Titulados interesados en un posgrado', ancho: true },
    { titulo: 'Remuneración mensual (Bs.)', detalle: 'Titulados que trabajan en una organización', ancho: true },
    { titulo: 'Tiempo para el primer empleo', detalle: 'Empleo relacionado con la formación' },
  ],
  empleadores: [
    { titulo: 'Rubro de las organizaciones', detalle: 'Sector principal' },
    { titulo: 'Nivel de formación demandado', detalle: 'Para contratar nuevos profesionales', ancho: true },
    { titulo: 'Formación y perfil profesional', detalle: 'Valoración por criterio', ancho: true },
    { titulo: 'Relación con la Carrera', detalle: 'Vinculación y retroalimentación' },
  ],
}

export default function Dashboard() {
  const { encuesta, resumen } = useContextoAdmin()
  const total = resumen?.[encuesta]?.total ?? null
  const sinDatos = total === 0

  return (
    <>
      <div className="admin__titulo">
        <h1>Resumen</h1>
        <p>
          {encuesta === 'titulados'
            ? 'Indicadores clave de empleabilidad, satisfacción e interés en posgrado de los titulados.'
            : 'Percepción del sector empleador sobre la formación y el desempeño de los titulados.'}
        </p>
      </div>

      <div className="aviso-panel">
        <IconoInfo />
        <p>
          {sinDatos
            ? 'Todavía no hay respuestas para esta encuesta. Cuando se completen formularios o se importe un CSV, los indicadores aparecerán aquí.'
            : 'Los indicadores y gráficos de esta sección están en desarrollo; por ahora solo se muestra el total de respuestas.'}
        </p>
      </div>

      <div className="kpis">
        <div className="kpi kpi--destacado">
          <span>Total de respuestas</span>
          <strong>{total ?? '—'}</strong>
          <small>{encuesta === 'titulados' ? 'Titulados que completaron la encuesta' : 'Organizaciones que respondieron'}</small>
        </div>
        {INDICADORES[encuesta].map((k) => (
          <div key={k.titulo} className="kpi">
            <span>{k.titulo}</span>
            <strong>—</strong>
            <small>{k.detalle}</small>
          </div>
        ))}
      </div>

      <div className="graficos">
        {GRAFICOS[encuesta].map((g) => (
          <section key={g.titulo} className={`grafico${g.ancho ? ' grafico--ancho' : ''}`}>
            <h2>{g.titulo}</h2>
            <p>{g.detalle}</p>
            <div className="grafico__vacio">
              <IconoGrafico />
              <span>{sinDatos ? 'Sin datos todavía' : 'Gráfico en desarrollo'}</span>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
