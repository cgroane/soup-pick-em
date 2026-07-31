import { NextFunction, Request, Response } from "express";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
export const reqUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
  return;
}

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

/**
 * Authorize by the caller's role WITHIN a group. Reads groups/{gid}/members/{uid}
 * and allows the request when that member holds any role in `roles`. A global
 * admin (custom claim) always passes. `gid` comes from the route param `:gid`.
 */
export const requireGroupRole =
  (roles: string[]) =>
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const uid = req.user?.uid;
      const gid = req.params.gid;
      if (!uid) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (req.user?.admin) {
        next();
        return;
      }
      if (!gid) {
        return res.status(400).json({ message: "Missing group id" });
      }
      try {
        const memberSnap = await getFirestore()
          .collection("groups")
          .doc(gid)
          .collection("members")
          .doc(uid)
          .get();
        const memberRoles = memberSnap.exists
          ? ((memberSnap.data() as { roles?: string[] }).roles ?? [])
          : [];
        if (memberRoles.some((r) => roles.includes(r))) {
          next();
          return;
        }
        return res.status(403).json({ message: "Forbidden" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    };