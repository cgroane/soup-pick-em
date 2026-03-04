import express from "express";
import { getLines, SeasonType } from "cfbd";
import { requireAuth } from "../middlware";

const oddsRouter = express.Router();
oddsRouter.use(requireAuth);

oddsRouter.get('/odds', async (req: express.Request<{}, {}, {}, {
  week?: string;
  year?: string;
  seasonType?: SeasonType;
}>, res: express.Response) => {
  try {
    const odds = await getLines({
      query: {
        week: req.query.week ? parseInt(req.query.week) : undefined,
        year: req.query.year ? parseInt(req.query.year) : undefined,
        seasonType: req.query.seasonType as SeasonType | undefined,
      }
    });
    res.status(200).json(odds.data);
    return;
  } catch (err) {
    res.status(500).send(err)
  }
});
export default oddsRouter;