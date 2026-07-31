#!/usr/bin/env node
/**
 * Backfill: convert the per-group single `role` string to a `roles` array.
 *
 * The groups feature originally stored one role per member
 * (`role: 'owner' | 'slate-picker' | 'member'`). It now stores an additive
 * array (`roles: string[]`) where every member has `member` and the same person
 * may also hold `owner` and/or `slate-picker`. This walks every group's member
 * docs AND the users/{uid}/memberships mirrors and rewrites them in place.
 *
 * Structural only + idempotent: a doc that already has a `roles` array is left
 * alone, and the old scalar `role` field is deleted once converted. It does NOT
 * consult global user roles — for the legacy group, re-running
 * migrate-groups.js additively re-derives owner+slate-picker from the global
 * roles if a user held both (something a string→array conversion can't know).
 *
 * Target selection matches migrate-groups.js:
 *   Default (emulator): FIRESTORE_EMULATOR_HOST MUST be set.
 *   Prod (--prod):      FIRESTORE_EMULATOR_HOST unset, creds required, --yes.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=soup-pick-em \
 *     node scripts/backfill-group-roles.js --dry-run
 *   node --env-file=.env.local scripts/backfill-group-roles.js --prod --yes
 */

const admin = require('firebase-admin');

const BATCH_SIZE = 400;
const DRY_RUN = process.argv.includes('--dry-run');
const PROD = process.argv.includes('--prod');
const YES = process.argv.includes('--yes');
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

function initApp() {
  if (PROD) {
    if (EMULATOR) {
      console.error('REFUSING: --prod passed but FIRESTORE_EMULATOR_HOST is set. Unset it to target prod.');
      process.exit(1);
    }
    if (!YES) {
      console.error('REFUSING: --prod requires --yes to confirm writing to real Firebase.');
      process.exit(1);
    }
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    } else {
      try {
        credential = admin.credential.cert(require('./serviceAccountKey.json'));
      } catch (_) {
        console.error('REFUSING: --prod but no credentials (set FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, or scripts/serviceAccountKey.json).');
        process.exit(1);
      }
    }
    admin.initializeApp({ credential });
    console.log('TARGET: PRODUCTION Firebase');
  } else {
    if (!EMULATOR) {
      console.error('REFUSING: no FIRESTORE_EMULATOR_HOST set and --prod not passed. Refusing to guess the target.');
      process.exit(1);
    }
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'soup-pick-em' });
    console.log(`TARGET: EMULATOR (${process.env.FIRESTORE_EMULATOR_HOST})`);
  }
}

// 'owner' -> ['member','owner']; 'member' -> ['member']; missing -> ['member'].
function rolesFromScalar(role) {
  const out = ['member'];
  if (role && role !== 'member') out.push(role);
  return out;
}

// Returns { roles, changed }. If the doc already has a roles array, no change.
function convert(data) {
  if (Array.isArray(data.roles)) return { roles: data.roles, changed: false };
  return { roles: rolesFromScalar(data.role), changed: true };
}

async function main() {
  initApp();
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;
  console.log(DRY_RUN ? '\n*** DRY RUN — no writes ***\n' : '\n*** LIVE RUN ***\n');

  let batch = db.batch();
  let pending = 0;
  let converted = 0;
  let skipped = 0;

  const stage = async (ref, roles) => {
    converted++;
    if (DRY_RUN) return;
    batch.update(ref, { roles, role: FieldValue.delete() });
    if (++pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  };

  // 1. groups/{gid}/members/{uid}
  const groups = await db.collection('groups').get();
  for (const g of groups.docs) {
    const members = await g.ref.collection('members').get();
    for (const m of members.docs) {
      const { roles, changed } = convert(m.data());
      if (changed) await stage(m.ref, roles);
      else skipped++;
    }
  }

  // 2. users/{uid}/memberships/{gid}
  const users = await db.collection('users').get();
  for (const u of users.docs) {
    const memberships = await u.ref.collection('memberships').get();
    for (const mm of memberships.docs) {
      const { roles, changed } = convert(mm.data());
      if (changed) await stage(mm.ref, roles);
      else skipped++;
    }
  }

  if (!DRY_RUN && pending > 0) await batch.commit();

  console.log(`\nDone. converted=${converted}  already-array=${skipped}  groups=${groups.size}  users=${users.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
