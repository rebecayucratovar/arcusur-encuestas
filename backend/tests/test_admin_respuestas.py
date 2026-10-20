from fastapi.testclient import TestClient

from app import admin
from app.auth import requiere_staff
from app.main import app


class Resultado:
    def __init__(self, data):
        self.data = data


class Consulta:
    def __init__(self, filas):
        self.filas = list(filas)

    def select(self, _columnas):
        return self

    def eq(self, columna, valor):
        self.filas = [f for f in self.filas if f.get(columna) == valor]
        return self

    def is_(self, columna, valor):
        if valor == "null":
            self.filas = [f for f in self.filas if f.get(columna) is None]
        return self

    def in_(self, columna, valores):
        self.filas = [f for f in self.filas if f.get(columna) in valores]
        return self

    def order(self, columna, desc=False):
        self.filas.sort(key=lambda f: f.get(columna) or "", reverse=desc)
        return self

    def limit(self, cantidad):
        self.filas = self.filas[:cantidad]
        return self

    def range(self, inicio, fin):
        self.filas = self.filas[inicio:fin + 1]
        return self

    def execute(self):
        return Resultado(self.filas)


class SupabaseFalso:
    def __init__(self, tablas):
        self.tablas = tablas

    def table(self, nombre):
        return Consulta(self.tablas.get(nombre, []))


TABLAS = {
    "tss_surveys": [{"id": "survey-1", "slug": "titulados"}],
    "tss_submissions": [
        {"id": "envio-1", "survey_id": "survey-1", "submitted_at": "2026-10-19T12:00:00Z",
         "source": "public_link", "excluded_reason": None},
        {"id": "excluido", "survey_id": "survey-1", "submitted_at": "2026-10-19T12:01:00Z",
         "source": "public_link", "excluded_reason": "duplicado"},
    ],
    "tss_answers": [
        {"id": "a1", "submission_id": "envio-1", "question_id": "q1", "text_value": None,
         "numeric_value": None},
        {"id": "a2", "submission_id": "envio-1", "question_id": "q2", "text_value": None,
         "numeric_value": None},
        {"id": "a3", "submission_id": "envio-1", "question_id": "q3", "text_value": "7",
         "numeric_value": None},
        {"id": "a4", "submission_id": "envio-1", "question_id": "q4",
         "text_value": "dato-privado-heredado", "numeric_value": None},
    ],
    "tss_questions": [
        {"id": "q1", "code": "genero", "question_type": "single_choice"},
        {"id": "q2", "code": "asignaturas", "question_type": "multiple_choice"},
        {"id": "q3", "code": "anios_profesional", "question_type": "short_text"},
        {"id": "q4", "code": "correo", "question_type": "email",
         "configuration": {"store": "contact", "personal_data": True}},
    ],
    "tss_answer_choices": [
        {"answer_id": "a1", "option_id": "o1"},
        {"answer_id": "a2", "option_id": "o3"},
        {"answer_id": "a2", "option_id": "o2"},
    ],
    "tss_question_options": [
        {"id": "o1", "value": "mujer", "position": 2},
        {"id": "o2", "value": "programacion", "position": 1},
        {"id": "o3", "value": "bases_datos", "position": 2},
    ],
    # La presencia de esta tabla comprueba que el endpoint no necesita consultarla.
    "tss_submission_contacts": [{"submission_id": "envio-1", "email": "privado@ejemplo.com"}],
}


def cliente(monkeypatch, tablas=TABLAS, role="admin"):
    monkeypatch.setattr(admin, "supabase", SupabaseFalso(tablas))
    app.dependency_overrides[requiere_staff] = lambda: {
        "id": "staff-1", "email": "staff@ejemplo.com", "role": role}
    return TestClient(app)


def test_endpoint_exige_autorizacion():
    app.dependency_overrides.clear()
    respuesta = TestClient(app).get("/admin/respuestas/titulados")
    assert respuesta.status_code == 401


def test_transforma_respuestas_al_contrato_y_excluye_contactos(monkeypatch):
    with cliente(monkeypatch) as c:
        respuesta = c.get("/admin/respuestas/titulados")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 200
    assert respuesta.json() == [{
        "id": "envio-1",
        "fecha": "2026-10-19T12:00:00Z",
        "origen": "public_link",
        "valores": {
            "genero": "mujer",
            "asignaturas": ["programacion", "bases_datos"],
            "anios_profesional": "7",
        },
    }]
    assert "privado@ejemplo.com" not in respuesta.text
    assert "dato-privado-heredado" not in respuesta.text


def test_analyst_puede_consultar_respuestas_sin_contactos(monkeypatch):
    with cliente(monkeypatch, role="analyst") as c:
        respuesta = c.get("/admin/respuestas/titulados")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 200
    assert "dato-privado-heredado" not in respuesta.text


def test_encuesta_sin_envios_devuelve_lista_vacia(monkeypatch):
    tablas = {**TABLAS, "tss_submissions": []}
    with cliente(monkeypatch, tablas) as c:
        respuesta = c.get("/admin/respuestas/titulados")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 200
    assert respuesta.json() == []


def test_encuesta_inexistente_devuelve_404(monkeypatch):
    with cliente(monkeypatch) as c:
        respuesta = c.get("/admin/respuestas/no-existe")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 404


def test_paginacion_recupera_mas_de_una_pagina(monkeypatch):
    monkeypatch.setattr(admin, "TAMANO_PAGINA", 2)
    tablas = {
        **TABLAS,
        "tss_submissions": [
            {"id": f"e{i}", "survey_id": "survey-1", "submitted_at": f"2026-10-19T12:0{i}:00Z",
             "source": "public_link", "excluded_reason": None}
            for i in range(3)
        ],
        "tss_answers": [],
        "tss_questions": [],
        "tss_answer_choices": [],
        "tss_question_options": [],
    }
    with cliente(monkeypatch, tablas) as c:
        respuesta = c.get("/admin/respuestas/titulados")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 200
    assert [fila["id"] for fila in respuesta.json()] == ["e0", "e1", "e2"]
