// Go port of api/index.ts, using only the standard library's net/http.
//
// Run it (from examples/go-api):
//
//	go mod tidy     // like `npm install`: reads imports, downloads deps, writes go.sum (the lockfile)
//	go run .        // compile the package in this folder (plus everything it imports) and run it
//	go build -o server . && ./server   // what you'd do in prod: one static binary, no runtime needed
//
// Layout (each folder is one package):
//
//	main.go, firebase.go   package main        entry point; two files, one package
//	respond/               package respond     JSON response helpers
//	middleware/            package middleware  RequireAuth, RequireAdmin, CORS
//	routes/                package routes      mounts every router under its /api prefix
//	routes/admin/          package admin       the /api/admin routes
//
// There's no framework here on purpose. Since Go 1.22 the built-in router understands
// methods and path params ("GET /users/{id}"), so most Go APIs don't need an Express-like
// library. (Chi, Gin and Echo exist if you want one.)
package main // `package main` + `func main()` = an executable. Any other package name = a library.

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"

	// Your own packages are imported by module path (from go.mod) + folder.
	// There are no relative imports like "./routes" in Go.
	"soup-pick-em/api/middleware"
	"soup-pick-em/api/respond"
	"soup-pick-em/api/routes"
)

// Go has no top-level `await` and no module-level side effects worth relying on;
// everything happens inside main(), top to bottom.
func main() {
	// -----------------------------------------------------------------------
	// 1. Environment
	// -----------------------------------------------------------------------
	// Paths are relative to where you run the binary (here: examples/go-api).
	// Go has no __dirname for the source file, since a compiled binary doesn't know where its
	// source lived, so real services usually take paths from env vars or flags.
	repoRoot := "../.."
	env := os.Getenv("NODE_ENV") // returns "" when unset. Go has no undefined/null for strings
	if env == "" {
		env = "development"
	}
	// godotenv.Load never overrides; Overload does. Errors ignored because the files are optional.
	_ = godotenv.Load(filepath.Join(repoRoot, ".env"))
	for _, name := range []string{".env." + env, ".env.local", ".env." + env + ".local"} {
		_ = godotenv.Overload(filepath.Join(repoRoot, name))
	}

	// -----------------------------------------------------------------------
	// 2. Firebase Admin (see firebase.go, same package, so no import needed)
	// -----------------------------------------------------------------------
	// context.Background() is the root "context": Go's way of carrying deadlines,
	// cancellation, and request-scoped values. Nearly every I/O function takes one first.
	authClient, err := newAuthClient(context.Background(), os.Getenv("FIREBASE_SERVICE_ACCOUNT"))
	if err != nil {
		// No exceptions in Go. Functions that can fail return (value, error) and you check
		// `err != nil` right away. log.Fatal prints and exits(1).
		log.Fatal(err)
	}

	// -----------------------------------------------------------------------
	// 3. The router  (Express: `const app = express()`)
	// -----------------------------------------------------------------------
	// A ServeMux maps patterns to handlers. A "handler" is anything with a
	// ServeHTTP(w http.ResponseWriter, r *http.Request) method.
	//   w  ~= res  (but lower-level: you set headers, write a status, then write bytes)
	//   r  ~= req
	mux := http.NewServeMux()

	// -----------------------------------------------------------------------
	// 4. Mounting routers  (Express: the app.use("/api/...", router) lines)
	// -----------------------------------------------------------------------
	// routes.Mount is capitalised because it's called from another package (this one).
	// routes.Deps{Auth: authClient} builds a struct with named fields, like an object literal.
	routes.Mount(mux, routes.Deps{Auth: authClient})

	// -----------------------------------------------------------------------
	// 5. An inline route  (Express: app.get(`/api/current-week`, async (req, res) => ...))
	// -----------------------------------------------------------------------
	// The HTTP method lives *inside the pattern string*, not in the method name
	// (mux.HandleFunc("GET /x") rather than app.get("/x")). On its own, a POST to this path
	// would get an automatic 405. Here it falls through to the "/" catch-all below instead.
	//
	// Handlers aren't async and return nothing. Go's server already runs every request on
	// its own goroutine (a very cheap thread), so blocking code is fine: no promises, no
	// await, and a slow request can't stall the others.
	mux.HandleFunc("GET /api/current-week", func(w http.ResponseWriter, r *http.Request) {
		details, err := getCurrentSeasonDetails(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return // forgetting this return is the Go version of forgetting `return` after res.send()
		}
		respond.JSON(w, http.StatusOK, details)
	})

	// -----------------------------------------------------------------------
	// 6. Static React build + SPA fallback
	// -----------------------------------------------------------------------
	// Go's router picks the *most specific* matching pattern, not the first one registered,
	// so unlike Express this catch-all could be declared anywhere and /api routes still win.
	//
	// Why "/" and not "GET /"? Specificity has to be unambiguous. "GET /" is narrower on
	// method but broader on path than "/api/admin/", so neither beats the other and
	// ServeMux panics at startup. That's a conflict Express never catches: it just runs
	// whichever route was registered first. So the method check happens inside the handler.
	buildDir := filepath.Join(repoRoot, "build")
	fileServer := http.FileServer(http.Dir(buildDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.NotFound(w, r)
			return
		}
		if strings.Contains(r.URL.Path, ".") {
			fileServer.ServeHTTP(w, r) // /static/js/main.js, /favicon.ico, ...
			return
		}
		http.ServeFile(w, r, filepath.Join(buildDir, "index.html"))
	})

	// -----------------------------------------------------------------------
	// 7. Global middleware + listen
	// -----------------------------------------------------------------------
	// Middleware in Go is a function that takes a handler and returns a wrapped handler.
	// There's no app.use() list; you nest them. middleware.CORS(mux) runs CORS first, then the mux.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	fmt.Printf("Listening on port: %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, middleware.CORS(mux))) // blocks forever unless it fails
}

// seasonDetails is the typed response for /api/current-week: a subset of SeasonDetailsData
// in api/schema/sportsDataIO. The tags keep the JSON keys identical to what the React app reads.
type seasonDetails struct {
	Season      int    `json:"Season"`
	APIWeek     int    `json:"ApiWeek"`
	SeasonType  string `json:"seasonType"`
	IsOffseason bool   `json:"isOffseason"`
}

// Stand-in for api/currentWeek.ts. ctx is unused until the real version makes an HTTP call.
func getCurrentSeasonDetails(_ context.Context) (seasonDetails, error) {
	return seasonDetails{Season: 2026, APIWeek: 1, SeasonType: "regular", IsOffseason: false}, nil
}
