from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import admin
from app.auth import requiere_staff
from app.encuestas import EncuestaNoEncontrada
from app.main import app


class Resultado:
    def __init__(self, data):
        self.data = data


class RpcFalsa:
    def __init__(self, respuesta=None, error=None):
        self.respuesta = respuesta or {"importadas": 0, "rechazadas": []}
        self.error = error
        self.llamadas = []

    def rpc(self, nombre, parametros):
        self.llamadas.append((nombre, parametros))
        return self

    def execute(self):
        if self.error:
            raise self.error
        return Resultado(deepcopy(self.respuesta))


def encuesta_minima():
    return {
        "survey_id": "00000000-0000-0000-0000-000000000001",
        "version_id": "00000000-0000-0000-0000-000000000002",
        "version_status": "draft",
        "sections": [{"questions": [
            {"id": "00000000-0000-0000-0000-000000000010", "code": "sector",
             "question_type": "single_choice", "required": True, "display_condition": None,
             "configuration": {}, "options": [
                 {"id": "00000000-0000-0000-0000-000000000011", "value": "publico"},
                 {"id": "00000000-0000-0000-0000-000000000012", "value": "privado"},
             ]},
            {"id": "00000000-0000-0000-0000-000000000020", "code": "areas",
             "question_type": "multiple_choice", "required": False, "display_condition": None,
             "configuration": {"max_selected": 1}, "options": [
                 {"id": "00000000-0000-0000-0000-000000000021", "value": "datos"},
                 {"id": "00000000-0000-0000-0000-000000000022", "value": "redes"},
             ]},
            {"id": "00000000-0000-0000-0000-000000000030", "code": "experiencia",
             "question_type": "short_text", "required": False, "display_condition": None,
             "configuration": {"input": "integer", "min": 0, "max": 60}, "options": []},
            {"id": "00000000-0000-0000-0000-000000000040", "code": "email",
             "question_type": "email", "required": False, "display_condition": None,
             "configuration": {"store": "contact", "contact_field": "email"}, "options": []},
        ]}],
    }


@pytest.fixture
def cliente_importacion(monkeypatch):
    base = encuesta_minima()
    rpc = RpcFalsa()
    monkeypatch.setattr(admin, "supabase", rpc)
    monkeypatch.setattr(admin, "cargar_encuesta", lambda slug, vista_previa=False: deepcopy(base))
    app.dependency_overrides[requiere_staff] = lambda: {
        "id": "00000000-0000-0000-0000-000000000099",
        "email": "admin@ejemplo.com", "role": "admin",
    }
    try:
        yield TestClient(app), rpc
    finally:
        app.dependency_overrides.clear()


def test_csv_valido_separa_opciones_y_contacto_y_conserva_fecha(cliente_importacion):
    cliente, rpc = cliente_importacion
    rpc.respuesta = {"importadas": 1, "rechazadas": []}
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "forms.csv",
        "filas": [{
            "fila": 2,
            "submitted_at": "2025-03-25T10:30:00-04:00",
            "answers": {"sector": "publico", "areas": ["datos", "redes"],
                        "experiencia": "8", "email": "persona@ejemplo.com"},
        }],
    })
    assert respuesta.status_code == 200
    assert respuesta.json() == {"importadas": 1, "rechazadas": []}
    nombre, parametros = rpc.llamadas[0]
    assert nombre == "tss_import_csv"
    assert parametros["p_file_name"] == "forms.csv"
    fila = parametros["p_rows"][0]
    assert fila["submitted_at"] == "2025-03-25T10:30:00-04:00"
    assert fila["choices"]["00000000-0000-0000-0000-000000000020"] == [
        "00000000-0000-0000-0000-000000000021",
        "00000000-0000-0000-0000-000000000022",
    ]
    assert fila["contact"]["email"] == "persona@ejemplo.com"
    assert all(a["question_id"] != "00000000-0000-0000-0000-000000000040"
               for a in fila["answers"])


@pytest.mark.parametrize("answers,mensaje", [
    ({}, "no contiene respuestas"),
    ({"sector": "desconocido"}, "Opción no válida"),
    ({"experiencia": "61"}, "valor máximo"),
    ({"email": "correo-invalido"}, "Correo electrónico no válido"),
    ({"cabecera_incorrecta": "valor"}, "Pregunta desconocida"),
])
def test_filas_invalidas_se_envian_como_rechazadas_para_auditoria(
        cliente_importacion, answers, mensaje):
    cliente, rpc = cliente_importacion
    cliente.post("/admin/importar/titulados", json={
        "archivo": "datos.csv", "filas": [{"fila": 2, "submitted_at": None, "answers": answers}],
    })
    fila = rpc.llamadas[0][1]["p_rows"][0]
    assert fila["estado"] == "rechazada"
    assert mensaje.lower() in " ".join(fila["errores"]).lower()


def test_fecha_invalida_y_futura_se_rechazan_por_fila(cliente_importacion):
    cliente, rpc = cliente_importacion
    futura = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    for fecha in ("31/02/2025", futura):
        cliente.post("/admin/importar/titulados", json={
            "archivo": "datos.csv",
            "filas": [{"fila": 2, "submitted_at": fecha, "answers": {"sector": "publico"}}],
        })
        assert "fecha no válida o futura" in rpc.llamadas[-1][1]["p_rows"][0]["errores"][0]


