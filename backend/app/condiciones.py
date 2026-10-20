"""Evaluación de display_condition (formato en database/catalogo/README.md).

El frontend replica esta misma lógica para mostrar u ocultar preguntas.
"""


def evaluar(cond, respuestas):
    """True si la pregunta con esta condición debe mostrarse.

    `respuestas` es {codigo: valor | [valores]}; una pregunta sin respuesta
    (o oculta) simplemente no está en el diccionario.
    """
    if cond is None:
        return True
    if "all" in cond:
        return all(evaluar(c, respuestas) for c in cond["all"])
    if "any" in cond:
        return any(evaluar(c, respuestas) for c in cond["any"])
    if "not" in cond:
        return not evaluar(cond["not"], respuestas)

    valor = respuestas.get(cond["q"])
    valores = valor if isinstance(valor, list) else ([] if valor in (None, "") else [valor])
    if "eq" in cond:
        return cond["eq"] in valores
    if "in" in cond:
        return any(v in cond["in"] for v in valores)
    if "answered" in cond:
        return bool(valores) == cond["answered"]
    raise ValueError(f"Condición desconocida: {cond}")
