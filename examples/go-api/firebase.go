// Still `package main`: a second file in the same package, so main.go can call newAuthClient
// (lowercase) without importing anything. Compare with the folders under routes/, which are
// separate packages and have to export (capitalise) what they share.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// serviceAccount describes the FIREBASE_SERVICE_ACCOUNT JSON. It's the Go version of the
// `as { project_id: string; client_email: string; private_key: string }` cast in index.ts,
// except that it's enforced: json.Unmarshal fills these fields and nothing else.
//
// Struct tags (the backtick strings) map JSON keys to fields:
//   - `json:"project_id"`  reads/writes the key "project_id" into ProjectID.
//   - `omitempty`          leaves the key out when marshalling if the field is its zero value ("").
//
// Fields must be capitalised even though the struct itself isn't: encoding/json is another
// package, and it can only see exported fields. A lowercase field would be silently skipped.
//
// JSON keys that don't match a field (auth_uri, client_x509_cert_url, ...) are ignored,
// not an error. Go's decoder is lenient by default.
type serviceAccount struct {
	Type         string `json:"type"`
	ProjectID    string `json:"project_id"`
	PrivateKeyID string `json:"private_key_id,omitempty"`
	PrivateKey   string `json:"private_key"`
	ClientEmail  string `json:"client_email"`
	ClientID     string `json:"client_id,omitempty"`
	TokenURI     string `json:"token_uri,omitempty"`
}

// newAuthClient does what the fbApp setup in index.ts does, returning an error instead of throwing.
// The `(*auth.Client, error)` return is Go's standard "result or failure" pair.
func newAuthClient(ctx context.Context, rawJSON string) (*auth.Client, error) {
	var sa serviceAccount
	// &sa passes a pointer, so Unmarshal can write into our variable (Go passes by value otherwise).
	if err := json.Unmarshal([]byte(rawJSON), &sa); err != nil {
		// %w wraps the original error so callers can still inspect it: error chaining, like `cause`.
		return nil, fmt.Errorf("parse FIREBASE_SERVICE_ACCOUNT: %w", err)
	}
	if sa.ProjectID == "" || sa.ClientEmail == "" || sa.PrivateKey == "" {
		return nil, fmt.Errorf("FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key")
	}
	sa.PrivateKey = strings.ReplaceAll(sa.PrivateKey, `\n`, "\n")

	// Firebase's Go SDK takes credentials as JSON bytes, not as an object like
	// admin.credential.cert({...}). So we marshal the cleaned struct back to JSON.
	credsJSON, err := json.Marshal(sa)
	if err != nil {
		return nil, fmt.Errorf("encode service account: %w", err)
	}

	// &firebase.Config{...} creates a struct and takes its address in one step.
	// Passing ProjectID mirrors `projectId: firebaseConfig.project_id` in index.ts.
	app, err := firebase.NewApp(ctx,
		&firebase.Config{ProjectID: sa.ProjectID},
		option.WithAuthCredentialsJSON(option.ServiceAccount, credsJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("init firebase: %w", err)
	}
	return app.Auth(ctx)
}
