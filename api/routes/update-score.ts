import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { getGames, SeasonType } from "cfbd";
import { SeasonDetails } from "api/schema/sportsDataIO";
import { CFPBracket, GamesAPIResult, GroupMember, Picks, Slate } from "model";
import { PickHistory } from "pages/Picks/PicksTable";
import { requireCronSecret } from "../middlware";
import axios from "axios";

const getSeasonData = async (): Promise<SeasonDetails> => {
  /**
   * MOCK
   * During the season, you will need to check and see if
   * returns NEXT SAT or prev SAT
   * I THINK prev
   */
  const url = `${process.env.REACT_APP_API_URL}/api/current-week`;
  const response = await axios.get(url);
  return response.data;
};

/**
 * Grade a single pick against a completed game.
 * Returns true/false when the game is complete and gradeable.
 * Returns null when the game is not yet complete or lacks spread data.
 */
const gradePick = (
  pick: Picks,
  freshGame: { homePoints?: number | null; awayPoints?: number | null; completed?: boolean },
  outcomes: GamesAPIResult["outcomes"]
): boolean | null => {
  if (!freshGame?.completed) return null;
  if (!pick.selection || !outcomes) return null;

  const homePoints = freshGame.homePoints ?? 0;
  const awayPoints = freshGame.awayPoints ?? 0;
  const { id, pointValue } = pick.selection;

  if (id === 0) {
    // PUSH: check if the favorite covers exactly
    const favIsHome = (outcomes.home?.pointValue ?? 0) < 0;
    const favScore = favIsHome ? homePoints : awayPoints;
    const underDogScore = favIsHome ? awayPoints : homePoints;
    const favSpread = favIsHome
      ? (outcomes.home?.pointValue ?? 0)
      : (outcomes.away?.pointValue ?? 0);
    return favScore + favSpread === underDogScore;
  }

  // id === 1 → picked home team, id === 2 → picked away team
  const pickedScore = id === 1 ? homePoints : awayPoints;
  const otherScore = id === 1 ? awayPoints : homePoints;
  return pickedScore + (pointValue ?? 0) > otherScore;
};

const updateScoresRouter = express.Router();

