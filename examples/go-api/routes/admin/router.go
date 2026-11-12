// Package admin ports api/routes/admin.ts. It's spread across three files:
//
//	router.go       NewRouter: the only exported name; builds the mux and applies middleware
//	impersonate.go  GET  /impersonate
//	set_role.go     POST /set-role
//
// Nothing outside this folder can see `handler`, its fields, or its methods, because
// they're all lowercase. The package's whole public surface is admin.NewRouter.
package admin

import (
	"net/http"

	"firebase.google.com/go/v4/auth"

	"soup-pick-em/api/middleware"
)

// handler holds this package's dependencies. The route functions are methods on it, so they
// reach the Firebase client as h.auth instead of through a global or an import cycle.
type handler struct {
	auth *auth.Client
}

// NewRouter is the Go shape of:
//
//	const adminRouter = express.Router();
//	adminRouter.use(requireAuth, reqUser, requireAdmin);
//	adminRouter.get('/impersonate', ...);
//	adminRouter.post('/set-role', ...);
//	export default adminRouter;
//
// There's no `export default`: the capital N is the export. The name is NewRouter, not
// NewAdminRouter, because callers write admin.NewRouter, which already says "admin".
func NewRouter(authClient *auth.Client) http.Handler {
	h := &handler{auth: authClient}

	mux := http.NewServeMux()
	// h.impersonate is a "method value": the method bound to h, the way h.impersonate.bind(h)
	// would be in JS. Its signature matches what HandleFunc wants.
	mux.HandleFunc("GET /impersonate", h.impersonate)
	mux.HandleFunc("POST /set-role", h.setRole)

	// Router-level middleware isn't registered on the mux; you wrap the finished mux.
	// Read it inside-out: a request hits RequireAuth, then RequireAdmin, then the mux.
	return middleware.RequireAuth(authClient)(middleware.RequireAdmin(mux))
}
