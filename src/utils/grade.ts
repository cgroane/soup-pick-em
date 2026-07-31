import { GamesAPIResult, Picks } from '../model';

/** The score/status fields grading needs from the latest game data. */
export type GradeableGame = {
  homePoints?: number | null;
  awayPoints?: number | null;
  completed?: boolean;
};

/**
 * Single source of truth for grading one pick against a completed game — used by
 * BOTH the cron grader (api/routes/update-score.ts, which persists the result)
 * and the Picks page (which recomputes for live display). Keeping one function
 * prevents the two from drifting (F7).
 *
 * Selection ids come from the matchups mapping: 1 = home, 2 = away, 0 = push.
 * A legacy auto-fill push may arrive as {name:'PUSH'} with no id — treated as a
 * push so it is not mis-graded as an away-team bet (F4).
 *
 * @returns `true` (correct) · `false` (incorrect) · `null` (ungradeable: game
 *          not complete, or missing selection/spread data).
 */
export const gradePick = (
  pick: Picks,
  freshGame: GradeableGame,
  outcomes: GamesAPIResult['outcomes']
): boolean | null => {
  if (!freshGame?.completed) return null;
  if (!pick.selection || !outcomes) return null;

  const homePoints = freshGame.homePoints ?? 0;
  const awayPoints = freshGame.awayPoints ?? 0;
  const { id, pointValue } = pick.selection;

  const isPush = id === 0 || pick.selection.name === 'PUSH';
  if (isPush) {
    const favIsHome = (outcomes.home?.pointValue ?? 0) < 0;
    const favScore = favIsHome ? homePoints : awayPoints;
    const underDogScore = favIsHome ? awayPoints : homePoints;
    const favSpread = favIsHome
      ? outcomes.home?.pointValue ?? 0
      : outcomes.away?.pointValue ?? 0;
    return favScore + favSpread === underDogScore;
  }

  // id === 1 → picked home, id === 2 → picked away.
  const pickedScore = id === 1 ? homePoints : awayPoints;
  const otherScore = id === 1 ? awayPoints : homePoints;
  return pickedScore + (pointValue ?? 0) > otherScore;
};
