# Soup Pick'em — Test-Case Specification

Companion to [`architecture-review.md`](./architecture-review.md). Test cases are
grouped by subsystem. Each case lists **preconditions → action → expected**, a
priority (P0 highest), and the finding it exercises (`Fn`) where it is a repro for a
known bug. Cases marked **repro** currently fail against the code as written; cases
without a marker assert intended behavior that should hold.

Legend: 🔴 repro (documents a bug) · 🟢 guard (asserts correct behavior).

> **Status (post-fix pass).** Implemented and green in `npm run test:review`:
> section A (rules, A1–A20 incl. new `cfpBracket` A18–A20; **A2 flipped** to assert the
> active rules now deny anon writes — F1 fixed), section B1 (`gradePick`, bound to the
> shared `src/utils/grade.ts`; **B1h and B1g are now 🟢 guards** — F4 fixed, and F8
> confirmed working-as-intended: an on-the-number side pick is a loss, not a push),
> and section F (pick-lock, F1t–F4t + two
> extra — F5/F6 fixed). Fixed but not yet backed by an emulator integration test:
> **F2** (B3b) and **F3** (B2d) — the code paths are corrected; the seeded-grader
> integration cases are still pending.

---

## A. Firestore security rules (`firestore.rules.prod`)

_Runnable now via `@firebase/rules-unit-testing` against the Firestore emulator._
Implemented in `test/rules/firestore.rules.test.ts`.

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| A1 | P0 | prod rules loaded; no auth | read/write `groups/{g}` | **denied** | 🟢 |
| A2 | P0 | dev rules (`firestore.rules`) loaded; no auth | write `groups/{g}` | **allowed** (proves F1) | 🔴 F1 |
| A3 | P0 | user is member of `g` | read `groups/g/slates/{w}` | allowed | 🟢 |
| A4 | P0 | user is NOT a member of `g` | read `groups/g/slates/{w}` | denied | 🟢 |
| A5 | P0 | member (role=member) of `g` | write `groups/g/slates/{w}` | denied | 🟢 |
| A6 | P0 | slate-picker of `g` | write `groups/g/slates/{w}` | allowed | 🟢 |
| A7 | P0 | owner of `g` | write `groups/g/slates/{w}` | allowed (owner ⊇ slate-picker) | 🟢 |
| A8 | P0 | member A of `g` | write `groups/g/members/B/picks/{w}` (B≠A) | denied | 🟢 |
| A9 | P0 | member A of `g` | write `groups/g/members/A/picks/{w}` | allowed | 🟢 |
| A10 | P1 | any signed-in user | write `groups/g/members/{uid}` (roster doc) | denied (server-owned) | 🟢 |
| A11 | P1 | group `g` is public; non-member | read `groups/g` | allowed (discovery) | 🟢 |
| A12 | P1 | group `g` is private; non-member | read `groups/g` | denied | 🟢 |
| A13 | P1 | user A | read `users/B` (B≠A, A not admin) | denied | 🟢 |
| A14 | P1 | user A | write `users/A/memberships/{g}` | allowed | 🟢 |
| A15 | P2 | global admin claim | read `users/B` | allowed | 🟢 |
| A16 | P2 | owner of `g` | update `groups/g` (name) | allowed | 🟢 |
| A17 | P2 | member (non-owner) of `g` | update/delete `groups/g` | denied | 🟢 |

## B. Scoring / grading (`api/routes/update-score.ts`)

_Requires exporting `gradePick` (and ideally `processRegularSeason`/`processCFP`) to
unit-test directly — see `test/grading/gradePick.test.ts` (pending the export)._

### B1. `gradePick` unit

| # | Pri | Input | Expected | Tag |
|---|-----|-------|----------|-----|
| B1a | P0 | game not `completed` | `null` (ungradeable) | 🟢 |
| B1b | P0 | home pick (id=1), home covers spread | `true` | 🟢 |
| B1c | P0 | home pick (id=1), home fails spread | `false` | 🟢 |
| B1d | P0 | away pick (id=2), away covers | `true` | 🟢 |
| B1e | P0 | push (id=0), favorite lands exactly on number | `true` | 🟢 |
| B1f | P0 | push (id=0), favorite misses number | `false` | 🟢 |
| B1g | P1 | side pick lands **exactly** on the number | `false` (loss — did not cover; PUSH is its own pick) | 🟢 |
| B1h | P0 | selection `{name:'PUSH', point:0, price:0}` (no `id`) | should be push; currently graded as **away** | 🔴 F4 |
| B1i | P1 | missing `outcomes` | `null` | 🟢 |

