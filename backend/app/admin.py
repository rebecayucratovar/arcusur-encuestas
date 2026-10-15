"""Rutas del panel del Comité (requieren sesión de administrador).

P3 agrega aquí las estadísticas; P2 las de importación y exportación.
"""

from collections import Counter

from fastapi import APIRouter, Depends

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
