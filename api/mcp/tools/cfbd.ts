import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import { getCurrentSeasonDetails, resolveSeasonYear } from "../../currentWeek";
import {
  getAdvancedSeasonStats,
  getElo,
  getFpi,
  getGames,
  getLines,
  getMatchup,
  getPredictedPointsAddedByTeam,
  getPregameWinProbabilities,
  getRankings,
  getRecords,
  getReturningProduction,
  getSp,
  getSrs,
  getTeamsAts,
  SeasonType,
} from "cfbd";

const seasonType = z
  .enum(["regular", "postseason"])
  .default("regular")
  .describe("Which part of the season. Defaults to regular.");

const year = z
  .number()
  .int()
  .optional()
  .describe("Season year. Defaults to the season currently in progress.");

const jsonResult = (data: unknown, limit = 400) => {
  const rows = Array.isArray(data) ? data : [data];
  const truncated = rows.length > limit;
  const payload = truncated ? rows.slice(0, limit) : rows;
  const text = JSON.stringify(payload, null, 1);
  return {
    content: [
      {
        type: "text" as const,
        text: truncated
          ? `${text}\n\n[truncated: showing ${limit} of ${rows.length} rows — narrow the query with team/conference filters]`
          : text,
      },
    ],
  };
};

const failed = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

