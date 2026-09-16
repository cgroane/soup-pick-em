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
| `api/mcp/tools/write.ts` | `set_slate`, registered only with the `write` scope |
| `api/slates/setSlate.ts` | Slate write: authz, validation, pick reconciliation |
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

The token endpoint accepts `application/x-www-form-urlencoded`, which RFC 6749
requires and every real client sends. `bodyParser.json()` alone leaves `req.body`
empty for those requests, so `grant_type` reads as `undefined` and the exchange
fails with `unsupported_grant_type` — hence the `express.urlencoded` on
`oauthRouter`. A JSON-only test will not catch this.

Set `PUBLIC_BASE_URL` to the service's own public origin (e.g.
`https://soup-pick-em-production.up.railway.app`). Behind Railway's proxy the
request host is the internal address, and every discovery document and redirect
advertises this value — point it at localhost and clients are told the
authorization server lives on their own machine.

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

`read` grants the group-scoped read tools. `write` grants `set_slate` and
nothing else; a read-only token never sees the tool, because `buildMcpServer`
registers it only when the scope is present.

**A scope is not a role.** `write` only means the token may *attempt* a write —
`setSlate` still requires the caller to hold `slate-picker` in that group (or the
global admin claim), checked server-side on every call. A member who grants
`write` at consent still cannot set a slate.

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

**Writes** (`write` scope + `slate-picker` role)

`set_slate` — replaces a group's slate for one week.

## Setting a slate

`POST /api/groups/:gid/slates` is the one way a slate is written. The `set_slate`
tool is a client of it, not a parallel path:

```
set_slate
  -> POST /api/groups/:gid/slates          (requireAuth + requireGroupRole)
       -> GET /api/game-data/matchups      (same bearer token)
            -> CFBD
```

The tool holds a uid, not a Firebase ID token, so it mints one with
`createCustomToken` and exchanges it through Identity Toolkit before calling the
endpoint. The request therefore passes `requireAuth` and
`requireGroupRole(["slate-picker"])` exactly as a browser request does, and the
tool reports whatever the endpoint returns — including its error `message`.
Custom claims (the global `admin` flag) survive that exchange, so admin
behaviour is unchanged.

`setSlate` gets the week's games by calling `/api/game-data/matchups`, passing
the caller's token through, so the games/lines/rankings merge lives only in
`api/routes/matchups.ts`.

The service repeats the slate-picker check that `requireGroupRole` already
performed. That is deliberate: it keeps `setSlate` safe to call from anywhere,
and it needs the global-admin answer regardless, to decide whether the kickoff
lock is overridden.

```
POST /api/groups/:gid/slates
{ "week": 3, "year": 2026, "seasonType": "regular", "gameIds": [401858225, ...] }
```

Rejections come back as `{ code, message }`: `not_slate_picker` (403),
`wrong_game_count` / `duplicate_games` / `unknown_games` (400), `slate_locked`
(409), `group_not_found` (404).

Rules enforced, all matching the app:

- Exactly 10 games, no duplicates, each present in that week's priced games — a
  game with no point spread is not selectable, since there is nothing to cover.
- Locked once the week's **first game** kicks off, via `arePicksLocked` from
  `src/utils/pickLock.ts` — the same helper the UI's `canEdit` uses, applied to
  the whole week's games rather than the slate's. A global admin is never locked
  out.
- The write replaces the slate. Member picks on surviving games are kept; picks
  on dropped games are discarded and replaced with unpicked placeholders
  (`selection: null`), which `gradePick` treats as ungradeable. The response
  reports `added`, `removed` and `membersWithCancelledPicks`.

The web app does **not** use this endpoint yet — `CreateSlate` still writes
Firestore directly through `FirebaseSlatesClass.addSlate`, so none of the above
validation applies to it. Migrating the client would make this the single slate
write path.

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
