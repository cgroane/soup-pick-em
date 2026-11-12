// Package routes is the "app.use(prefix, router)" block from index.ts, pulled out of main.
// Each sub-folder (admin/, and later groups/, matchups/, ...) is its own package that
// exposes one NewRouter. This file is the only place that knows the URL prefixes.
//
// Nesting folders doesn't nest packages: routes and routes/admin are two unrelated
// packages that happen to share a path. routes has no special access to admin's
// lowercase names; it has to import it like anyone else.
package routes

import (
	"net/http"

	"firebase.google.com/go/v4/auth"

	"soup-pick-em/api/routes/admin"
)

// Deps is everything route packages need from main. Adding a dependency (a Firestore
// client, a CFBD client, ...) means adding a field here, not another global.
//
// Express shares fbApp by having routes import it from index.ts. Go forbids import cycles
// (main -> routes -> main won't compile), so dependencies are passed down explicitly.
type Deps struct {
	Auth *auth.Client
}

// Mount registers every API router on mux.
//
// http.StripPrefix trims "/api/admin" before the sub-router sees the path, so inside the
// admin package the patterns are just "GET /impersonate", same as the Express router.
// A pattern ending in "/" matches that whole subtree.
func Mount(mux *http.ServeMux, deps Deps) {
	mux.Handle("/api/admin/", http.StripPrefix("/api/admin", admin.NewRouter(deps.Auth)))
	// mux.Handle("/api/groups/", http.StripPrefix("/api/groups", groups.NewRouter(deps.Auth, deps.Firestore)))
}
