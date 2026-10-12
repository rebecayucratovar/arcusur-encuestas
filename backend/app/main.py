from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError

from app.db import supabase

app = FastAPI(title="arcusur-encuestas")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    # Todavía no hay tablas: se consulta una inexistente. Si Supabase responde
    # "tabla no encontrada" (PGRST205), la URL y la clave funcionan.
    try:
        supabase.table("_health_check").select("*").limit(1).execute()
        return {"status": "ok", "supabase": "conectado"}
    except APIError as e:
        if e.code == "PGRST205":
            return {"status": "ok", "supabase": "conectado"}
        return {"status": "error", "code": e.code, "detail": e.message}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
