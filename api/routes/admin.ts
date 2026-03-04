import express from "express";
import { fbApp } from "..";
import { requireAdmin, requireAuth } from "../middlware";

const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);


adminRouter.get('/impersonate', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.query.userId as string;
    const customToken = await fbApp.auth().createCustomToken(userId);
    res.json({ customToken });
  }
  catch (err) {
    res.status(500).send('Server error');
  }
});

adminRouter.post('/set-role', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, role } = req.body;
    await fbApp.auth().setCustomUserClaims(userId, { [role]: true });
    res.json({ message: `Role ${role} set for user ${userId}` });
  }
  catch (err) {
    res.status(500).send('Server error');
  }
});

export default adminRouter;