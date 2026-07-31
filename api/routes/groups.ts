import express from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireGroupRole } from "../middlware";

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

export default groupsRouter;
