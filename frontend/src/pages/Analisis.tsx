import { useMemo, useState } from 'react'
import EstadoDatos from '../components/admin/EstadoDatos'
import ChiCuadrada from '../components/analisis/ChiCuadrada'
import Descriptivos from '../components/analisis/Descriptivos'
import Frecuencias from '../components/analisis/Frecuencias'
import TablasCruzadas from '../components/analisis/TablasCruzadas'
import { useContextoAdmin, type SlugEncuesta } from '../lib/admin'
import { useDatosEncuesta } from '../lib/datos'
import { categoricas, variables as listarVariables } from '../lib/variables'

type Pestana = 'frecuencias' | 'cruzadas' | 'chi' | 'descriptivos'

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'frecuencias', texto: 'Frecuencias' },
  { id: 'cruzadas', texto: 'Tablas cruzadas' },
  { id: 'chi', texto: 'Chi-cuadrada' },
  { id: 'descriptivos', texto: 'Descriptivos' },
]

// Variables con que abre cada subpestaña.
const INICIAL: Record<SlugEncuesta, { frecuencia: string; cruce: [string, string] }> = {
  titulados: { frecuencia: 'situacion_laboral', cruce: ['sector_trabajo', 'remuneracion'] },
  empleadores: { frecuencia: 'rubro', cruce: ['tipo_organizacion', 'probabilidad_contratar'] },
}

function Contenido({ encuesta, origenes }: { encuesta: SlugEncuesta; origenes: string[] }) {
  const [pestana, setPestana] = useState<Pestana>('frecuencias')
  const datos = useDatosEncuesta(encuesta, origenes)
  const vars = useMemo(() => listarVariables(datos.encuesta), [datos.encuesta])
  const cats = useMemo(() => categoricas(vars), [vars])
  const inicial = INICIAL[encuesta]

  return (
    <>
      <div className="admin__titulo">
        <h1>Análisis</h1>
        <p>
          Análisis estadístico de la encuesta de {encuesta} con {datos.filas.length} respuestas según los orígenes seleccionados.
        </p>
      </div>

      <div className="subpestanas" role="tablist" aria-label="Tipo de análisis">
        {PESTANAS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id}
            className={`subpestanas__boton${pestana === p.id ? ' subpestanas__boton--activo' : ''}`}
            onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      <EstadoDatos cargando={datos.cargando} error={datos.error} origenes={origenes} total={datos.filas.length}>
        <div role="tabpanel" className="analisis">
          {pestana === 'frecuencias' && <Frecuencias variables={vars} filas={datos.filas} inicial={inicial.frecuencia} />}
          {pestana === 'cruzadas' && <TablasCruzadas variables={cats} filas={datos.filas} inicial={inicial.cruce} />}
          {pestana === 'chi' && <ChiCuadrada variables={cats} filas={datos.filas} inicial={inicial.cruce} />}
          {pestana === 'descriptivos' && <Descriptivos variables={vars} filas={datos.filas} slug={encuesta} />}
        </div>
      </EstadoDatos>
    </>
  )
}

export default function Analisis() {
  const { encuesta, origenes } = useContextoAdmin()
  // key: al cambiar de encuesta se reinician las variables elegidas.
  return <Contenido key={encuesta} encuesta={encuesta} origenes={origenes} />
}
