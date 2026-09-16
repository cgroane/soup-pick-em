import express from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireGroupRole } from "../middlware";
import { setSlate, SeasonPhase, slateIdFor } from "../slates/setSlate";
import { GamesAPIResult, GamesAPIResponseOutcome } from "model";
import { PickHistory } from "pages/Picks/PicksTable";
import { arePicksLocked } from "utils/pickLock";
import { publicBaseUrl } from "../mcp/auth";

const groupsRouter = express.Router();

// Every group route requires a signed-in user.
groupsRouter.use(requireAuth);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genInviteCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

async function buildMemberDoc(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  roles: string[]
) {
  const userSnap = await db.collection("users").doc(uid).get();
  const u = (userSnap.data() ?? {}) as { fName?: string; lName?: string; email?: string };
  return {
    uid,
    roles,
    record: [] as unknown[],
    trophyCase: [] as unknown[],
    fName: u.fName ?? "",
    lName: u.lName ?? "",
    email: u.email ?? "",
    joinedAt: new Date().toISOString(),
  };
}

/** Create a group. The caller becomes the owner. */
groupsRouter.post("/", async (req: express.Request, res: express.Response) => {
  const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
  const { name, visibility } = req.body as { name?: string; visibility?: string };
  if (!name?.trim()) {
    return res.status(400).json({ message: "Missing group name" });
  }
  const vis = visibility === "public" ? "public" : "private";
  const db = getFirestore();
  try {
    const groupRef = db.collection("groups").doc();
    const gid = groupRef.id;
    const group = {
      id: gid,
      name: name.trim(),
      visibility: vis,
      inviteCode: genInviteCode(),
      ownerUid: uid,
      createdAt: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(groupRef, group);
    batch.set(groupRef.collection("members").doc(uid), await buildMemberDoc(db, uid, ["member", "owner"]));
    batch.set(db.collection("users").doc(uid).collection("memberships").doc(gid), {
      gid,
      name: group.name,
      roles: ["member", "owner"],
      joinedAt: group.createdAt,
    });
    await batch.commit();
    return res.status(201).json(group);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Join a group — by invite code (private or public), or by id for a group that
 * is public (discovery). One of `inviteCode` / `gid` is required.
 */
groupsRouter.post("/join", async (req: express.Request, res: express.Response) => {
  const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
  const { inviteCode, gid: joinGid } = req.body as { inviteCode?: string; gid?: string };
  if (!inviteCode?.trim() && !joinGid) {
    return res.status(400).json({ message: "Provide an invite code or a public group id" });
  }
  const db = getFirestore();
  try {
    let groupDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot;
    if (inviteCode?.trim()) {
      const match = await db
        .collection("groups")
        .where("inviteCode", "==", inviteCode.trim().toUpperCase())
        .limit(1)
        .get();
      if (match.empty) {
        return res.status(404).json({ message: "No group found for that code" });
      }
      groupDoc = match.docs[0];
    } else {
      const snap = await db.collection("groups").doc(joinGid as string).get();
      if (!snap.exists) {
        return res.status(404).json({ message: "Group not found" });
      }
      if ((snap.data() as { visibility?: string }).visibility !== "public") {
        return res.status(403).json({ message: "This group is private — an invite code is required" });
      }
      groupDoc = snap;
    }
    const gid = groupDoc.id;
    const group = groupDoc.data() as { name: string };

    const memberRef = groupDoc.ref.collection("members").doc(uid);
    if ((await memberRef.get()).exists) {
      return res.status(200).json({ gid, name: group.name, alreadyMember: true });
    }

    const batch = db.batch();
    batch.set(memberRef, await buildMemberDoc(db, uid, ["member"]));
    batch.set(db.collection("users").doc(uid).collection("memberships").doc(gid), {
      gid,
      name: group.name,
      roles: ["member"],
      joinedAt: new Date().toISOString(),
    });
    await batch.commit();
    return res.status(200).json({ gid, name: group.name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/** List public groups for discovery. */
groupsRouter.get("/public", async (_req: express.Request, res: express.Response) => {
  const db = getFirestore();
  try {
    const snap = await db.collection("groups").where("visibility", "==", "public").get();
    const groups = snap.docs.map((d) => {
      const g = d.data() as { name: string; ownerUid: string };
      return { id: d.id, name: g.name, ownerUid: g.ownerUid };
    });
    return res.json(groups);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/** Update group settings (name / visibility). Owner only. */
groupsRouter.patch(
  "/:gid",
  requireGroupRole(["owner"]),
  async (req: express.Request, res: express.Response) => {
    const gid = req.params.gid;
    const { name, visibility } = req.body as { name?: string; visibility?: string };
    const updates: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (visibility === "public" || visibility === "private") updates.visibility = visibility;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const db = getFirestore();
    try {
      const groupRef = db.collection("groups").doc(gid);
      const batch = db.batch();
      batch.update(groupRef, updates);
      // Keep the denormalized name on every membership mirror in sync.
      if (updates.name) {
        const members = await groupRef.collection("members").get();
        members.docs.forEach((m) => {
          batch.update(db.collection("users").doc(m.id).collection("memberships").doc(gid), {
            name: updates.name,
          });
        });
      }
      await batch.commit();
      return res.json({ id: gid, ...updates });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * Assign the slate-picker role within a group. Only the group owner (or a
 * global admin) may call this. There is at most one slate-picker per group, so
 * the role is removed from any current holder and granted to the target. Roles
 * are an additive array, so this never touches a member's `owner`/`member`
 * roles — the owner may also hold slate-picker. Member docs are server-owned
 * (client writes are denied by the rules), so this runs with Admin privileges.
 */
groupsRouter.post(
  "/:gid/slate-picker",
  requireGroupRole(["owner"]),
  async (req: express.Request, res: express.Response) => {
    const gid = req.params.gid;
    const { uid } = req.body as { uid?: string };
    if (!uid) {
      return res.status(400).json({ message: "Missing uid" });
    }

    const db = getFirestore();
    try {
      const membersCol = db.collection("groups").doc(gid).collection("members");
      const membersSnap = await membersCol.get();
      const target = membersSnap.docs.find((m) => m.id === uid);
      if (!target) {
        return res.status(404).json({ message: "User is not a member of this group" });
      }

      const batch = db.batch();
      const membershipRef = (memberUid: string) =>
        db.collection("users").doc(memberUid).collection("memberships").doc(gid);

      // Strip slate-picker from any current holder other than the target.
      membersSnap.docs.forEach((m) => {
        if ((m.data().roles as string[] | undefined)?.includes("slate-picker") && m.id !== uid) {
          batch.update(m.ref, { roles: FieldValue.arrayRemove("slate-picker") });
          batch.update(membershipRef(m.id), { roles: FieldValue.arrayRemove("slate-picker") });
        }
      });

      // Grant slate-picker to the target (arrayUnion is a no-op if already set).
      batch.update(target.ref, { roles: FieldValue.arrayUnion("slate-picker") });
      batch.update(membershipRef(uid), { roles: FieldValue.arrayUnion("slate-picker") });

      await batch.commit();
      return res.json({ message: `slate-picker set to ${uid} for group ${gid}` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

groupsRouter.post(
  "/:gid/slates",
  requireGroupRole(["slate-picker"]),
  async (req: express.Request, res: express.Response) => {
    const uid = (req as express.Request & { user?: { uid: string } }).user!.uid;
    const { week, year, seasonType, gameIds } = req.body as {
      week?: number;
      year?: number;
      seasonType?: SeasonPhase;
      gameIds?: number[];
    };

    if (typeof week !== "number" || typeof year !== "number") {
      return res.status(400).json({ message: "week and year are required numbers" });
    }
    if (!Array.isArray(gameIds) || gameIds.some((id) => typeof id !== "number")) {
      return res.status(400).json({ message: "gameIds must be an array of numbers" });
    }

    try {
      const result = await setSlate({
        gid: req.params.gid,
        uid,
        baseUrl: publicBaseUrl(req),
        authorization: req.headers.authorization ?? "",
        week,
        year,
        seasonType: seasonType === "postseason" ? "postseason" : "regular",
        gameIds,
      });
      if (!result.ok) {
        return res.status(result.status).json({ code: result.code, message: result.message });
      }
      return res.status(200).json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

groupsRouter.post(
  "/:gid/picks",
  requireGroupRole(["member"]),
  async (req: express.Request, res: express.Response) => {
    const uid = (req as express.Request & { user?: { uid: string; admin?: boolean } }).user!.uid;
    const isAdmin = !!(req as express.Request & { user?: { admin?: boolean } }).user?.admin;
    const { week, year, seasonType, picks } = req.body as {
      week?: number;
      year?: number;
      seasonType?: SeasonPhase;
      picks?: Array<{ gameId?: number; selection?: string }>;
    };

    if (typeof week !== "number" || typeof year !== "number") {
      return res.status(400).json({ code: "bad_request", message: "week and year are required numbers" });
    }
    if (!Array.isArray(picks) || !picks.length) {
      return res.status(400).json({ code: "bad_request", message: "picks must be a non-empty array" });
    }

    const gid = req.params.gid;
    const slateId = slateIdFor(week, year, seasonType === "postseason" ? "postseason" : "regular");
    const db = getFirestore();

    try {
      const slateSnap = await db.collection("groups").doc(gid).collection("slates").doc(slateId).get();
      if (!slateSnap.exists) {
        return res.status(404).json({ code: "no_slate", message: `No slate ${slateId} for this group.` });
      }
      const slate = slateSnap.data() as { week?: number; games?: GamesAPIResult[] };
      const games = slate.games ?? [];

      if (arePicksLocked(games, isAdmin)) {
        return res.status(409).json({
          code: "picks_locked",
          message: `Picks for ${slateId} are locked — the first game has already kicked off.`,
        });
      }

      const byId = new Map(games.map((g) => [g.id, g]));
      const seen = new Set<number>();
      const resolved: Array<{ gameId: number; selection: GamesAPIResponseOutcome }> = [];

      for (const entry of picks) {
        const gameId = entry?.gameId;
        const choice = (entry?.selection ?? "").toLowerCase();
        if (typeof gameId !== "number" || !byId.has(gameId)) {
          return res.status(400).json({
            code: "unknown_game",
            message: `Game ${gameId} is not in slate ${slateId}.`,
          });
        }
        if (seen.has(gameId)) {
          return res.status(400).json({
            code: "duplicate_game",
            message: `Game ${gameId} was listed more than once.`,
          });
        }
        seen.add(gameId);

        const outcomes = byId.get(gameId)?.outcomes;
        if (choice === "push") {
          resolved.push({ gameId, selection: { name: "PUSH", point: "0", pointValue: 0, id: 0 } });
        } else if (choice === "home" && outcomes?.home) {
          resolved.push({ gameId, selection: outcomes.home });
        } else if (choice === "away" && outcomes?.away) {
          resolved.push({ gameId, selection: outcomes.away });
        } else {
          return res.status(400).json({
            code: "bad_selection",
            message: `selection for game ${gameId} must be "home", "away" or "push".`,
          });
        }
      }

      const pickRef = db
        .collection("groups").doc(gid)
        .collection("members").doc(uid)
        .collection("picks").doc(slateId);
      const existing = (await pickRef.get()).data() as PickHistory | undefined;
      const existingById = new Map((existing?.picks ?? []).map((pk) => [pk.matchup, pk]));
      const chosen = new Map(resolved.map((r) => [r.gameId, r.selection]));

      const userSnap = await db.collection("users").doc(uid).get();
      const u = (userSnap.data() ?? {}) as { fName?: string; lName?: string };

      const merged = games.map((game) => {
        const selection = chosen.get(game.id) ?? existingById.get(game.id)?.selection ?? null;
        return {
          matchup: game.id,
          userId: selection ? uid : existingById.get(game.id)?.userId ?? null,
          isCorrect: existingById.get(game.id)?.isCorrect ?? false,
          week: game.week ?? slate.week ?? week,
          selection,
        };
      });

      await pickRef.set({
        ...existing,
        name: `${u.fName ?? ""} ${u.lName ?? ""}`.trim(),
        slateId,
        week: slate.week ?? week,
        year,
        userId: uid,
        picks: merged,
      });

      const unpicked = merged.filter((pk) => !pk.selection).map((pk) => pk.matchup);
      return res.status(200).json({
        slateId,
        submitted: resolved.length,
        totalGames: games.length,
        complete: unpicked.length === 0,
        unpickedGameIds: unpicked,
        picks: merged.map((pk) => ({
          gameId: pk.matchup,
          selection: pk.selection ? (pk.selection as GamesAPIResponseOutcome).name : null,
          point: pk.selection ? (pk.selection as GamesAPIResponseOutcome).point : null,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

export default groupsRouter;
