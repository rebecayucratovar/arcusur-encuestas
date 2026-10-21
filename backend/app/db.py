import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

# backend/.env, sin importar desde qué carpeta se ejecute uvicorn
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_KEY en backend/.env")

_local = threading.local()


def cliente() -> Client:
    """El cliente de Supabase del hilo actual.

    FastAPI atiende las rutas síncronas en varios hilos a la vez, y un mismo cliente
    compartido entre hilos mezcla las peticiones: devolvía respuestas incompletas o
    fallaba cuando el panel pedía varias cosas al mismo tiempo. Un cliente por hilo
    lo evita (los hilos se reutilizan, así que se crean pocos).
    """
    c = getattr(_local, "cliente", None)
    if c is None:
        c = _local.cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
    return c


class _SupabasePorHilo:
    """Se usa igual que un Client (`supabase.table(...)`), pero con un cliente por hilo."""

    def __getattr__(self, nombre):
        return getattr(cliente(), nombre)


supabase = _SupabasePorHilo()
