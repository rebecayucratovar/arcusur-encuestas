import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import admin, auth, encuestas, respuestas
from app.db import supabase

app = FastAPI(title="arcusur-encuestas")
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(encuestas.router_admin)
app.include_router(encuestas.router)
app.include_router(respuestas.router)

# Orígenes del frontend separados por coma (en producción, la URL desplegada).
ORIGENES = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ORIGENES if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    """Comprueba una tabla real sin exponer datos ni detalles de Supabase."""
    try:
        supabase.table("tss_surveys").select("id").limit(1).execute()
        return {"status": "ok", "supabase": "conectado"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "supabase": "no disponible"},
        )