export const registerCfbdTools = (server: McpServer) => {
  server.registerTool(
    "get_current_week",
    {
      title: "Current week and season",
      description:
        "Which week and season are in progress right now, and whether the season is in its regular, postseason, or offseason phase. This is the same source of truth the app itself uses to decide what to show. Call it before any week-scoped query rather than assuming the current week from today's date — week numbers do not map to dates.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const details = await getCurrentSeasonDetails();
        return jsonResult({
          season: details.Season,
          week: details.ApiWeek,
          seasonType: details.seasonType,
          isOffseason: details.isOffseason,
          description: details.Description,
        });
      } catch (err) {
        return failed(`Failed to fetch the current week: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_team_ratings",
    {
      title: "Team ratings (SP+, FPI, Elo, SRS)",
      description:
        "Composite power ratings for a team or an entire season from all four major systems at once: SP+ (efficiency), FPI (ESPN), Elo, and SRS (schedule-adjusted margin). The single best starting point for judging whether a team is better than its record suggests.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name, e.g. 'Texas'. Omit for all teams."),
        year,
        conference: z.string().optional().describe("Conference abbreviation filter, e.g. 'SEC'."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ team, year: y, conference }: { team?: string; year?: number; conference?: string }) => {
      const season = await resolveSeasonYear(y);
      try {
        const [sp, fpi, elo, srs] = await Promise.all([
          getSp({ query: { team, year: season } }),
          getFpi({ query: { team, year: season, conference } }),
          getElo({ query: { team, year: season, conference } }),
          getSrs({ query: { team, year: season, conference } }),
        ]);
        return jsonResult({
          year: season,
          sp: sp.data ?? [],
          fpi: fpi.data ?? [],
          elo: elo.data ?? [],
          srs: srs.data ?? [],
        });
      } catch (err) {
        return failed(`Failed to fetch ratings: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_team_ats",
    {
      title: "Against-the-spread records",
      description:
        "A team's record against the closing point spread, which is the metric a spread pick'em actually rewards — straight-up records say nothing about whether a team covers.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name. Omit for all teams."),
        year,
        conference: z.string().optional().describe("Conference abbreviation filter."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ team, year: y, conference }: { team?: string; year?: number; conference?: string }) => {
      try {
        const res = await getTeamsAts({ query: { team, year: await resolveSeasonYear(y), conference } });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch ATS records: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_advanced_season_stats",
    {
      title: "Advanced season stats",
      description:
        "Drive-level efficiency metrics: success rate, explosiveness, line yards, havoc rate, and field position, split by offense and defense. Use `excludeGarbageTime` to strip blowout snaps that inflate raw totals.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name. Omit for all teams."),
        year,
        startWeek: z.number().int().optional().describe("First week to include."),
        endWeek: z.number().int().optional().describe("Last week to include."),
        excludeGarbageTime: z
          .boolean()
          .default(true)
          .describe("Drop garbage-time plays. Defaults to true."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: {
      team?: string;
      year?: number;
      startWeek?: number;
      endWeek?: number;
      excludeGarbageTime: boolean;
    }) => {
      try {
        const res = await getAdvancedSeasonStats({
          query: {
            team: args.team,
            year: await resolveSeasonYear(args.year),
            startWeek: args.startWeek,
            endWeek: args.endWeek,
            excludeGarbageTime: args.excludeGarbageTime,
          },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch advanced stats: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_team_ppa",
    {
      title: "Predicted points added",
      description:
        "Predicted points added (PPA) per team — CFBD's expected-points model, broken out by offense/defense and down. A better signal of true quality than yards or points, since it credits situation rather than volume.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name. Omit for all teams."),
        year,
        conference: z.string().optional().describe("Conference abbreviation filter."),
        excludeGarbageTime: z.boolean().default(true).describe("Drop garbage-time plays."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: {
      team?: string;
      year?: number;
      conference?: string;
      excludeGarbageTime: boolean;
    }) => {
      try {
        const res = await getPredictedPointsAddedByTeam({
          query: {
            team: args.team,
            year: await resolveSeasonYear(args.year),
            conference: args.conference,
            excludeGarbageTime: args.excludeGarbageTime,
          },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch PPA: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_head_to_head",
    {
      title: "Head-to-head history",
      description:
        "All-time series history between two teams, including each meeting's score and venue.",
      inputSchema: z.object({
        team1: z.string().describe("First team's school name."),
        team2: z.string().describe("Second team's school name."),
        minYear: z.number().int().optional().describe("Earliest year to include."),
        maxYear: z.number().int().optional().describe("Latest year to include."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { team1: string; team2: string; minYear?: number; maxYear?: number }) => {
      try {
        const res = await getMatchup({ query: args });
        return jsonResult(res.data ?? {});
      } catch (err) {
        return failed(`Failed to fetch head-to-head: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_win_probability",
    {
      title: "Pregame win probabilities",
      description:
        "CFBD's pregame win probability for each game in a week. Compare against the point spread to find games where the model and the market disagree.",
      inputSchema: z.object({
        year,
        week: z.number().int().optional().describe("Week number. Omit for the whole season."),
        team: z.string().optional().describe("Team school name filter."),
        seasonType,
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { year?: number; week?: number; team?: string; seasonType: SeasonType }) => {
      try {
        const res = await getPregameWinProbabilities({
          query: {
            year: await resolveSeasonYear(args.year),
            week: args.week,
            team: args.team,
            seasonType: args.seasonType,
          },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch win probabilities: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_games_with_lines",
    {
      title: "Games with betting lines",
      description:
        "Every FBS game for a week alongside its point spread and over/under. This is the same raw material the weekly slate is chosen from.",
      inputSchema: z.object({
        year,
        week: z.number().int().optional().describe("Week number."),
        seasonType,
        team: z.string().optional().describe("Team school name filter."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { year?: number; week?: number; seasonType: SeasonType; team?: string }) => {
      const season = await resolveSeasonYear(args.year);
      try {
        const [games, lines] = await Promise.all([
          getGames({
            query: {
              year: season,
              week: args.week,
              seasonType: args.seasonType,
              team: args.team,
              classification: "fbs",
            },
          }),
          getLines({
            query: {
              year: season,
              week: args.week,
              seasonType: args.seasonType,
              team: args.team,
            },
          }),
        ]);
        const merged = (games.data ?? []).map((g) => {
          const line = (lines.data ?? []).find((l) => l.id === g.id);
          const book =
            line?.lines?.find((l) => l.provider === "DraftKings") ?? line?.lines?.[0];
          return {
            id: g.id,
            week: g.week,
            startDate: g.startDate,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            homePoints: g.homePoints,
            awayPoints: g.awayPoints,
            completed: g.completed,
            neutralSite: g.neutralSite,
            conferenceGame: g.conferenceGame,
            spread: book?.spread,
            overUnder: book?.overUnder,
            provider: book?.provider,
          };
        });
        return jsonResult(merged);
      } catch (err) {
        return failed(`Failed to fetch games: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_rankings",
    {
      title: "Poll rankings",
      description:
        "Poll rankings for a week — AP, Coaches, and the Playoff Committee rankings once those begin.",
      inputSchema: z.object({
        year,
        week: z.number().int().optional().describe("Week number."),
        seasonType,
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { year?: number; week?: number; seasonType: SeasonType }) => {
      try {
        const res = await getRankings({
          query: { year: await resolveSeasonYear(args.year), week: args.week, seasonType: args.seasonType },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch rankings: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_team_records",
    {
      title: "Team records",
      description:
        "Straight-up win/loss records, split by overall, conference, home, and away.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name. Omit for all teams."),
        year,
        conference: z.string().optional().describe("Conference abbreviation filter."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { team?: string; year?: number; conference?: string }) => {
      try {
        const res = await getRecords({
          query: { team: args.team, year: await resolveSeasonYear(args.year), conference: args.conference },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch records: ${(err as Error).message}`);
      }
    }
  );

  server.registerTool(
    "get_returning_production",
    {
      title: "Returning production",
      description:
        "Share of production returning from last season, by team. Useful early in the year when ratings are still driven by priors rather than results.",
      inputSchema: z.object({
        team: z.string().optional().describe("Team school name. Omit for all teams."),
        year,
        conference: z.string().optional().describe("Conference abbreviation filter."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args: { team?: string; year?: number; conference?: string }) => {
      try {
        const res = await getReturningProduction({
          query: { team: args.team, year: await resolveSeasonYear(args.year), conference: args.conference },
        });
        return jsonResult(res.data ?? []);
      } catch (err) {
        return failed(`Failed to fetch returning production: ${(err as Error).message}`);
      }
    }
  );
};
