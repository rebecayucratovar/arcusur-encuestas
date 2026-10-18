# arcusur-encuestas

Análisis de mercado - Titulados Ingeniería de Sistemas (UMSS)

Stack: Python (FastAPI + pandas) · React + TypeScript (Vite) · Supabase (PostgreSQL + Auth)

## Estructura
- `backend/`   API y análisis estadístico (Python)
- `frontend/`  Aplicación web (React + TypeScript)
- `database/`  Catálogo de preguntas y SQL de Supabase (ver [database/catalogo/README.md](database/catalogo/README.md))

## Requisitos
- Git
- Python 3.12+
- Node.js 20+
- Acceso al proyecto `arcusur-encuestas` en [Supabase](https://supabase.com/dashboard) (pedir invitación al equipo)

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/rebecayucratovar/arcusur-encuestas.git
cd arcusur-encuestas
```

### 2. Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1     # Windows (PowerShell)
# source .venv/bin/activate       # Linux / macOS
pip install -r requirements.txt
copy .env.example .env           # luego completarlo (ver "Variables de entorno")
uvicorn app.main:app --reload
```
La API queda en http://localhost:8000 (prueba: http://localhost:8000/health, documentación: http://localhost:8000/docs).

### 3. Frontend
En otra terminal:
```powershell
cd frontend
npm install
copy .env.example .env           # luego completarlo (ver "Variables de entorno")
npm run dev
```
La aplicación queda en http://localhost:5173.

## Variables de entorno

Hay **dos** archivos `.env`, uno por carpeta. Ninguno se sube a GitHub (están en `.gitignore`).

| Archivo | Variable | Valor | Dónde se obtiene |
|---|---|---|---|
| `backend/.env` | `SUPABASE_URL` | `https://<id>.supabase.co` | Supabase → **Project Settings → Data API** → *Project URL* |
| `backend/.env` | `SUPABASE_KEY` | `sb_secret_...` | Supabase → **Project Settings → API Keys** → *Secret keys* |
| `backend/.env` | `CORS_ORIGINS` | `http://localhost:5173` | URL del frontend (en producción, la URL desplegada) |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:8000` | URL del backend |
| `frontend/.env` | `VITE_SUPABASE_URL` | la misma *Project URL* | igual que arriba |
| `frontend/.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Supabase → **Project Settings → API Keys** → *Publishable key* |

> ⚠️ **Nunca** poner la clave secreta (`sb_secret_...`) en `frontend/.env`: todo lo que está en el frontend
> llega al navegador, y esa clave da acceso total a la base de datos. El frontend solo usa la publicable.
> No compartir las claves por el grupo ni en capturas; si una clave secreta se filtra, generar otra en *API Keys*.

Vite lee `frontend/.env` solo al arrancar: después de cambiarlo, detener `npm run dev` y volver a ejecutarlo.

## Cuentas del Comité (panel `/admin`)

No hay registro público: las cuentas se crean con un script (requiere `backend/.env` completo).
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.crear_admin nombre@dominio.com    # pide la contraseña sin mostrarla
```
Si el correo ya existe, solo le asigna el rol. Luego se ingresa desde "Acceso administrador" en la portada.

En Supabase, **Authentication → Sign In / Providers → Allow new users to sign up** debe estar desactivado.

## Uso diario
Los pasos de instalación se hacen una sola vez. Para trabajar:

```powershell
# Terminal 1 - backend
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# Terminal 2 - frontend
cd frontend
npm run dev
```

Después de un `git pull`, si cambió `backend/requirements.txt` ejecutar `pip install -r requirements.txt` (con el venv activado), y si cambió `frontend/package.json` ejecutar `npm install`.

## Pruebas
```powershell
cd backend
python -m pytest              # backend: validación de respuestas y catálogo
cd ..\frontend
npx tsc -b; npx eslint src    # frontend: tipos y estilo
```

## Agregar dependencias de Python
Con el entorno virtual activado y dentro de `backend/`:
```powershell
pip install <paquete>
pip freeze | Out-File -Encoding utf8 requirements.txt
```

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `WinError 10013` al iniciar `uvicorn` | El puerto 8000 ya está en uso (otro backend abierto). Cerrar esa terminal o usar `uvicorn app.main:app --reload --port 8001` y ajustar `VITE_API_URL`. |
| El login dice que `frontend/.env` tiene la clave secreta | Reemplazarla por la `sb_publishable_...` y reiniciar `npm run dev`. |
| "Su cuenta no tiene acceso al panel del Comité" | La cuenta existe pero no tiene rol: ejecutar `python -m scripts.crear_admin <correo>`. |
| Las encuestas no cargan ("No se pudo cargar la encuesta") | El backend no está corriendo, o `VITE_API_URL` no apunta a él. |
