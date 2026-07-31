#!/usr/bin/env node
/**
 * Groups Migration: backfill the "legacy" group from pre-groups data.
 *
 * Non-destructive COPY. Reads the existing global collections and writes the
 * group-centric shape alongside them. Original `users/*`, `slates/*`, and
 * `users/{uid}/picks/*` are left untouched so this is safe to re-run and safe
 * to roll back. A separate, deliberate cleanup step removes old data later,
 * only after Steps 2-4 prove the new model in the app.
 *
 * Writes:
 *   groups/legacy                              (group doc)
 *   groups/legacy/members/{uid}                (per-group state: role, record, trophyCase, name)
 *   groups/legacy/members/{uid}/picks/{slateId}(copied from users/{uid}/picks)
 *   groups/legacy/slates/{uniqueWeek}          (copied from slates)
 *   users/{uid}/memberships/legacy             (mirror)
 *
 * Target selection (safety):
 *   Default (emulator): FIRESTORE_EMULATOR_HOST MUST be set, else refuse.
 *   Prod (--prod):      FIRESTORE_EMULATOR_HOST must be UNSET, creds required,
 *                       and --yes must be passed to confirm.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=soup-pick-em \
 *     node scripts/migrate-groups.js --dry-run
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=soup-pick-em \
 *     node scripts/migrate-groups.js
 *   node scripts/migrate-groups.js --prod --yes      # against real Firebase
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// --- Config ---
const LEGACY_GID = 'legacy';
const LEGACY_NAME = 'Soup (Legacy)';
const BATCH_SIZE = 400; // Firestore hard limit is 500
const DRY_RUN = process.argv.includes('--dry-run');
const PROD = process.argv.includes('--prod');
const YES = process.argv.includes('--yes');
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

const ROLE = { OWNER: 'owner', SLATE_PICKER: 'slate-picker', MEMBER: 'member' };

// --- Target guard ---
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
      console.error('  For the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=soup-pick-em node scripts/migrate-groups.js');
      process.exit(1);
    }
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'soup-pick-em' });
    console.log(`TARGET: EMULATOR (${process.env.FIRESTORE_EMULATOR_HOST})`);
  }
}

// Group roles are additive: everyone is a MEMBER; the legacy owner also gets
// OWNER, and anyone who was a global slate-picker also gets SLATE_PICKER. The
// same user can hold several (e.g. an owner who also makes the slates).
function memberRoles(roles, uid, ownerUid) {
  const out = [ROLE.MEMBER];
  if (uid === ownerUid) out.push(ROLE.OWNER);
  if (Array.isArray(roles) && roles.includes('slate-picker')) out.push(ROLE.SLATE_PICKER);
  return out;
}

function genInviteCode() {
  // 6 chars, unambiguous alphabet
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Batched-write helper that no-ops on dry run.
function makeWriter(db) {
  let batch = db.batch();
  let count = 0;
  let total = 0;
  return {
    set: async (ref, data) => {
      total++;
      if (DRY_RUN) return;
      batch.set(ref, data);
      count++;
      if (count >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    },
    flush: async () => {
      if (!DRY_RUN && count > 0) await batch.commit();
      return total;
    },
    get total() { return total; },
  };
}

async function main() {
  initApp();
  const db = admin.firestore();
  const nowIso = new Date().toISOString();
  console.log(DRY_RUN ? '\n*** DRY RUN — no writes ***\n' : '\n*** LIVE RUN ***\n');

  // 1. Load users, determine owner (first global admin).
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs;
  const admins = users.filter((u) => (u.data().roles || []).includes('admin'));
  if (admins.length === 0) {
    console.warn('WARNING: no user has the global "admin" role; falling back to first user as owner.');
  }
  const ownerUid = (admins[0] || users[0]).id;
  console.log(`Users: ${users.length}  |  owner (legacy group): ${ownerUid}`);

  // 2. Group doc — preserve inviteCode/createdAt if it already exists (idempotent).
  const groupRef = db.collection('groups').doc(LEGACY_GID);
  const existingGroup = await groupRef.get();
  const groupDoc = {
    id: LEGACY_GID,
    name: LEGACY_NAME,
    visibility: 'private',
    inviteCode: existingGroup.exists ? existingGroup.data().inviteCode : genInviteCode(),
    ownerUid,
    createdAt: existingGroup.exists ? existingGroup.data().createdAt : nowIso,
  };

  const writer = makeWriter(db);
  await writer.set(groupRef, groupDoc);
  console.log(`Group doc: groups/${LEGACY_GID} (inviteCode=${groupDoc.inviteCode})`);

  // 3. Members + membership mirrors + copied picks.
  let memberCount = 0;
  let pickDocCount = 0;
  const roleTally = { owner: 0, 'slate-picker': 0, member: 0 };
  for (const userDoc of users) {
    const u = userDoc.data();
    const uid = userDoc.id;
    const roles = memberRoles(u.roles, uid, ownerUid);
    roles.forEach((r) => roleTally[r]++);

    await writer.set(groupRef.collection('members').doc(uid), {
      uid,
      roles,
      record: u.record || [],
      trophyCase: u.trophyCase || [],
      fName: u.fName || '',
      lName: u.lName || '',
      email: u.email || '',
      joinedAt: nowIso,
    });
    memberCount++;

    await writer.set(db.collection('users').doc(uid).collection('memberships').doc(LEGACY_GID), {
      gid: LEGACY_GID,
      name: LEGACY_NAME,
      roles,
      joinedAt: nowIso,
    });

    // Copy the user's picks subcollection into the membership.
    const picksSnap = await db.collection('users').doc(uid).collection('picks').get();
    for (const p of picksSnap.docs) {
      await writer.set(groupRef.collection('members').doc(uid).collection('picks').doc(p.id), p.data());
      pickDocCount++;
    }
  }
  console.log(`Members: ${memberCount}  roles=${JSON.stringify(roleTally)}  |  copied pick docs: ${pickDocCount}`);

  // 4. Copy slates into the group.
  const slatesSnap = await db.collection('slates').get();
  for (const s of slatesSnap.docs) {
    await writer.set(groupRef.collection('slates').doc(s.id), s.data());
  }
  console.log(`Slates copied: ${slatesSnap.size}`);

  const total = await writer.flush();
  console.log(`\n${DRY_RUN ? 'Would write' : 'Wrote'} ${total} documents total.`);
  console.log(DRY_RUN ? 'Dry run complete.' : 'Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
