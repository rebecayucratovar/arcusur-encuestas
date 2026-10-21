"""Rutas del panel del Comité (lectura para staff; escritura solo admin).

P3 agrega aquí las estadísticas; P2 las de importación y exportación.
"""

from collections import Counter
from datetime import datetime
from hashlib import sha256
import json
from pathlib import PurePath

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.auth import requiere_admin, requiere_staff
from app.db import supabase
from app.encuestas import EncuestaNoEncontrada, cargar_encuesta
from app.respuestas import construir_filas, normalizar_fecha
from app.validacion import validar

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_staff)])

TAMANO_PAGINA = 1000
TAMANO_LOTE = 200
MAX_FILAS_IMPORTACION = 5000
MAX_RESPUESTAS_POR_FILA = 500
MAX_OPCIONES_POR_RESPUESTA = 200
MAX_LONGITUD_VALOR = 10000


def _paginar(crear_consulta):
    """Ejecuta una consulta PostgREST completa, sin perder filas por su límite."""
    filas, inicio = [], 0
    while True:
        pagina = crear_consulta().range(inicio, inicio + TAMANO_PAGINA - 1).execute().data or []
        filas.extend(pagina)
        if len(pagina) < TAMANO_PAGINA:
            return filas
        inicio += TAMANO_PAGINA


def _lotes(valores, tamano=TAMANO_LOTE):
    for inicio in range(0, len(valores), tamano):
        yield valores[inicio:inicio + tamano]


# ---------------------------------------------------------------- importación CSV

ValorImportado = str | int | float | list[str] | None


class FilaImportacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fila: int = Field(ge=2)
    submitted_at: datetime | str | None = None
    answers: dict[str, ValorImportado]

    @model_validator(mode="after")
    def limitar_respuestas(self):
        if len(self.answers) > MAX_RESPUESTAS_POR_FILA:
            raise ValueError(f"Una fila no puede contener más de {MAX_RESPUESTAS_POR_FILA} respuestas.")
        for valor in self.answers.values():
            valores = valor if isinstance(valor, list) else [valor]
            if len(valores) > MAX_OPCIONES_POR_RESPUESTA:
                raise ValueError(
                    f"Una respuesta no puede contener más de {MAX_OPCIONES_POR_RESPUESTA} opciones.")
            if any(isinstance(elemento, str) and len(elemento) > MAX_LONGITUD_VALOR
                   for elemento in valores):
                raise ValueError(
                    f"Un valor no puede superar {MAX_LONGITUD_VALOR} caracteres.")
        return self


class ImportacionCsv(BaseModel):
    model_config = ConfigDict(extra="forbid")

    archivo: str = Field(min_length=1, max_length=255)
    filas: list[FilaImportacion] = Field(max_length=MAX_FILAS_IMPORTACION)

    @model_validator(mode="after")
    def filas_unicas(self):
        numeros = [fila.fila for fila in self.filas]
        if len(numeros) != len(set(numeros)):
            raise ValueError("Los números de fila no pueden repetirse.")
        return self


def _errores_fila(encuesta, fila):
    """Valida una fila y devuelve el payload seguro para la RPC transaccional."""
    fecha = None
    errores = []
    if fila.submitted_at is not None:
        try:
            valor = fila.submitted_at
            if isinstance(valor, str):
                valor = datetime.fromisoformat(valor.replace("Z", "+00:00"))
            fecha = normalizar_fecha(valor).isoformat()
        except (TypeError, ValueError):
            errores.append("submitted_at: fecha no válida o futura.")

    limpias, errores_respuestas = validar(encuesta, fila.answers, importado=True)
    errores.extend(f"{codigo}: {mensaje}" for codigo, mensaje in errores_respuestas.items())
    if not errores and not limpias:
        errores.append("La fila no contiene respuestas válidas.")
    if errores:
        return {"fila": fila.fila, "estado": "rechazada", "errores": errores}

    answers, elecciones, contacto = construir_filas(encuesta, limpias)
    return {
        "fila": fila.fila,
        "estado": "aceptada",
        "submitted_at": fecha,
        "answers": answers,
        "choices": elecciones,
        "contact": contacto,
    }


def _huella_importacion(version_id, archivo, filas):
    contenido = {
        "survey_version_id": version_id,
        "archivo": archivo,
        "filas": [fila.model_dump(mode="json") for fila in filas],
    }
    canonico = json.dumps(contenido, ensure_ascii=False, sort_keys=True,
                          separators=(",", ":")).encode("utf-8")
    return sha256(canonico).hexdigest()


