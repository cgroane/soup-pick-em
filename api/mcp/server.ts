import { McpServer } from "@modelcontextprotocol/server";
import { registerCfbdTools } from "./tools/cfbd";
import { registerAppTools } from "./tools/app";
import { registerWriteTools } from "./tools/write";
import { McpScope } from "./tokenStore";

const INSTRUCTIONS = `Analytics for a college-football pick'em league.

Members pick which team will cover the point spread in each of the 10 games on
their group's weekly slate, so the useful question is almost never "who wins?"
but "who covers?". Prefer spread-aware evidence: against-the-spread records
(get_team_ats), efficiency ratings (get_team_ratings), and the gap between a
model's win probability and the market line (get_win_probability against
get_games_with_lines).

Week and season default to whatever is in progress, resolved from the same
source of truth the app uses. Call get_current_week before any week-scoped
query — week numbers do not map to dates, so today's date cannot tell you the
current week.

Group-scoped tools read the caller's own league data. Call list_my_groups first
when you need a group id.`;

const WRITE_INSTRUCTIONS = `

Two tools write, and both act in a standing competition against real people, so
confirm the specifics with the user before calling either.

submit_picks records the user's own picks for a slate. Read get_slate first so
you are picking real games at their stored spreads, and say which side you are
taking in each before you send it. Picks merge, so partial submissions are fine;
the response names the games still unpicked.

set_slate replaces a group's slate for a week and is limited to that group's
slate-picker. It discards any pick a member already made on a game you drop, and
they cannot be recovered.`;

export const buildMcpServer = (uid: string, scopes: McpScope[], baseUrl?: string) => {
  const server = new McpServer(
    { name: "soup-pick-em", version: "1.0.0", title: "Soup Pick 'em" },
    {
      instructions: scopes.includes("write")
        ? INSTRUCTIONS + WRITE_INSTRUCTIONS
        : INSTRUCTIONS,
    }
  );

  registerCfbdTools(server);

  if (scopes.includes("read")) {
    registerAppTools(server, uid);
  }

  if (scopes.includes("write")) {
    registerWriteTools(server, uid, baseUrl);
  }

  return server;
};
