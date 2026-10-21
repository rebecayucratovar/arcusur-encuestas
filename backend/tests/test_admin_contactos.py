from app.main import app
from tests.test_admin_respuestas import TABLAS, cliente

CONTACTOS = TABLAS | {
    "tss_submissions": TABLAS["tss_submissions"] + [
        {"id": "envio-2", "survey_id": "survey-1", "submitted_at": "2026-10-20T09:00:00Z",
         "source": "csv_import", "excluded_reason": None},
    ],
    "tss_submission_contacts": [
        {"submission_id": "envio-1", "email": "uno@ejemplo.com", "phone": None, "linkedin_url": None},
        {"submission_id": "envio-2", "email": "dos@ejemplo.com", "phone": "70000000", "linkedin_url": None},
        {"submission_id": "excluido", "email": "excluido@ejemplo.com", "phone": None, "linkedin_url": None},
    ],
}


def test_admin_ve_contactos_con_fecha_y_origen(monkeypatch):
    respuesta = cliente(monkeypatch, CONTACTOS).get("/admin/contactos/titulados")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 200
    assert [c["email"] for c in respuesta.json()] == ["dos@ejemplo.com", "uno@ejemplo.com"]
    assert respuesta.json()[0]["source"] == "csv_import"


def test_analyst_no_ve_contactos(monkeypatch):
    respuesta = cliente(monkeypatch, CONTACTOS, role="analyst").get("/admin/contactos/titulados")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 403


def test_encuesta_inexistente(monkeypatch):
    respuesta = cliente(monkeypatch, CONTACTOS).get("/admin/contactos/otra")
    app.dependency_overrides.clear()
    assert respuesta.status_code == 404
