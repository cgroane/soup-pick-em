import express from "express";
import { requireAuth } from "../middlware";
import { fbApp } from "..";
import { GamesAPIResponseOutcome, Slate } from "model";
import { generatePicks } from "../agent/auto-pick";
import { PickHistory } from "pages/Picks/PicksTable";


const aiRouter = express.Router();
aiRouter.use(requireAuth);

aiRouter.post('/agentic-picks', async (req: express.Request<{}, {}, { slateId: string; userId: string; userName: string }>, res: express.Response) => {
  try {
    const { slateId, userId, userName } = req.body;
    const slate = await fbApp.firestore().collection("slates").doc(slateId).get()
    const slateData = slate.data() as Slate | undefined;

    const aiPicks = await generatePicks(slateData as Slate);

    const pickDocData: PickHistory = {
      slateId,
      userId,
      week: slateData?.week as number,
      name: userName,
      year: parseInt(slateData?.uniqueWeek.split("-")[1] as string) as number,
      picks: aiPicks.map((p) => ({
        matchup: p.gameId,
        isCorrect: false,
        selection: { ...slateData?.games.find((g) => g.id === p.gameId)?.outcomes?.[p.pick === "home" ? "home" : "away"] as GamesAPIResponseOutcome },
        userId,
        week: slateData?.week as number,
      }))
    };
    const fbRes = await fbApp.firestore().collection("users").doc(userId).collection("picks").doc(slateId).set(pickDocData);

    if (!fbRes) {
      res.status(500).json({ error: "Failed to save picks" });
      throw new Error("Failed to save picks");
    }
    if (!slate) {
      res.status(404).json({ error: "Slate not found" });
      throw new Error("Slate not found");
    }
    res.status(200).json({ message: "Picks generated and saved successfully", picks: aiPicks });
  } catch (err) {
    console.error("Error generating picks:", err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Error generating picks" });
  }
});

aiRouter.post('/api/insights', async (_req: express.Request, res: express.Response) => {
  res.status(501).json({ error: "Not implemented" });
});

export default aiRouter;