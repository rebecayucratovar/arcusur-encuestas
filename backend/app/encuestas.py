from fastapi import APIRouter, Depends, HTTPException

from app.auth import requiere_staff
from app.db import supabase

router = APIRouter(prefix="/encuestas", tags=["encuestas"])
router_admin = APIRouter(
    prefix="/admin/encuestas",
    tags=["admin"],
    dependencies=[Depends(requiere_staff)],
)

# Notas internas del catálogo que el formulario no necesita.
CONFIG_INTERNA = {"source", "source_note"}

SELECT_VERSION = """
    id, version_number, status,
    tss_sections (
        id, title, description, position,
        tss_questions (
            id, code, prompt, help_text, question_type, required, position,
            configuration, display_condition,
            tss_question_options ( id, value, label, position )
        )
    )
"""


def elegir_version(versiones, incluir_borradores=False):
    """Elige una versión visible para el contexto solicitado.

    Las rutas públicas solo pueden elegir versiones publicadas. La vista previa
    administrativa también admite borradores, pero nunca versiones archivadas.
    """
    estados = {"published", "draft"} if incluir_borradores else {"published"}
    candidatas = [v for v in versiones if v["status"] in estados]
    return max(candidatas, key=lambda v: v["version_number"], default=None)


def armar_encuesta(encuesta, version):
    """Convierte las filas anidadas de Supabase en el JSON que consume el formulario."""
    secciones = []
    for s in sorted(version["tss_sections"], key=lambda s: s["position"]):
        preguntas = []
        for q in sorted(s["tss_questions"], key=lambda q: q["position"]):
            preguntas.append({
                "id": q["id"],
                "code": q["code"],
                "prompt": q["prompt"],
                "help_text": q["help_text"],
                "question_type": q["question_type"],
                "required": q["required"],
                "position": q["position"],
                "configuration": {k: v for k, v in (q["configuration"] or {}).items()
                                  if k not in CONFIG_INTERNA},
                "display_condition": q["display_condition"],
                "options": sorted(q["tss_question_options"], key=lambda o: o["position"]),
            })
        secciones.append({
            "id": s["id"],
            "title": s["title"],
            "description": s["description"],
            "position": s["position"],
            "questions": preguntas,
        })
    return {
        "survey_id": encuesta["id"],
        "slug": encuesta["slug"],
        "name": encuesta["name"],
        "description": encuesta["description"],
        "is_active": encuesta["is_active"],
        "version_id": version["id"],
        "version_number": version["version_number"],
        "version_status": version["status"],
        "sections": secciones,
    }


class EncuestaNoEncontrada(Exception):
    pass


def cargar_encuesta(slug, *, vista_previa=False):
    """Carga una encuesta pública o una vista previa administrativa.

    En modo público exige que la encuesta esté activa y que exista una versión
    publicada. La vista previa puede recuperar el último borrador aunque la
    encuesta esté inactiva. Lanza ``EncuestaNoEncontrada`` si no es visible en
    el contexto solicitado.
    """
    filas = supabase.table("tss_surveys").select("*").eq("slug", slug).limit(1).execute().data
    if not filas:
        raise EncuestaNoEncontrada(f"No existe la encuesta '{slug}'")
    encuesta = filas[0]
    if not vista_previa and not encuesta["is_active"]:
        raise EncuestaNoEncontrada(f"La encuesta '{slug}' no está disponible")

    versiones = (supabase.table("tss_survey_versions").select(SELECT_VERSION)
                 .eq("survey_id", encuesta["id"]).execute().data)
    version = elegir_version(versiones, incluir_borradores=vista_previa)
    if version is None:
        detalle = "versiones disponibles" if vista_previa else "una versión publicada"
        raise EncuestaNoEncontrada(f"La encuesta '{slug}' no tiene {detalle}")
    return armar_encuesta(encuesta, version)


@router.get("/{slug}")
def obtener_encuesta(slug: str):
    try:
        return cargar_encuesta(slug)
    except EncuestaNoEncontrada as e:
        raise HTTPException(404, str(e))


@router_admin.get("/{slug}/vista-previa")
def obtener_vista_previa(slug: str):
    """Permite al Comité revisar el último borrador sin publicarlo."""
    try:
        return cargar_encuesta(slug, vista_previa=True)
    except EncuestaNoEncontrada as e:
        raise HTTPException(404, str(e))
