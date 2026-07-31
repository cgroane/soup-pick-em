/**
 * Firestore security-rules tests — section A of docs/test-cases.md.
 *
 * Runs against the Firestore emulator with NO app-code changes. Two projects are
 * loaded into one emulator:
 *   - `soup-pick-em`   → the canonical prod rules (firestore.rules.prod). Most cases.
 *   - `soup-active`    → the ACTIVE rules file (firestore.rules, what firebase.json
 *                        deploys). A2 asserts it is now closed (F1 resolved) and
 *                        mirrors the canonical file.
 *
 * Run via the aggregate runner: `npm run test:review` (needs a Firestore emulator
 * on 127.0.0.1:8080 — the runner skips this suite if none is reachable).
 *
 * Self-contained harness (no jest): each `test()` runs an assertion that throws on
 * failure; results are tallied and the process exits non-zero if anything fails.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const HOST = '127.0.0.1';
const PORT = 8080;
const PROD_RULES = readFileSync(resolve(__dirname, '../../firestore.rules.prod'), 'utf8');
const DEV_RULES = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');

// ---- tiny test harness -----------------------------------------------------
type Case = { name: string; fn: () => Promise<void> };
const cases: Case[] = [];
const test = (name: string, fn: () => Promise<void>) => cases.push({ name, fn });

async function runAll() {
  let passed = 0;
  const failures: { name: string; err: unknown }[] = [];
  for (const c of cases) {
    try {
      await c.fn();
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${c.name}`);
    } catch (err) {
      failures.push({ name: c.name, err });
      console.log(`  \x1b[31m✗ ${c.name}\x1b[0m`);
    }
  }
  console.log(`\n${passed}/${cases.length} passed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.name}\n    ${String((f.err as Error)?.message ?? f.err)}`);
  }
  return failures.length;
}

// ---- fixtures --------------------------------------------------------------
const OWNER = 'owner1';
const MEMBER = 'member1';
const PICKER = 'picker1';
const OUTSIDER = 'outsider1';
const ADMIN = 'admin1';
const G_PRIV = 'g-priv';
const G_PUB = 'g-pub';

async function seed(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'groups', G_PRIV), {
      id: G_PRIV, name: 'Private', visibility: 'private', inviteCode: 'ABC123', ownerUid: OWNER,
    });
    await setDoc(doc(db, 'groups', G_PUB), {
      id: G_PUB, name: 'Public', visibility: 'public', inviteCode: 'PUB123', ownerUid: OWNER,
    });
    const seededRoles: [string, string[]][] = [
      [OWNER, ['member', 'owner']],
      [MEMBER, ['member']],
      [PICKER, ['member', 'slate-picker']],
    ];
    for (const [uid, roles] of seededRoles) {
      await setDoc(doc(db, 'groups', G_PRIV, 'members', uid), { uid, roles });
    }
    await setDoc(doc(db, 'groups', G_PRIV, 'slates', 'w5-2024'), { uniqueWeek: 'w5-2024', games: [] });
    await setDoc(doc(db, 'users', MEMBER), { id: MEMBER, email: 'm@x.com' });
  });
}

// convenience db handles
let prodEnv: RulesTestEnvironment;
let devEnv: RulesTestEnvironment;
const asUser = (uid: string, claims?: Record<string, unknown>) =>
  prodEnv.authenticatedContext(uid, claims as never).firestore();
const asAnon = () => prodEnv.unauthenticatedContext().firestore();

// ---- cases (mirror docs/test-cases.md §A) ----------------------------------
function register() {
  // A1: prod rules deny anonymous group access
  test('A1  prod: anon read groups/g → denied', async () => {
    await assertFails(getDoc(doc(asAnon(), 'groups', G_PRIV)));
  });

  // A2: the ACTIVE rules file (firestore.rules) now denies anonymous writes —
  // F1 resolved. (Was a repro that anon writes were ALLOWED under the open rules.)
  test('A2  active(F1 fixed): anon write groups/g → denied', async () => {
    const db = devEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'groups', 'anything'), { hacked: true }));
  });

  test('A3  member reads own group slate → allowed', async () => {
    await assertSucceeds(getDoc(doc(asUser(MEMBER), 'groups', G_PRIV, 'slates', 'w5-2024')));
  });

  test('A4  non-member reads group slate → denied', async () => {
    await assertFails(getDoc(doc(asUser(OUTSIDER), 'groups', G_PRIV, 'slates', 'w5-2024')));
  });

  test('A5  member writes slate → denied', async () => {
    await assertFails(setDoc(doc(asUser(MEMBER), 'groups', G_PRIV, 'slates', 'w6-2024'), { uniqueWeek: 'w6-2024', games: [] }));
  });

  test('A6  slate-picker writes slate → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(PICKER), 'groups', G_PRIV, 'slates', 'w6-2024'), { uniqueWeek: 'w6-2024', games: [] }));
  });

  // Owner ≠ slate-picker under the array role model: an owner who was not also
  // granted slate-picker cannot write slates.
  test('A7  owner (not slate-picker) writes slate → denied', async () => {
    await assertFails(setDoc(doc(asUser(OWNER), 'groups', G_PRIV, 'slates', 'w7-2024'), { uniqueWeek: 'w7-2024', games: [] }));
  });

  test('A7b global admin writes slate → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(ADMIN, { admin: true }), 'groups', G_PRIV, 'slates', 'w7-2024'), { uniqueWeek: 'w7-2024', games: [] }));
  });

  test('A8  member A writes B’s picks → denied', async () => {
    await assertFails(setDoc(doc(asUser(MEMBER), 'groups', G_PRIV, 'members', PICKER, 'picks', 'w5-2024'), { picks: [] }));
  });

  test('A9  member A writes own picks → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(MEMBER), 'groups', G_PRIV, 'members', MEMBER, 'picks', 'w5-2024'), { picks: [] }));
  });

  test('A10 signed-in user writes roster member doc → denied (server-owned)', async () => {
    await assertFails(setDoc(doc(asUser(OWNER), 'groups', G_PRIV, 'members', MEMBER), { uid: MEMBER, roles: ['member', 'owner'] }));
  });

  test('A11 public group readable by non-member → allowed', async () => {
    await assertSucceeds(getDoc(doc(asUser(OUTSIDER), 'groups', G_PUB)));
  });

  test('A12 private group not readable by non-member → denied', async () => {
    await assertFails(getDoc(doc(asUser(OUTSIDER), 'groups', G_PRIV)));
  });

  test('A13 user A reads user B doc → denied', async () => {
    await assertFails(getDoc(doc(asUser(OUTSIDER), 'users', MEMBER)));
  });

  test('A14 user writes own membership mirror → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(MEMBER), 'users', MEMBER, 'memberships', G_PRIV), { gid: G_PRIV, roles: ['member'] }));
  });

  test('A15 global admin reads any user doc → allowed', async () => {
    await assertSucceeds(getDoc(doc(asUser(ADMIN, { admin: true }), 'users', MEMBER)));
  });

  test('A16 owner updates group settings → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(OWNER), 'groups', G_PRIV), { id: G_PRIV, name: 'Renamed', visibility: 'private', inviteCode: 'ABC123', ownerUid: OWNER }, { merge: true }));
  });

  test('A17 non-owner member updates group → denied', async () => {
    await assertFails(setDoc(doc(asUser(MEMBER), 'groups', G_PRIV), { name: 'Nope' }, { merge: true }));
  });

  // --- CFP bracket (global) ---------------------------------------------------
  test('A18 signed-in user reads cfpBracket → allowed', async () => {
    await assertSucceeds(getDoc(doc(asUser(OUTSIDER), 'cfpBracket', 'cfp-2024')));
  });

  test('A19 non-admin writes cfpBracket → denied', async () => {
    await assertFails(setDoc(doc(asUser(MEMBER), 'cfpBracket', 'cfp-2024'), { year: 2024, games: [] }));
  });

  test('A20 global admin writes cfpBracket → allowed', async () => {
    await assertSucceeds(setDoc(doc(asUser(ADMIN, { admin: true }), 'cfpBracket', 'cfp-2024'), { year: 2024, games: [] }));
  });
}

// ---- entry point -----------------------------------------------------------
/** Runs the rules suite. Returns the number of HARD failures (real test failures). */
export async function run(): Promise<number> {
  prodEnv = await initializeTestEnvironment({
    projectId: 'soup-pick-em',
    firestore: { rules: PROD_RULES, host: HOST, port: PORT },
  });
  devEnv = await initializeTestEnvironment({
    projectId: 'soup-active',
    firestore: { rules: DEV_RULES, host: HOST, port: PORT },
  });

  await prodEnv.clearFirestore();
  await devEnv.clearFirestore();
  await seed(prodEnv);

  console.log('\nFirestore rules — section A\n');
  register();
  const failed = await runAll();

  await prodEnv.cleanup();
  await devEnv.cleanup();
  return failed;
}
