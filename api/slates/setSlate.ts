import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { GamesAPIResult, Picks } from "model";
import { PickHistory } from "pages/Picks/PicksTable";
import { arePicksLocked } from "utils/pickLock";
import { normalizeGame } from "utils/normalizeGame";

export const SLATE_SIZE = 10;

export type SeasonPhase = "regular" | "postseason";

export type SetSlateArgs = {
  gid: string;
  uid: string;
  week: number;
  year: number;
  seasonType: SeasonPhase;
  gameIds: number[];
  baseUrl: string;
  authorization: string;
};

export type SetSlateResult =
  | {
    ok: true;
    slateId: string;
    games: Array<{ id: number; homeTeam: string; awayTeam: string; spread?: number; startDate: string }>;
    added: number[];
    removed: number[];
    membersWithCancelledPicks: number;
  }
  | { ok: false; status: number; code: string; message: string };

export const slateIdFor = (week: number, year: number, seasonType: SeasonPhase) =>
  seasonType === "postseason" ? `w${week}-${year}POST` : `w${week}-${year}`;

export const isGlobalAdmin = async (uid: string): Promise<boolean> => {
  try {
    const user = await getAuth().getUser(uid);
    return (user.customClaims as { admin?: boolean } | undefined)?.admin === true;
  } catch {
    return false;
  }
};

export const isSlatePickerForGroup = async (gid: string, uid: string): Promise<boolean> => {
  const snap = await getFirestore()
    .collection("groups")
    .doc(gid)
    .collection("members")
    .doc(uid)
    .get();
  if (!snap.exists) return false;
  return ((snap.data() as { roles?: string[] }).roles ?? []).includes("slate-picker");
};

const fail = (status: number, code: string, message: string): SetSlateResult => ({
  ok: false,
  status,
  code,
  message,
});

export const setSlate = async (args: SetSlateArgs): Promise<SetSlateResult> => {
  const { gid, uid, week, year, seasonType, gameIds, baseUrl, authorization } = args;
  const db = getFirestore();

  const groupSnap = await db.collection("groups").doc(gid).get();
  if (!groupSnap.exists) {
    return fail(404, "group_not_found", `No group ${gid}.`);
  }

  const admin = await isGlobalAdmin(uid);
  if (!admin && !(await isSlatePickerForGroup(gid, uid))) {
    return fail(
      403,
      "not_slate_picker",
      `You are not the slate-picker for ${groupSnap.get("name") ?? gid}.`
    );
  }

  const unique = Array.from(new Set(gameIds));
  if (unique.length !== gameIds.length) {
    return fail(400, "duplicate_games", "The same game was listed more than once.");
  }
  if (unique.length !== SLATE_SIZE) {
    return fail(
      400,
      "wrong_game_count",
      `A slate needs exactly ${SLATE_SIZE} games; received ${unique.length}.`
    );
  }

  const matchupsUrl =
    `${baseUrl}/api/game-data/matchups?year=${year}&week=${week}&seasonType=${seasonType}`;
  const matchupsRes = await fetch(matchupsUrl, { headers: { Authorization: authorization } });
  if (!matchupsRes.ok) {
    return fail(
      502,
      "matchups_unavailable",
      `Could not load week ${week} of ${year} (${seasonType}): the matchups endpoint returned ${matchupsRes.status}.`
    );
  }
  const weekGames = (await matchupsRes.json()) as GamesAPIResult[];
  if (!Array.isArray(weekGames) || !weekGames.length) {
    return fail(404, "no_games", `No games found for week ${week} of ${year} (${seasonType}).`);
  }

  const byId = new Map(weekGames.map((g) => [g.id, g]));
  const missing = unique.filter((id) => !byId.has(id));
  if (missing.length) {
    return fail(
      400,
      "unknown_games",
      `These game ids are not in week ${week} of ${year} (${seasonType}), or have no point spread: ${missing.join(", ")}.`
    );
  }

  if (arePicksLocked(weekGames, admin)) {
    return fail(
      409,
      "slate_locked",
      `Week ${week} is locked — its first game has already kicked off.`
    );
  }

  const slateId = seasonType === "postseason" ? `w${week}-${year}POST` : `w${week}-${year}`;
  const slateRef = db.collection("groups").doc(gid).collection("slates").doc(slateId);
  const existing = (await slateRef.get()).data() as { games?: GamesAPIResult[] } | undefined;

  const previousIds = new Set((existing?.games ?? []).map((g) => g.id));
  const nextIds = new Set(unique);
  const added = unique.filter((id) => !previousIds.has(id));
  const removed = [...previousIds].filter((id) => !nextIds.has(id));

  const games = unique.map((id) => normalizeGame(byId.get(id) as GamesAPIResult)) as GamesAPIResult[];

  const picker = await db.collection("users").doc(uid).get();
  const p = (picker.data() ?? {}) as { fName?: string; lName?: string; email?: string };

  const batch = db.batch();
  batch.set(slateRef, {
    week,
    uniqueWeek: slateId,
    processed: false,
    providedBy: {
      uid,
      fName: p.fName ?? "",
      lName: p.lName ?? "",
      email: p.email ?? "",
    },
    games,
  });

  const membersSnap = await db.collection("groups").doc(gid).collection("members").get();
  let membersWithCancelledPicks = 0;

  await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const pickRef = memberDoc.ref.collection("picks").doc(slateId);
      const pickData = (await pickRef.get()).data() as PickHistory | undefined;
      if (!pickData) return;

      const kept = (pickData.picks ?? []).filter((pick) => nextIds.has(pick.matchup));
      if (kept.length !== (pickData.picks ?? []).length) membersWithCancelledPicks++;

      const keptIds = new Set(kept.map((pick) => pick.matchup));
      const placeholders = games
        .filter((g) => !keptIds.has(g.id))
        .map((g) => ({
          isCorrect: false,
          matchup: g.id,
          selection: null,
          userId: null,
          week: g.week,
        })) as unknown as Picks[];

      batch.set(pickRef, { ...pickData, picks: [...kept, ...placeholders] });
    })
  );

  await batch.commit();

  return {
    ok: true,
    slateId,
    games: games.map((g) => ({
      id: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      spread: g.pointSpread,
      startDate: g.startDate,
    })),
    added,
    removed,
    membersWithCancelledPicks,
  };
};
