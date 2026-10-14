"""Genera database/seeds/catalogo_v1.sql a partir de titulados.json y empleadores.json.

Uso (desde la raíz del repo):
    python database/catalogo/generar_sql.py          # valida y escribe el SQL
    python database/catalogo/generar_sql.py --rutas  # además muestra qué preguntas ve cada camino

El SQL resultante reemplaza el catálogo (secciones, preguntas y opciones) de la
versión indicada de cada encuesta. Se niega a hacerlo si esa versión ya tiene
envíos o no está en estado 'draft'.
"""

import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI.parent / "seeds" / "catalogo_v1.sql"
ENCUESTAS = ["titulados", "empleadores"]

TIPOS = {"single_choice", "multiple_choice", "likert", "short_text", "long_text", "email"}
CON_OPCIONES = {"single_choice", "multiple_choice", "likert"}


# ---------------------------------------------------------------- condiciones

def evaluar(cond, respuestas):
    """Evalúa un display_condition contra {codigo: valor | [valores]}.

    Formatos:
        {"q": "codigo", "eq": "valor"}
        {"q": "codigo", "in": ["v1", "v2"]}
        {"q": "codigo", "answered": true}
        {"all": [cond, ...]}   {"any": [cond, ...]}   {"not": cond}
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


def referencias(cond):
    """Pares (codigo, [valores]) que usa una condición."""
    if cond is None:
        return []
    for clave in ("all", "any"):
        if clave in cond:
            return [r for c in cond[clave] for r in referencias(c)]
    if "not" in cond:
        return referencias(cond["not"])
    return [(cond["q"], [cond["eq"]] if "eq" in cond else cond.get("in", []))]


# ---------------------------------------------------------------- carga

def cargar(nombre):
    datos = json.loads((AQUI / f"{nombre}.json").read_text(encoding="utf-8"))
    opciones_comp = datos.get("shared_options", {})
    puntajes_comp = datos.get("shared_scores", {})
    condiciones_comp = datos.get("shared_conditions", {})

    for seccion in datos["sections"]:
        for q in seccion["questions"]:
            config = dict(q.get("config", {}))
            if isinstance(q.get("options"), str):
                clave = q["options"].lstrip("@")
                q["options"] = opciones_comp[clave]
                if q["type"] == "likert" and clave in puntajes_comp:
                    config.setdefault("scores", puntajes_comp[clave])
            if isinstance(q.get("if"), str):
                q["if"] = condiciones_comp[q["if"].lstrip("@")]
            q["config"] = config
    return datos


def validar(datos):
    errores = []
    vistas = {}  # codigo -> valores de sus opciones, solo preguntas anteriores
    todas = {q["code"] for s in datos["sections"] for q in s["questions"]}

    for seccion in datos["sections"]:
        for q in seccion["questions"]:
            cod, cfg = q["code"], q["config"]
            if cod in vistas:
                errores.append(f"{cod}: código repetido")
            if q["type"] not in TIPOS:
                errores.append(f"{cod}: tipo desconocido {q['type']}")

            opciones = [v for v, _ in q.get("options", [])]
            if (q["type"] in CON_OPCIONES) != bool(opciones):
                errores.append(f"{cod}: opciones no corresponden al tipo {q['type']}")
            if len(set(opciones)) != len(opciones):
                errores.append(f"{cod}: valores de opción repetidos")

            for ref, valores in referencias(q.get("if")):
                if ref not in vistas:
                    errores.append(f"{cod}: la condición usa '{ref}', que no es una pregunta anterior")
                elif bad := [v for v in valores if v not in vistas[ref]]:
                    errores.append(f"{cod}: '{ref}' no tiene las opciones {bad}")

            for clave in ("other_question", "other_for", "max_question"):
                if clave in cfg and cfg[clave] not in todas:
                    errores.append(f"{cod}: {clave} apunta a '{cfg[clave]}', que no existe")
            if "max_question" in cfg and cfg["max_question"] not in vistas:
                errores.append(f"{cod}: max_question debe ser una pregunta anterior")
            for ref in cfg.get("require_one_of", []):
                if ref not in todas:
                    errores.append(f"{cod}: require_one_of apunta a '{ref}', que no existe")

            mn, mx = cfg.get("min_selected"), cfg.get("max_selected")
            if (mn or mx) and q["type"] != "multiple_choice":
                errores.append(f"{cod}: min/max_selected solo aplica a multiple_choice")
            if mx and mx > len(opciones):
                errores.append(f"{cod}: max_selected={mx} > {len(opciones)} opciones")
            if mn and mx and mn > mx:
                errores.append(f"{cod}: min_selected > max_selected")
            if bad := set(cfg.get("scores", {})) - set(opciones):
                errores.append(f"{cod}: scores con valores inexistentes {bad}")

            vistas[cod] = opciones
    return errores


# ---------------------------------------------------------------- SQL

def lit(texto):
    return "null" if texto is None else "'" + str(texto).replace("'", "''") + "'"


def jsonb(valor):
    return "null" if valor is None else lit(json.dumps(valor, ensure_ascii=False)) + "::jsonb"


def sql_encuesta(datos):
    slug, version = datos["survey"], datos["version"]
    lineas = [
        f"  -- ===================== {slug} v{version} =====================",
        "  select sv.id, sv.status into v_version, v_status",
        "    from tss_survey_versions sv join tss_surveys s on s.id = sv.survey_id",
        f"   where s.slug = {lit(slug)} and sv.version_number = {version};",
        f"  if v_version is null then raise exception 'No existe {slug} v{version}'; end if;",
        f"  if v_status <> 'draft' then raise exception '{slug} v{version} no está en draft (%)', v_status; end if;",
        "  if exists (select 1 from tss_submissions where survey_version_id = v_version) then",
        f"    raise exception '{slug} v{version} ya tiene envíos: no se regenera el catálogo';",
        "  end if;",
        "",
        "  delete from tss_question_options where question_id in (",
        "    select q.id from tss_questions q join tss_sections se on se.id = q.section_id",
        "     where se.survey_version_id = v_version);",
        "  delete from tss_questions where section_id in",
        "    (select id from tss_sections where survey_version_id = v_version);",
        "  delete from tss_sections where survey_version_id = v_version;",
    ]
    for pos_s, seccion in enumerate(datos["sections"], 1):
        lineas += [
            "",
            "  insert into tss_sections (survey_version_id, title, description, position)",
            f"  values (v_version, {lit(seccion['title'])}, {lit(seccion.get('description'))}, {pos_s})",
            "  returning id into v_section;",
        ]
        for pos_q, q in enumerate(seccion["questions"], 1):
            config = {"source": datos["source"], "source_note": q.get("note"), **q["config"]}
            lineas += [
                "",
                "  insert into tss_questions (section_id, code, prompt, help_text, question_type,",
                "                             required, position, configuration, display_condition)",
                f"  values (v_section, {lit(q['code'])}, {lit(q['prompt'])}, {lit(q.get('help'))},",
                f"          {lit(q['type'])}, {str(q['required']).lower()}, {pos_q},",
                f"          {jsonb(config)},",
                f"          {jsonb(q.get('if'))})",
                "  returning id into v_question;",
            ]
            if q.get("options"):
                filas = ",\n".join(
                    f"    (v_question, {lit(v)}, {lit(l)}, {i})"
                    for i, (v, l) in enumerate(q["options"], 1)
                )
                lineas += ["  insert into tss_question_options (question_id, value, label, position) values", filas + ";"]
    return "\n".join(lineas)


def generar(todas):
    cuerpo = "\n\n".join(sql_encuesta(d) for d in todas)
    return f"""-- GENERADO por database/catalogo/generar_sql.py. No editar a mano:
