import { GamesAPIResult } from '../model';

/**
 * The earliest kickoff (epoch ms) across a set of games, or `Infinity` when the
 * set is empty / has no parseable dates.
 */
export const earliestKickoff = (games?: GamesAPIResult[]): number => {
  const times = (games ?? [])
    .map((g) => Date.parse(g?.startDate))
    .filter((t) => !Number.isNaN(t));
  return times.length ? Math.min(...times) : Infinity;
};

/**
 * Whether picks/slate edits are locked because the earliest game has kicked off.
 *
 * Uses the real current instant (`Date.now()`) — NOT local midnight — so the
 * lock engages the moment the first game starts and does not stay open for the
 * rest of the calendar day (or flip across timezones). A global admin is never
 * locked out.
 *
 * @param games   the relevant games (all week games for slate edits; the slate's
 *                games for making picks)
 * @param isAdmin global admin override
 */
export const arePicksLocked = (games?: GamesAPIResult[], isAdmin = false): boolean => {
  if (isAdmin) return false;
  return Date.now() >= earliestKickoff(games);
};
