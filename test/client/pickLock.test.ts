/**
 * Pick-locking / timing tests — section F of docs/test-cases.md.
 *
 * Exercises the shared `arePicksLocked` helper (src/utils/pickLock.ts) that both
 * MakePicks (F5) and SlateContext (F6) now use. The key regression this guards is
 * F6: the old math compared against LOCAL MIDNIGHT (`toDateString()`), so on game
 * day the lock stayed open until the next calendar day even after kickoff.
 *
 * Run via the aggregate runner: `npm run test:review`.
 */
import { arePicksLocked, earliestKickoff } from '../../src/utils/pickLock';
import { GamesAPIResult } from '../../src/model';

const game = (startDate: string): GamesAPIResult => ({ startDate } as unknown as GamesAPIResult);

// Freeze "now" to game day 15:00 UTC; kickoff at 12:00 same day.
const NOW = Date.parse('2024-11-16T15:00:00Z');
const KICK_1200 = '2024-11-16T12:00:00Z';
const KICK_1800 = '2024-11-16T18:00:00Z'; // still upcoming
const KICK_PAST = '2024-11-09T12:00:00Z'; // last week

type Case = { id: string; run: () => void; repro?: string };
const eq = (actual: unknown, expected: unknown, msg: string) => {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
};

const cases: Case[] = [
  {
    id: 'F1t  earliest game already kicked off → locked',
    run: () => eq(arePicksLocked([game(KICK_1800), game(KICK_PAST)]), true, 'F1t'),
  },
  {
    id: 'F2t  now=gameday 15:00, kickoff 12:00 → locked (was open under date-only math)',
    run: () => eq(arePicksLocked([game(KICK_1200)]), true, 'F2t'),
  },
  {
    id: 'F3t  now before earliest kickoff → not locked',
    run: () => eq(arePicksLocked([game(KICK_1800)]), false, 'F3t'),
  },
  {
    id: 'F4t  admin override, after kickoff → not locked',
    run: () => eq(arePicksLocked([game(KICK_1200)], true), false, 'F4t'),
  },
  {
    id: 'F5t  empty slate → not locked (nothing to lock yet)',
    run: () => eq(arePicksLocked([]), false, 'F5t'),
  },
  {
    id: 'F6t  earliestKickoff returns the minimum start',
    run: () => eq(earliestKickoff([game(KICK_1800), game(KICK_1200)]), Date.parse(KICK_1200), 'F6t'),
  },
];

export async function run(): Promise<number> {
  console.log('\nPick locking — section F\n');

  const realNow = Date.now;
  Date.now = () => NOW;

  let passed = 0;
  const failures: { id: string; msg: string }[] = [];
  try {
    for (const c of cases) {
      try {
        c.run();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${c.id}`);
      } catch (err) {
        failures.push({ id: c.id, msg: (err as Error).message });
        console.log(`  \x1b[31m✗\x1b[0m ${c.id}`);
      }
    }
  } finally {
    Date.now = realNow;
  }

  console.log(`\n${passed}/${cases.length} passed`);
  if (failures.length) {
    console.log('\nDetails:');
    for (const f of failures) console.log(`  - ${f.id}\n    ${f.msg}`);
  }
  return failures.length;
}
