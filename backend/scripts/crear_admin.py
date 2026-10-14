"""Crea (o reactiva) una cuenta del Comité de Evaluación.

Uso, desde backend/ con el venv activado:
    python -m scripts.crear_admin correo@umss.edu

Pide la contraseña sin mostrarla. Si el correo ya existe, solo le asigna el rol.
"""

import getpass
import sys

from app.db import supabase


def buscar_usuario(email):
    pagina = 1
    while True:
        usuarios = supabase.auth.admin.list_users(page=pagina, per_page=200)
        for u in usuarios:
            if (u.email or "").lower() == email.lower():
                return u
        if len(usuarios) < 200:
            return None
        pagina += 1


def main():
    if len(sys.argv) != 2:
        sys.exit("Uso: python -m scripts.crear_admin correo@dominio")
    email = sys.argv[1].strip()

    usuario = buscar_usuario(email)
    if usuario:
        print(f"La cuenta {email} ya existe; se le asigna el rol de administrador.")
    else:
        clave = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
        if len(clave) < 8 or clave != getpass.getpass("Repita la contraseña: "):
            sys.exit("Las contraseñas no coinciden o son muy cortas.")
        usuario = supabase.auth.admin.create_user(
            {"email": email, "password": clave, "email_confirm": True}).user
        print(f"Cuenta creada: {email}")

    supabase.table("tss_admin_roles").upsert(
        {"user_id": usuario.id, "role": "admin", "active": True}).execute()
    print("Rol de administrador activo.")


if __name__ == "__main__":
    main()
