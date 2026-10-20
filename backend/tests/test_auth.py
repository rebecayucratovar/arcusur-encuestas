from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import auth
from app.auth import requiere_staff
from app.main import app


class Resultado:
    def __init__(self, data):
        self.data = data


class ConsultaRol:
    def __init__(self, rol):
        self.rol = rol

    def select(self, _columnas):
        return self

    def eq(self, _columna, _valor):
        return self

    def execute(self):
        return Resultado([] if self.rol is None else [self.rol])


class AuthFalso:
    def __init__(self, usuario=None, error=None):
        self.usuario = usuario
        self.error = error

    def get_user(self, _token):
        if self.error:
            raise self.error
        return SimpleNamespace(user=self.usuario)


class SupabaseAuthFalso:
    def __init__(self, rol=None, usuario=None, error=None):
        self.auth = AuthFalso(usuario, error)
        self.rol = rol

    def table(self, nombre):
        assert nombre == "tss_admin_roles"
        return ConsultaRol(self.rol)


def usuario():
    return SimpleNamespace(id="usuario-1", email="persona@ejemplo.com")


def test_staff_exige_token():
    with pytest.raises(HTTPException) as error:
        auth.requiere_staff(None)
    assert error.value.status_code == 401


def test_staff_rechaza_token_invalido(monkeypatch):
    monkeypatch.setattr(auth, "supabase", SupabaseAuthFalso(error=RuntimeError("token inválido")))
    with pytest.raises(HTTPException) as error:
        auth.requiere_staff("Bearer token-invalido")
    assert error.value.status_code == 401


@pytest.mark.parametrize("rol", ["admin", "analyst"])
def test_staff_acepta_roles_activos(monkeypatch, rol):
    monkeypatch.setattr(auth, "supabase", SupabaseAuthFalso(
        rol={"role": rol, "active": True}, usuario=usuario()))
    resultado = auth.requiere_staff("Bearer token-valido")
    assert resultado["role"] == rol


@pytest.mark.parametrize("rol", [None, {"role": "admin", "active": False},
                                  {"role": "otro", "active": True}])
def test_staff_rechaza_cuenta_sin_permiso(monkeypatch, rol):
    monkeypatch.setattr(auth, "supabase", SupabaseAuthFalso(rol=rol, usuario=usuario()))
    with pytest.raises(HTTPException) as error:
        auth.requiere_staff("Bearer token-valido")
    assert error.value.status_code == 403


def test_admin_acepta_admin():
    resultado = auth.requiere_admin({"id": "u1", "email": "a@b.test", "role": "admin"})
    assert resultado["role"] == "admin"


def test_admin_rechaza_analyst():
    with pytest.raises(HTTPException) as error:
        auth.requiere_admin({"id": "u1", "email": "a@b.test", "role": "analyst"})
    assert error.value.status_code == 403


@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("post", "/admin/simulaciones", {
        "title": "Escenario",
        "parameters": {},
        "assumptions": {},
        "results": {},
    }),
    ("delete", "/admin/simulaciones/00000000-0000-0000-0000-000000000000", None),
])
def test_analyst_no_puede_escribir_en_admin(metodo, ruta, cuerpo):
    app.dependency_overrides[requiere_staff] = lambda: {
        "id": "analyst-1", "email": "analyst@ejemplo.com", "role": "analyst"}
    try:
        respuesta = TestClient(app).request(metodo.upper(), ruta, json=cuerpo)
    finally:
        app.dependency_overrides.clear()

    assert respuesta.status_code == 403