@router.post("/importar/{slug}")
def importar_csv(slug: str, solicitud: ImportacionCsv,
                 usuario: dict = Depends(requiere_admin)):
    """Valida un archivo y persiste todas sus filas mediante una RPC atómica."""
    try:
        encuesta = cargar_encuesta(slug, vista_previa=True)
    except EncuestaNoEncontrada as error:
        raise HTTPException(404, str(error))

    filas_rpc = []
    for lote in _lotes(solicitud.filas):
        filas_rpc.extend(_errores_fila(encuesta, fila) for fila in lote)
    # Los navegadores solo envían el nombre, pero se elimina cualquier ruta por defensa.
    archivo = PurePath(solicitud.archivo.replace("\\", "/")).name.strip()
    if not archivo:
        raise HTTPException(422, "El nombre del archivo no es válido.")
    try:
        resultado = supabase.rpc("tss_import_csv", {
            "p_import_key": _huella_importacion(encuesta["version_id"], archivo, solicitud.filas),
            "p_file_name": archivo,
            "p_survey_id": encuesta["survey_id"],
            "p_survey_version_id": encuesta["version_id"],
            "p_imported_by": usuario["id"],
            "p_rows": filas_rpc,
        }).execute().data
    except Exception:
        # La RPC es una sola transacción: si falla, no queda una importación parcial.
        raise HTTPException(502, "No se pudo guardar la importación.")

    if isinstance(resultado, list):
        resultado = resultado[0] if resultado else None
    if not isinstance(resultado, dict):
        raise HTTPException(502, "La base de datos devolvió una respuesta de importación no válida.")
    return {
        "importadas": int(resultado.get("importadas", 0)),
        "rechazadas": resultado.get("rechazadas", []),
    }


def cargar_respuestas(slug: str):
    """Devuelve los envíos analíticos aplanados; nunca incluye datos de contacto."""
    encuestas = (supabase.table("tss_surveys").select("id")
                 .eq("slug", slug).limit(1).execute().data or [])
    if not encuestas:
        raise HTTPException(404, f"No existe la encuesta '{slug}'.")

    survey_id = encuestas[0]["id"]
    envios = _paginar(lambda: supabase.table("tss_submissions")
                      .select("id, submitted_at, source")
                      .eq("survey_id", survey_id)
                      .is_("excluded_reason", "null")
                      .order("submitted_at"))
    if not envios:
        return []

    respuestas = []
    for ids in _lotes([e["id"] for e in envios]):
        respuestas.extend(_paginar(lambda ids=ids: supabase.table("tss_answers")
                                   .select("id, submission_id, question_id, text_value, numeric_value")
                                   .in_("submission_id", ids)))

    preguntas = []
    ids_preguntas = list(dict.fromkeys(r["question_id"] for r in respuestas))
    for ids in _lotes(ids_preguntas):
        preguntas.extend(_paginar(lambda ids=ids: supabase.table("tss_questions")
                                  .select("id, code, question_type, configuration")
                                  .in_("id", ids)))

    elecciones = []
    ids_respuestas = [r["id"] for r in respuestas]
    for ids in _lotes(ids_respuestas):
        elecciones.extend(_paginar(lambda ids=ids: supabase.table("tss_answer_choices")
                                   .select("answer_id, option_id")
                                   .in_("answer_id", ids)))

    opciones = []
    ids_opciones = list(dict.fromkeys(e["option_id"] for e in elecciones))
    for ids in _lotes(ids_opciones):
        opciones.extend(_paginar(lambda ids=ids: supabase.table("tss_question_options")
                                 .select("id, value, position")
                                 .in_("id", ids)))

    pregunta_por_id = {q["id"]: q for q in preguntas}
    opcion_por_id = {o["id"]: o for o in opciones}
    elecciones_por_respuesta = {}
    for eleccion in elecciones:
        opcion = opcion_por_id.get(eleccion["option_id"])
        if opcion:
            elecciones_por_respuesta.setdefault(eleccion["answer_id"], []).append(opcion)

    valores_por_envio = {e["id"]: {} for e in envios}
    for respuesta in respuestas:
        pregunta = pregunta_por_id.get(respuesta["question_id"])
        if not pregunta:
            continue
        configuracion = pregunta.get("configuration") or {}
        if (configuracion.get("store") == "contact"
                or configuracion.get("personal_data") is True):
            continue
        seleccionadas = sorted(elecciones_por_respuesta.get(respuesta["id"], []),
                                key=lambda opcion: opcion.get("position", 0))
        if seleccionadas:
            valores = [opcion["value"] for opcion in seleccionadas]
            valor = valores if pregunta["question_type"] == "multiple_choice" else valores[0]
        else:
            valor = respuesta.get("numeric_value")
            if valor is None:
                valor = respuesta.get("text_value")
            if valor is None:
                continue
            valor = str(valor)
        valores_por_envio[respuesta["submission_id"]][pregunta["code"]] = valor

    return [{
        "id": envio["id"],
        "fecha": envio["submitted_at"],
        "origen": envio["source"],
        "valores": valores_por_envio[envio["id"]],
    } for envio in envios]


