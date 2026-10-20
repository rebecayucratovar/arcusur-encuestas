"""Validación de respuestas contra el catálogo (la encuesta armada por GET /encuestas/{slug}).

La usan el formulario web y el importador de CSV, para que ambos apliquen las mismas reglas.
"""

import re

from app.condiciones import evaluar

CON_OPCIONES = {"single_choice", "likert", "multiple_choice"}

RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RE_TELEFONO = re.compile(r"^\+?[\d\s-]{6,20}$")
RE_URL = re.compile(r"^https?://\S+\.\S+$", re.IGNORECASE)

OBLIGATORIA = "Esta pregunta es obligatoria."


def preguntas(encuesta):
    return [q for s in encuesta["sections"] for q in s["questions"]]


def _vacio(valor):
    return valor is None or valor == "" or valor == []


def _normalizar(valor):
    """Quita espacios de los textos y descarta valores vacíos."""
    if isinstance(valor, str):
        valor = valor.strip()
    elif isinstance(valor, list):
        valor = [v.strip() if isinstance(v, str) else v for v in valor]
        valor = [v for v in valor if not _vacio(v)]
    return None if _vacio(valor) else valor


def _validar_valor(q, valor, limpias, importado=False):
    """Devuelve (valor_limpio, error). El valor ya no está vacío."""
    tipo, cfg = q["question_type"], q["configuration"]
    permitidos = {o["value"] for o in q["options"]}

    if tipo in ("single_choice", "likert"):
        if not isinstance(valor, str) or valor not in permitidos:
            return None, "Opción no válida."
        return valor, None

    if tipo == "multiple_choice":
        if isinstance(valor, str):
            valor = [valor]
        if not isinstance(valor, list) or any(v not in permitidos for v in valor):
            return None, "Opción no válida."
        valor = list(dict.fromkeys(valor))  # sin repetidos, en el orden recibido
        if importado:
            return valor, None  # versiones anteriores del formulario pedían otra cantidad
        mn, mx = cfg.get("min_selected"), cfg.get("max_selected")
        if mn is not None and mx is not None and mn == mx and len(valor) != mn:
            return None, f"Seleccione exactamente {mn} opciones."
        if mn is not None and len(valor) < mn:
            return None, f"Seleccione al menos {mn} opciones."
        if mx is not None and len(valor) > mx:
            return None, f"Seleccione como máximo {mx} opciones."
        return valor, None

    if not isinstance(valor, (str, int, float)):
        return None, "Respuesta no válida."
    texto = str(valor).strip()

    if tipo == "email":
        return (texto, None) if RE_EMAIL.match(texto) else (None, "Correo electrónico no válido.")

    entrada = cfg.get("input")
    if entrada == "integer":
        if not re.fullmatch(r"\d+", texto):
            return None, "Introduzca solo un número entero, sin espacios."
        numero = int(texto)
        if "min" in cfg and numero < cfg["min"]:
            return None, f"El valor mínimo es {cfg['min']}."
        if "max" in cfg and numero > cfg["max"]:
            return None, f"El valor máximo es {cfg['max']}."
        tope = limpias.get(cfg.get("max_question"))
        if tope is not None and numero > tope:
            return None, f"No puede ser mayor que {tope}."
        return numero, None
    if entrada == "phone" and not RE_TELEFONO.match(texto):
        return None, "Número de teléfono no válido."
    if entrada == "url" and not RE_URL.match(texto):
        return None, "Enlace no válido (debe empezar con http:// o https://)."
    return texto, None


def validar(encuesta, respuestas, importado=False):
    """Valida `respuestas` ({codigo: valor}) y devuelve (limpias, errores).

    - Solo se conservan las preguntas visibles; las respuestas a preguntas
      ocultas se descartan sin error (el usuario pudo cambiar de rama).
    - `limpias` lleva los enteros ya convertidos a int.
    - `errores` es {codigo: mensaje}; vacío si todo es válido.
    - `importado`: para respuestas traídas de Microsoft/Google Forms. No exige las
      obligatorias ni la cantidad de opciones, porque el formulario cambió durante la
      recolección (preguntas añadidas después, "5 asignaturas" que antes eran menos).
      Los valores que sí vienen se validan igual que en el formulario.
    """
    lista = preguntas(encuesta)
    conocidas = {q["code"] for q in lista}
    errores = {c: "Pregunta desconocida." for c in respuestas if c not in conocidas}

    limpias, visibles = {}, set()
    for q in lista:
        if not evaluar(q["display_condition"], limpias):
            continue
        visibles.add(q["code"])
        valor = _normalizar(respuestas.get(q["code"]))
        if valor is None:
            if q["required"] and not importado:
                errores[q["code"]] = OBLIGATORIA
            continue
        valor, error = _validar_valor(q, valor, limpias, importado)
        if error:
            errores[q["code"]] = error
        else:
            limpias[q["code"]] = valor

    # "Elegir una opción o escribir en Otro" (rubro, área, cargo).
    for q in lista:
        grupo = q["configuration"].get("require_one_of")
        if q["code"] in visibles and grupo and not importado and not any(c in limpias for c in grupo):
            errores.setdefault(q["code"], "Seleccione una opción o complete el campo 'Otro'.")

    return limpias, errores
