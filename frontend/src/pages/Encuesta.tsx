import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MatrizLikert from '../components/encuesta/MatrizLikert'
import Pregunta from '../components/encuesta/Pregunta'
import NavbarPublica from '../components/NavbarPublica'
import { IconoCheck, IconoFlechaIzq } from '../components/Iconos'
import { useSesion } from '../lib/sesion'
import { esVisible, respuestasVisibles, validar } from '../lib/validacion'
import { enviarRespuestas, ErrorValidacion, obtenerCatalogoAdmin, obtenerEncuesta } from '../services/api'
import type { Answers, AnswerValue, Errors, Question, Survey } from '../types'

// Textos de presentación de cada formulario original.
const PRESENTACION: Record<string, { titulo: string; parrafos: string[]; nota?: string }> = {
  titulados: {
    titulo: 'Encuesta de opinión a titulados de Ingeniería en Sistemas',
    parrafos: [
      'Estimad@ Ingenier@: La Carrera de Ingeniería en Sistemas está en proceso de Autoevaluación para la elaboración de un PLAN DE DESARROLLO ESTRATÉGICO en el marco de una futura postulación de acreditación ante el ARCUSUR. Le agradecemos su colaboración.',
    ],
    nota: 'Cuando envíe este formulario, no recopilará automáticamente sus detalles, como el nombre y la dirección de correo electrónico, a menos que lo proporcione usted mismo.',
  },
  empleadores: {
    titulo: 'Encuesta a empleadores',
    parrafos: [
      'La Carrera de Ingeniería de Sistemas de la Facultad de Ciencias y Tecnología (UMSS), en el marco de su proceso de Autoevaluación Académica, desarrolla la etapa de recopilación de información primaria mediante la aplicación del presente cuestionario dirigido a empleadores de profesionales titulados de la Carrera.',
      'El objetivo de esta encuesta es conocer la percepción del sector empleador respecto al desempeño profesional, competencias, capacidades y formación académica de los Ingenieros de Sistemas titulados por la Universidad Mayor de San Simón, con la finalidad de identificar fortalezas y oportunidades de mejora en el proceso formativo de la Carrera.',
    ],
    nota: 'La información proporcionada será utilizada exclusivamente con fines académicos e institucionales, garantizando la confidencialidad y anonimato de las respuestas.',
  },
}

type Bloque =
  | { tipo: 'pregunta'; q: Question; otro?: Question }
  | { tipo: 'matriz'; preguntas: Question[] }

const escala = (q: Question) => q.options.map((o) => o.value).join('|')

/** Agrupa las preguntas visibles de una sección para dibujarlas. */
function armarBloques(preguntas: Question[], todas: Map<string, Question>): Bloque[] {
  const bloques: Bloque[] = []
  for (const q of preguntas) {
    if (q.configuration.other_for) continue // se dibuja junto a su pregunta principal
    const anterior = bloques.at(-1)
    if (q.question_type === 'likert') {
      if (anterior?.tipo === 'matriz' && escala(anterior.preguntas[0]) === escala(q)) {
        anterior.preguntas.push(q)
        continue
      }
      if (anterior?.tipo === 'pregunta' && anterior.q.question_type === 'likert' && escala(anterior.q) === escala(q)) {
        bloques[bloques.length - 1] = { tipo: 'matriz', preguntas: [anterior.q, q] }
        continue
      }
    }
    const otro = q.configuration.other_question ? todas.get(q.configuration.other_question) : undefined
    bloques.push({ tipo: 'pregunta', q, otro })
  }
  return bloques
}

const claveBorrador = (slug: string) => `encuesta:${slug}`

function leerBorrador(slug: string): { respuestas: Answers; seccionId: string | null } {
  try {
    const guardado = localStorage.getItem(claveBorrador(slug))
    if (guardado) return JSON.parse(guardado)
  } catch {
    // sin almacenamiento disponible: se empieza de cero
  }
  return { respuestas: {}, seccionId: null }
}

function guardarBorrador(slug: string, respuestas: Answers, seccionId: string | null) {
  try {
    localStorage.setItem(claveBorrador(slug), JSON.stringify({ respuestas, seccionId }))
  } catch {
    // no es crítico
  }
}