### B2. `processRegularSeason` integration (emulator)

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| B2a | P0 | group with slate `w5-2024` + one member's completed picks | run grader | member picks `processed: true`, `correctCount`/record updated | 🟢 |
| B2b | P0 | grader already ran once | run grader again (same scores) | record **unchanged** (delta = 0, no double-count) | 🟢 |
| B2c | P0 | two groups, one has no slate for the week | run grader | group without slate is skipped, no error | 🟢 |
| B2d | P1 | slate `w1-2024POST` (postseason) + picks | run grader | picks graded | 🔴 F3 (currently never graded) |
| B2e | P1 | member with no pick doc for the week | run grader | member skipped, no record change | 🟢 |
| B2f | P2 | some games in slate not yet complete | run grader | only complete games counted; incomplete left ungraded | 🟢 |

### B3. `processCFP` integration (emulator)

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| B3a | P0 | `cfpBracket/cfp-2024` + a group member's `cfp-2024` picks in the **group** path | run grader | picks graded, record updated | 🟢 |
| B3b | P0 | CFP picks saved via the app (`saveCfpPicks`) | run grader | picks are graded | 🔴 F2 (written to `users/{uid}/picks`, never graded) |
| B3c | P1 | bracket advances a round (new completed games) | re-run grader | delta applied for newly-complete games only | 🟢 |
| B3d | P2 | bracket missing for year | run grader | throws / 500, other groups unaffected | 🟢 |

### B4. Cron trigger + auth

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| B4a | P0 | no `x-cron-secret` header | POST `/api/cron/update-scores` | 403 | 🟢 |
| B4b | P0 | wrong secret | POST | 403 | 🟢 |
| B4c | P1 | correct secret | POST | 200, grading runs | 🟢 |
| B4d | P2 | scheduled fn env `REACT_APP_PROD_API_URL` set | invoke `updateScores` | POSTs to `/cron/update-scores` with secret | 🟢 |

## C. Group API (`api/routes/groups.ts`)

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| C1 | P0 | authed user | POST `/` `{name}` | 201; caller is `owner`; member + membership docs created | 🟢 |
| C2 | P0 | no name | POST `/` `{}` | 400 | 🟢 |
| C3 | P0 | private group, valid code | POST `/join` `{inviteCode}` | 200, member added as `member` | 🟢 |
| C4 | P0 | bad code | POST `/join` | 404 | 🟢 |
| C5 | P1 | already a member | POST `/join` | 200 `{alreadyMember:true}`, no duplicate | 🟢 |
| C6 | P1 | private group, join by `gid` (no code) | POST `/join` `{gid}` | 403 | 🟢 |
| C7 | P1 | public group, join by `gid` | POST `/join` `{gid}` | 200 | 🟢 |
| C8 | P0 | non-owner member | POST `/:gid/slate-picker` | 403 | 🟢 |
| C9 | P0 | owner assigns picker to member X | POST `/:gid/slate-picker {uid:X}` | X→slate-picker; prior picker→member; owner unchanged | 🟢 |
| C10 | P1 | owner assigns picker to a non-member | POST | 404 | 🟢 |
| C11 | P1 | owner renames group | PATCH `/:gid {name}` | group + **all** membership mirrors updated | 🟢 |
| C12 | P2 | two groups issued the same invite code | POST `/join {code}` | joins the intended group | 🔴 F13 |
| C13 | P2 | non-owner | PATCH `/:gid` | 403 | 🟢 |

## D. Auth & RBAC

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| D1 | P0 | no bearer token | any `/api/game-data/*` | 401 | 🟢 |
| D2 | P0 | valid token, non-admin | `/api/admin/*` | 403 | 🟢 |
| D3 | P1 | admin `set-role` with role `"admin"` | POST | claim set | 🟢 |
| D4 | P1 | admin `set-role` with arbitrary role key | POST | should be rejected; currently accepted | 🔴 F9 |
| D5 | P1 | user registered before `currentUser` resolved | load route | route accessible after login | 🔴 F10 |
| D6 | P2 | route guard: basic user → `/admin-cfp` | navigate | "no permission" | 🟢 |
| D7 | P2 | group owner → `/choose-picker` | navigate | allowed | 🟢 |

