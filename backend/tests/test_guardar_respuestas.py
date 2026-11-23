"""Caja blanca de app/respuestas.py: guardado, reversión ante fallos y POST /encuestas/{slug}/respuestas.

Usa una base en memoria en lugar de Supabase, así que no toca la base de datos real.
"""

from datetime import datetime, timedelta, timezone
from itertools import count

import pytest
from fastapi.testclient import TestClient

from app import respuestas
from app.encuestas import EncuestaNoEncontrada
from app.main import app
from app.respuestas import RespuestaInvalida, guardar_respuesta, normalizar_fecha
from tests.conftest import respuesta_valida


class Resultado:
    def __init__(self, data):
        self.data = data


class Consulta:
    """Imita la cadena de PostgREST: table().insert/select/delete().eq/in_().execute()."""

    def __init__(self, base, tabla):
        self.base, self.tabla = base, tabla
        self.accion, self.filas, self.filtros = None, None, []

    def insert(self, filas):
        self.accion, self.filas = "insert", filas if isinstance(filas, list) else [filas]
        return self

    def select(self, _columnas):
        self.accion = "select"
        return self

    def delete(self):
        self.accion = "delete"
        return self

    def eq(self, columna, valor):
        self.filtros.append(lambda f: f.get(columna) == valor)
        return self

    def in_(self, columna, valores):
        self.filtros.append(lambda f: f.get(columna) in valores)
        return self

    def execute(self):
        if self.tabla in self.base.fallar_en and self.accion == "insert":
            raise RuntimeError(f"fallo simulado en {self.tabla}")
        datos = self.base.tablas.setdefault(self.tabla, [])
        if self.accion == "insert":
            nuevas = [{"id": f"{self.tabla}-{next(self.base.ids)}", **f} for f in self.filas]
            datos.extend(nuevas)
            return Resultado(nuevas)
        elegidas = [f for f in datos if all(c(f) for c in self.filtros)]
        if self.accion == "delete":
            self.base.tablas[self.tabla] = [f for f in datos if f not in elegidas]
        return Resultado(elegidas)


class SupabaseMemoria:
    def __init__(self, fallar_en=()):
        self.tablas, self.fallar_en, self.ids = {}, set(fallar_en), count(1)

    def table(self, nombre):
        return Consulta(self, nombre)


@pytest.fixture
def base(monkeypatch):
    memoria = SupabaseMemoria()
    monkeypatch.setattr(respuestas, "supabase", memoria)
    return memoria


def test_guarda_envio_respuestas_elecciones_y_contacto(base, titulados):
    datos = respuesta_valida(titulados) | {"interes_red": "si"}
    submission_id = guardar_respuesta("titulados", datos, encuesta=titulados)

    envio, = base.tablas["tss_submissions"]
    assert envio["id"] == submission_id and envio["consent_given"] is True
    assert "source" not in envio and "submitted_at" not in envio  # los pone la BD
    assert all(a["submission_id"] == submission_id for a in base.tablas["tss_answers"])
    assert base.tablas["tss_answer_choices"]  # opciones elegidas
    contacto, = base.tablas["tss_submission_contacts"]
    assert contacto["allow_contact"] is True and contacto["submission_id"] == submission_id


def test_guarda_origen_y_fecha_original(base, titulados):
    fecha = datetime(2026, 10, 20, 9, 30)  # sin zona: se asume Bolivia
    guardar_respuesta("titulados", respuesta_valida(titulados), source="csv_import",
                      encuesta=titulados, submitted_at=fecha, importado=True)
    envio, = base.tablas["tss_submissions"]
    assert envio["source"] == "csv_import"
    assert envio["submitted_at"] == "2026-10-20T09:30:00-04:00"


def test_respuesta_invalida_no_escribe_nada(base, titulados):
    datos = respuesta_valida(titulados) | {"anios_profesional": " 7"}
    with pytest.raises(RespuestaInvalida) as error:
        guardar_respuesta("titulados", datos, encuesta=titulados)
    assert "anios_profesional" in error.value.errores
    assert base.tablas == {}


@pytest.mark.parametrize("tabla", ["tss_answers", "tss_answer_choices", "tss_submission_contacts"])
def test_fallo_a_medio_guardar_deshace_el_envio(monkeypatch, titulados, tabla):
    memoria = SupabaseMemoria(fallar_en=[tabla])
    monkeypatch.setattr(respuestas, "supabase", memoria)
    datos = respuesta_valida(titulados) | {"interes_red": "si"}

    with pytest.raises(RuntimeError):
        guardar_respuesta("titulados", datos, encuesta=titulados)

    for nombre in ("tss_submissions", "tss_answers", "tss_answer_choices", "tss_submission_contacts"):
        assert memoria.tablas.get(nombre, []) == [], nombre


def test_carga_la_encuesta_si_no_se_pasa(base, monkeypatch, titulados):
    monkeypatch.setattr(respuestas, "cargar_encuesta", lambda slug: titulados)
    assert guardar_respuesta("titulados", respuesta_valida(titulados))


def test_normalizar_fecha_rechaza_no_fechas_y_futuras():
    with pytest.raises(ValueError):
        normalizar_fecha("2026-10-20")
    with pytest.raises(ValueError):
        normalizar_fecha(datetime.now(timezone.utc) + timedelta(days=1))


def test_post_respuestas_201(base, monkeypatch, titulados):
    monkeypatch.setattr(respuestas, "cargar_encuesta", lambda slug: titulados)
    r = TestClient(app).post("/encuestas/titulados/respuestas", json={"answers": respuesta_valida(titulados)})
    assert r.status_code == 201
    assert r.json()["submission_id"] == base.tablas["tss_submissions"][0]["id"]


def test_post_respuestas_422_con_errores_por_pregunta(base, monkeypatch, titulados):
    monkeypatch.setattr(respuestas, "cargar_encuesta", lambda slug: titulados)
    datos = respuesta_valida(titulados)
    datos.pop("genero")
    r = TestClient(app).post("/encuestas/titulados/respuestas", json={"answers": datos})
    assert r.status_code == 422
    assert r.json()["detail"]["errores"] == {"genero": "Esta pregunta es obligatoria."}


def test_post_respuestas_404_si_la_encuesta_no_existe(base, monkeypatch):
    def no_existe(slug):
        raise EncuestaNoEncontrada(f"No existe la encuesta {slug}")
    monkeypatch.setattr(respuestas, "cargar_encuesta", no_existe)
    r = TestClient(app).post("/encuestas/otra/respuestas", json={"answers": {}})
    assert r.status_code == 404
