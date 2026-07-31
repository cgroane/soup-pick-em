# Soup Pick'em — System Architecture Review

_Whole-system review conducted on the `feature/groups` branch. Focus: correctness
and integrity of the group-scoped data model, the scoring pipeline, RBAC, and the
season/week plumbing. This document catalogs findings; a companion
[`test-cases.md`](./test-cases.md) turns them into a test spec._

---

## 1. System map

```
                        ┌────────────────────────────────────────┐
   External APIs        │  Express API (api/, tsx, port 3001)     │
  ┌──────────────┐      │                                        │
  │ CFBD (games, │◄─────┤  /api/game-data/matchups  (maps →      │
  │ lines, ranks,│      │     GamesAPIResult)                    │
  │ teams)       │      │  /api/current-week  (season/type)      │
  ├──────────────┤      │  /api/groups/*      (create/join/...)  │
  │ SportsData.io│◄─────┤  /api/cron/update-scores (secret-gated)│
  │ (season)     │      │  /api/admin/*       (claims, tokens)   │
  └──────────────┘      └───────────────┬────────────────────────┘
                                        │ Admin SDK (bypasses rules)
   Scheduled trigger                    ▼
  ┌──────────────┐            ┌────────────────────┐
  │ Cloud Fn     │──POST────► │     Firestore      │
  │ updateScores │  x-cron-   │  groups/{gid}/     │
  │ (Tue 12:00)  │  secret    │    members/{uid}/  │
  └──────────────┘            │      picks/{week}  │
                              │    slates/{week}   │
   React client (CRA)         │  users/{uid}/      │
  ┌──────────────┐  client    │    memberships/    │
  │ contexts:    │  SDK       │  cfpBracket/{year} │
  │ ui→group→    │◄──────────►│                    │
  │ user→pick→   │  (rules)   └────────────────────┘
  │ slate→cfp    │
  └──────────────┘
```

**Storage is group-centric.** Per-group state (roles, records, picks, slates) lives
under `groups/{gid}`. `users/{uid}/memberships/{gid}` is a denormalized mirror so a
user can list their groups cheaply. The CFP **bracket** stays global (one real
playoff); only CFP **picks/records** are supposed to be per-group.

**Three role stores, kept in sync by hand:**
1. Firestore `users/{uid}.roles: UserRoles[]` — drives client UI.
2. Firebase Auth custom claims (`admin`) — drives Express middleware (`requireAdmin`).
3. `groups/{gid}/members/{uid}.role: GroupRole` — drives per-group authz
   (`requireGroupRole`, rules `isGroupSlatePicker`).

**Two write authorities:** the client SDK (constrained by rules) and the Admin SDK
(migration scripts, cron, Express — bypasses rules; must self-enforce).

---

## 2. Findings

Severity: **Critical** (data loss / security / core feature dead) · **High**
(feature broken or silently wrong for users) · **Medium** (drift, edge cases,
maintainability) · **Low** (gaps, polish).

### F1 · Critical · Production runs fully-open rules
`firebase.json` → `firestore.rules`, which is `allow read, write: if true` for
`/{document=**}`. This is **no auth at all** — anyone with the web config can read
and write every group, every user doc, every pick. The real group-scoped rules are
written but inert in `firestore.rules.prod`. Nothing enforces group isolation,
role gating, or self-ownership in prod today.
- **Location:** `firestore.rules`, `firestore.rules.prod`, `firebase.json`.
- **Blocked on:** the client still does self-scoped reads that the prod rules
  allow, so activation is mostly a swap — but it must be tested first (F-series
  below depend on the same paths).
- **Repro:** rules-unit test — unauthenticated `setDoc` to `groups/x` succeeds
  under `firestore.rules`, is denied under `firestore.rules.prod`.

### F2 · Critical · CFP picks are written to a dead path
`saveCfpPicks` (`src/context/cfp/index.tsx`) writes to
`users/{uid}/picks/{cfp-year}` via `FirebaseUsersClassInstance.addDocument(..., ['picks', slateId])`.
But:
- the cron (`processCFP`) grades `groups/{gid}/members/{uid}/picks/{cfp-year}`,
- the Picks page reads `allPickHistories` = `getAllPicks(gid)` (group path),
- `CFPContext` reloads existing picks from `user.pickHistory`, which the user
  context loads from `getMemberPicks(activeGroupId, uid)` (group path).

So CFP picks are **written where nothing reads, grades, or displays them**, and they
are not group-scoped at all — violating "CFP brackets are scoped to group."
- **Location:** `src/context/cfp/index.tsx:80` vs `api/routes/update-score.ts:223` &
  `src/context/user/index.tsx:81`.
