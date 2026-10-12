import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

# backend/.env, sin importar desde qué carpeta se ejecute uvicorn
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_KEY en backend/.env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
