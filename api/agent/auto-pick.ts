import { Slate } from "model"
import Anthropic from "@anthropic-ai/sdk";
import { executeTool, ToolInput, TOOLS } from "./tools";
import { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources";

type PickResult = {
  picks: Array<{
    gameId: number;
    pick: "home" | "away";
    confidence: number;
    reasoning?: string;
  }>;
};

export const generatePicks = async (slate: Slate): Promise<PickResult["picks"]> => {
  try {

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_AI_API_KEY || "",
    });
    const messages: Array<MessageParam> = [
      {
        role: "user", content: `Here is the slate of games: ${JSON.stringify(slate.games)}.`,
      },
    ]
    const createParams = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      tools: TOOLS,
      system: `You're a helpful and precise assistant for picking college football games against the spread. The spread is the number of points that the favored team is expected to win by. For example, if the spread is -7, the favored team is expected to win by 7 points. If the spread is +7, the underdog team is expected to lose by 7 points.

You have 3 tools:
1. get_game_analysis — call once per game with homeTeam, awayTeam, year, week. Returns all data you need: recent games, ATS records, ratings (S&P+, SRS, Elo, FPI), PPA, head-to-head history, and weather.
2. get_talent_composite — call once with the year to get roster talent rankings for all teams.
3. submit_picks — call once with all your picks when done.

IMPORTANT: You are making predictions as if the games have not been played yet. Do NOT use any knowledge of actual game outcomes from your training data. Base your picks entirely on the analytical data returned by the tools (ratings, trends, ATS records, etc.).

Strategy: First call get_talent_composite, then call get_game_analysis for each game (you can call multiple in parallel). Analyze all the data, then submit_picks with your final selections. Each pick needs a gameId, pick (home/away), confidence (0-1), and reasoning.`,

      messages,
    };
    let iterations = 0;
    const MAX_ITERATIONS = 20;
    let response = await anthropic.messages.create(createParams);
    while (response.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
      iterations++

      const submitCall = response.content.find((c) => c.type === "tool_use" && c.name === "submit_picks");
      if (submitCall && submitCall.type === "tool_use") {
        return (submitCall.input as PickResult).picks;
      }
      const toolUseBlocks = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
      const toolResponses: ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (c) => {
          try {
            const result = await executeTool(c.name, c.input as ToolInput);
            return {
              type: "tool_result",
              tool_use_id: c.id,
              content: result,
            };
          } catch (err) {
            return {
              type: "tool_result",
              tool_use_id: c.id,
              content: `Error executing tool: ${err instanceof Error ? err.message : String(err)}`,
            }
          }
        })
      );
      messages.push({
        role: "assistant", content: response.content,
      });
      messages.push({
        role: "user", content: toolResponses
      });
      response = await anthropic.messages.create(createParams);
    }
    if (iterations === MAX_ITERATIONS) {
      throw new Error("Max iterations reached without generating picks.");
    }
    throw new Error("No picks generated.");
  } catch (err) {
    console.error("Error generating picks:", err instanceof Error ? err.message : String(err));
    throw err;
  }
}