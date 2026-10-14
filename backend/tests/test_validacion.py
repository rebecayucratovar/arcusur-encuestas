import pytest

from app.respuestas import construir_filas
from app.validacion import OBLIGATORIA, validar
from tests.conftest import respuesta_valida

RAMAS = {
    "trabaja": {"situacion_laboral": "trabaja"},
    "no trabaja, trabajó antes": {"situacion_laboral": "no_trabaja", "trabajo_antes": "si"},
    "no trabaja, nunca trabajó": {"situacion_laboral": "no_trabaja", "trabajo_antes": "no"},
    "emprende": {"situacion_laboral": "emprende"},
}


@pytest.mark.parametrize("interes", ["si", "no"])
@pytest.mark.parametrize("rama", RAMAS)
def test_los_8_caminos_de_titulados_son_validos(titulados, interes, rama):
    eleccion = {"interes_posgrado": interes, "interes_red": "si", **RAMAS[rama]}
    limpias, errores = validar(titulados, respuesta_valida(titulados, eleccion))

    assert errores == {}
    assert ("area_posgrado" in limpias) == (interes == "si")
    assert ("remuneracion" in limpias) == (rama == "trabaja")
    assert ("tiempo_primer_trabajo" in limpias) == (rama != "no trabaja, nunca trabajó")


def test_respuestas_de_preguntas_ocultas_se_descartan(titulados):
    respuestas = respuesta_valida(titulados, {"situacion_laboral": "emprende"})
    respuestas["remuneracion"] = "mas_10000"  # quedó de cuando eligió "trabaja"
    limpias, errores = validar(titulados, respuestas)

    assert errores == {}
    assert "remuneracion" not in limpias


def test_falta_una_obligatoria(titulados):
    respuestas = respuesta_valida(titulados)
    del respuestas["edad"]
    _, errores = validar(titulados, respuestas)

    assert errores == {"edad": OBLIGATORIA}


def test_pregunta_desconocida(titulados):
    respuestas = respuesta_valida(titulados) | {"inventada": "x"}
    assert "inventada" in validar(titulados, respuestas)[1]


def test_opcion_inexistente(titulados):
    respuestas = respuesta_valida(titulados) | {"edad": "99_100"}
    assert validar(titulados, respuestas)[1] == {"edad": "Opción no válida."}


@pytest.mark.parametrize("cantidad, ok", [(4, False), (5, True), (6, False)])
def test_asignaturas_exactamente_5(titulados, cantidad, ok):
    opciones = [o["value"] for s in titulados["sections"] for q in s["questions"]
                if q["code"] == "asignaturas_ventaja" for o in q["options"]]
    respuestas = respuesta_valida(titulados) | {"asignaturas_ventaja": opciones[:cantidad]}
    _, errores = validar(titulados, respuestas)

    assert ("asignaturas_ventaja" not in errores) == ok


def test_otra_asignatura_no_cuenta_para_el_limite(titulados):
    respuestas = respuesta_valida(titulados) | {"otra_ventaja": "Sistemas Operativos"}
    limpias, errores = validar(titulados, respuestas)

    assert errores == {}
    assert len(limpias["asignaturas_ventaja"]) == 5
    assert limpias["otra_ventaja"] == "Sistemas Operativos"


@pytest.mark.parametrize("valor, esperado", [("7", 7), (" 7 ", 7), ("siete", None), ("7.5", None), ("61", None)])
def test_anios_profesional_entero(titulados, valor, esperado):
    respuestas = respuesta_valida(titulados) | {"anios_profesional": valor, "anios_desempleado": "0"}
    limpias, errores = validar(titulados, respuestas)

    if esperado is None:
        assert "anios_profesional" in errores
    else:
        assert limpias["anios_profesional"] == esperado


def test_desempleo_no_supera_vida_profesional(titulados):
    respuestas = respuesta_valida(titulados) | {"anios_profesional": "3", "anios_desempleado": "4"}
    assert validar(titulados, respuestas)[1] == {"anios_desempleado": "No puede ser mayor que 3."}


def test_rubro_u_otro_rubro(titulados):
    base = respuesta_valida(titulados, {"situacion_laboral": "trabaja"})
    sin_rubro = {k: v for k, v in base.items() if k not in ("rubro_trabajo", "otro_rubro")}

    assert "rubro_trabajo" in validar(titulados, sin_rubro)[1]
    assert validar(titulados, sin_rubro | {"otro_rubro": "Minería"})[1] == {}


def test_contacto_invalido(titulados):
    respuestas = respuesta_valida(titulados, {"interes_red": "si"}) | {
        "email": "no-es-correo", "linkedin": "linkedin.com/in/x"}
    _, errores = validar(titulados, respuestas)

    assert set(errores) == {"email", "linkedin"}


def test_empleadores_acepta_no_sabe(empleadores):
    respuestas = respuesta_valida(empleadores) | {"perfil_01": "no_sabe"}
    assert validar(empleadores, respuestas)[1] == {}


def test_empleadores_cargos_al_menos_uno(empleadores):
    respuestas = respuesta_valida(empleadores) | {"cargos": []}
    assert validar(empleadores, respuestas)[1] == {"cargos": OBLIGATORIA}


# ---------------------------------------------------------------- reparto en tablas

def test_construir_filas_titulados(titulados):
    respuestas = respuesta_valida(titulados, {"situacion_laboral": "trabaja", "interes_red": "si"})
    respuestas["anios_profesional"] = "8"
    limpias, _ = validar(titulados, respuestas)
    answers, elecciones, contacto = construir_filas(titulados, limpias)
    por_pregunta = {a["question_id"]: a for a in answers}

    assert por_pregunta["q-anios_profesional"]["text_value"] == "8"
    assert por_pregunta["q-anios_profesional"]["numeric_value"] is None
    assert por_pregunta["q-nombre_empresa"]["text_value"] == "Texto de prueba"
    assert elecciones["q-edad"] == ["o-edad-15_18"]
    assert len(elecciones["q-asignaturas_ventaja"]) == 5
    # Los datos de contacto no se guardan como respuestas analíticas.
    assert "q-email" not in por_pregunta
    assert contacto == {"email": "persona@ejemplo.com", "phone": "+591 70000000",
                        "linkedin_url": "https://www.linkedin.com/in/persona", "allow_contact": True}


def test_construir_filas_sin_red_no_hay_contacto(titulados):
    limpias, _ = validar(titulados, respuesta_valida(titulados, {"interes_red": "no"}))
    assert construir_filas(titulados, limpias)[2] is None


def test_construir_filas_empleadores_correo_sin_permiso_de_contacto(empleadores):
    limpias, _ = validar(empleadores, respuesta_valida(empleadores))
    _, _, contacto = construir_filas(empleadores, limpias)

    assert contacto == {"email": "persona@ejemplo.com", "allow_contact": False}
