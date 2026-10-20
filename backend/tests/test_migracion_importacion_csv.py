from pathlib import Path


MIGRACION = (Path(__file__).resolve().parents[2] / "database" / "migrations"
             / "20261019000000_importacion_csv_atomica.sql")


def sql():
    return MIGRACION.read_text(encoding="utf-8").lower()


def test_migracion_protege_tablas_y_rpc():
    contenido = sql()
    assert "alter table public.tss_imports enable row level security" in contenido
    assert "alter table public.tss_import_rows enable row level security" in contenido
    assert "security invoker" in contenido
    assert "revoke execute on function public.tss_import_csv" in contenido
    assert "grant execute on function public.tss_import_csv" in contenido
    assert "to service_role" in contenido


def test_migracion_hace_idempotencia_atomica_con_clave_unica():
    contenido = sql()
    assert "import_key text not null unique" in contenido
    assert "on conflict (import_key) do nothing" in contenido
    assert "primary key (import_id, row_number)" in contenido


def test_migracion_no_oculta_fallos_inesperados():
    contenido = sql()
    assert "when integrity_constraint_violation or data_exception or raise_exception" in contenido
    assert "when others" not in contenido


def test_migracion_no_actualiza_ni_elimina_respuestas_existentes():
    contenido = sql()
    for tabla in ("tss_submissions", "tss_answers", "tss_answer_choices",
                  "tss_submission_contacts"):
        assert f"delete from public.{tabla}" not in contenido
        assert f"update public.{tabla}" not in contenido
