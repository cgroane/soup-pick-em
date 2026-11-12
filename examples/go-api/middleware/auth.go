// Package middleware ports api/middlware.ts. It's split over two files (auth.go, cors.go),
// which both say `package middleware` and share everything, lowercase names included.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"firebase.google.com/go/v4/auth"

	"soup-pick-em/api/respond"
)

// In Express you attach data by mutating the request: `req.user = decodedToken`.
// Go's *http.Request is not meant to be mutated. Instead you copy the request with a new
// context that carries the value, and read it back downstream.
//
// ctxKey and userKey are lowercase, so no other package can see them. That's the point:
// nothing outside middleware can overwrite or forge the user. Other packages must go
// through UserFrom, the exported getter below.
type ctxKey string

const userKey ctxKey = "user"

// UserFrom returns the verified token that RequireAuth stored, or nil if there isn't one.
// Exported (capital U) because route packages like routes/admin call it.
func UserFrom(r *http.Request) *auth.Token {
	tok, _ := r.Context().Value(userKey).(*auth.Token)
	return tok
}

// RequireAuth needs the Firebase client, but middleware must have the shape
// func(http.Handler) http.Handler. So this is a factory: call it with the client and it
// returns the middleware, a closure over authClient. It's the same trick as
// requireGroupRole(roles) in the Node code.
func RequireAuth(authClient *auth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !found || token == "" {
				respond.JSON(w, http.StatusUnauthorized, respond.Message{Message: "Unauthorized"})
				return
			}

			// r.Context() is cancelled if the client disconnects, so Firebase's network call
			// gets abandoned too. Node has no built-in equivalent of this.
			decoded, err := authClient.VerifyIDToken(r.Context(), token)
			if err != nil {
				respond.JSON(w, http.StatusUnauthorized, respond.Message{Message: "Unauthorized"})
				return
			}

			// Express: req.user = decoded; next();
			ctx := context.WithValue(r.Context(), userKey, decoded)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin also covers `reqUser`: with no user in the context, it's a 401.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := UserFrom(r)
		if user == nil {
			respond.JSON(w, http.StatusUnauthorized, respond.Message{Message: "Unauthorized"})
			return
		}
		// Custom claims are free-form, so the SDK exposes them as map[string]any. The
		// comma-ok assertion yields isAdmin=false if the claim is missing or isn't a bool.
		if isAdmin, _ := user.Claims["admin"].(bool); !isAdmin {
			respond.JSON(w, http.StatusForbidden, respond.Message{Message: "Forbidden"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
