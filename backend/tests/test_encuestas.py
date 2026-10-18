from app.encuestas import armar_encuesta, elegir_version


def version(id, numero, status, secciones=()):
    return {"id": id, "version_number": numero, "status": status, "tss_sections": list(secciones)}


def pregunta(code, position, opciones=(), configuration=None):
    return {
        "id": f"q-{code}", "code": code, "prompt": code.upper(), "help_text": None,
        "question_type": "single_choice" if opciones else "short_text",
        "required": True, "position": position,
        "configuration": configuration or {}, "display_condition": None,
        "tss_question_options": [{"value": v, "label": v.upper(), "position": p} for v, p in opciones],
    }


ENCUESTA = {"id": "e1", "slug": "titulados", "name": "Titulados", "description": "d", "is_active": False}


def test_elegir_version_prefiere_la_ultima_publicada():
    versiones = [version("a", 1, "published"), version("b", 2, "published"), version("c", 3, "draft")]
    assert elegir_version(versiones)["id"] == "b"


def test_elegir_version_sin_publicadas_usa_el_ultimo_borrador():
    assert elegir_version([version("a", 1, "draft"), version("b", 2, "draft")])["id"] == "b"


def test_elegir_version_sin_versiones():
    assert elegir_version([]) is None


def test_armar_encuesta_ordena_secciones_preguntas_y_opciones():
    secciones = [
        {"id": "s2", "title": "Segunda", "description": None, "position": 2,
         "tss_questions": [pregunta("b", 1)]},
        {"id": "s1", "title": "Primera", "description": None, "position": 1,
         "tss_questions": [pregunta("a2", 2), pregunta("a1", 1, opciones=[("no", 2), ("si", 1)])]},
    ]
    r = armar_encuesta(ENCUESTA, version("v1", 1, "draft", secciones))

    assert [s["title"] for s in r["sections"]] == ["Primera", "Segunda"]
    assert [q["code"] for q in r["sections"][0]["questions"]] == ["a1", "a2"]
    assert [o["value"] for o in r["sections"][0]["questions"][0]["options"]] == ["si", "no"]
    assert r["version_id"] == "v1"


def test_armar_encuesta_oculta_notas_internas_de_configuration():
    cfg = {"source": "pdf", "source_note": "pendiente", "min_selected": 5}
    secciones = [{"id": "s1", "title": "S", "description": None, "position": 1,
                  "tss_questions": [pregunta("x", 1, configuration=cfg)]}]
    r = armar_encuesta(ENCUESTA, version("v1", 1, "draft", secciones))

    assert r["sections"][0]["questions"][0]["configuration"] == {"min_selected": 5}
