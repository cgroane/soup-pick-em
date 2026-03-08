import {
  getGames,
  getMatchup,
  getTeamsAts,
  getWeather,
  getSp,
  getSrs,
  getElo,
  getFpi,
  getPredictedPointsAddedByTeam,
} from "cfbd";

export interface GameAnalysis {
  homeTeam: {
    recentGames: unknown[];
    atsRecord: unknown | null;
    ratings: { sp: unknown | null; srs: unknown | null; elo: unknown | null; fpi: unknown | null };
    ppa: unknown | null;
  };
  awayTeam: {
    recentGames: unknown[];
    atsRecord: unknown | null;
    ratings: { sp: unknown | null; srs: unknown | null; elo: unknown | null; fpi: unknown | null };
    ppa: unknown | null;
  };
  headToHead: unknown | null;
  weather: unknown[] | null;
}

export async function fetchGameAnalysis(params: {
  homeTeam: string;
  awayTeam: string;
  year: number;
  week: number;
}): Promise<GameAnalysis> {
  const { homeTeam, awayTeam, year, week } = params;

  const [
    homeGames,
    awayGames,
    matchup,
    homeAts,
    awayAts,
    weather,
    homeSp,
    awaySp,
    homeSrs,
    awaySrs,
    homeElo,
    awayElo,
    homeFpi,
    awayFpi,
    homePpa,
    awayPpa,
  ] = await Promise.all([
    getGames({ query: { team: homeTeam, year, week, classification: "fbs" } }).then(r => r.data).catch(() => []),
    getGames({ query: { team: awayTeam, year, week, classification: "fbs" } }).then(r => r.data).catch(() => []),
    getMatchup({ query: { team1: homeTeam, team2: awayTeam, minYear: year - 5, maxYear: year } }).then(r => r.data).catch(() => null),
    getTeamsAts({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getTeamsAts({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
    getWeather({ query: { year, week } }).then(r => r.data).catch(() => null),
    getSp({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getSp({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
    getSrs({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getSrs({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
    getElo({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getElo({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
    getFpi({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getFpi({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
    getPredictedPointsAddedByTeam({ query: { team: homeTeam, year } }).then(r => r.data).catch(() => null),
    getPredictedPointsAddedByTeam({ query: { team: awayTeam, year } }).then(r => r.data).catch(() => null),
  ]);

  return {
    homeTeam: {
      recentGames: homeGames ?? [],
      atsRecord: homeAts ?? null,
      ratings: { sp: homeSp ?? null, srs: homeSrs ?? null, elo: homeElo ?? null, fpi: homeFpi ?? null },
      ppa: homePpa ?? null,
    },
    awayTeam: {
      recentGames: awayGames ?? [],
      atsRecord: awayAts ?? null,
      ratings: { sp: awaySp ?? null, srs: awaySrs ?? null, elo: awayElo ?? null, fpi: awayFpi ?? null },
      ppa: awayPpa ?? null,
    },
    headToHead: matchup ?? null,
    weather: weather ?? null,
  };
}