def test_importacion_historica_admite_catalogo_borrador(cliente_importacion):
    cliente, _ = cliente_importacion
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "historico.csv",
        "filas": [{"fila": 2, "submitted_at": None, "answers": {"sector": "privado"}}],
    })
    assert respuesta.status_code == 200


def test_encuesta_inexistente_devuelve_404(cliente_importacion, monkeypatch):
    cliente, rpc = cliente_importacion

    def no_existe(*_args, **_kwargs):
        raise EncuestaNoEncontrada("No existe la encuesta 'ausente'")

    monkeypatch.setattr(admin, "cargar_encuesta", no_existe)
    respuesta = cliente.post("/admin/importar/ausente", json={"archivo": "datos.csv", "filas": []})
    assert respuesta.status_code == 404
    assert rpc.llamadas == []


def test_archivo_vacio_se_registra_sin_inventar_respuestas(cliente_importacion):
    cliente, rpc = cliente_importacion
    respuesta = cliente.post("/admin/importar/titulados", json={"archivo": "vacio.csv", "filas": []})
    assert respuesta.json() == {"importadas": 0, "rechazadas": []}
    assert rpc.llamadas[0][1]["p_rows"] == []


def test_reintentos_generan_la_misma_clave_sin_deduplicar_filas_legitimas(cliente_importacion):
    cliente, rpc = cliente_importacion
    cuerpo = {"archivo": "datos.csv", "filas": [
        {"fila": 2, "submitted_at": None, "answers": {"sector": "publico"}},
        {"fila": 3, "submitted_at": None, "answers": {"sector": "publico"}},
    ]}
    cliente.post("/admin/importar/titulados", json=cuerpo)
    cliente.post("/admin/importar/titulados", json=cuerpo)
    assert rpc.llamadas[0][1]["p_import_key"] == rpc.llamadas[1][1]["p_import_key"]
    assert len(rpc.llamadas[0][1]["p_rows"]) == 2


def test_archivos_distintos_con_filas_identicas_no_comparten_clave(cliente_importacion):
    cliente, rpc = cliente_importacion
    fila = [{"fila": 2, "submitted_at": None, "answers": {"sector": "publico"}}]
    cliente.post("/admin/importar/titulados", json={"archivo": "primero.csv", "filas": fila})
    cliente.post("/admin/importar/titulados", json={"archivo": "segundo.csv", "filas": fila})
    assert rpc.llamadas[0][1]["p_import_key"] != rpc.llamadas[1][1]["p_import_key"]


def test_resultado_parcial_reporta_errores_por_fila(cliente_importacion):
    cliente, rpc = cliente_importacion
    rpc.respuesta = {"importadas": 1, "rechazadas": [
        {"fila": 3, "errores": ["No se pudo guardar la fila."]},
    ]}
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "parcial.csv",
        "filas": [{"fila": 2, "submitted_at": None, "answers": {"sector": "publico"}}],
    })
    assert respuesta.json()["rechazadas"][0]["fila"] == 3


def test_error_de_supabase_no_expone_detalles(cliente_importacion):
    cliente, rpc = cliente_importacion
    rpc.error = RuntimeError("secreto interno")
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "datos.csv",
        "filas": [{"fila": 2, "submitted_at": None, "answers": {"sector": "publico"}}],
    })
    assert respuesta.status_code == 502
    assert "secreto interno" not in respuesta.text


def test_usuario_no_autenticado_no_puede_importar():
    app.dependency_overrides.clear()
    respuesta = TestClient(app).post("/admin/importar/titulados", json={
        "archivo": "datos.csv", "filas": [],
    })
    assert respuesta.status_code == 401


def test_analyst_no_puede_importar(monkeypatch):
    monkeypatch.setattr(admin, "cargar_encuesta", lambda *_args, **_kwargs: encuesta_minima())
    app.dependency_overrides[requiere_staff] = lambda: {
        "id": "analyst-1", "email": "analyst@ejemplo.com", "role": "analyst"}
    try:
        respuesta = TestClient(app).post("/admin/importar/titulados", json={
            "archivo": "datos.csv", "filas": [],
        })
    finally:
        app.dependency_overrides.clear()
    assert respuesta.status_code == 403


def test_limite_de_archivo_grande(cliente_importacion):
    cliente, rpc = cliente_importacion
    filas = [{"fila": i + 2, "submitted_at": None, "answers": {"sector": "publico"}}
             for i in range(admin.MAX_FILAS_IMPORTACION + 1)]
    respuesta = cliente.post("/admin/importar/titulados", json={"archivo": "grande.csv", "filas": filas})
    assert respuesta.status_code == 422
    assert rpc.llamadas == []


def test_filas_repetidas_invalidan_el_cuerpo(cliente_importacion):
    cliente, rpc = cliente_importacion
    fila = {"fila": 2, "submitted_at": None, "answers": {"sector": "publico"}}
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "datos.csv", "filas": [fila, fila],
    })
    assert respuesta.status_code == 422
    assert rpc.llamadas == []


def test_cliente_no_puede_suplantar_al_administrador(cliente_importacion):
    cliente, rpc = cliente_importacion
    respuesta = cliente.post("/admin/importar/titulados", json={
        "archivo": "datos.csv", "filas": [], "imported_by": "otro-usuario",
    })
    assert respuesta.status_code == 422
    assert rpc.llamadas == []