- **Repro:** save a CFP pick, assert `groups/{gid}/members/{uid}/picks/{cfp-year}`
  is empty and the legacy path is written.

### F3 · High · Postseason (non-CFP) slates are never graded
A "postseason slate" is created with `uniqueWeek = w{week}-{year}POST`
(`CreateSlate.submitSlate`). The cron routes anything postseason to `processCFP`,
which only grades the **bracket** doc `cfp-{year}` — it never looks at
`slates/{w1-{year}POST}`. `processRegularSeason` builds the id as
`w{week}-{year}` (no `POST` suffix) and is skipped when `isCFP`. Result: users can
pick a postseason slate that will **never** be scored.
- **Location:** `api/routes/update-score.ts:79-88, 178-221`; `CreateSlate/index.tsx:81`.
- **Repro:** seed a `w1-2024POST` slate + picks, run the grader, assert picks stay
  `processed: false`.

### F4 · High · Auto-filled PUSH picks are graded as an away-team pick
`MakePicks.ifMissingGames` fills unselected games with
`selection: { name: 'PUSH', point: 0, price: 0 }` — the **legacy** `Outcome` shape.
The grader keys off `selection.id`: `id === 0` = push, `1` = home, `2` = away.
Here `id` is `undefined`, so the push branch is skipped and the code falls through
to `id === 1 ? home : away` → graded as an **away-team** pick against a 0 spread,
not a push.
- **Location:** `src/pages/MakePicks/index.tsx:42-46`; `api/routes/update-score.ts:37-53`.
- **Repro:** grade a pick with `selection = {name:'PUSH', point:0, price:0}` and
  assert it is treated as a push (or at least not silently as away).

### F5 · High · `/pick` has no kickoff lock
CLAUDE.md: "user can change picks up until the earliest listed game start date,
after which all picks will be locked." `MakePicks` gates the submit button only on
`picksCount < 10` — there is no time check. `canEdit` (which does the time math)
lives in `SlateContext` and is only consulted by `CreateSlate`. A user can submit or
change picks after kickoff.
- **Location:** `src/pages/MakePicks/index.tsx:86-93` (no lock);
  `src/context/slate/index.tsx:53-60` (lock exists but unused here).
- **Repro:** component/integration test — render `/pick` with a slate whose earliest
  game is in the past; assert submit is disabled.

### F6 · High · The kickoff-lock time math is date-only
`canEdit` compares `Date.parse(today.toDateString())` — i.e. **local midnight
today** — against the earliest kickoff. On game day this keeps editing open until
the next calendar day even after kickoff, and can flip on timezone. Same
`toDateString()` truncation is used in `Picks/index.tsx` (lines 76, 133) to decide
whether to grade a game.
- **Location:** `src/context/slate/index.tsx:54-57`; `src/pages/Picks/index.tsx:76,133`.
- **Repro:** freeze clock to game day 15:00 with a 12:00 kickoff; assert `canEdit`
  is `false`.

### F7 · High · Two divergent grading implementations
Grading is implemented twice with different logic:
- **Cron** (`gradePick`): identifies the picked side by `selection.id` (1/2).
- **Picks UI** (`Picks/index.tsx`): identifies the picked side by **string-matching**
  `selection.name` against `game.homeTeam` (lowercased, spaces stripped, `includes`).

These can disagree (neutral-site games, teams whose names are substrings of each
other, the malformed PUSH shape from F4). The UI number-correct and the stored
record can drift. There should be one grading function used by both.
- **Location:** `api/routes/update-score.ts:27-54` vs `src/pages/Picks/index.tsx:60-104`.

### F8 · Resolved (working as intended) · Exact-spread semantics
`gradePick` for a side pick returns `pickedScore + point > otherScore` (strict), so a
result landing **exactly** on the spread is a **loss**. **Confirmed correct by product
owner:** a side pick is a bet that the team *covers*; landing on the number is not a
cover, so it loses. PUSH is the separate, first-class "the spread is exactly right"
selection. No change needed; guarded by B1g (now 🟢).
- **Location:** `src/utils/grade.ts` (shared grader).

### F9 · Medium · RBAC drift across three stores + unvalidated claim writes
- `admin/set-role` does `setCustomUserClaims(userId, { [role]: true })` — it does not
  validate `role` against an allowlist (an admin can inject any claim key) and does
  not preserve/clear other claims.
