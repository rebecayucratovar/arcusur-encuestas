# arcusur-encuestas

Análisis de mercado - Titulados Ingeniería de Sistemas (UMSS)

Stack: Python (FastAPI + pandas) · React + TypeScript (Vite) · Supabase (PostgreSQL)

## Estructura
- `backend/`   API y análisis estadístico (Python)
- `frontend/`  Aplicación web (React + TypeScript)
- `database/`  Esquema SQL de Supabase

## Requisitos
- Git
- Python 3.12+
- Node.js 20+

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
copy .env.example .env           # luego completar SUPABASE_URL y SUPABASE_KEY
uvicorn app.main:app --reload
```
La API queda en http://localhost:8000 (prueba: http://localhost:8000/health).

> Las credenciales de Supabase **no** se suben al repositorio. Pídelas al equipo por un medio privado.

### 3. Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
La aplicación queda en http://localhost:5173.

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

## Agregar dependencias de Python
Con el entorno virtual activado y dentro de `backend/`:
```powershell
pip install <paquete>
pip freeze | Out-File -Encoding utf8 requirements.txt
```
