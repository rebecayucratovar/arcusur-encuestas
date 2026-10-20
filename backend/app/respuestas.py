"""Guardado de respuestas: lo usan POST /encuestas/{slug}/respuestas y el importador de CSV."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import supabase
from app.encuestas import EncuestaNoEncontrada, cargar_encuesta
from app.validacion import CON_OPCIONES, preguntas, validar

router = APIRouter(prefix="/encuestas", tags=["respuestas"])


class RespuestaInvalida(Exception):
    def __init__(self, errores):
        super().__init__(f"{len(errores)} errores de validación")
        self.errores = errores


def construir_filas(encuesta, limpias):
    """Reparte las respuestas validadas entre las tablas.

    Devuelve (answers, elecciones, contacto):
    - answers: filas de tss_answers (sin submission_id), una por pregunta respondida.
    - elecciones: {question_id: [option_id, ...]} para tss_answer_choices.
    - contacto: fila de tss_submission_contacts (sin submission_id), o None.
    """
    answers, elecciones, contacto = [], {}, {}
    for q in preguntas(encuesta):
        if q["code"] not in limpias:
            continue
        valor, cfg = limpias[q["code"]], q["configuration"]

        if cfg.get("store") == "contact":
            contacto[cfg["contact_field"]] = valor
            continue

        fila = {"question_id": q["id"], "text_value": None, "numeric_value": None}
        if q["question_type"] in CON_OPCIONES:
            ids = {o["value"]: o["id"] for o in q["options"]}
            elegidas = valor if isinstance(valor, list) else [valor]
            elecciones[q["id"]] = [ids[v] for v in elegidas]
        else:
            # Un trigger de la BD exige que las preguntas de texto usen solo text_value,
            # incluso las numéricas (input: integer): se guardan como "6", ya validadas.
            fila["text_value"] = str(valor)
        answers.append(fila)

    if contacto:
        # En titulados los datos de contacto solo aparecen si aceptó unirse a la red.
        contacto["allow_contact"] = limpias.get("interes_red") == "si"
    return answers, elecciones, contacto or None


def _borrar_envio(submission_id):
    """Deshace un envío a medio guardar (PostgREST no ofrece transacciones)."""
    ids = [a["id"] for a in supabase.table("tss_answers").select("id")
           .eq("submission_id", submission_id).execute().data]
    if ids:
        supabase.table("tss_answer_choices").delete().in_("answer_id", ids).execute()
    supabase.table("tss_answers").delete().eq("submission_id", submission_id).execute()
    supabase.table("tss_submission_contacts").delete().eq("submission_id", submission_id).execute()
    supabase.table("tss_submissions").delete().eq("id", submission_id).execute()


def guardar_respuesta(slug, respuestas, source=None, encuesta=None, submitted_at=None, importado=False):
    """Valida y guarda un envío completo. Devuelve el id de tss_submissions.

    - `encuesta`: la encuesta ya cargada (el importador la pasa para no
      consultarla en cada fila). Si es None se carga por `slug`.
    - `source`: origen del envío; si es None se usa el default de la tabla.
    - `submitted_at`: fecha original del envío (datetime), p. ej. la columna
      "Hora de finalización" del CSV. Si es None, la BD pone la hora actual.
      Sin zona horaria se asume la de Bolivia (UTC-4).
    - `importado`: True para filas de CSV (ver `validar`); el importador lo usa
      junto con source="csv_import".
    Lanza RespuestaInvalida o EncuestaNoEncontrada.
    """
    encuesta = encuesta or cargar_encuesta(slug)
    limpias, errores = validar(encuesta, respuestas, importado)
    if errores:
        raise RespuestaInvalida(errores)
    answers, elecciones, contacto = construir_filas(encuesta, limpias)

    envio = {
        "survey_id": encuesta["survey_id"],
        "survey_version_id": encuesta["version_id"],
        "consent_given": True,  # el formulario informa el uso académico al enviar
    }
    if source:
        envio["source"] = source
    if submitted_at is not None:
        envio["submitted_at"] = normalizar_fecha(submitted_at).isoformat()
    submission_id = supabase.table("tss_submissions").insert(envio).execute().data[0]["id"]

    try:
        if answers:
            filas = (supabase.table("tss_answers")
                     .insert([{**a, "submission_id": submission_id} for a in answers])
                     .execute().data)
            answer_ids = {f["question_id"]: f["id"] for f in filas}
            filas_elecciones = [
                {"answer_id": answer_ids[qid], "question_id": qid, "option_id": oid}
                for qid, oids in elecciones.items() for oid in oids
            ]
            if filas_elecciones:
                supabase.table("tss_answer_choices").insert(filas_elecciones).execute()
        if contacto:
            supabase.table("tss_submission_contacts").insert(
                {**contacto, "submission_id": submission_id}).execute()
    except Exception:
        _borrar_envio(submission_id)
        raise
    return submission_id


BOLIVIA = timezone(timedelta(hours=-4))


def normalizar_fecha(fecha):
    """Valida la fecha de un envío importado: con zona horaria y no futura."""
    if not isinstance(fecha, datetime):
        raise ValueError("submitted_at debe ser un datetime")
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=BOLIVIA)
    if fecha > datetime.now(timezone.utc):
        raise ValueError(f"La fecha {fecha.isoformat()} está en el futuro")
    return fecha


class EnvioRespuestas(BaseModel):
    answers: dict[str, str | int | float | list[str] | None]


@router.post("/{slug}/respuestas", status_code=201)
def crear_respuesta(slug: str, envio: EnvioRespuestas):
    try:
        submission_id = guardar_respuesta(slug, envio.answers)
    except EncuestaNoEncontrada as e:
        raise HTTPException(404, str(e))
    except RespuestaInvalida as e:
        raise HTTPException(422, {"mensaje": "Hay respuestas por corregir.", "errores": e.errores})
    return {"submission_id": submission_id}