- Group role changes (`/:gid/slate-picker`) update the Firestore member doc + the
  membership mirror but **not** auth claims. Middleware `requireGroupRole` reads the
  member doc (consistent), but the legacy `slatePicker` claim can go stale.
- `remove-role`, `assign-slate-picker`, `revoke-token`, `view-roles` are referenced
  in project notes but **do not exist** in `api/routes/admin.ts` (only `impersonate`
  + `set-role`).
- **Location:** `api/routes/admin.ts`; `api/routes/groups.ts:190`.

### F10 · Medium · `isAuthenticated` route guard is a stale persisted flag
Routes gate on `user?.isAuthenticated`, read from the Firestore user doc.
`isAuthenticated` is written **once** at registration as `!!auth.currentUser`
(frequently `false` at that instant) and never updated on subsequent logins. Route
access thus depends on a stale snapshot rather than live auth state.
- **Location:** `src/routes.tsx` (guards); `src/firebase/user/user.ts:76`.

### F11 · Medium · Slate-edit deletion indices are order-fragile
`SlateContext.addAndRemove` records `deletions` as the index `found` into the
**mutating** `selectedGames` array. `addSlate` then applies those indices against
`existingSlate.games`. After the first removal the arrays diverge, so a second edit
can flag the wrong game as overwritten — corrupting which users' picks get
invalidated. Deletions should be keyed by game **id**, not positional index.
- **Location:** `src/context/slate/index.tsx:95-104`; `src/firebase/slate/slate.ts:23-28`.

### F12 · Medium · Postseason/offseason plumbing is duplicated & inconsistent
Offseason adjustment (decrement season/week) happens in the UI context
(`getSeasonData`) **and** independently in the cron (`update-score.ts:67`). Slate ids
carry a `POST` suffix on the client but not in `processRegularSeason`. `usePostSeason`
is derived from `ApiSeason.includes('POST')`, `useOffSeason` from `isOffseason` — two
different mechanisms. This is the plumbing already flagged as causing the Profile
crash + slate-write failures.
- **Location:** `src/context/ui/index.tsx:47-62`; `api/routes/update-score.ts:65-88`.

### F13 · Medium · Invite codes are not collision-checked
`genInviteCode` picks 6 random chars with no uniqueness check on insert; `/join`
resolves a code with `.where('inviteCode','==',...).limit(1)`. A collision silently
routes a joiner into the wrong group. Low probability, high blast radius.
- **Location:** `api/routes/groups.ts:11-15, 87-96`.

### F14 · Low · Group lifecycle gaps vs spec
No API to: transfer ownership (admin), remove/kick a member, leave a group, or
delete a group (rules allow delete, no endpoint). "Users in no group" is still a
`TBD` in CLAUDE.md — a brand-new user has zero memberships, so `activeGroupId` is
`undefined` and most pages render empty with no onboarding path.
- **Location:** `api/routes/groups.ts` (missing routes); `src/context/group/index.tsx:54`.

### F15 · Low · Signup seeds a yearless record row
`transformUserData` seeds `record: [{ wins: 0, losses: 0 }]` (no `year`). Profile
filters `r => !!r.year` and the leaderboard keys on `year`, so the row is inert; the
overall reducer counts its zeros harmlessly. Cosmetic but a latent foot-gun.
- **Location:** `src/firebase/user/user.ts:69-73`.

### F16 · Low · `updateSlateScores` calls `getGames()` with no args
`refreshSlatePicksStatus` → `updateSlateScores` calls `getGames()` with no
week/year, so it fetches whatever the server defaults to rather than the slate's
week. Likely wrong data if ever exercised.
- **Location:** `src/firebase/slate/slate.ts:81-105`.

### F17 · High · Profile "make your picks" indicator is stale after submitting (user-reported)
**Symptom:** after a user submits picks, the Profile page still shows "Make your
picks" until a full page refresh; navigating away and back to Profile reproduces
the stale state.

**Root cause — stale mirror + wrong source of truth:**
`Profile.hasPicksThisWeek` is derived from `user.pickHistory`, a hand-synced
**mirror** of the authoritative group picks. That mirror is only hydrated in three
places, none of which fire on plain navigation:
1. The mount-time effect gated on `[user?.uid, activeGroupId]`
   (`context/user/index.tsx:81`) — reads `getMemberPicks` from the group path. Route
   changes alter neither dep, so it does not re-run.
2. The `onAuthStateChanged` listener (`context/user/index.tsx:66`) does
   `setUser(userDoc)`; the user doc's **legacy** `pickHistory` field is empty since
   picks moved to the group path — so any re-read **resets the mirror to `[]`**.
