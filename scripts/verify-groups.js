#!/usr/bin/env node
/**
 * Verify the groups migration. Read-only. Exits non-zero if any invariant fails.
 *
 * Invariants:
 *   1. groups/legacy exists, is private, has an inviteCode + an owner that is a global admin.
 *   2. member count === users count.
 *   3. exactly one 'owner' (=== group.ownerUid); every global slate-picker is >= slate-picker in-group.
 *   4. every user has users/{uid}/memberships/legacy with a role matching their member doc.
 *   5. slate ids under groups/legacy/slates === slate ids under top-level slates.
 *   6. per user: pick-doc count under the membership === count under users/{uid}/picks,
 *      and a sampled pick doc is byte-equal (no data loss).
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=soup-pick-em \
 *     node scripts/verify-groups.js
 */

const admin = require('firebase-admin');

const LEGACY_GID = 'legacy';
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const PROD = process.argv.includes('--prod');

if (!EMULATOR && !PROD) {
  console.error('REFUSING: no FIRESTORE_EMULATOR_HOST and --prod not passed. Refusing to guess the target.');
  process.exit(1);
}
if (PROD && EMULATOR) {
  console.error('REFUSING: --prod but FIRESTORE_EMULATOR_HOST is set.');
  process.exit(1);
}

if (PROD) {
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : admin.credential.applicationDefault();
  admin.initializeApp({ credential });
} else {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'soup-pick-em' });
}
const db = admin.firestore();

let failures = 0;
function check(label, cond, detail = '') {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

async function main() {
  console.log(`\nVerifying groups/${LEGACY_GID} on ${EMULATOR ? 'EMULATOR' : 'PROD'}...\n`);

  const groupRef = db.collection('groups').doc(LEGACY_GID);
  const groupSnap = await groupRef.get();
  check('1. group doc exists', groupSnap.exists);
  if (!groupSnap.exists) {
    console.error('\nCannot continue — group missing.');
    process.exit(1);
  }
  const group = groupSnap.data();
  check('1. group is private', group.visibility === 'private', `visibility=${group.visibility}`);
  check('1. group has inviteCode', !!group.inviteCode);
  check('1. group has ownerUid', !!group.ownerUid);

  const usersSnap = await db.collection('users').get();
  const ownerSnap = await db.collection('users').doc(group.ownerUid).get();
  check('1. owner is a global admin',
    ownerSnap.exists && (ownerSnap.data().roles || []).includes('admin'),
    `owner=${group.ownerUid}`);

  const membersSnap = await groupRef.collection('members').get();
  check('2. member count === user count',
    membersSnap.size === usersSnap.size,
    `members=${membersSnap.size} users=${usersSnap.size}`);

  const memberById = new Map(membersSnap.docs.map((d) => [d.id, d.data()]));
  const rolesOf = (m) => (m && m.roles) || [];
  const owners = membersSnap.docs.filter((d) => rolesOf(d.data()).includes('owner'));
  check('3. exactly one owner', owners.length === 1, `owners=${owners.length}`);
  check('3. owner member === group.ownerUid',
    owners.length === 1 && owners[0].id === group.ownerUid);
  check('3. every member has base member role',
    membersSnap.docs.every((d) => rolesOf(d.data()).includes('member')));

  // every global slate-picker also holds slate-picker in-group
  let slatePickerOk = true;
  for (const u of usersSnap.docs) {
    if ((u.data().roles || []).includes('slate-picker')) {
      const m = memberById.get(u.id);
      if (!rolesOf(m).includes('slate-picker')) slatePickerOk = false;
    }
  }
  check('3. global slate-pickers preserved in-group', slatePickerOk);

  // membership mirrors — roles array matches the member doc (order-insensitive)
  const sameRoles = (a, b) =>
    a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
  let mirrorsOk = true;
  let mirrorDetail = '';
  for (const u of usersSnap.docs) {
    const mm = await db.collection('users').doc(u.id).collection('memberships').doc(LEGACY_GID).get();
    const member = memberById.get(u.id);
    if (!mm.exists || !sameRoles(rolesOf(mm.data()), rolesOf(member))) {
      mirrorsOk = false;
      mirrorDetail = `uid=${u.id} mirror=${mm.exists ? JSON.stringify(rolesOf(mm.data())) : 'MISSING'} member=${JSON.stringify(rolesOf(member))}`;
      break;
    }
  }
  check('4. membership mirrors present + roles-matched', mirrorsOk, mirrorDetail);

  // slates
  const srcSlates = await db.collection('slates').get();
  const dstSlates = await groupRef.collection('slates').get();
  const srcIds = new Set(srcSlates.docs.map((d) => d.id));
  const dstIds = new Set(dstSlates.docs.map((d) => d.id));
  const missing = [...srcIds].filter((id) => !dstIds.has(id));
  check('5. all slate ids copied',
    missing.length === 0 && srcIds.size === dstIds.size,
    `src=${srcIds.size} dst=${dstIds.size} missing=${missing.slice(0, 5).join(',')}`);

  // picks: count parity + one sampled deep-equal
  let picksParityOk = true;
  let sampleEqualOk = true;
  let picksDetail = '';
  let sampled = false;
  for (const u of usersSnap.docs) {
    const src = await db.collection('users').doc(u.id).collection('picks').get();
    const dst = await groupRef.collection('members').doc(u.id).collection('picks').get();
    if (src.size !== dst.size) {
      picksParityOk = false;
      picksDetail = `uid=${u.id} src=${src.size} dst=${dst.size}`;
      break;
    }
    if (!sampled && src.size > 0) {
      const srcDoc = src.docs[0];
      const dstDoc = await groupRef.collection('members').doc(u.id).collection('picks').doc(srcDoc.id).get();
      sampleEqualOk = dstDoc.exists &&
        JSON.stringify(srcDoc.data()) === JSON.stringify(dstDoc.data());
      sampled = true;
    }
  }
  check('6. pick-doc counts match per user', picksParityOk, picksDetail);
  check('6. sampled pick doc is byte-equal', sampleEqualOk);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