## E. Client contexts — group scoping & switching

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| E1 | P0 | user in groups G1, G2; active=G1 | switch to G2 | slate, picks, leaderboard all reflect **G2** | 🟢 |
| E2 | P0 | user picked in G1, not in G2; active=G2 | open `/pick` | no G1 picks leak into G2 prepopulation | 🟢 |
| E3 | P1 | stored `activeGroupId` no longer a membership | load app | falls back to first membership | 🟢 |
| E4 | P1 | user in zero groups | load app | onboarding path (create/join), no crash/empty dead-end | 🔴 F14 |
| E5 | P1 | slate-picker edits slate, swaps 2 games after users picked | resubmit | only the swapped games' picks invalidated for each user | 🔴 F11 |
| E6 | P2 | MakePicks prepopulation source | open `/pick` with existing group picks | selections restored from group path | 🟢 (guards F2-adjacent) |
| E7 | P0 | complete `PickHistory` in group path; `user.pickHistory` mirror empty/stale | render Profile (navigate, no refresh) | "Change your picks" shown (indicator uses authoritative group picks, not the mirror) | 🔴 F17 |
| E8 | P1 | submit picks on `/pick`, then navigate to Profile (no refresh) | render Profile | indicator reflects the just-submitted picks | 🔴 F17 |

## F. Pick locking & timing

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| F1t | P0 | slate earliest game already kicked off | open `/pick` | submit disabled / picks locked | 🔴 F5 |
| F2t | P0 | now = game day 15:00, kickoff 12:00 | eval `canEdit` | `false` | 🔴 F6 |
| F3t | P1 | now before earliest kickoff | eval `canEdit` (slate-picker) | `true` | 🟢 |
| F4t | P2 | global admin, after kickoff | eval `canEdit` | `true` (admin override) | 🟢 |

## G. Season / week pipeline

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| G1 | P0 | `/current-week` returns `ApiSeason` with `OFF` | map | `seasonType:'offseason'`, `isOffseason:true` | 🟢 |
| G2 | P0 | `ApiSeason` includes `POST` | map | `seasonType:'postseason'` | 🟢 |
| G3 | P1 | offseason | UI `getSeasonData` | Season/Week decremented once (not double) | 🔴 F12 |
| G4 | P1 | postseason selected in SelectWeek | fetch | week→1, slate id suffixed `POST`; grader path consistent | 🔴 F3/F12 |
| G5 | P2 | offseason | Profile render | no crash on `headingText` (regression guard) | 🟢 |

## H. External API mapping (`/api/game-data/matchups`)

| # | Pri | Precondition | Action | Expected | Tag |
|---|-----|--------------|--------|----------|-----|
| H1 | P1 | CFBD games + lines + teams + ranks | GET `/matchups` | each game has `homeTeamData`, `awayTeamData`, `outcomes{home,away}`, `pointSpread` | 🟢 |
| H2 | P1 | a game with no line | GET | game filtered out (`outcomes` undefined) | 🟢 |
| H3 | P1 | postseason request | GET | CFP games excluded from the regular matchups list | 🟢 |
| H4 | P2 | Playoff Committee poll present | GET | ranks read from `playoffRank`, else `apRank` | 🟢 |
| H5 | P2 | game team id not in FBS teams | GET | game filtered out | 🟢 |

---

## Implementation plan (highest-risk first)

1. **A. Rules** — fully runnable now, no app changes. `test/rules/` (this pass).
2. **B1. `gradePick`** — highest bug density (F4/F6/F8). Blocked only by a one-line
   `export`. Test file staged in `test/grading/`, activated once `gradePick` is
   exported.
3. **B2/B3. Grader integration** — emulator + seeded groups; catches F2/F3.
4. **C/D. Route tests** — supertest against the Admin-SDK routes.
5. **E/F/G/H.** — client context + mapping tests (jsdom / msw), lower urgency.
