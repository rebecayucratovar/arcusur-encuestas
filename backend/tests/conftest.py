"""Fixtures: el catálogo real (database/catalogo/*.json) en el formato de GET /encuestas/{slug}."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "database" / "catalogo"))
from generar_sql import cargar  # noqa: E402

from app.condiciones import evaluar  # noqa: E402


def encuesta_desde_catalogo(nombre):
    datos = cargar(nombre)
    secciones = []
    for pos_s, s in enumerate(datos["sections"], 1):
        preguntas = [{
            "id": f"q-{q['code']}",
            "code": q["code"],
            "prompt": q["prompt"],
            "help_text": q.get("help"),
            "question_type": q["type"],
            "required": q["required"],
            "position": pos_q,
            "configuration": q["config"],
            "display_condition": q.get("if"),
            "options": [{"id": f"o-{q['code']}-{v}", "value": v, "label": l, "position": i}
                        for i, (v, l) in enumerate(q.get("options", []), 1)],
        } for pos_q, q in enumerate(s["questions"], 1)]
        secciones.append({"id": f"s{pos_s}", "title": s["title"], "description": s.get("description"),
                          "position": pos_s, "questions": preguntas})
    return {"survey_id": f"e-{nombre}", "slug": nombre, "name": nombre, "description": None,
            "is_active": False, "version_id": f"v-{nombre}", "version_number": 1,
            "version_status": "draft", "sections": secciones}


def respuesta_valida(encuesta, eleccion=None):
    """Recorre la encuesta y responde todo lo visible con un valor válido.

    `eleccion` fuerza respuestas concretas ({codigo: valor}) para elegir la rama.
    """
    eleccion = eleccion or {}
    respuestas = {}
    for s in encuesta["sections"]:
        for q in s["questions"]:
            if not evaluar(q["display_condition"], respuestas):
                continue
            cod, cfg, valores = q["code"], q["configuration"], [o["value"] for o in q["options"]]
            if cod in eleccion:
                respuestas[cod] = eleccion[cod]
            elif q["question_type"] == "multiple_choice":
                respuestas[cod] = valores[: cfg.get("min_selected", 1)]
            elif valores:
                respuestas[cod] = valores[0]
            elif q["question_type"] == "email":
                respuestas[cod] = "persona@ejemplo.com"
            elif cfg.get("input") == "integer":
                respuestas[cod] = "1"
            elif cfg.get("input") == "phone":
                respuestas[cod] = "+591 70000000"
            elif cfg.get("input") == "url":
                respuestas[cod] = "https://www.linkedin.com/in/persona"
            else:
                respuestas[cod] = "Texto de prueba"
    return respuestas


@pytest.fixture(scope="session")
def titulados():
    return encuesta_desde_catalogo("titulados")


@pytest.fixture(scope="session")
def empleadores():
    return encuesta_desde_catalogo("empleadores")
