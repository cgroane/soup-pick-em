package middleware

import "net/http"

// CORS is app.use(cors({ exposedHeaders: [...] })).
// Compare to Express's (req, res, next): here `next` is the handler you were given, and
// "calling next()" is literally next.ServeHTTP(w, r).
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		h.Set("Access-Control-Expose-Headers", "WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent) // answer the preflight; don't call next
			return
		}
		next.ServeHTTP(w, r)
	})
}
