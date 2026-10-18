"""Rutas del panel del Comité (requieren sesión de administrador).

P3 agrega aquí las estadísticas; P2 las de importación y exportación.
"""

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import requiere_admin
from app.db import supabase

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_admin)])


@router.get("/resumen")
def resumen():
    """Cantidad de envíos por encuesta y por origen (formulario web, CSV...)."""
    encuestas = supabase.table("tss_surveys").select("id, slug, name").execute().data
    envios = (supabase.table("tss_submissions").select("survey_id, source")
              .is_("excluded_reason", "null").execute().data)
    por_encuesta = {e["id"]: Counter() for e in encuestas}
    for envio in envios:
        por_encuesta[envio["survey_id"]][envio["source"]] += 1
    return {
        e["slug"]: {
            "name": e["name"],
            "total": sum(por_encuesta[e["id"]].values()),
            "por_origen": dict(por_encuesta[e["id"]]),
        }
        for e in encuestas
    }


# ---------------------------------------------------------------- escenarios (simulación)

MODELO_POSGRADO = "posgrado_titulados"


class Escenario(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    model_version: str = "1"
    parameters: dict
    assumptions: dict = {}
    results: dict


@router.get("/simulaciones")
def listar_simulaciones(modelo: str = MODELO_POSGRADO, limite: int = 10):
    """Escenarios guardados del modelo, del más reciente al más antiguo."""
    return (supabase.table("tss_simulation_runs")
            .select("id, title, model_version, parameters, assumptions, results, created_at")
            .eq("model_key", modelo).order("created_at", desc=True).limit(min(limite, 50))
            .execute().data)


@router.post("/simulaciones", status_code=201)
def guardar_simulacion(escenario: Escenario, usuario: dict = Depends(requiere_admin)):
    fila = {**escenario.model_dump(), "model_key": MODELO_POSGRADO, "created_by": usuario["id"]}
    return supabase.table("tss_simulation_runs").insert(fila).execute().data[0]


@router.delete("/simulaciones/{simulacion_id}", status_code=204)
def borrar_simulacion(simulacion_id: str):
    borradas = supabase.table("tss_simulation_runs").delete().eq("id", simulacion_id).execute().data
    if not borradas:
        raise HTTPException(404, "No existe ese escenario.")
