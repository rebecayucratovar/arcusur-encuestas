from fastapi.testclient import TestClient

from app import main


class ConsultaSalud:
    def select(self, _columnas):
        return self

    def limit(self, _cantidad):
        return self

    def execute(self):
        return object()


class SupabaseSalud:
    def __init__(self, error=None):
        self.error = error

    def table(self, nombre):
        assert nombre == "tss_surveys"
        if self.error:
            raise self.error
        return ConsultaSalud()


def test_health_db_confirma_conexion_sin_devolver_datos(monkeypatch):
    monkeypatch.setattr(main, "supabase", SupabaseSalud())

    respuesta = TestClient(main.app).get("/health/db")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok", "supabase": "conectado"}


def test_health_db_oculta_detalles_internos(monkeypatch):
    secreto = "detalle-interno-que-no-debe-filtrarse"
    monkeypatch.setattr(main, "supabase", SupabaseSalud(RuntimeError(secreto)))

    respuesta = TestClient(main.app).get("/health/db")

    assert respuesta.status_code == 503
    assert respuesta.json() == {"status": "error", "supabase": "no disponible"}
    assert secreto not in respuesta.text