-- modificar titulados.json / empleadores.json y volver a generar.
-- Se ejecuta completo o no se aplica nada (un solo bloque DO).
do $catalogo$
declare
  v_version  uuid;
  v_status   text;
  v_section  uuid;
  v_question uuid;
begin
{cuerpo}
end
$catalogo$;
"""


# ---------------------------------------------------------------- rutas

RUTAS_TITULADOS = {
    "trabaja": {"situacion_laboral": "trabaja"},
    "no trabaja, trabajó antes": {"situacion_laboral": "no_trabaja", "trabajo_antes": "si"},
    "no trabaja, nunca trabajó": {"situacion_laboral": "no_trabaja", "trabajo_antes": "no"},
    "emprende": {"situacion_laboral": "emprende"},
}


def visibles(datos, eleccion):
    """Recorre la encuesta en orden; responde con `eleccion` o la primera opción."""
    respuestas, codigos = {}, []
    for seccion in datos["sections"]:
        for q in seccion["questions"]:
            if not evaluar(q.get("if"), respuestas):
                continue
            codigos.append(q["code"])
            opciones = [v for v, _ in q.get("options", [])]
            respuestas[q["code"]] = eleccion.get(q["code"], opciones[0] if opciones else "1")
    return codigos


def mostrar_rutas(datos):
    for interes in ("si", "no"):
        for nombre, eleccion in RUTAS_TITULADOS.items():
            eleccion = {"formacion": "no", "interes_posgrado": interes, "interes_red": "no", **eleccion}
            cods = visibles(datos, eleccion)
            print(f"\n[interés posgrado={interes} | {nombre}] {len(cods)} preguntas")
            print("  " + ", ".join(cods))


# ---------------------------------------------------------------- main

def main():
    todas = [cargar(n) for n in ENCUESTAS]
    fallo = False
    for d in todas:
        errores = validar(d)
        n = sum(len(s["questions"]) for s in d["sections"])
        print(f"{d['survey']}: {len(d['sections'])} secciones, {n} preguntas, {len(errores)} errores")
        for e in errores:
            print("  -", e)
        fallo |= bool(errores)
    if fallo:
        sys.exit(1)

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(generar(todas), encoding="utf-8")
    print(f"Escrito {SALIDA.relative_to(AQUI.parents[1])}")

    if "--rutas" in sys.argv:
        mostrar_rutas(todas[0])


if __name__ == "__main__":
    main()
