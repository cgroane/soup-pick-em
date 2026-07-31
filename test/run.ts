/**
 * Aggregate test runner — `npm run test:review`.
 *
 * Runs every review test suite in one process:
 *   - grading  (test/grading/gradePick.test.ts)      — pure, always runs
 *   - profile  (test/client/profileIndicator.test.ts)— pure, always runs
 *   - rules    (test/rules/firestore.rules.test.ts)  — needs the Firestore
 *              emulator on 127.0.0.1:8080; skipped (not failed) if unreachable.
 *
 * Each suite exports `run(): Promise<number>` returning its count of HARD
 * failures (real regressions). Informational repro suites (grading PENDING, F17)
 * return 0. The process exits non-zero only on hard failures.
 *
 * To include the rules suite, have an emulator running first (e.g. the dev stack,
 * or `firebase emulators:start --only firestore`).
 */
import { Socket } from 'net';
import { run as runGrading } from './grading/gradePick.test';
import { run as runProfile } from './client/profileIndicator.test';
import { run as runPickLock } from './client/pickLock.test';
import { run as runRules } from './rules/firestore.rules.test';

function emulatorReachable(host = '127.0.0.1', port = 8080, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

(async () => {
  let hardFailures = 0;

  hardFailures += await runGrading();
  hardFailures += await runProfile();
  hardFailures += await runPickLock();

  if (process.env.FIRESTORE_EMULATOR_HOST || (await emulatorReachable())) {
    hardFailures += await runRules();
  } else {
    console.log(
      '\nFirestore rules — SKIPPED (no emulator on 127.0.0.1:8080).\n' +
        '  Start one first, e.g. `firebase emulators:start --only firestore`, then re-run.'
    );
  }

  console.log(`\n==== review tests complete — ${hardFailures} hard failure(s) ====`);
  process.exit(hardFailures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
