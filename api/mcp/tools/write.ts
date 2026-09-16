import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const SLATE_SIZE = 10;

type GroupMembership = { gid: string; name: string; roles: string[] };

const jsonResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }],
});

const failed = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const resolveGroup = async (
  uid: string,
  gid?: string
): Promise<{ ok: true; gid: string; name: string } | { ok: false; message: string }> => {
  const snap = await getFirestore().collection("users").doc(uid).collection("memberships").get();
  const mine = snap.docs.map((d) => d.data() as GroupMembership);
  if (mine.length === 0) return { ok: false, message: "You are not a member of any group yet." };
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
  if (!match) return { ok: false, message: `You are not a member of group ${gid}.` };
  return { ok: true, gid: match.gid, name: match.name };
};

const idTokenFor = async (uid: string): Promise<string> => {
  const customToken = await getAuth().createCustomToken(uid);
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const base = emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com/v1`
    : "https://identitytoolkit.googleapis.com/v1";
  const apiKey = (JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG ?? "{}") as { apiKey?: string })
    .apiKey;

  const res = await fetch(`${base}/accounts:signInWithCustomToken?key=${apiKey ?? ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !body.idToken) {
    throw new Error(body.error?.message ?? `custom token exchange failed (${res.status})`);
  }
  return body.idToken;
};

export const registerWriteTools = (server: McpServer, uid: string, baseUrl?: string) => {
  server.registerTool(
    "set_slate",
    {
      title: "Set a group's slate",
      description:
        `Choose the ${SLATE_SIZE} games that make up a group's slate for one week. Only the group's slate-picker (or a global admin) may do this, and only before the week's first game kicks off. Game ids come from get_games_with_lines. Replaces the slate entirely, so pass the full set of ${SLATE_SIZE} games you want, not just the ones you are changing. Any member pick on a game you drop is discarded and they will have to pick again.`,
      inputSchema: z.object({
        gid: z.string().optional().describe("Group id. Optional when you belong to exactly one group."),
        week: z.number().int().describe("Week number."),
        year: z.number().int().describe("Season year."),
        seasonType: z.enum(["regular", "postseason"]).default("regular"),
        gameIds: z
          .array(z.number().int())
          .describe(`Exactly ${SLATE_SIZE} CFBD game ids, from get_games_with_lines.`),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args: {
      gid?: string;
      week: number;
      year: number;
      seasonType: "regular" | "postseason";
      gameIds: number[];
    }) => {
      if (!baseUrl) {
        return failed("Cannot reach the slate endpoint: set PUBLIC_BASE_URL on this server.");
      }
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);

      try {
        const idToken = await idTokenFor(uid);
        const res = await fetch(`${baseUrl}/api/groups/${group.gid}/slates`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            week: args.week,
            year: args.year,
            seasonType: args.seasonType,
            gameIds: args.gameIds,
          }),
        });
        const body = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          const message = (body.message as string) ?? `The slate endpoint returned ${res.status}.`;
          return failed(
            res.status === 403
              ? `${message} — setting a slate requires the slate-picker role in ${group.name}.`
              : message
          );
        }
        return jsonResult({ group: group.name, ...body });
      } catch (err) {
        return failed(`Failed to set the slate: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "submit_picks",
    {
      title: "Submit picks",
      description:
        "Submit or change your own picks for a group's slate — which side of the spread you take in each game. Any member can do this, for themselves only, until the slate's first game kicks off. Call get_slate first to see the games and their spreads. Picks merge into what you already have, so you can send a few at a time; the response reports which games are still unpicked. Because these are real entries in a standing competition, confirm the exact selections with the user before calling.",
      inputSchema: z.object({
        gid: z.string().optional().describe("Group id. Optional when you belong to exactly one group."),
        week: z.number().int().describe("Week number of the slate."),
        year: z.number().int().describe("Season year of the slate."),
        seasonType: z.enum(["regular", "postseason"]).default("regular"),
        picks: z
          .array(
            z.object({
              gameId: z.number().int().describe("A game id from the slate."),
              selection: z
                .enum(["home", "away", "push"])
                .describe("Which side covers: the home team, the away team, or an exact push."),
            })
          )
          .min(1)
          .describe("One entry per game you are picking. Spreads are taken from the stored slate, never from you."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args: {
      gid?: string;
      week: number;
      year: number;
      seasonType: "regular" | "postseason";
      picks: Array<{ gameId: number; selection: "home" | "away" | "push" }>;
    }) => {
      if (!baseUrl) {
        return failed("Cannot reach the picks endpoint: set PUBLIC_BASE_URL on this server.");
      }
      const group = await resolveGroup(uid, args.gid);
      if (!group.ok) return failed(group.message);

      try {
        const idToken = await idTokenFor(uid);
        const res = await fetch(`${baseUrl}/api/groups/${group.gid}/picks`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            week: args.week,
            year: args.year,
            seasonType: args.seasonType,
            picks: args.picks,
          }),
        });
        const body = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          const message = (body.message as string) ?? `The picks endpoint returned ${res.status}.`;
          return failed(
            res.status === 403
              ? `${message} — you must be a member of ${group.name} to pick.`
              : message
          );
        }
        return jsonResult({ group: group.name, ...body });
      } catch (err) {
        return failed(`Failed to submit picks: ${(err as Error).message}`);
      }
    }
  );
};
