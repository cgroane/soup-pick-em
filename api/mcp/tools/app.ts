import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import { getFirestore } from "firebase-admin/firestore";

type GroupMembership = { gid: string; name: string; roles: string[] };
type GroupMember = {
  uid: string;
  roles: string[];
  record: Array<{ wins: number; losses: number; year: number }>;
  fName: string;
  lName: string;
  email: string;
};

const jsonResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }],
});

const failed = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const uniqueWeekId = (week: number, year: number, seasonType: string) =>
  seasonType === "postseason" ? `w${week}-${year}POST` : `w${week}-${year}`;

const memberships = async (uid: string): Promise<GroupMembership[]> => {
  const snap = await getFirestore().collection("users").doc(uid).collection("memberships").get();
  return snap.docs.map((d) => d.data() as GroupMembership);
};

const resolveGroup = async (
  uid: string,
  gid?: string
): Promise<{ ok: true; gid: string; name: string } | { ok: false; message: string }> => {
  const mine = await memberships(uid);
  if (mine.length === 0) {
    return { ok: false, message: "You are not a member of any group yet." };
  }
  if (!gid) {
    if (mine.length === 1) return { ok: true, gid: mine[0].gid, name: mine[0].name };
    return {
      ok: false,
      message:
        "You belong to multiple groups — pass `gid`. Your groups: " +
        mine.map((m) => `${m.name} (${m.gid})`).join(", "),
    };
  }
  const match = mine.find((m) => m.gid === gid);
  if (!match) {
    return { ok: false, message: `You are not a member of group ${gid}.` };
  }
  return { ok: true, gid: match.gid, name: match.name };
};

const gidArg = z
  .string()
  .optional()
  .describe("Group id. Optional when you belong to exactly one group.");


export const registerAppTools = (server: McpServer, uid: string) => {
  server.registerTool(
    "list_my_groups",
    {
      title: "List my groups",
      description:
        "The pick'em groups you belong to, with your roles in each. Call this first to get a `gid` for the other group-scoped tools.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return jsonResult(await memberships(uid));
      } catch (err) {
        return failed(`Failed to list groups: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_slate",
    {
      title: "Get a group's slate",
      description:
        "The 10 games chosen for a given week in a group, with each game's point spread. This is what members pick against.",
      inputSchema: z.object({
        gid: gidArg,
        week: z.number().int().describe("Week number."),
        year: z.number().int().describe("Season year."),
        seasonType: z.enum(["regular", "postseason"]).default("regular"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args: { gid?: string; week: number; year: number; seasonType: string }) => {
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);
      const slateId = uniqueWeekId(args.week, args.year, args.seasonType);
      try {
        const snap = await getFirestore()
          .collection("groups")
          .doc(group.gid)
          .collection("slates")
          .doc(slateId)
          .get();
        if (!snap.exists) {
          return failed(`No slate ${slateId} exists for ${group.name}.`);
        }
        return jsonResult({ gid: group.gid, group: group.name, slateId, ...snap.data() });
      } catch (err) {
        return failed(`Failed to fetch slate: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_group_leaderboard",
    {
      title: "Group leaderboard",
      description:
        "Every member of a group with their win/loss record for a season, sorted by win percentage.",
      inputSchema: z.object({
        gid: gidArg,
        year: z.number().int().optional().describe("Season year. Defaults to all seasons on record."),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args: { gid?: string; year?: number }) => {
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);
      try {
        const snap = await getFirestore()
          .collection("groups")
          .doc(group.gid)
          .collection("members")
          .get();
        const rows = snap.docs
          .map((d) => d.data() as GroupMember)
          .map((m) => {
            const records = args.year
              ? (m.record ?? []).filter((r) => r.year === args.year)
              : (m.record ?? []);
            const wins = records.reduce((a, r) => a + (r.wins ?? 0), 0);
            const losses = records.reduce((a, r) => a + (r.losses ?? 0), 0);
            const played = wins + losses;
            return {
              uid: m.uid,
              name: `${m.fName ?? ""} ${m.lName ?? ""}`.trim(),
              roles: m.roles,
              wins,
              losses,
              pct: played ? Number((wins / played).toFixed(3)) : 0,
            };
          })
          .sort((a, b) => b.pct - a.pct || b.wins - a.wins);
        return jsonResult({ gid: group.gid, group: group.name, year: args.year, leaderboard: rows });
      } catch (err) {
        return failed(`Failed to fetch leaderboard: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_my_picks",
    {
      title: "My picks",
      description:
        "Your submitted picks in a group. Omit `week`/`year` for your full pick history, or pass both for one slate. Once graded, each pick carries whether it was correct.",
      inputSchema: z.object({
        gid: gidArg,
        week: z.number().int().optional().describe("Week number. Requires `year`."),
        year: z.number().int().optional().describe("Season year. Requires `week`."),
        seasonType: z.enum(["regular", "postseason"]).default("regular"),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args: { gid?: string; week?: number; year?: number; seasonType: string }) => {
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);
      const picksCol = getFirestore()
        .collection("groups")
        .doc(group.gid)
        .collection("members")
        .doc(uid)
        .collection("picks");
      try {
        if (args.week !== undefined && args.year !== undefined) {
          const slateId = uniqueWeekId(args.week, args.year, args.seasonType);
          const snap = await picksCol.doc(slateId).get();
          if (!snap.exists) return failed(`You have no picks for ${slateId} in ${group.name}.`);
          return jsonResult(snap.data());
        }
        const snap = await picksCol.get();
        return jsonResult(snap.docs.map((d) => d.data()));
      } catch (err) {
        return failed(`Failed to fetch picks: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_my_record",
    {
      title: "My record",
      description: "Your win/loss record by season within a group.",
      inputSchema: z.object({ gid: gidArg }),
      annotations: { readOnlyHint: true },
    },
    async (args: { gid?: string }) => {
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);
      try {
        const snap = await getFirestore()
          .collection("groups")
          .doc(group.gid)
          .collection("members")
          .doc(uid)
          .get();
        if (!snap.exists) return failed(`No member record for you in ${group.name}.`);
        const member = snap.data() as GroupMember;
        return jsonResult({
          gid: group.gid,
          group: group.name,
          roles: member.roles,
          record: member.record ?? [],
        });
      } catch (err) {
        return failed(`Failed to fetch record: ${(err as Error).message}`);
      }
    }
  );
};
