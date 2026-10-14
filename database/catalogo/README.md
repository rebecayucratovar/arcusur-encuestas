# Catálogo de preguntas

`titulados.json` y `empleadores.json` son la fuente del catálogo que vive en Supabase
(`tss_sections`, `tss_questions`, `tss_question_options`). No se edita a mano en Supabase:
se cambia el JSON, se regenera el SQL y se ejecuta en el SQL Editor.

```powershell
python database/catalogo/generar_sql.py           # valida y escribe database/seeds/catalogo_v1.sql
python database/catalogo/generar_sql.py --rutas   # además lista las preguntas visibles por camino
```

El SQL reemplaza el catálogo completo de la versión 1 de cada encuesta y se niega a correr
si esa versión ya tiene envíos o no está en `draft`.

## Opciones

`[valor, etiqueta]`. El **valor** es un código corto y estable (`trabaja`, `base_datos`): es lo
que se guarda y lo que usan las condiciones y el análisis. La **etiqueta** es el texto exacto
del formulario original (incluidas sus erratas), para que el importador pueda emparejar el CSV.

## `display_condition`

```json
{"q": "formacion", "eq": "si"}
{"q": "situacion_laboral", "in": ["trabaja", "emprende"]}
{"q": "remuneracion", "answered": true}
{"all": [ ... ]}   {"any": [ ... ]}   {"not": { ... }}
```

`null` = siempre visible. Solo puede referirse a preguntas anteriores. Una pregunta oculta
cuenta como no respondida, y sus respuestas se descartan al guardar.

## `configuration`

| Clave | Significado |
|---|---|
| `source`, `source_note` | De dónde salió la pregunta y observaciones pendientes |
| `min_selected`, `max_selected` | Límite de casillas en `multiple_choice` (asignaturas: 5 y 5) |
| `other_question` / `other_for` | Enlaza una pregunta con su campo de texto "Otro" (el texto no cuenta para el límite) |
| `require_one_of` | Al menos una de esas preguntas debe responderse (ej. rubro o "otro rubro") |
| `input` | `integer`, `phone` o `url` para validar `short_text`; los enteros van a `numeric_value` |
| `min`, `max`, `max_question` | Rango de un entero; `max_question` = no puede superar otra respuesta |
| `scores` | Puntaje de cada opción de un `likert`; las opciones sin puntaje (`no_sabe`) no entran en la media |
| `store: "contact"`, `contact_field` | Se guarda en `tss_submission_contacts`, no en `tss_answers` |
