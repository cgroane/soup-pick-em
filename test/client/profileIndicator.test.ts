/**
 * Repro for F17 (docs/architecture-review.md) — section E7/E8 of docs/test-cases.md.
 *
 * Profile's "make your picks" indicator (`hasPicksThisWeek`) is derived from the
 * hand-synced `user.pickHistory` mirror instead of the authoritative group picks
 * that Profile already fetches into `allPickHistories`. When the mirror is stale or
 * empty (after the auth listener re-reads the legacy user doc, or on plain
 * navigation) the indicator wrongly says "make your picks" even though a complete
 * slate of picks exists in the group path.
 *
 * This is a pure-logic repro: it mirrors Profile.hasPicksThisWeek and shows that the
 * mirror-based computation disagrees with the authoritative one. No app-code change.
 *
 * Run via the aggregate runner: `npm run test:review`.
 */

type Selection = { name: string } | null;
type Pick = { matchup: number; selection: Selection };
type PickHistory = { slateId: string; userId: string; picks: Pick[] };
type Slate = { uniqueWeek: string; games: { id: number }[] };

/** MIRROR of Profile.hasPicksThisWeek (src/pages/Profile/index.tsx:32-37). */
const hasPicksThisWeek = (pickHistory: PickHistory[] | undefined, slate: Slate | undefined) => {
  const allValid = pickHistory
    ?.find((h) => h.slateId === slate?.uniqueWeek)
    ?.picks.filter((pick) => !!pick.selection);
  return (allValid?.length === slate?.games?.length && slate?.games?.length) || false;
};

// -- fixtures: user has a COMPLETE, submitted slate in the authoritative group path --
const SLATE: Slate = { uniqueWeek: 'w5-2024', games: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })) };
const UID = 'user1';
const completePicks: PickHistory = {
  slateId: 'w5-2024',
  userId: UID,
  picks: SLATE.games.map((g) => ({ matchup: g.id, selection: { name: 'PUSH' } })),
};

// Authoritative source Profile already fetches (fetchUsers → allPickHistories).
const allPickHistories: PickHistory[] = [completePicks];
// The stale/empty mirror on the user doc after the auth listener reset (F17).
const staleMirror: PickHistory[] = [];

// -- harness ----------------------------------------------------------------
const results: { name: string; ok: boolean; msg?: string }[] = [];
// Profile renders "Change your picks" when hasPicksThisWeek is TRUTHY (it returns
// the game count, not a strict boolean), so compare on truthiness.
const expect = (name: string, actual: unknown, expectedTruthy: boolean) =>
  results.push(
    !!actual === expectedTruthy
      ? { name, ok: true }
      : { name, ok: false, msg: `expected ${expectedTruthy ? 'truthy' : 'falsy'}, got ${JSON.stringify(actual)}` }
  );

/** Runs the F17 repro. Informational (documents a known bug) → returns 0 hard failures. */
export async function run(): Promise<number> {
  console.log('\nProfile pick-status indicator — F17 (E7/E8)\n');

  // Authoritative computation (the intended fix) → user HAS picks.
  expect(
    'E7  authoritative (allPickHistories) → hasPicks = true',
    hasPicksThisWeek(allPickHistories.filter((p) => p.userId === UID), SLATE),
    true
  );

  // Current code path (stale mirror) → wrongly reports NO picks. This is the bug.
  expect(
    'E7  mirror (stale user.pickHistory) → hasPicks = true (repro: currently false)',
    hasPicksThisWeek(staleMirror, SLATE),
    true
  );

  let passed = 0;
  for (const r of results) {
    if (r.ok) passed++;
    const mark = r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[33m✗ (repro F17)\x1b[0m';
    console.log(`  ${mark} ${r.name}${r.ok ? '' : `\n      ${r.msg}`}`);
  }
  console.log(`\n${passed}/${results.length} passed`);
  console.log(
    '\nThe authoritative computation reports the picks correctly; the mirror-based one ' +
      '(what Profile uses today) does not — that gap is F17.'
  );
  // Informational repro — do not fail CI on the documented bug.
  return 0;
}
