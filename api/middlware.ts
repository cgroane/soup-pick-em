import { NextFunction, Request, Response } from "express";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    (req).user = decodedToken;
    next();
    return;
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const requireCronSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-cron-secret'] as string;
  if (secret !== process.env.CLOUD_CRON_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
  return;
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.user.admin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
  return;
};