@router.get("/respuestas/{slug}")
def listar_respuestas(slug: str):
    try:
        return cargar_respuestas(slug)
    except HTTPException:
        raise
    except Exception:
        # No se devuelve el mensaje de Supabase porque podría revelar detalles internos.
        raise HTTPException(502, "No se pudieron consultar las respuestas.")


# ---------------------------------------------------------------- contactos

@router.get("/contactos/{slug}")
def listar_contactos(slug: str, _usuario: dict = Depends(requiere_admin)):
    """Datos de contacto de una encuesta, del más reciente al más antiguo.

    Son datos personales: solo el rol `admin` los ve y nunca entran en el análisis
    (GET /admin/respuestas los excluye). Cada fila lleva la fecha y el origen del envío.
    """
    encuestas = (supabase.table("tss_surveys").select("id")
                 .eq("slug", slug).limit(1).execute().data or [])
    if not encuestas:
        raise HTTPException(404, f"No existe la encuesta '{slug}'.")
    try:
        envios = _paginar(lambda: supabase.table("tss_submissions")
                          .select("id, submitted_at, source")
                          .eq("survey_id", encuestas[0]["id"])
                          .is_("excluded_reason", "null"))
        envio_por_id = {e["id"]: e for e in envios}
        contactos = []
        for ids in _lotes(list(envio_por_id)):
            contactos.extend(_paginar(lambda ids=ids: supabase.table("tss_submission_contacts")
                                      .select("submission_id, email, phone, linkedin_url")
                                      .in_("submission_id", ids)))
    except Exception:
        raise HTTPException(502, "No se pudieron consultar los contactos.")

    filas = [{
        "submission_id": c["submission_id"],
        "email": c.get("email"),
        "phone": c.get("phone"),
        "linkedin_url": c.get("linkedin_url"),
        "submitted_at": envio_por_id[c["submission_id"]]["submitted_at"],
        "source": envio_por_id[c["submission_id"]]["source"],
    } for c in contactos if any(c.get(k) for k in ("email", "phone", "linkedin_url"))]
    return sorted(filas, key=lambda f: f["submitted_at"] or "", reverse=True)


@router.get("/resumen")
def resumen():
    """Cantidad de envíos por encuesta y por origen (formulario web, CSV...)."""
    encuestas = supabase.table("tss_surveys").select("id, slug, name").execute().data
    envios = (supabase.table("tss_submissions").select("survey_id, source")
              .is_("excluded_reason", "null").execute().data)
    por_encuesta = {e["id"]: Counter() for e in encuestas}
    for envio in envios:
        por_encuesta[envio["survey_id"]][envio["source"]] += 1
    return {
        e["slug"]: {
            "name": e["name"],
            "total": sum(por_encuesta[e["id"]].values()),
            "por_origen": dict(por_encuesta[e["id"]]),
        }
        for e in encuestas
    }


# ---------------------------------------------------------------- escenarios (simulación)

MODELO_POSGRADO = "posgrado_titulados"


class Escenario(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    model_version: str = "1"
    parameters: dict
    assumptions: dict = {}
    results: dict


@router.get("/simulaciones")
def listar_simulaciones(modelo: str = MODELO_POSGRADO, limite: int = 10):
    """Escenarios guardados del modelo, del más reciente al más antiguo."""
    return (supabase.table("tss_simulation_runs")
            .select("id, title, model_version, parameters, assumptions, results, created_at")
            .eq("model_key", modelo).order("created_at", desc=True).limit(min(limite, 50))
            .execute().data)


@router.post("/simulaciones", status_code=201)
def guardar_simulacion(escenario: Escenario, usuario: dict = Depends(requiere_admin)):
    fila = {**escenario.model_dump(), "model_key": MODELO_POSGRADO, "created_by": usuario["id"]}
    return supabase.table("tss_simulation_runs").insert(fila).execute().data[0]


@router.delete("/simulaciones/{simulacion_id}", status_code=204)
def borrar_simulacion(simulacion_id: str, _usuario: dict = Depends(requiere_admin)):
    borradas = supabase.table("tss_simulation_runs").delete().eq("id", simulacion_id).execute().data
    if not borradas:
        raise HTTPException(404, "No existe ese escenario.")
