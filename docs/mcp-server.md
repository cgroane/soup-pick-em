# MCP server

Soup Pick 'em exposes a [Model Context Protocol](https://modelcontextprotocol.io)
server at `POST /api/mcp`, mounted on the existing Express API so it reuses the
already-initialized Firebase Admin app, the CFBD client, and the auth
middleware.

## Layout

| Path | Purpose |
| --- | --- |
| `api/routes/mcp.ts` | Mounts the handler, PAT routes, and the OAuth router |
| `api/mcp/server.ts` | Builds a per-request `McpServer` with the caller's uid |
| `api/mcp/tools/cfbd.ts` | Read-only CFBD analytics tools |
| `api/mcp/tools/app.ts` | Group-scoped reads of slates, picks, leaderboards |
| `api/mcp/auth.ts` | `requireMcpAuth` — opaque bearer token verification |
| `api/mcp/tokenStore.ts` | Token mint/verify/revoke, SHA-256 digests only |
| `api/mcp/oauth.ts` | OAuth 2.1 authorization server + discovery documents |
| `api/mcp/consentPage.ts` | Server-rendered consent screen |

The endpoint is **stateless**: `createMcpHandler` builds a fresh server per
request with the caller's uid closed over. Nothing survives between requests,
which is what makes it safe on Railway — a restart or a second instance would
invalidate any in-process session map.

## Authentication

Two ways in, both ending at the same opaque `Authorization: Bearer` token that
`requireMcpAuth` resolves to a uid. Firebase ID tokens are deliberately *not*
used as the credential: they expire in an hour, which no MCP client can hold.

### OAuth 2.1 (the "Connect" button flow)

Discovery is advertised at the origin root, per RFC 8414 / RFC 9728:

```
GET /.well-known/oauth-protected-resource
GET /.well-known/oauth-authorization-server
```

A client registers itself (`POST /api/mcp/oauth/register`, RFC 7591), sends the
user to `/api/mcp/oauth/authorize`, and exchanges the resulting code at
`/api/mcp/oauth/token`. PKCE with `S256` is required — clients are public and
hold no secret. Refresh tokens rotate on use.

The consent screen at `/authorize` is server-rendered rather than routed into
the React app, so the OAuth query parameters survive the round trip. It signs
the user in with the same Firebase web SDK the app uses and posts the resulting
ID token to `/approve`, which verifies it with the Admin SDK and then discards
it.

Set `PUBLIC_BASE_URL` in production. Behind Railway's proxy the request host is
the internal address, and every discovery document and redirect must advertise
the public origin.

### Personal access tokens

For clients configured with a static header:

```
POST   /api/mcp/tokens      { "name": "My laptop", "scopes": ["read"] }
GET    /api/mcp/tokens
DELETE /api/mcp/tokens/:tokenHash
```

These are authenticated with `requireAuth` (a Firebase ID token) because the
caller is the web app, not an MCP client. The plaintext token is returned
exactly once; only its SHA-256 digest is stored.

```jsonc
// e.g. .mcp.json
{
  "mcpServers": {
    "soup-pick-em": {
      "type": "http",
      "url": "https://<host>/api/mcp",
      "headers": { "Authorization": "Bearer spe_pat_..." }
    }
  }
}
```

## Scopes

`read` grants the group-scoped tools; `write` is defined but no tool consumes
it yet. Submitting picks is a consequential action and stays behind an
explicitly granted scope — a read-only token can never reach it.

## Tools

**CFBD analytics** (public data, no group scoping)

`get_current_week` · `get_team_ratings` · `get_team_ats` ·
`get_advanced_season_stats` · `get_team_ppa` · `get_head_to_head` ·
`get_win_probability` · `get_games_with_lines` · `get_rankings` ·
`get_team_records` · `get_returning_production`

Every tool's `year` defaults to the season in progress, resolved by
`api/currentWeek.ts` — the same lookup behind `GET /api/current-week`, shared so
the route and the tools cannot disagree. It caches for 10 minutes and falls back
to the last good value (then a calendar guess) if sportsdata.io is unreachable,
so a CFBD question never fails on an unrelated outage.

**League data** (read-only, membership enforced per call)

`list_my_groups` · `get_slate` · `get_group_leaderboard` · `get_my_picks` ·
`get_my_record`

Every group-scoped tool routes through `resolveGroup`, which proves the caller
belongs to the `gid` before any read. A token authenticates a user; it does not
entitle them to an arbitrary group id, and the model supplies that id as free
input.

## Firestore collections

| Collection | Contents |
| --- | --- |
| `mcpTokens/{sha256}` | Access tokens and PATs (digest-keyed) |
| `mcpRefreshTokens/{sha256}` | Refresh tokens, rotated on use |
| `mcpOAuthClients/{clientId}` | Dynamically registered clients |
| `mcpAuthCodes/{sha256}` | Authorization codes, 5-minute TTL, one-time use |

These are server-only and written with the Admin SDK, which bypasses rules. No
`match` block in `firestore.rules` covers these paths, and Firestore denies
anything unmatched — so clients already cannot read them. Do not add a rule for
them.

## Local testing

```bash
firebase emulators:start --only auth,firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=soup-pick-em PORT=3099 \
PUBLIC_BASE_URL=http://127.0.0.1:3099 \
npx tsx api/index.ts
```
