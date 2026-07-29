"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const v1_1 = require("firebase-functions/v1");
const BATCH_SIZE = 400;
// --- Utilities ---
function stripAndReplaceSpace(str) {
    if (!str)
        return "";
    return str.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}
function migrateGameOutcomes(game) {
    var _a, _b, _c, _d, _e;
    const outcomes = game.outcomes;
    if (!outcomes || !Array.isArray(outcomes)) {
        return undefined;
    }
    const homeTeamName = stripAndReplaceSpace(`${(_a = game === null || game === void 0 ? void 0 : game.homeTeamData) === null || _a === void 0 ? void 0 : _a.school}${(_b = game.homeTeamData) === null || _b === void 0 ? void 0 : _b.name}`);
    const awayTeamName = stripAndReplaceSpace(`${(_c = game === null || game === void 0 ? void 0 : game.awayTeamData) === null || _c === void 0 ? void 0 : _c.school}${(_d = game.awayTeamData) === null || _d === void 0 ? void 0 : _d.name}`);
    let homeOutcome = null;
    let awayOutcome = null;
    for (const o of outcomes) {
        const oName = stripAndReplaceSpace(o.name);
        if (oName.includes(homeTeamName) || homeTeamName.includes(oName)) {
            homeOutcome = o;
        }
        else if (oName.includes(awayTeamName) || awayTeamName.includes(oName)) {
            awayOutcome = o;
        }
    }
    if (!homeOutcome || !awayOutcome) {
        v1_1.logger.warn(`Could not match outcomes by team name for game ${(_e = game.gameID) !== null && _e !== void 0 ? _e : game.id}: ${game.awayTeam} @ ${game.homeTeam}`);
        v1_1.logger.warn(`Outcome names: ${outcomes.map((o) => o.name).join(", ")}`);
        if (outcomes.length === 2) {
            awayOutcome = outcomes[0];
            homeOutcome = outcomes[1];
            v1_1.logger.warn(`Using positional fallback: away=${outcomes[0].name}, home=${outcomes[1].name}`);
        }
        else {
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
function migrateSlateGame(game) {
    var _a, _b;
    const migrated = Object.assign({}, game);
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
        migrated.completed = ((_b = (_a = migrated.homeLineScores) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) >= 4;
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
function migratePickSelection(selection, slateGames, slateId) {
    var _a, _b, _c, _d;
    const migrated = Object.assign({}, selection);
    delete migrated.price;
    if ("point" in migrated && !("pointValue" in migrated)) {
        migrated.pointValue = migrated.point;
    }
    if (!("id" in migrated)) {
        if (migrated.name === "PUSH") {
            migrated.id = 0;
        }
        else {
            const selName = stripAndReplaceSpace(migrated.name);
            for (const game of slateGames) {
                const homeName = stripAndReplaceSpace(`${(_a = game.homeTeamData) === null || _a === void 0 ? void 0 : _a.school}${(_b = game.homeTeamData) === null || _b === void 0 ? void 0 : _b.name}`);
                const awayName = stripAndReplaceSpace(`${(_c = game.awayTeamData) === null || _c === void 0 ? void 0 : _c.school}${(_d = game.awayTeamData) === null || _d === void 0 ? void 0 : _d.name}`);
                if (game.id === 401636877) {
                    v1_1.logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
                }
                // if (game.id === 401628371) {
                //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
                // }
                if (selName.includes(homeName) || homeName.includes(selName)) {
                    if (game.id === 401636877) {
                        v1_1.logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
                    }
                    // if (game.id === 401628371) {
                    //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
                    // }
                    migrated.id = 1;
                    break;
                }
                else if (selName.includes(awayName) || awayName.includes(selName)) {
                    if (game.id === 401636877) {
                        v1_1.logger.warn("asu ttu", `away:${awayName} vs home:${homeName} selected:${selName}`);
                    }
                    // if (game.id === 401628371) {
                    //   logger.warn('texas v colst', `away:${awayName} vs home:${homeName} selected:${selName}`)
                    // }
                    migrated.id = 2;
                    break;
                }
            }
            if (!("id" in migrated)) {
                v1_1.logger.warn(`Could not derive selection.id for pick name="${migrated.name}"`, slateId);
            }
        }
    }
    return migrated;
}
// --- Migration Functions ---
async function migrateSlates(dryRun) {
    const db = (0, firestore_1.getFirestore)();
    v1_1.logger.log("=== Migrating Slates ===");
    const slatesSnap = await db.collection("slates").get();
    v1_1.logger.log(`Found ${slatesSnap.size} slate documents`);
    const slateCache = new Map();
    let batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    for (const slateDoc of slatesSnap.docs) {
        const data = slateDoc.data();
        if (!data.games || !Array.isArray(data.games)) {
            v1_1.logger.log(`Skipping ${slateDoc.id} - no games array`);
            continue;
        }
        const firstGame = data.games[0];
        if (firstGame && !("gameID" in firstGame) && !Array.isArray(firstGame.outcomes)) {
            v1_1.logger.log(`Skipping ${slateDoc.id} - appears already migrated`);
            slateCache.set(slateDoc.id, data.games);
            continue;
        }
        const migratedGames = data.games.map((g) => migrateSlateGame(g));
        v1_1.logger.log(`Migrating slate: ${slateDoc.id} (${migratedGames.length} games)`);
        if (dryRun) {
            v1_1.logger.log(`[DRY RUN] Would update ${slateDoc.id}`);
        }
        else {
            batch.set(slateDoc.ref, Object.assign(Object.assign({}, data), { games: migratedGames }));
            batchCount++;
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                v1_1.logger.log(`Committed batch of ${batchCount}`);
                batch = db.batch();
                batchCount = 0;
            }
        }
        slateCache.set(slateDoc.id, migratedGames);
        totalMigrated++;
    }
    if (!dryRun && batchCount > 0) {
        await batch.commit();
        v1_1.logger.log(`Committed final batch of ${batchCount}`);
    }
    v1_1.logger.log(`Slates migration complete: ${totalMigrated} documents ${dryRun ? "would be " : ""}updated`);
    return { cache: slateCache, count: totalMigrated };
}
async function migratePicks(slateCache, dryRun) {
    var _a, _b;
    const db = (0, firestore_1.getFirestore)();
    v1_1.logger.log("=== Migrating Picks ===");
    const usersSnap = await db.collection("users").get();
    v1_1.logger.log(`Found ${usersSnap.size} user documents`);
    let batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    for (const userDoc of usersSnap.docs) {
        const picksSnap = await db.collection("users").doc(userDoc.id).collection("picks").get();
        if (picksSnap.empty)
            continue;
        v1_1.logger.log(`User ${userDoc.id}: ${picksSnap.size} pick documents`);
        for (const pickDoc of picksSnap.docs) {
            const data = pickDoc.data();
            if (!data.picks || !Array.isArray(data.picks))
                continue;
            const slateId = (_a = data.slateId) !== null && _a !== void 0 ? _a : pickDoc.id;
            const slateGames = (_b = slateCache.get(slateId)) !== null && _b !== void 0 ? _b : [];
            const slateGameIds = new Set(slateGames.map((g) => { var _a; return (_a = g.id) !== null && _a !== void 0 ? _a : g.gameID; }));
            let needsUpdate = false;
            // Drop picks whose matchup game is not in this slate
            const validPicks = data.picks.filter((pick) => {
                const matchup = pick.matchup;
                if (matchup === undefined || !slateGameIds.has(matchup)) {
                    v1_1.logger.warn(`Dropping pick matchup=${matchup} - game not found in slate ${slateId}`);
                    needsUpdate = true;
                    return false;
                }
                return true;
            });
            const migratedPicks = validPicks.map((pick) => {
                if (!pick.selection)
                    return pick;
                if ("pointValue" in pick.selection && "id" in pick.selection && !("price" in pick.selection)) {
                    return pick;
                }
                needsUpdate = true;
                return Object.assign(Object.assign({}, pick), { selection: migratePickSelection(pick.selection, slateGames, slateId) });
            });
            if (!needsUpdate)
                continue;
            v1_1.logger.log(`Migrating picks: ${pickDoc.id}`);
            if (dryRun) {
                v1_1.logger.log(`[DRY RUN] Would update picks for ${pickDoc.id}`);
            }
            else {
                batch.set(pickDoc.ref, Object.assign(Object.assign({}, data), { picks: migratedPicks }));
                batchCount++;
                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    v1_1.logger.log(`Committed batch of ${batchCount}`);
                    batch = db.batch();
                    batchCount = 0;
                }
            }
            totalMigrated++;
        }
    }
    if (!dryRun && batchCount > 0) {
        await batch.commit();
        v1_1.logger.log(`Committed final batch of ${batchCount}`);
    }
    v1_1.logger.log(`Picks migration complete: ${totalMigrated} documents ${dryRun ? "would be " : ""}updated`);
    return totalMigrated;
}
// --- Exported handler ---
exports.default = {
    migrateData: async (dryRun) => {
        v1_1.logger.log("Firestore Migration: Old Types → New CFBD-based Types");
        v1_1.logger.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
        const { cache: slateCache, count: slatesMigrated } = await migrateSlates(dryRun);
        const picksMigrated = await migratePicks(slateCache, dryRun);
        v1_1.logger.log("=== Migration Complete ===");
        return { slatesMigrated, picksMigrated, dryRun };
    },
};
//# sourceMappingURL=index.js.map