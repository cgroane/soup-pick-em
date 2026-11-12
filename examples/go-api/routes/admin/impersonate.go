package admin

import (
	"net/http"

	"soup-pick-em/api/respond"
)

type impersonateResponse struct {
	CustomToken string `json:"customToken"`
}

// impersonate is a method on *handler: `(h *handler)` is the receiver, Go's explicit `this`.
// It's lowercase, so only this package can reference it (router.go does).
func (h *handler) impersonate(w http.ResponseWriter, r *http.Request) {
	// Express: req.query.userId. Query values are always strings; a missing one is "".
	userID := r.URL.Query().Get("userId")

	customToken, err := h.auth.CustomToken(r.Context(), userID)
	if err != nil {
		// Express: res.status(500).send('Server error'). http.Error writes plain text.
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	respond.JSON(w, http.StatusOK, impersonateResponse{CustomToken: customToken})
}
