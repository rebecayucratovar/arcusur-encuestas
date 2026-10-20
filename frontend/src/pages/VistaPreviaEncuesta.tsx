import { Navigate, useParams } from 'react-router-dom'
import Encuesta from './Encuesta'

export default function VistaPreviaEncuesta() {
  const { slug } = useParams()
  if (!slug) return <Navigate to="/admin" replace />
  return <Encuesta slug={slug} vistaPrevia />
}