function borrarBorrador(slug: string) {
  try {
    localStorage.removeItem(claveBorrador(slug))
  } catch {
    // no es crítico
  }
}

const irArriba = () => window.scrollTo({ top: 0, behavior: 'smooth' })

function enfocarPregunta(codigo: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(`pregunta-${codigo}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true })
  })
}

export default function Encuesta({ slug, vistaPrevia = false }: { slug: string; vistaPrevia?: boolean }) {
  const { token } = useSesion()
  const [encuesta, setEncuesta] = useState<Survey | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [respuestas, setRespuestas] = useState<Answers>(() => vistaPrevia ? {} : leerBorrador(slug).respuestas)
  const [seccionId, setSeccionId] = useState<string | null>(() => vistaPrevia ? null : leerBorrador(slug).seccionId)
  const [errores, setErrores] = useState<Errors>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)

  useEffect(() => {
    const carga = vistaPrevia
      ? (token ? obtenerCatalogoAdmin(token, slug) : Promise.reject(new Error('No hay una sesión administrativa activa.')))
      : obtenerEncuesta(slug)
    carga.then(setEncuesta).catch((e: Error) => setErrorCarga(e.message))
  }, [slug, token, vistaPrevia])

  useEffect(() => {
    if (!vistaPrevia && !enviada) guardarBorrador(slug, respuestas, seccionId)
  }, [slug, respuestas, seccionId, enviada, vistaPrevia])

  const visibles = useMemo(
    () => (encuesta ? respuestasVisibles(encuesta, respuestas) : {}),
    [encuesta, respuestas],
  )

  const presentacion = PRESENTACION[slug] ?? { titulo: encuesta?.name ?? '', parrafos: [] }

  if (errorCarga) {
    return <Estado titulo="No se pudo cargar la encuesta" texto={errorCarga} />
  }
  if (!encuesta) {
    return <Estado titulo="Cargando encuesta…" />
  }
  if (enviada) {
    return (
      <Estado icono titulo="¡Gracias por su participación!"
        texto="Sus respuestas fueron registradas correctamente. Su opinión contribuye al Plan de Desarrollo Estratégico de la Carrera." />
    )
  }

  const todas = new Map(encuesta.sections.flatMap((s) => s.questions).map((q) => [q.code, q]))
  const seccionesVisibles = encuesta.sections
    .map((s) => ({ ...s, questions: s.questions.filter((q) => esVisible(q, visibles)) }))
    .filter((s) => s.questions.length > 0)

  // Numeración continua de las preguntas visibles (los campos "Otro" no llevan número).
  const numeros = new Map<string, number>()
  for (const q of seccionesVisibles.flatMap((s) => s.questions)) {
    if (!q.configuration.other_for) numeros.set(q.code, numeros.size + 1)
  }

  const indice = Math.max(0, seccionesVisibles.findIndex((s) => s.id === seccionId))
  const seccion = seccionesVisibles[indice]
  const esUltima = indice === seccionesVisibles.length - 1

  const cambiar = (codigo: string, valor: AnswerValue) => {
    setRespuestas((r) => ({ ...r, [codigo]: valor }))
    setErrores((errs) => {
      const resto = { ...errs }
      delete resto[codigo]
      return resto
    })
  }

  const irASeccionConError = (errs: Errors) => {
    const primera = seccionesVisibles.find((s) => s.questions.some((q) => errs[q.code]))
    const pregunta = primera?.questions.find((q) => errs[q.code])
    if (primera) setSeccionId(primera.id)
    if (pregunta) enfocarPregunta(pregunta.code)
  }

  const siguiente = () => {
    const errs = validar(encuesta, respuestas, seccion.id)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return irASeccionConError(errs)
    setSeccionId(seccionesVisibles[indice + 1].id)
    irArriba()
  }

  const atras = () => {
    setErrores({})
    setSeccionId(seccionesVisibles[indice - 1].id)
    irArriba()
  }

  const enviar = async () => {
    if (vistaPrevia) return
    const errs = validar(encuesta, respuestas)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return irASeccionConError(errs)

    setEnviando(true)
    setErrorEnvio(null)
    try {
      await enviarRespuestas(slug, visibles)
      borrarBorrador(slug)
      setEnviada(true)
      irArriba()
    } catch (e) {
      if (e instanceof ErrorValidacion) {
        setErrores(e.errores)
        irASeccionConError(e.errores)
      } else {
        setErrorEnvio(e instanceof Error ? e.message : 'No se pudo enviar la encuesta.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="encuesta">
      <NavbarPublica />
      {vistaPrevia && (
        <div className="encuesta__vista-previa" role="status">
          <strong>Vista previa administrativa</strong>
          <span>
            Versión {encuesta.version_number} ({encuesta.version_status}) ·
            {encuesta.is_active ? ' encuesta activa' : ' encuesta inactiva'} · no se guardarán respuestas
          </span>
        </div>
      )}
      <header className="encuesta__cabecera">
        <div className="encuesta__contenedor">
          <Link to={vistaPrevia ? '/admin' : '/'} className="encuesta__volver">
            <IconoFlechaIzq /> {vistaPrevia ? 'Volver al panel' : 'Volver al inicio'}
          </Link>
          <h1>{presentacion.titulo}</h1>
          {presentacion.parrafos.map((p) => <p key={p}>{p}</p>)}
          {presentacion.nota && <p className="encuesta__nota">{presentacion.nota}</p>}
        </div>
      </header>

      <main className="encuesta__contenedor">
        <div className="encuesta__tarjeta">
          <p className="encuesta__obligatorio">* Obligatorio</p>
          <h2 className="encuesta__seccion">{seccion.title}</h2>
          {seccion.description && <p className="encuesta__descripcion">{seccion.description}</p>}

          {armarBloques(seccion.questions, todas).map((b) =>
            b.tipo === 'matriz' ? (
              <MatrizLikert key={b.preguntas[0].code} preguntas={b.preguntas}
                primerNumero={numeros.get(b.preguntas[0].code) ?? 0}
                respuestas={respuestas} errores={errores} onChange={cambiar} />
            ) : (
              <Pregunta key={b.q.code} q={b.q} numero={numeros.get(b.q.code) ?? 0}
                valor={respuestas[b.q.code]} error={errores[b.q.code]} onChange={cambiar}
                otro={b.otro && esVisible(b.otro, visibles)
                  ? { q: b.otro, valor: respuestas[b.otro.code], error: errores[b.otro.code] }
                  : undefined} />
            ),
          )}

          {esUltima && !vistaPrevia && (
            <p className="encuesta__consentimiento">
              Al enviar este formulario, acepta que sus respuestas se utilicen con fines académicos e
              institucionales del proceso de autoevaluación de la Carrera.
            </p>
          )}
          {errorEnvio && <p className="pregunta__error" role="alert">{errorEnvio}</p>}

          <div className="encuesta__pie">
            <div className="encuesta__botones">
              {indice > 0 && (
                <button type="button" className="boton boton--secundario" onClick={atras}>Atrás</button>
              )}
              {esUltima ? (
                vistaPrevia ? (
                  <span className="encuesta__sin-envio">Vista previa: el envío está deshabilitado</span>
                ) : (
                  <button type="button" className="boton" onClick={enviar} disabled={enviando}>
                    {enviando ? 'Enviando…' : 'Enviar'}
                  </button>
                )
              ) : (
                <button type="button" className="boton" onClick={siguiente}>Siguiente</button>
              )}
            </div>
            <div className="progreso">
              <span>Página {indice + 1} de {seccionesVisibles.length}</span>
              <div className="progreso__barra" role="progressbar" aria-valuemin={1}
                aria-valuemax={seccionesVisibles.length} aria-valuenow={indice + 1}>
                <div style={{ width: `${((indice + 1) / seccionesVisibles.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Estado({ titulo, texto, icono }: { titulo: string; texto?: string; icono?: boolean }) {
  return (
    <main className="estado">
      <div className="estado__tarjeta">
        {icono && <span className="estado__icono"><IconoCheck /></span>}
        <h1>{titulo}</h1>
        {texto && <p>{texto}</p>}
        <Link to="/" className="enlace"><IconoFlechaIzq /> Volver al inicio</Link>
      </div>
    </main>
  )
}
