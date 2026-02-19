#!/usr/bin/env node
/**
 * Firestore Migration Script: Old Types → New CFBD-based Types
 *
 * Migrates slate and pick documents from the old Matchup/Outcome shape
 * to the new GamesAPIResult/GamesAPIResponseOutcome shape.
 *
 * Usage:
 *   node migrate-firestore.js --dry-run     # Preview changes without writing
 *   node migrate-firestore.js               # Execute migration
 *
 * Prerequisites:
 *   - Firebase Admin SDK: npm install firebase-admin
 *   - Service account key file at ./serviceAccountKey.json
 *     (or set GOOGLE_APPLICATION_CREDENTIALS env var)
 *
 * IMPORTANT: Back up Firestore before running without --dry-run.
 * Run slate migration first, then picks migration (or use this script which does both in order).
 */

const admin = require('firebase-admin');

// --- Configuration ---
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 400; // Firestore limit is 500, using 400 for headroom

// --- Init Firebase Admin ---
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? undefined // SDK will auto-detect from env var
  : require('./serviceAccountKey.json');

if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

// --- Utilities ---

function stripAndReplaceSpace(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

function migrateGameOutcomes(game) {
  const outcomes = game.outcomes;
  if (!outcomes || !Array.isArray(outcomes)) {
    // Already migrated or no outcomes
    return undefined;
  }

  const homeTeamName = stripAndReplaceSpace(`${game.homeTeam}`);
  const awayTeamName = stripAndReplaceSpace(`${game.awayTeam}`);

  let homeOutcome = null;
  let awayOutcome = null;

  for (const o of outcomes) {
    const oName = stripAndReplaceSpace(o.name);
    if (oName.includes(homeTeamName) || homeTeamName.includes(oName)) {
      homeOutcome = o;
    } else if (oName.includes(awayTeamName) || awayTeamName.includes(oName)) {
      awayOutcome = o;
    }
  }

  if (!homeOutcome || !awayOutcome) {
    // Fallback: try matching by spread sign (home team usually has negative spread in CFBD)
    // If we still can't match, log a warning
    console.warn(`  WARNING: Could not match outcomes by team name for game ${game.gameID || game.id}: ${game.awayTeam} @ ${game.homeTeam}`);
    console.warn(`    Outcome names: ${outcomes.map(o => o.name).join(', ')}`);
    // Try positional fallback: first = away, second = home (common convention)
    if (outcomes.length === 2) {
      awayOutcome = outcomes[0];
      homeOutcome = outcomes[1];
      console.warn(`    Using positional fallback: away=${outcomes[0].name}, home=${outcomes[1].name}`);
    } else {
      return undefined;
    }
  }

  return {
    home: {
      name: homeOutcome.name,
      point: homeOutcome.point,
      pointValue: homeOutcome.point,
      id: 1
    },
    away: {
      name: awayOutcome.name,
      point: awayOutcome.point,
      pointValue: awayOutcome.point,
      id: 2
    }
  };
}

function migrateSlateGame(game) {
  const migrated = { ...game };

  // gameID → id
  if ('gameID' in migrated && !('id' in migrated)) {
    migrated.id = migrated.gameID;
  }
  delete migrated.gameID;

  // Remove theOddsId
  delete migrated.theOddsId;

  // outcomes: array → {home, away} object
  if (Array.isArray(migrated.outcomes)) {
    migrated.outcomes = migrateGameOutcomes(game);
  }

  // startTimeTbd → startTimeTBD
  if ('startTimeTbd' in migrated) {
    migrated.startTimeTBD = migrated.startTimeTbd;
    delete migrated.startTimeTbd;
  }

  // homePostWinProb → homePostgameWinProbability
  if ('homePostWinProb' in migrated) {
    migrated.homePostgameWinProbability = migrated.homePostWinProb;
    delete migrated.homePostWinProb;
  }

  // awayPostWinProb → awayPostgameWinProbability
  if ('awayPostWinProb' in migrated) {
    migrated.awayPostgameWinProbability = migrated.awayPostWinProb;
    delete migrated.awayPostWinProb;
  }

  // Derive completed
  if (!('completed' in migrated)) {
    migrated.completed = (migrated.homeLineScores?.length >= 4) || false;
  }

  // homeTeamData transforms
  if (migrated.homeTeamData) {
    if (migrated.homeTeamData.teamLogoUrl && !migrated.homeTeamData.logos) {
      migrated.homeTeamData.logos = [migrated.homeTeamData.teamLogoUrl];
    }
    delete migrated.homeTeamData.teamLogoUrl;
    if (!migrated.homeTeamData.id && game.homeId) {
      migrated.homeTeamData.id = game.homeId;
    }
    delete migrated.homeTeamData.teamID;
  }

  // awayTeamData transforms
  if (migrated.awayTeamData) {
    if (migrated.awayTeamData.teamLogoUrl && !migrated.awayTeamData.logos) {
      migrated.awayTeamData.logos = [migrated.awayTeamData.teamLogoUrl];
    }
    delete migrated.awayTeamData.teamLogoUrl;
    if (!migrated.awayTeamData.id && game.awayId) {
      migrated.awayTeamData.id = game.awayId;
    }
    delete migrated.awayTeamData.teamID;
  }

  return migrated;
}

function migratePickSelection(selection, slateGames) {
  if (!selection) return selection;

  const migrated = { ...selection };

  // Remove price
  delete migrated.price;

  // Add pointValue = point
  if ('point' in migrated && !('pointValue' in migrated)) {
    migrated.pointValue = migrated.point;
  }

  // Derive id: match name vs slate game's homeTeam/awayTeam
  if (!('id' in migrated) && slateGames) {
    if (migrated.name === 'PUSH') {
      migrated.id = 0;
    } else {
      const selName = stripAndReplaceSpace(migrated.name);
      for (const game of slateGames) {
        const homeName = stripAndReplaceSpace(game.homeTeam);
        const awayName = stripAndReplaceSpace(game.awayTeam);
        if (selName.includes(homeName) || homeName.includes(selName)) {
          migrated.id = 1; // home
          break;
        } else if (selName.includes(awayName) || awayName.includes(selName)) {
          migrated.id = 2; // away
          break;
        }
      }
      if (!('id' in migrated)) {
        console.warn(`  WARNING: Could not derive selection.id for pick name="${migrated.name}"`);
      }
    }
  }

  return migrated;
}

// --- Migration Functions ---

async function migrateSlates() {
  console.log('\n=== Migrating Slates ===\n');

  const slatesSnap = await db.collection('slates').get();
  console.log(`Found ${slatesSnap.size} slate documents`);

  // Cache migrated slate data for picks migration
  const slateCache = new Map();
  let batch = db.batch();
  let batchCount = 0;
  let totalMigrated = 0;

  for (const slateDoc of slatesSnap.docs) {
    const data = slateDoc.data();

    if (!data.games || !Array.isArray(data.games)) {
      console.log(`  Skipping ${slateDoc.id} - no games array`);
      continue;
    }

    // Check if already migrated (no gameID on first game)
    const firstGame = data.games[0];
    if (firstGame && !('gameID' in firstGame) && !Array.isArray(firstGame.outcomes)) {
      console.log(`  Skipping ${slateDoc.id} - appears already migrated`);
      slateCache.set(slateDoc.id, data.games);
      continue;
    }

    const migratedGames = data.games.map(g => migrateSlateGame(g));
    const updatedSlate = { ...data, games: migratedGames };

    console.log(`  Migrating slate: ${slateDoc.id} (${migratedGames.length} games)`);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would update ${slateDoc.id}`);
      // Log first game transform as sample
      if (migratedGames.length > 0) {
        console.log(`    Sample game id: ${migratedGames[0].id}, outcomes type: ${typeof migratedGames[0].outcomes}`);
      }
    } else {
      batch.set(slateDoc.ref, updatedSlate);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`    Committed batch of ${batchCount}`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    slateCache.set(slateDoc.id, migratedGames);
    totalMigrated++;
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount}`);
  }

  console.log(`\nSlates migration complete: ${totalMigrated} documents ${DRY_RUN ? 'would be ' : ''}updated`);
  return slateCache;
}

