"""
Python port of api/index.ts, using FastAPI.

Run it (from examples/python-api):
    python3 -m venv .venv            # like a project-local node_modules, but for the interpreter too
    source .venv/bin/activate        # puts .venv/bin/python + pip first on your PATH
    pip install -r requirements.txt  # like `npm install`
    uvicorn main:app --reload --port 3001

`uvicorn main:app` means "import the module main.py and serve the variable named `app`".
In Node, `app.listen()` lives inside your file. In Python, the web server (uvicorn) is a
separate program that imports your app object and runs it — your file only *builds* the app.
"""

import json
import os
from pathlib import Path

import firebase_admin
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from firebase_admin import credentials

# ---------------------------------------------------------------------------
# 1. Environment
# ---------------------------------------------------------------------------
# Same cascade as index.ts: later files override earlier ones.
# `Path(__file__)` is Python's `import.meta.url` / `__filename`; parents[2] walks up
# examples/python-api/main.py -> examples/python-api -> examples -> repo root.
REPO_ROOT = Path(__file__).resolve().parents[2]
env = os.getenv("NODE_ENV", "development")  # os.getenv(key, default) ~= process.env.X ?? default

load_dotenv(REPO_ROOT / ".env")
for name in (f".env.{env}", ".env.local", f".env.{env}.local"):
    load_dotenv(REPO_ROOT / name, override=True)

# ---------------------------------------------------------------------------
# 2. Firebase Admin
# ---------------------------------------------------------------------------
# json.loads == JSON.parse. It returns a plain dict, so there's no `as { ... }` cast —
# Python type hints are optional and not enforced at runtime.
service_account = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
service_account["private_key"] = service_account["private_key"].replace("\\n", "\n")

# Unlike Node, where index.ts exports `fbApp` and routes import it back (a circular import),
# firebase_admin keeps a module-level default app. Route files just `from firebase_admin import auth`
# and it finds this app on its own — nothing needs to be exported from here.
firebase_admin.initialize_app(credentials.Certificate(service_account))

# ---------------------------------------------------------------------------
# 3. The app object  (Express: `const app = express()`)
# ---------------------------------------------------------------------------
app = FastAPI()

# Global middleware. Express: app.use(cors({ exposedHeaders: [...] })).
# FastAPI has no bodyParser line: request bodies are parsed per-route, based on the
# parameter types each handler declares (see routes/admin.py).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["WWW-Authenticate", "Mcp-Session-Id", "MCP-Protocol-Version"],
)

# ---------------------------------------------------------------------------
# 4. Mounting routers  (Express: app.use("/api/admin", adminRouter))
# ---------------------------------------------------------------------------
# Imported *after* Firebase is initialised. Python runs a module's top-level code on first
# import, same as Node, so ordering matters in the same way.
from routes.admin import router as admin_router  # noqa: E402

app.include_router(admin_router, prefix="/api/admin")


# ---------------------------------------------------------------------------
# 5. An inline route  (Express: app.get(`/api/current-week`, async (req, res) => ...))
# ---------------------------------------------------------------------------
# The big shift: instead of calling `app.get(path, handler)`, you put a *decorator* on a
# function. `@app.get("/x")` is just sugar for `f = app.get("/x")(f)` — it registers the
# function and hands it back unchanged.
#
# There is no `res` object. Whatever you *return* becomes the response body (dicts/lists
# are serialised to JSON with a 200). To send an error you *raise* instead of res.status(500).
@app.get("/api/current-week")
async def current_week():
    try:
        return await get_current_season_details()
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


async def get_current_season_details():
    # Stand-in for api/currentWeek.ts — port that module next.
    return {"Season": 2026, "ApiWeek": 1, "seasonType": "regular", "isOffseason": False}


# ---------------------------------------------------------------------------
# 6. Static React build + SPA fallback
# ---------------------------------------------------------------------------
# Express: app.use(express.static(root)) followed by a catch-all that sends index.html.
# Registration order matters here just like Express: this catch-all is declared last so the
# /api routes above match first. `{full_path:path}` is FastAPI's version of Express's `*`.
BUILD_DIR = REPO_ROOT / "build"

if BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=BUILD_DIR / "static"), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        candidate = BUILD_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)  # favicon.ico, manifest.json, etc.
        return FileResponse(BUILD_DIR / "index.html")
