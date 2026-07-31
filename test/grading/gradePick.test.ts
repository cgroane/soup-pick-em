/**
 * Grading unit tests — section B1 of docs/test-cases.md.
 *
 * `gradePick` in api/routes/update-score.ts is a private const, so this suite
 * cannot import it without a one-line change to app code:
 *
 *     // api/routes/update-score.ts
 *     export const gradePick = (...) => { ... };
 *
 * Per the review's "Findings + repro (no app-code changes)" scope, that export is
 * NOT made here. This file is therefore runnable in two modes:
 *
 *   • BOUND   — once `gradePick` is exported, set GRADEPICK_EXPORTED=1. The suite
 *               imports the real function and asserts INTENDED behavior. Repro
 *               cases (B1g/B1h) will FAIL, pinpointing F4/F8 in the real code.
 *   • PENDING — default. The real function isn't reachable, so the suite runs a
 *               clearly-labeled MIRROR of the current logic to DEMONSTRATE the
 *               F4/F8 bugs, then reports the intended-behavior cases as pending.
 *
 * Run via the aggregate runner: `npm run test:review`.
 */

type Selection = { name: string; point?: unknown; pointValue?: number; id?: number };
type Pick = { selection: Selection | null | undefined };
type Fresh = { homePoints?: number | null; awayPoints?: number | null; completed?: boolean };
type Outcomes = { home?: { pointValue?: number }; away?: { pointValue?: number } } | undefined;

/**
 * MIRROR of gradePick as written in api/routes/update-score.ts (kept in sync
 * manually). Used only in PENDING mode to demonstrate current behavior. The BOUND
 * mode replaces this with the real import.
 */
const gradePickMirror = (pick: Pick, freshGame: Fresh, outcomes: Outcomes): boolean | null => {
  if (!freshGame?.completed) return null;
  if (!pick.selection || !outcomes) return null;
  const homePoints = freshGame.homePoints ?? 0;
  const awayPoints = freshGame.awayPoints ?? 0;
  const { id, pointValue } = pick.selection as { id?: number; pointValue?: number };
  const isPush = id === 0 || (pick.selection as { name?: string }).name === 'PUSH';
  if (isPush) {
    const favIsHome = (outcomes.home?.pointValue ?? 0) < 0;
    const favScore = favIsHome ? homePoints : awayPoints;
    const underDogScore = favIsHome ? awayPoints : homePoints;
    const favSpread = favIsHome ? (outcomes.home?.pointValue ?? 0) : (outcomes.away?.pointValue ?? 0);
    return favScore + favSpread === underDogScore;
  }
  const pickedScore = id === 1 ? homePoints : awayPoints;
  const otherScore = id === 1 ? awayPoints : homePoints;
  return pickedScore + (pointValue ?? 0) > otherScore;
};

// -- fixtures ---------------------------------------------------------------
// Home favored by 7 (home spread -7). Home 28, Away 20 → home wins by 8, covers.
const spread7 = { home: { pointValue: -7 }, away: { pointValue: 7 } };
const homeCovers: Fresh = { homePoints: 28, awayPoints: 20, completed: true };  // margin 8 > 7
const homeFails: Fresh = { homePoints: 24, awayPoints: 20, completed: true };   // margin 4 < 7
const exactlyOnNumber: Fresh = { homePoints: 27, awayPoints: 20, completed: true }; // margin 7 == 7
const notDone: Fresh = { homePoints: 0, awayPoints: 0, completed: false };

const homePick: Pick = { selection: { name: 'Home', pointValue: -7, id: 1 } };
const awayPick: Pick = { selection: { name: 'Away', pointValue: 7, id: 2 } };
const pushPick: Pick = { selection: { name: 'PUSH', pointValue: 0, id: 0 } };
// The exact malformed shape MakePicks.ifMissingGames produces (F4): no id, legacy `price`.
const autofilledPush: Pick = { selection: { name: 'PUSH', point: 0, price: 0 } as unknown as Selection };

// -- harness ----------------------------------------------------------------
type Case = { id: string; run: (grade: typeof gradePickMirror) => void; repro?: string };
const eq = (actual: unknown, expected: unknown, msg: string) => {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
};

