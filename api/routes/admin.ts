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
    const existing = (await fbApp.auth().getUser(userId))?.customClaims ?? {};
    await fbApp.auth().setCustomUserClaims(userId, { ...existing, [role]: true });
    res.json({ message: `Role ${role} set for user ${userId}` });
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
adminRouter.get('/view-roles', async (req: express.Request<{}, {}, { userId: string }>, res: express.Response) => {
  try {
    const { userId } = req.query;
    const user = await fbApp.auth().getUser(userId as string);
    res.json({ roles: user.customClaims });
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

adminRouter.post('/remove-role', async (req: express.Request, res: express.Response) => {
  try {
    const { userId, role } = req.body;
    const existing = (await fbApp.auth().getUser(userId))?.customClaims ?? {};
    delete existing[role];
    await fbApp.auth().setCustomUserClaims(userId, existing);
    res.json({ message: `Role ${role} removed for user ${userId}` });
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

adminRouter.post('/assign-slate-picker', async (req: express.Request, res: express.Response, _next: express.NextFunction) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }

    // Find the current slate picker and strip the claim
    const { users } = await fbApp.auth().listUsers();
    const currentPicker = users.find(u => u.customClaims?.['slatePicker'] === true);

    if (currentPicker && currentPicker.uid !== userId) {
      const currentClaims = { ...currentPicker.customClaims };
      delete currentClaims['slatePicker'];
      await fbApp.auth().setCustomUserClaims(currentPicker.uid, currentClaims);
    }

    // Assign slatePicker to the new user
    const newPickerClaims = (await fbApp.auth().getUser(userId))?.customClaims ?? {};
    await fbApp.auth().setCustomUserClaims(userId, { ...newPickerClaims, slatePicker: true });

    res.json({
      message: `Slate picker assigned to ${userId}`,
      previousPicker: currentPicker?.uid ?? null,
    });
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

adminRouter.post('/revoke-token', async (_req: express.Request, res: express.Response) => {
  try {
    const { userId } = _req.body;
    if (!userId) {
      res.status(400).json({ message: 'userId is required' });
      return;
    }
    fbApp.auth().revokeRefreshTokens(userId);
    res.status(200).json({ message: 'Tokens revoked' });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
    return;
  }
})

export default adminRouter;