updateScoresRouter.post("/update-scores", requireCronSecret, async (_req: express.Request, res: express.Response) => {
  const db = getFirestore();
  try {
    if (!process.env.REACT_APP_SEASON_KEY || !process.env.REACT_APP_MATCHUPS_API_KEY) {
      throw new Error("Missing required API keys");
    }

    let seasonInfo = await getSeasonData();

    if (process.env.REACT_APP_SEASON_KEY === "offseason") {
      seasonInfo = {
        ApiWeek: 5,
        Season: 2024,
        EndYear: 2025,
        StartYear: 2024,
        ApiSeason: "2024",
        Description: seasonInfo.Description,
        isOffseason: true,
      };
    }

    const isCFP =
      process.env.REACT_APP_SEASON_KEY === "postseason" ||
      seasonInfo.ApiSeason.includes("POST");

    if (isCFP) {
      await processCFP(db, seasonInfo.Season);
    } else {
      await processRegularSeason(db, seasonInfo);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Grade every member of one group for a single slate/bracket doc and stage the
 * writes (member records + graded pick docs) into `batch`. `refGames` supplies
 * the spread/outcomes (from the group's slate or the bracket); `freshGames`
 * supplies the latest scores from CFBD.
 */
async function gradeGroupMembers(
  db: ReturnType<typeof getFirestore>,
  gid: string,
  docId: string,
  year: number,
  refGames: GamesAPIResult[],
  freshGames: Awaited<ReturnType<typeof getGames>>["data"],
  batch: ReturnType<ReturnType<typeof getFirestore>["batch"]>
): Promise<void> {
  const membersCol = db.collection("groups").doc(gid).collection("members");
  const membersSnap = await membersCol.get();

  await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const member = memberDoc.data() as GroupMember;
      const pickDocRef = membersCol.doc(memberDoc.id).collection("picks").doc(docId);
      const pickData = (await pickDocRef.get()).data() as PickHistory | undefined;
      if (!pickData) return;

      /**
       * Track previously stored counts so re-running this job does not
       * double-count wins/losses — we only apply the delta.
       */
      const prevCorrect = pickData.correctCount ?? 0;
      const prevIncorrect = pickData.incorrectCount ?? 0;

      let newCorrect = 0;
      let newIncorrect = 0;

      const updatedPicks = pickData.picks.map((pick) => {
        const refGame = refGames.find((gm) => gm.id === pick.matchup);
        const freshGame = (freshGames ?? []).find((gm) => gm.id === pick.matchup);
        if (!freshGame) return pick;

        const result = gradePick(pick, freshGame, refGame?.outcomes);
        if (result === null) return pick; // game not yet complete

        if (result) newCorrect++;
        else newIncorrect++;
        return { ...pick, isCorrect: result };
      });

      const deltaCorrect = newCorrect - prevCorrect;
      const deltaIncorrect = newIncorrect - prevIncorrect;

      if (deltaCorrect !== 0 || deltaIncorrect !== 0) {
        const record = [...(member.record ?? [])];
        const idx = record.findIndex((r) => r.year === year);
        if (idx >= 0) {
          record[idx] = {
            wins: (record[idx].wins ?? 0) + deltaCorrect,
            losses: (record[idx].losses ?? 0) + deltaIncorrect,
            year,
          };
        } else {
          record.push({
            wins: Math.max(0, deltaCorrect),
            losses: Math.max(0, deltaIncorrect),
            year,
          });
        }
        batch.set(memberDoc.ref, { ...member, record });
      }

      batch.set(pickDocRef, {
        ...pickData,
        picks: updatedPicks,
        correctCount: newCorrect,
        incorrectCount: newIncorrect,
        processed: true,
        processedAt: new Date().toISOString(),
      });
    })
  );
}

async function processRegularSeason(
  db: ReturnType<typeof getFirestore>,
  seasonInfo: SeasonDetails
): Promise<void> {
  const week = seasonInfo.ApiWeek - 1;
  const year = seasonInfo.Season;
  const slateId = `w${week}-${year}`;

  // Real-world results are the same for every group — fetch once, reuse per group.
  const freshGamesResp = await getGames({
    query: { week, year, division: "fbs" },
  });
  const freshGames = freshGamesResp?.data ?? [];

  const groupsSnap = await db.collection("groups").get();

  // One batch per group keeps each commit under the 500-write limit and isolates
  // a bad group from the rest.
  for (const groupDoc of groupsSnap.docs) {
    const gid = groupDoc.id;
    const slateRef = db.collection("groups").doc(gid).collection("slates").doc(slateId);
    const slateData = (await slateRef.get()).data() as Slate | undefined;
    if (!slateData) continue; // this group has no slate for this week

    const batch = db.batch();

    // Update the group's slate with the latest scores.
    batch.set(slateRef, {
      ...slateData,
      games: slateData.games.map((sgm) => {
        const fresh = freshGames.find((g) => g.id === sgm.id);
        return {
          ...sgm,
          homePoints: fresh?.homePoints ?? sgm.homePoints ?? 0,
          awayPoints: fresh?.awayPoints ?? sgm.awayPoints ?? 0,
          completed: fresh?.completed ?? sgm.completed ?? false,
        };
      }),
    });

    await gradeGroupMembers(db, gid, slateId, year, slateData.games, freshGames, batch);
    await batch.commit();
  }
}

async function processCFP(
  db: ReturnType<typeof getFirestore>,
  year: number
): Promise<void> {
  const bracketId = `cfp-${year}`;
  const bracketRef = db.collection("cfpBracket").doc(bracketId);
  const bracketSnap = await bracketRef.get();
  const bracketData = bracketSnap.data() as CFPBracket | undefined;

  if (!bracketData) throw new Error(`CFP bracket not found for year ${year}`);

  const bracketGameIds = new Set<number>(bracketData.games.map((gm) => gm.id));

  const freshGamesResp = await getGames({
    query: { year, seasonType: "postseason" as SeasonType },
  });
  const cfpFreshGames = (freshGamesResp?.data ?? []).filter(
    (gm) =>
      bracketGameIds.has(gm.id) &&
      (gm.notes as string)?.includes("College Football Playoff")
  );

  // The CFP bracket itself stays global (one real playoff); only picks/records
  // are per-group. Update the bracket scores once.
  await bracketRef.set({
    ...bracketData,
    updatedAt: new Date().toISOString(),
    games: bracketData.games.map((bgm) => {
      const fresh = cfpFreshGames.find((g) => g.id === bgm.id);
      return {
        ...bgm,
        homePoints: fresh?.homePoints ?? bgm.homePoints ?? 0,
        awayPoints: fresh?.awayPoints ?? bgm.awayPoints ?? 0,
        completed: fresh?.completed ?? (bgm).completed ?? false,
      };
    }),
  });

  // Grade every group's members against the shared bracket.
  const groupsSnap = await db.collection("groups").get();
  for (const groupDoc of groupsSnap.docs) {
    const batch = db.batch();
    await gradeGroupMembers(db, groupDoc.id, bracketId, year, bracketData.games, cfpFreshGames, batch);
    await batch.commit();
  }
}

export default updateScoresRouter;
