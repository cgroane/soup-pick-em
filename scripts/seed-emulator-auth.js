#!/usr/bin/env node
/**
 * Seed the Auth emulator with accounts that match the Firestore user docs.
 *
 * The Firestore snapshot in emulator-data/ is a Firestore-only export — it has
 * no auth_export — so the Auth emulator boots empty and Google sign-in fails
 * with "no google.com accounts exist in the auth emulator".
 *
 * For every users/{uid} doc this imports an Auth user with:
 *   - the SAME uid (so it lines up with users/{uid} and groups/legacy/members/{uid})
 *   - a google.com provider (so the emulator's Google popup lists the account)
 *   - a dev password (so email/password sign-in also works)
 *
 * EMULATOR ONLY. Refuses to run unless FIREBASE_AUTH_EMULATOR_HOST is set, so it
 * can never touch production auth.
 *
 * Usage (emulator running):
 *   npm run seed:auth:emu
 */

const admin = require('firebase-admin');

const DEV_PASSWORD = 'password123';

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('REFUSING: FIREBASE_AUTH_EMULATOR_HOST is not set. This script only seeds the emulator.');
  process.exit(1);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'soup-pick-em' });
const db = admin.firestore();
const auth = admin.auth();

async function main() {
  console.log(`Seeding Auth emulator (${process.env.FIREBASE_AUTH_EMULATOR_HOST})...\n`);
  const usersSnap = await db.collection('users').get();
  if (usersSnap.empty) {
    console.error('No users/ docs found in the emulator Firestore. Import the snapshot / run the migration first.');
    process.exit(1);
  }

  const records = usersSnap.docs.map((d) => {
    const u = d.data();
    const email = u.email || `${d.id}@example.com`;
    const displayName = [u.fName, u.lName].filter(Boolean).join(' ') || email;
    return {
      uid: d.id,
      email,
      emailVerified: true,
      displayName,
      // Password lets you sign in via the email/password form too.
      passwordHash: Buffer.from(DEV_PASSWORD),
      // google.com provider makes the account show up in the Google sign-in popup.
      providerData: [{ uid: email, providerId: 'google.com', email, displayName }],
    };
  });

  // The emulator ignores real hashing; pass BCRYPT so importUsers accepts the field.
  const result = await auth.importUsers(records, { hash: { algorithm: 'BCRYPT' } });
  console.log(`Imported: ${result.successCount} | failed: ${result.failureCount}`);
  result.errors.forEach((e) => console.error(`  uid=${records[e.index].uid}: ${e.error.message}`));

  console.log('\nSign in with any of these (Google button → pick the account, or email/password):');
  records.slice(0, 20).forEach((r) => console.log(`  ${r.email}   (uid=${r.uid})`));
  console.log(`\nDev password for all: ${DEV_PASSWORD}`);
  console.log('\nTip: to persist auth across restarts, run `firebase emulators:export ./emulator-data/<new-dir>` and repoint fb:serve.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