async function migratePicks(slateCache) {
  console.log('\n=== Migrating Picks ===\n');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} user documents`);

  let batch = db.batch();
  let batchCount = 0;
  let totalMigrated = 0;

  for (const userDoc of usersSnap.docs) {
    const picksSnap = await db.collection('users').doc(userDoc.id).collection('picks').get();

    if (picksSnap.empty) continue;

    console.log(`  User ${userDoc.id}: ${picksSnap.size} pick documents`);

    for (const pickDoc of picksSnap.docs) {
      const data = pickDoc.data();

      if (!data.picks || !Array.isArray(data.picks)) continue;

      // Get corresponding slate games for id derivation
      const slateGames = slateCache.get(data.slateId || pickDoc.id) || [];

      let needsUpdate = false;
      const migratedPicks = data.picks.map(pick => {
        if (!pick.selection) return pick;

        // Check if already migrated
        if ('pointValue' in pick.selection && 'id' in pick.selection && !('price' in pick.selection)) {
          return pick;
        }

        needsUpdate = true;
        return {
          ...pick,
          selection: migratePickSelection(pick.selection, slateGames)
        };
      });

      if (!needsUpdate) continue;

      console.log(`    Migrating picks: ${pickDoc.id}`);

      if (DRY_RUN) {
        console.log(`      [DRY RUN] Would update picks for ${pickDoc.id}`);
        // Sample
        const sample = migratedPicks.find(p => p.selection);
        if (sample) {
          console.log(`      Sample selection: id=${sample.selection.id}, pointValue=${sample.selection.pointValue}, has price=${'price' in sample.selection}`);
        }
      } else {
        batch.set(pickDoc.ref, { ...data, picks: migratedPicks });
        batchCount++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`    Committed batch of ${batchCount}`);
          batch = db.batch();
          batchCount = 0;
        }
      }

      totalMigrated++;
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount}`);
  }

  console.log(`\nPicks migration complete: ${totalMigrated} documents ${DRY_RUN ? 'would be ' : ''}updated`);
}

// --- Main ---

async function main() {
  console.log(`\nFirestore Migration: Old Types → New CFBD-based Types`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('---');

  try {
    // Slates first (picks depend on slate data for id derivation)
    const slateCache = await migrateSlates();

    // Then picks
    await migratePicks(slateCache);

    console.log('\n=== Migration Complete ===');
  } catch (err) {
    console.error('\nMigration failed:', err);
    process.exit(1);
  }
}

main();
