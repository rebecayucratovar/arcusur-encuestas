from types import SimpleNamespace

from fastapi.testclient import TestClient

from app import encuestas, respuestas
from app.auth import requiere_staff
from app.main import app


def version(identificador, numero, estado):
    return {
        "id": identificador,
        "survey_id": "encuesta-1",
        "version_number": numero,
        "status": estado,
        "tss_sections": [],
    }


class Consulta:
    def __init__(self, filas, supabase):
        self.filas = list(filas)
        self.supabase = supabase
        self.limite = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, campo, valor):
        self.filas = [fila for fila in self.filas if fila.get(campo) == valor]
        return self

    def limit(self, limite):
        self.limite = limite
        return self

    def insert(self, *_args, **_kwargs):
        self.supabase.intento_escritura = True
        raise AssertionError("Una encuesta no pública no debe producir escrituras")

    def execute(self):
        filas = self.filas[:self.limite] if self.limite is not None else self.filas
        return SimpleNamespace(data=filas)


class SupabaseFalso:
    def __init__(self, activa, versiones):
        self.intento_escritura = False
        self.tablas = {
            "tss_surveys": [{
                "id": "encuesta-1",
                "slug": "titulados",
                "name": "Titulados",
                "description": None,
                "is_active": activa,
            }],
            "tss_survey_versions": versiones,
            "tss_submissions": [],
        }

    def table(self, nombre):
        return Consulta(self.tablas.get(nombre, []), self)


def cliente(monkeypatch, *, activa, versiones, autenticado=False):
    falso = SupabaseFalso(activa, versiones)
    monkeypatch.setattr(encuestas, "supabase", falso)
    monkeypatch.setattr(respuestas, "supabase", falso)
    app.dependency_overrides.clear()
    if autenticado:
        app.dependency_overrides[requiere_staff] = lambda: {
            "id": "admin-1", "email": "admin@example.com", "role": "admin",
        }
    return TestClient(app), falso


def test_publica_activa_devuelve_ultima_version_publicada(monkeypatch):
    c, _ = cliente(
        monkeypatch,
        activa=True,
        versiones=[version("publicada-1", 1, "published"), version("borrador-2", 2, "draft")],
    )
    with c:
        respuesta = c.get("/encuestas/titulados")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 200
    assert respuesta.json()["version_id"] == "publicada-1"
    assert respuesta.json()["version_status"] == "published"


def test_publica_activa_sin_version_publicada_no_se_expone(monkeypatch):
    c, _ = cliente(monkeypatch, activa=True, versiones=[version("borrador-1", 1, "draft")])
    with c:
        respuesta = c.get("/encuestas/titulados")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 404


def test_publica_inactiva_no_se_expone_aunque_tenga_version_publicada(monkeypatch):
    c, _ = cliente(monkeypatch, activa=False, versiones=[version("publicada-1", 1, "published")])
    with c:
        respuesta = c.get("/encuestas/titulados")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 404


def test_anonimo_no_puede_enviar_respuestas_a_borrador(monkeypatch):
    c, falso = cliente(monkeypatch, activa=True, versiones=[version("borrador-1", 1, "draft")])
    with c:
        respuesta = c.post("/encuestas/titulados/respuestas", json={"answers": {}})
    app.dependency_overrides.clear()

    assert respuesta.status_code == 404
    assert falso.intento_escritura is False


def test_anonimo_no_puede_enviar_respuestas_a_encuesta_inactiva(monkeypatch):
    c, falso = cliente(monkeypatch, activa=False, versiones=[version("publicada-1", 1, "published")])
    with c:
        respuesta = c.post("/encuestas/titulados/respuestas", json={"answers": {}})
    app.dependency_overrides.clear()

    assert respuesta.status_code == 404
    assert falso.intento_escritura is False


def test_vista_previa_protegida_devuelve_ultimo_borrador_inactivo(monkeypatch):
    c, _ = cliente(
        monkeypatch,
        activa=False,
        versiones=[version("publicada-1", 1, "published"), version("borrador-2", 2, "draft")],
        autenticado=True,
    )
    with c:
        respuesta = c.get("/admin/encuestas/titulados/vista-previa")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 200
    assert respuesta.json()["version_id"] == "borrador-2"
    assert respuesta.json()["version_status"] == "draft"
    assert respuesta.json()["is_active"] is False


def test_catalogo_admin_funciona_con_publicada_activa(monkeypatch):
    c, _ = cliente(
        monkeypatch,
        activa=True,
        versiones=[version("publicada-1", 1, "published")],
        autenticado=True,
    )
    with c:
        respuesta = c.get("/admin/encuestas/titulados/vista-previa")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 200
    assert respuesta.json()["version_id"] == "publicada-1"
    assert respuesta.json()["version_status"] == "published"


def test_vista_previa_exige_autenticacion(monkeypatch):
    c, _ = cliente(monkeypatch, activa=True, versiones=[version("borrador-1", 1, "draft")])
    with c:
        respuesta = c.get("/admin/encuestas/titulados/vista-previa")
    app.dependency_overrides.clear()

    assert respuesta.status_code == 401
