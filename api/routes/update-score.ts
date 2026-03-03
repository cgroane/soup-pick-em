import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { client, getGames, SeasonType } from "cfbd";
import { SeasonDetails } from "@/api/schema/sportsDataIO";
import { CFPBracket, GamesAPIResult, Picks, Slate, UserCollectionData } from "@/model";
import { PickHistory } from "@/pages/Picks/PicksTable";
import { requireCronSecret } from "api/middlware";

const apiUrl = "https://api.sportsdata.io/v3/cfb/";

client.setConfig({
  headers: {
    "Authorization": `Bearer ${process.env.REACT_APP_CFBD_API_KEY}`,
  },
});

const getSeasonData = async (): Promise<SeasonDetails> => {
  /**
   * MOCK
   * During the season, you will need to check and see if
   * returns NEXT SAT or prev SAT
   * I THINK prev
   */
  const search = new URLSearchParams({
    key: process.env.REACT_APP_MATCHUPS_API_KEY as string,
  });
  const url = `${apiUrl}scores/json/CurrentSeasonDetails?${search}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.REACT_APP_MATCHUPS_API_KEY as string,
    },
  });
  return response.json();
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

async function processRegularSeason(
  db: ReturnType<typeof getFirestore>,
  seasonInfo: SeasonDetails
): Promise<void> {
  const week = seasonInfo.ApiWeek - 1;
  const year = seasonInfo.Season;
  const slateId = `w${week}-${year}`;

  const slateRef = db.collection("slates").doc(slateId);
  const slateData = (await slateRef.get()).data() as Slate;
  if (!slateData) throw new Error(`Slate not found: ${slateId}`);

  const slateGameIds = new Set<number>(slateData.games.map((gm) => gm.id));

  const freshGamesResp = await getGames({
    query: { week, year, division: "fbs" },
  });
  const freshGames = (freshGamesResp?.data ?? []).filter((gm) =>
    slateGameIds.has(gm.id)
  );

  const batch = db.batch();

  // Update slate with latest scores
  batch.set(slateRef, {
    ...slateData,
    games: slateData.games.map((sgm) => {
      const fresh = freshGames.find((g) => g.id === sgm.id);
      return {
        ...sgm,
        homePoints: fresh?.homePoints ?? sgm.homePoints ?? 0,
        awayPoints: fresh?.awayPoints ?? sgm.awayPoints ?? 0,
        completed: fresh?.completed ?? (sgm).completed ?? false,
      };
    }),
  });

  const usersSnap = await db.collection("users").get();

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data() as UserCollectionData;
      const pickDocRef = db
        .collection("users")
        .doc(userDoc.id)
        .collection("picks")
        .doc(slateId);
      const pickDocSnap = await pickDocRef.get();
      const pickData = pickDocSnap.data() as PickHistory | undefined;

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
        const slateGame = slateData.games.find(
          (gm) => gm.id === pick.matchup
        ) as GamesAPIResult;
        const freshGame = freshGames.find((gm) => gm.id === pick.matchup);
        if (!freshGame) return pick;

        const result = gradePick(pick, freshGame, slateGame?.outcomes);
        if (result === null) return pick; // game not yet complete

        if (result) newCorrect++;
        else newIncorrect++;
        return { ...pick, isCorrect: result };
      });

      const deltaCorrect = newCorrect - prevCorrect;
      const deltaIncorrect = newIncorrect - prevIncorrect;

      if (deltaCorrect !== 0 || deltaIncorrect !== 0) {
        const thisSeasonIdx =
          userData.record?.findIndex((r) => r.year === year) ?? -1;
        if (thisSeasonIdx >= 0) {
          userData.record[thisSeasonIdx] = {
            wins: (userData.record[thisSeasonIdx].wins ?? 0) + deltaCorrect,
            losses: (userData.record[thisSeasonIdx].losses ?? 0) + deltaIncorrect,
            year,
          };
        } else {
          userData.record.push({
            wins: Math.max(0, deltaCorrect),
            losses: Math.max(0, deltaIncorrect),
            year,
          });
        }
        batch.set(db.collection("users").doc(userData.id), {
          ...userData,
          record: [...userData.record],
        });
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

  await batch.commit();
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

  const batch = db.batch();

  // Update bracket document with latest scores
  batch.set(bracketRef, {
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

  const usersSnap = await db.collection("users").get();

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data() as UserCollectionData;
      const pickDocRef = db
        .collection("users")
        .doc(userDoc.id)
        .collection("picks")
        .doc(bracketId);
      const pickDocSnap = await pickDocRef.get();
      const pickData = pickDocSnap.data() as PickHistory | undefined;

      if (!pickData) return;

      /**
       * CFP games complete across multiple rounds over several weeks.
       * Delta tracking ensures each round's results are counted exactly once,
       * even if the job is re-run before all rounds are finished.
       */
      const prevCorrect = pickData.correctCount ?? 0;
      const prevIncorrect = pickData.incorrectCount ?? 0;

      let newCorrect = 0;
      let newIncorrect = 0;

      const updatedPicks = pickData.picks.map((pick) => {
        const bracketGame = bracketData.games.find(
          (gm) => gm.id === pick.matchup
        ) as GamesAPIResult;
        const freshGame = cfpFreshGames.find((gm) => gm.id === pick.matchup);
        if (!freshGame) return pick;

        const result = gradePick(pick, freshGame, bracketGame?.outcomes);
        if (result === null) return pick; // game not yet complete

        if (result) newCorrect++;
        else newIncorrect++;
        return { ...pick, isCorrect: result };
      });

      const deltaCorrect = newCorrect - prevCorrect;
      const deltaIncorrect = newIncorrect - prevIncorrect;

      if (deltaCorrect !== 0 || deltaIncorrect !== 0) {
        const thisSeasonIdx =
          userData.record?.findIndex((r) => r.year === year) ?? -1;
        if (thisSeasonIdx >= 0) {
          userData.record[thisSeasonIdx] = {
            wins: (userData.record[thisSeasonIdx].wins ?? 0) + deltaCorrect,
            losses: (userData.record[thisSeasonIdx].losses ?? 0) + deltaIncorrect,
            year,
          };
        } else {
          userData.record.push({
            wins: Math.max(0, deltaCorrect),
            losses: Math.max(0, deltaIncorrect),
            year,
          });
        }
        batch.set(db.collection("users").doc(userData.id), {
          ...userData,
          record: [...userData.record],
        });
      }

      batch.set(pickDocRef, {
        ...pickData,
        picks: updatedPicks,
        correctCount: newCorrect,
        incorrectCount: newIncorrect,
        processedAt: new Date().toISOString(),
      });
    })
  );

  await batch.commit();
}

export default updateScoresRouter;
