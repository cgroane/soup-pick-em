// Package respond holds response helpers shared by main and every route package.
//
// A package is a folder. Its name (the line below) is what callers type before the dot:
// respond.JSON(...). The import path is the module name from go.mod plus the folder:
// "soup-pick-em/api/respond".
package respond

import (
	"encoding/json"
	"net/http"
)

// JSON is the res.status(x).json(v) you get for free in Express.
//
// Named JSON, not WriteJSON or RespondJSON: callers already write `respond.` in front, so
// the package name does half the naming. Go style avoids repeating it ("stutter").
//
// Order matters with ResponseWriter: headers, then status, then body. Once the status is
// written, later header changes are silently ignored.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Message is the {"message": "..."} body the Node API uses for errors.
// An exported struct with a tag is the typed alternative to map[string]string{"message": ...}.
type Message struct {
	Message string `json:"message"`
}
