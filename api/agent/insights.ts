import Anthropic from "@anthropic-ai/sdk"
import { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources";
import { executeTool, ToolInput, TOOLS } from "./tools";

const toolsWithoutSubmit = [...TOOLS.filter((t) => t.name !== "submit_picks"), {
  name: "submit_insights",
  description: "Submit your final insights on the game.",
  input_schema: {
    type: "object" as const,
    properties: {
      insights: { type: "string", description: "Your insights on the game." },
    },
    required: ["insights"],
  }
}];


export const getInsights = async () => {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });
  const messages: Array<MessageParam> = [
    {
      role: "user", content: `Provide predictive insights on the upcoming college football games this week between these two teams.`,
    },
  ]
  const createParams = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You're a helpful and precise assistant for providing insights on college football games. You have access to tools that allow you to get the latest data on team performance, injuries, weather, and other factors that may affect the outcome of the game. Use these tools to inform your insights.`,
    messages,
    tools: toolsWithoutSubmit,
  };
  let iterations = 0;
  const MAX_ITERATIONS = 20;
  let response = await anthropic.messages.create(createParams);
  while (response.stop_reason === "tool_use" && iterations < MAX_ITERATIONS) {
    iterations++
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
  try {
    const response = await anthropic.messages.create(createParams);
    return response;
  } catch (error) {
    console.error("Error generating insights:", error);
    throw new Error("Error generating insights");
  }
}