3. `MakePicks.submitPicks` patches the mirror in memory
   (`setUser({...prev, pickHistory: refreshed})`) — which is why it looks right for
   a moment, but nothing re-derives it after navigation.

Meanwhile Profile's own effect calls `fetchUsers()`, which **does** load fresh,
authoritative picks into `allPickHistories` — but `hasPicksThisWeek` ignores that
and reads the stale `user.pickHistory` mirror. So a full reload rehydrates the
mirror (correct), while client navigation renders the stale/empty mirror ("make
your picks").
- **Location:** `src/pages/Profile/index.tsx:32-37`; `src/context/user/index.tsx:66-95`.
- **Fix direction:** derive the indicator from the data Profile already fetches
  (`allPickHistories.filter(p => p.userId === user.uid)`), or re-hydrate
  `user.pickHistory` on slate/route change and stop the auth listener from
  clobbering it with the empty legacy field. Same stale-mirror smell as F2/F10.
- **Repro:** submit picks so the group path has a complete `PickHistory`; leave
  `user.pickHistory` empty (simulating the reset/never-hydrated mirror); assert
  Profile's `hasPicksThisWeek` computed from `allPickHistories` is `true` while the
  mirror-based computation is `false`.

---

## 3. Cross-cutting observations

- **No test suite exists.** `react-scripts test` is wired but there are zero app
  tests. The grading logic, rules, and season plumbing — the three riskiest areas —
  have no coverage. This review adds the first tests (rules + grading).
- **Grading logic is private.** `gradePick` is a non-exported const inside
  `update-score.ts`. Unit-testing it directly (F4/F6/F8) requires exporting it — a
  one-line change intentionally left out of this diagnostic pass; see test-cases.md.
- **Two grading sources** (F7) is the root maintainability risk: every scoring rule
  must be edited in two places or they drift.
- **Admin SDK paths self-enforce.** Because cron/Express bypass rules, the rules
  tests (F1) do **not** cover server writes — those need route-level tests.

---

## 4. Recommended remediation order

1. ✅ **F2, F3, F4** — silent scoring/data-path breaks; users get wrong or no results.
2. **F17** — visible, user-reported: Profile shows the wrong pick status after submitting.
3. ✅ **F5, F6** — pick-locking correctness (integrity of the contest).
4. ✅ **F1** — activate prod rules (after F2–F6 confirm the group paths are correct).
5. ✅ **F7** — unify grading into one shared function.
6. **F8–F16** — drift, lifecycle, and polish.

### Status (this pass)

Fixed and covered by `npm run test:review` (0 hard failures):
- **F2** — `saveCfpPicks` writes to the group path (`groups/{gid}/members/{uid}/picks/{cfp-year}`).
- **F3** — cron grades postseason `…POST` slates via `processPostseasonSlates`, alongside `processCFP`.
- **F4** — `MakePicks` auto-fill emits the canonical PUSH outcome; `gradePick` also treats any
  `name==='PUSH'` selection as a push (protects already-stored legacy picks).
- **F5/F6** — shared `src/utils/pickLock.ts::arePicksLocked` (real-instant math) gates `MakePicks`
  submit and `SlateContext.canEdit`; `Picks`/`PickCard` date math de-truncated.
- **F1** — group-scoped rules activated (`firestore.rules` mirrors `firestore.rules.prod`, + a new
  `cfpBracket` rule). **Not deployed** — takes effect on `firebase deploy --only firestore`.
- **F7** — single grader `src/utils/grade.ts::gradePick`, imported by the cron and the Picks page.

**F8** resolved as working-as-intended (on-the-number side pick = loss; confirmed by product
owner; B1g is now a 🟢 guard). Still open: **F17** (Profile stale mirror), **F9–F16**.

**Post-activation follow-on (pre-auth read race).** Activating F1 surfaced a latent bug the
open rules had masked: `GroupContext` seeded `activeGroupId` synchronously from `localStorage`,
so on a cold load a group id reached the slate/pick/bracket fetchers *before* auth resolved,
firing **unauthenticated** reads that the rules (correctly) reject — the "evaluation error at
L85 for 'get'" (that signature = `uid()` deref on a null `request.auth`, the slate-read path).
Fix: `activeGroupId` now inits `undefined` and is hydrated from the stored preference inside
`refreshMemberships` *after* a uid exists, validated against real memberships (also closes E3);
`CFPContext.fetchBracket` is gated on `user?.uid`. General rule: every client Firestore read
must be gated on an authenticated uid, since the group-scoped rules deny anonymous access.
