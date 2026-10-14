from fastapi import APIRouter, HTTPException

from app.db import supabase

router = APIRouter(prefix="/encuestas", tags=["encuestas"])

# Notas internas del catálogo que el formulario no necesita.
CONFIG_INTERNA = {"source", "source_note"}

SELECT_VERSION = """
    id, version_number, status,
    tss_sections (
        id, title, description, position,
        tss_questions (
            id, code, prompt, help_text, question_type, required, position,
            configuration, display_condition,
            tss_question_options ( value, label, position )
        )
    )
"""


def elegir_version(versiones):
    """La última versión publicada; si no hay ninguna, la última en borrador."""
    publicadas = [v for v in versiones if v["status"] == "published"]
    candidatas = publicadas or versiones
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
        "slug": encuesta["slug"],
        "name": encuesta["name"],
        "description": encuesta["description"],
        "is_active": encuesta["is_active"],
        "version_id": version["id"],
        "version_number": version["version_number"],
        "version_status": version["status"],
        "sections": secciones,
    }


@router.get("/{slug}")
def obtener_encuesta(slug: str):
    filas = supabase.table("tss_surveys").select("*").eq("slug", slug).limit(1).execute().data
    if not filas:
        raise HTTPException(404, f"No existe la encuesta '{slug}'")
    encuesta = filas[0]

    versiones = (supabase.table("tss_survey_versions").select(SELECT_VERSION)
                 .eq("survey_id", encuesta["id"]).execute().data)
    version = elegir_version(versiones)
    if version is None:
        raise HTTPException(404, f"La encuesta '{slug}' no tiene versiones")
    return armar_encuesta(encuesta, version)
