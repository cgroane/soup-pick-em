#!/usr/bin/env node
/**
 * Re-derive apRank/playoffRank on every group slate for a season from CFBD rankings.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-slate-rankings.js --prod --dry-run [--year=2026]
 *   node --env-file=.env.local scripts/backfill-slate-rankings.js --prod --yes [--year=2026]
 */

const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');
const PROD = process.argv.includes('--prod');
const YES = process.argv.includes('--yes');
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const YEAR = Number((process.argv.find((a) => a.startsWith('--year=')) ?? '').split('=')[1]) || new Date().getFullYear();

if (PROD && EMULATOR) {
  console.error('REFUSING: --prod passed but FIRESTORE_EMULATOR_HOST is set.');
  process.exit(1);
}
if (!PROD && !EMULATOR) {
  console.error('REFUSING: no FIRESTORE_EMULATOR_HOST and --prod not passed.');
  process.exit(1);
}
if (PROD && !DRY_RUN && !YES) {
  console.error('REFUSING: prod write requires --yes (or use --dry-run).');
  process.exit(1);
}

if (PROD) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
} else {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'soup-pick-em' });
}
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const rankingsCache = new Map();
async function rankingPollFor(week, seasonType) {
  const key = `${week}-${seasonType}`;
  if (!rankingsCache.has(key)) {
    const res = await fetch(
      `https://api.collegefootballdata.com/rankings?year=${YEAR}&week=${week}&seasonType=${seasonType}`,
      { headers: { Authorization: `Bearer ${process.env.REACT_APP_CFBD_API_KEY}` } }
    );
    if (!res.ok) throw new Error(`CFBD rankings ${key} returned ${res.status}`);
    const polls = (await res.json())?.[0]?.polls ?? [];
    const playoffPoll = polls.find((p) => p.poll === 'Playoff Committee Rankings');
    const rankingPoll = playoffPoll ?? polls.find((p) => p.poll === 'AP Top 25');
    rankingsCache.set(key, { rankingPoll, rankPropAccessor: playoffPoll ? 'playoffRank' : 'apRank' });
  }
  return rankingsCache.get(key);
}

const rankOf = (poll, teamId) => poll?.ranks?.find((r) => r.teamId === teamId)?.rank;

async function main() {
  console.log(`\nBackfilling ${YEAR} slate rankings on ${PROD ? 'PROD' : 'EMULATOR'}${DRY_RUN ? ' (dry run)' : ''}\n`);
  const groups = await db.collection('groups').get();
  let updated = 0;

  for (const group of groups.docs) {
    const slates = await group.ref.collection('slates').get();
    for (const slate of slates.docs) {
      const data = slate.data();
      const games = data.games ?? [];
      if (!games.some((g) => g.season === YEAR)) continue;

      const seasonType = slate.id.endsWith('POST') ? 'postseason' : 'regular';
      const { rankingPoll, rankPropAccessor } = await rankingPollFor(data.week, seasonType);
      if (!rankingPoll) {
        console.warn(`  SKIP ${group.id}/${slate.id}: no AP or playoff poll for week ${data.week}`);
        continue;
      }

      const changes = [];
      const nextGames = games.map((game) => {
        const withRank = (teamData) => {
          const next = {
            ...teamData,
            coachesRank: undefined,
            apRank: undefined,
            playoffRank: undefined,
            [rankPropAccessor]: rankOf(rankingPoll, teamData?.id),
          };
          delete next.coachesRank;
          if (next.apRank === undefined) delete next.apRank;
          if (next.playoffRank === undefined) delete next.playoffRank;
          if (teamData?.apRank !== next.apRank || teamData?.playoffRank !== next.playoffRank) {
            changes.push(`${teamData?.school}: ap ${teamData?.apRank ?? '-'}→${next.apRank ?? '-'}, cfp ${teamData?.playoffRank ?? '-'}→${next.playoffRank ?? '-'}`);
          }
          return next;
        };
        return { ...game, awayTeamData: withRank(game.awayTeamData), homeTeamData: withRank(game.homeTeamData) };
      });

      console.log(`  ${group.id}/${slate.id} (${rankingPoll.poll}): ${changes.length ? changes.length + ' change(s)' : 'already accurate'}`);
      changes.forEach((c) => console.log(`      ${c}`));
      if (!changes.length) continue;

      updated++;
      if (!DRY_RUN) {
        await db.runTransaction(async (tx) => {
          const current = (await tx.get(slate.ref)).data()?.games ?? [];
          const ranksById = new Map(nextGames.map((g) => [g.id, g]));
          tx.update(slate.ref, {
            games: current.map((g) => ({
              ...g,
              awayTeamData: ranksById.get(g.id)?.awayTeamData ?? g.awayTeamData,
              homeTeamData: ranksById.get(g.id)?.homeTeamData ?? g.homeTeamData,
            })),
          });
        });
      }
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${updated} slate(s).\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