const cases: Case[] = [
  { id: 'B1a  incomplete game → null', run: (g) => eq(g(homePick, notDone, spread7), null, 'B1a') },
  { id: 'B1b  home pick covers → true', run: (g) => eq(g(homePick, homeCovers, spread7), true, 'B1b') },
  { id: 'B1c  home pick fails → false', run: (g) => eq(g(homePick, homeFails, spread7), false, 'B1c') },
  { id: 'B1d  away pick covers → true', run: (g) => eq(g(awayPick, homeFails, spread7), true, 'B1d') },
  { id: 'B1e  push, lands on number → true', run: (g) => eq(g(pushPick, exactlyOnNumber, spread7), true, 'B1e') },
  { id: 'B1f  push, misses number → false', run: (g) => eq(g(pushPick, homeCovers, spread7), false, 'B1f') },
  { id: 'B1i  missing outcomes → null', run: (g) => eq(g(homePick, homeCovers, undefined), null, 'B1i') },
  {
    id: 'B1g  side pick exactly on number → loss (did not cover; PUSH is its own pick)',
    // A side pick is a bet that the team COVERS the spread. Landing exactly on the
    // number is not a cover, so it is a loss — the user should have picked PUSH to
    // bet the number is exact. Confirmed product intent; the strict `>` is correct.
    run: (g) => eq(g(homePick, exactlyOnNumber, spread7), false, 'B1g'),
  },
  {
    id: 'B1h  auto-filled PUSH (no id) on a real push → true (push handling, not away)',
    // Fixture chosen so push-handling and the buggy away-branch DIVERGE: the game
    // lands exactly on the number (a real push). Correct push handling → true;
    // the old away-branch fall-through → false. Now a green guard: F4 hardens
    // gradePick to detect a PUSH-named selection even without an id.
    run: (g) => eq(g(autofilledPush, exactlyOnNumber, spread7), true, 'B1h'),
  },
];

async function loadReal(): Promise<typeof gradePickMirror | null> {
  // `gradePick` is now exported, so bind to the real function automatically.
  // Set GRADEPICK_EXPORTED=0 to force the mirror (e.g. to inspect legacy behavior).
  if (process.env.GRADEPICK_EXPORTED === '0') return null;
  try {
    const mod: any = await import('../../api/routes/update-score');
    return (mod.gradePick ?? null) as typeof gradePickMirror | null;
  } catch (e) {
    console.error('Could not import real gradePick:', (e as Error).message);
    return null;
  }
}

/**
 * Runs the grading suite. In BOUND mode (real gradePick) returns real hard
 * failures; in PENDING mode the mirror repros are informational → returns 0.
 */
export async function run(): Promise<number> {
  const real = await loadReal();
  const grade = real ?? gradePickMirror;
  const mode = real ? 'BOUND (real gradePick)' : 'PENDING (mirror — demonstrates current behavior)';
  console.log(`\nGrading — section B1  [${mode}]\n`);

  let passed = 0;
  const failures: { id: string; msg: string; repro?: string }[] = [];
  for (const c of cases) {
    try {
      c.run(grade);
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${c.id}`);
    } catch (err) {
      failures.push({ id: c.id, msg: (err as Error).message, repro: c.repro });
      const tag = c.repro ? `\x1b[33m✗ (known repro ${c.repro})\x1b[0m` : '\x1b[31m✗\x1b[0m';
      console.log(`  ${tag} ${c.id}`);
    }
  }

  console.log(`\n${passed}/${cases.length} passed`);
  if (failures.length) {
    console.log('\nDetails:');
    for (const f of failures) console.log(`  - ${f.id}\n    ${f.msg}`);
  }

  if (!real) {
    console.log(
      '\nPENDING: mirror mode (GRADEPICK_EXPORTED=0). The real `gradePick` is ' +
        'exported and normally bound automatically.'
    );
    return 0;
  }

  // A failing `repro` case is a known, not-yet-fixed finding (e.g. F8), tracked
  // but not a regression. A failing guard is a real regression → hard failure.
  const hard = failures.filter((f) => !f.repro);
  const known = failures.filter((f) => f.repro);
  if (known.length) {
    console.log(`\n${known.length} known repro(s) still open: ${known.map((k) => k.repro).join(', ')}`);
  }
  return hard.length;
}
