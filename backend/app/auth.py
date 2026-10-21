"""Autenticación del Comité de Evaluación.

El frontend inicia sesión con Supabase Auth y envía el token en
`Authorization: Bearer <token>`. Las rutas de lectura aceptan personal activo;
las operaciones de escritura exigen expresamente el rol `admin`.
"""

from fastapi import APIRouter, Depends, Header, HTTPException

from app.db import supabase

router = APIRouter(prefix="/auth", tags=["auth"])


def requiere_staff(authorization: str | None = Header(default=None)):
    """Autentica un miembro activo con rol `admin` o `analyst`."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Falta el token de sesión.")
    token = authorization.split(" ", 1)[1].strip()

    try:
        usuario = supabase.auth.get_user(token).user
    except Exception:
        usuario = None
    if usuario is None:
        raise HTTPException(401, "Sesión inválida o expirada.")

    roles = (supabase.table("tss_admin_roles").select("role, active")
             .eq("user_id", usuario.id).execute().data)
    if (not roles or not roles[0]["active"]
            or roles[0]["role"] not in {"admin", "analyst"}):
        raise HTTPException(403, "Su cuenta no tiene acceso al panel del Comité.")
    return {"id": usuario.id, "email": usuario.email, "role": roles[0]["role"]}


def requiere_admin(usuario: dict = Depends(requiere_staff)):
    """Restringe una operación de escritura al rol `admin`."""
    if usuario["role"] != "admin":
        raise HTTPException(403, "Esta operación requiere el rol de administrador.")
    return usuario


@router.get("/yo")
def yo(usuario: dict = Depends(requiere_staff)):
    return usuario
