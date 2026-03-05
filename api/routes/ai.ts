import express from "express";
import { requireAuth } from "../middlware";


const aiRouter = express.Router();
aiRouter.use(requireAuth);

aiRouter.post('/api/agentic-picks', async (_req: express.Request, _res: express.Response) => {

});

export default aiRouter;