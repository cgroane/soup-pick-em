# API ports: Express → Python / Go

`api/index.ts` and `api/routes/admin.ts` (with the middleware they use), rewritten in
Python (FastAPI) and in Go (standard library `net/http`). The source files explain each step in comments.

| | Express (`api/`) | FastAPI (`python-api/`) | Go (`go-api/`) |
|---|---|---|---|
| Create app | `express()` | `FastAPI()` | `http.NewServeMux()` |
| Define route | `app.get(path, fn)` | `@app.get(path)` decorator on a function | `mux.HandleFunc("GET /path", fn)` (method goes in the pattern string) |
| Sub-router | `express.Router()` + `app.use(prefix, r)` | `APIRouter()` + `include_router(r, prefix=)` | a second mux + `http.StripPrefix` |
| Middleware | `(req, res, next)` chain, mutate `req.user` | `Depends()` graph: dependencies return values, raise to stop | `func(http.Handler) http.Handler` wrappers; values ride on `r.Context()` |
| Send response | `res.status().json()` | `return` a dict; `raise HTTPException` for errors | write headers → `WriteHeader` → body, then `return` |
| Body parsing | `bodyParser.json()` globally | Pydantic model in the signature (validated, 422 on bad input) | `json.NewDecoder(r.Body).Decode(&struct)` by hand |
| Errors | `try/catch` | `try/except` | `if err != nil` after every call |
| Concurrency | single thread, `async/await` | `async def`, or `def` for blocking work (runs on a thread pool) | a goroutine per request; plain blocking code |
| Route order | first registered wins | first registered wins | most specific wins; ambiguous overlaps panic at startup |
| Run | `node` runs your file | `uvicorn main:app` imports your app | `go build` produces one binary |

## Python setup

```sh
cd examples/python-api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3001
```

## Go setup

```sh
cd examples/go-api
go mod tidy        # already done; go.mod/go.sum are committed-ready
go run .
```
