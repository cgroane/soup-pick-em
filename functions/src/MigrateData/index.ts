import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions/v1";
import {MigrationResult, NewOutcomes, OldGame, OldPickDocument, OldSelection, Outcome} from "../types";

const BATCH_SIZE = 400;

// --- Utilities ---

function stripAndReplaceSpace(str: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function migrateGameOutcomes(game: OldGame): NewOutcomes | undefined {
  const outcomes = game.outcomes as Outcome[] | undefined;
  if (!outcomes || !Array.isArray(outcomes)) {
    return undefined;
  }

  const homeTeamName = stripAndReplaceSpace(`${game?.homeTeamData?.school}${game.homeTeamData?.name}`);
  const awayTeamName = stripAndReplaceSpace(`${game?.awayTeamData?.school}${game.awayTeamData?.name}`);

  let homeOutcome: Outcome | null = null;
  let awayOutcome: Outcome | null = null;

  for (const o of outcomes) {
    const oName = stripAndReplaceSpace(o.name);
    if (oName.includes(homeTeamName) || homeTeamName.includes(oName)) {
      homeOutcome = o;
    } else if (oName.includes(awayTeamName) || awayTeamName.includes(oName)) {
      awayOutcome = o;
    }
  }

  if (!homeOutcome || !awayOutcome) {
    logger.warn(`Could not match outcomes by team name for game ${game.gameID ?? game.id}: ${game.awayTeam} @ ${game.homeTeam}`);
    logger.warn(`Outcome names: ${outcomes.map((o) => o.name).join(", ")}`);
    if (outcomes.length === 2) {
      awayOutcome = outcomes[0];
      homeOutcome = outcomes[1];
      logger.warn(`Using positional fallback: away=${outcomes[0].name}, home=${outcomes[1].name}`);
    } else {
      return undefined;
    }
  }

  return {
    home: {
      name: homeOutcome.name,
      point: homeOutcome.point > 0 ? `+${homeOutcome.point}` : `${homeOutcome.point}`,
      pointValue: homeOutcome.point,
      id: 1,
    },
    away: {
      name: awayOutcome.name,
      point: awayOutcome.point > 0 ? `+${awayOutcome.point}` : `${awayOutcome.point}`,
      pointValue: awayOutcome.point,
      id: 2,
    },
  };
}

function migrateSlateGame(game: OldGame): OldGame {
  const migrated: OldGame = {...game};

  if ("gameID" in migrated && !("id" in migrated)) {
    migrated.id = migrated.gameID;
  }
  delete migrated.gameID;
  delete migrated.theOddsId;

  if (Array.isArray(migrated.outcomes)) {
    migrated.outcomes = migrateGameOutcomes(game);
  }

  if ("startTimeTbd" in migrated) {
    migrated.startTimeTBD = migrated.startTimeTbd;
    delete migrated.startTimeTbd;
  }

  if ("homePostWinProb" in migrated) {
    migrated.homePostgameWinProbability = migrated.homePostWinProb;
    delete migrated.homePostWinProb;
  }

  if ("awayPostWinProb" in migrated) {
    migrated.awayPostgameWinProbability = migrated.awayPostWinProb;
    delete migrated.awayPostWinProb;
  }

  if (!("completed" in migrated)) {
    migrated.completed = (migrated.homeLineScores?.length ?? 0) >= 4;
  }

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

function migratePickSelection(selection: OldSelection, slateGames: OldGame[], slateId: string): OldSelection {
  const migrated: OldSelection = {...selection};

  delete migrated.price;

  if ("point" in migrated && !("pointValue" in migrated)) {
    migrated.pointValue = migrated.point;
  }

  if (!("id" in migrated)) {
    if (migrated.name === "PUSH") {
      migrated.id = 0;
    } else {
      const selName = stripAndReplaceSpace(migrated.name);
      for (const game of slateGames) {
        const homeName = stripAndReplaceSpace(`${game.homeTeamData?.school}${game.homeTeamData?.name}`);
        const awayName = stripAndReplaceSpace(`${game.awayTeamData?.school}${game.awayTeamData?.name}`);
        if (game.id === 401636877) {
          logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
        }
        // if (game.id === 401628371) {
        //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
        // }

        if (selName.includes(homeName) || homeName.includes(selName)) {
          if (game.id === 401636877) {
            logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
          }
          // if (game.id === 401628371) {
          //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
          // }
          migrated.id = 1;
          break;
        } else if (selName.includes(awayName) || awayName.includes(selName)) {
          if (game.id === 401636877) {
            logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
          }
          // if (game.id === 401628371) {
          //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
          // }
          migrated.id = 2;
          break;
        }
      }
      if (!("id" in migrated)) {
        logger.warn(`Could not derive selection.id for pick name="${migrated.name}"`, slateId);
      }
    }
  }

  return migrated;
}

// --- Migration Functions ---

async function migrateSlates(dryRun: boolean): Promise<{ cache: Map<string, OldGame[]>; count: number }> {
  const db = getFirestore();
  logger.log("=== Migrating Slates ===");

  const slatesSnap = await db.collection("slates").get();
  logger.log(`Found ${slatesSnap.size} slate documents`);

  const slateCache = new Map<string, OldGame[]>();
  let batch = db.batch();
  let batchCount = 0;
  let totalMigrated = 0;

  for (const slateDoc of slatesSnap.docs) {
    const data = slateDoc.data() as { games?: OldGame[];[key: string]: unknown };

    if (!data.games || !Array.isArray(data.games)) {
      logger.log(`Skipping ${slateDoc.id} - no games array`);
      continue;
    }

    const firstGame = data.games[0] as OldGame | undefined;
    if (firstGame && !("gameID" in firstGame) && !Array.isArray(firstGame.outcomes)) {
      logger.log(`Skipping ${slateDoc.id} - appears already migrated`);
      slateCache.set(slateDoc.id, data.games);
      continue;
    }

    const migratedGames = data.games.map((g) => migrateSlateGame(g));
    logger.log(`Migrating slate: ${slateDoc.id} (${migratedGames.length} games)`);

    if (dryRun) {
      logger.log(`[DRY RUN] Would update ${slateDoc.id}`);
    } else {
      batch.set(slateDoc.ref, {...data, games: migratedGames});
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        logger.log(`Committed batch of ${batchCount}`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    slateCache.set(slateDoc.id, migratedGames);
    totalMigrated++;
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
    logger.log(`Committed final batch of ${batchCount}`);
  }

  logger.log(`Slates migration complete: ${totalMigrated} documents ${dryRun ? "would be " : ""}updated`);
  return {cache: slateCache, count: totalMigrated};
}

async function migratePicks(slateCache: Map<string, OldGame[]>, dryRun: boolean): Promise<number> {
  const db = getFirestore();
  logger.log("=== Migrating Picks ===");

  const usersSnap = await db.collection("users").get();
  logger.log(`Found ${usersSnap.size} user documents`);

  let batch = db.batch();
  let batchCount = 0;
  let totalMigrated = 0;

  for (const userDoc of usersSnap.docs) {
    const picksSnap = await db.collection("users").doc(userDoc.id).collection("picks").get();

    if (picksSnap.empty) continue;

    logger.log(`User ${userDoc.id}: ${picksSnap.size} pick documents`);

    for (const pickDoc of picksSnap.docs) {
      const data = pickDoc.data() as OldPickDocument;

      if (!data.picks || !Array.isArray(data.picks)) continue;

      const slateId = data.slateId ?? pickDoc.id;
      const slateGames = slateCache.get(slateId) ?? [];
      const slateGameIds = new Set(slateGames.map((g) => g.id ?? g.gameID));

      let needsUpdate = false;

      // Drop picks whose matchup game is not in this slate
      const validPicks = data.picks.filter((pick) => {
        const matchup = pick.matchup as number | undefined;
        if (matchup === undefined || !slateGameIds.has(matchup)) {
          logger.warn(`Dropping pick matchup=${matchup} - game not found in slate ${slateId}`);
          needsUpdate = true;
          return false;
        }
        return true;
      });

      const migratedPicks = validPicks.map((pick) => {
        if (!pick.selection) return pick;

        if ("pointValue" in pick.selection && "id" in pick.selection && !("price" in pick.selection)) {
          return pick;
        }
        needsUpdate = true;
        return {
          ...pick,
          selection: migratePickSelection(pick.selection, slateGames, slateId),
        };
      });

      if (!needsUpdate) continue;

      logger.log(`Migrating picks: ${pickDoc.id}`);

      if (dryRun) {
        logger.log(`[DRY RUN] Would update picks for ${pickDoc.id}`);
      } else {
        batch.set(pickDoc.ref, {...data, picks: migratedPicks});
        batchCount++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          logger.log(`Committed batch of ${batchCount}`);
          batch = db.batch();
          batchCount = 0;
        }
      }

      totalMigrated++;
    }
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
    logger.log(`Committed final batch of ${batchCount}`);
  }

  logger.log(`Picks migration complete: ${totalMigrated} documents ${dryRun ? "would be " : ""}updated`);
  return totalMigrated;
}

// --- Exported handler ---

export default {
  migrateData: async (dryRun: boolean): Promise<MigrationResult> => {
    logger.log("Firestore Migration: Old Types → New CFBD-based Types");
    logger.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);

    const {cache: slateCache, count: slatesMigrated} = await migrateSlates(dryRun);
    const picksMigrated = await migratePicks(slateCache, dryRun);

    logger.log("=== Migration Complete ===");
    return {slatesMigrated, picksMigrated, dryRun};
  },
};
