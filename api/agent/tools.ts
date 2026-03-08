import Anthropic from "@anthropic-ai/sdk";
import { getTalent } from "cfbd";
import { fetchGameAnalysis } from "../routes/advanced-data";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_game_analysis",
    description:
      "Get comprehensive analysis data for a single game matchup. Returns recent games, ATS records, ratings (S&P+, SRS, Elo, FPI), PPA, head-to-head history, and weather for both teams. Call this once per game.",
    input_schema: {
      type: "object" as const,
      properties: {
        homeTeam: { type: "string", description: "Home team school name e.g. 'Alabama', 'Ohio State'" },
        awayTeam: { type: "string", description: "Away team school name e.g. 'Georgia', 'Michigan'" },
        year: { type: "number", description: "Season year e.g. 2025" },
        week: { type: "number", description: "Week number" },
      },
      required: ["homeTeam", "awayTeam", "year", "week"],
    },
  },
  {
    name: "get_talent_composite",
    description: "Get the 247Sports team talent composite ranking for a season. Reflects overall roster talent based on recruiting ratings. Call this once per agent run.",
    input_schema: {
      type: "object" as const,
      properties: {
        year: { type: "number", description: "Season year" },
      },
      required: ["year"],
    },
  },
  {
    name: "submit_picks",
    description: "Submit your final picks for all games in the slate.",
    input_schema: {
      type: "object" as const,
      properties: {
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              gameId: { type: "number" },
              pick: { type: "string", enum: ["home", "away"] },
              confidence: { type: "number", description: "Confidence level from 0 to 1" },
              reasoning: { type: "string" },
            },
            required: ["gameId", "pick", "confidence"],
          },
        }
      },
      required: ["picks"],
    }
  }
];

// Tool execution - maps tool names to CFBD SDK calls
export type ToolInput = Record<string, unknown>;

async function executeTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case "get_game_analysis": {
      const { homeTeam, awayTeam, year, week } = input as {
        homeTeam: string; awayTeam: string; year: number; week: number;
      };
      const result = await fetchGameAnalysis({ homeTeam, awayTeam, year, week });
      return JSON.stringify(result);
    }

    case "get_talent_composite": {
      const { year } = input as { year: number };
      const res = await getTalent({ query: { year } });
      return JSON.stringify(res.data);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export { TOOLS, executeTool };
