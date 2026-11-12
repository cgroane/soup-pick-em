package admin

import (
	"encoding/json"
	"fmt"
	"net/http"

	"soup-pick-em/api/respond"
)

// setRoleRequest is the body shape: the typed version of `const { userId, role } = req.body`.
// The type is lowercase (private to admin), but its fields are capitalised so encoding/json,
// a different package, can fill them.
type setRoleRequest struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
}

func (h *handler) setRole(w http.ResponseWriter, r *http.Request) {
	// No bodyParser: you decode the body yourself.
	var body setRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	user, err := h.auth.GetUser(r.Context(), body.UserID)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// `{ ...customClaims, [role]: true }`. Go has no spread, so copy then set.
	// Claims stay map[string]any: they're arbitrary per user, so there's no fixed shape to
	// write a struct for. That's the case where a map really is the right tool.
	// make() allocates the map; writing to a nil map panics, reading one is fine.
	claims := make(map[string]any, len(user.CustomClaims)+1)
	for k, v := range user.CustomClaims {
		claims[k] = v
	}
	claims[body.Role] = true

	if err := h.auth.SetCustomUserClaims(r.Context(), body.UserID, claims); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	respond.JSON(w, http.StatusOK, respond.Message{
		Message: fmt.Sprintf("Role %s set for user %s", body.Role, body.UserID),
	})
}
