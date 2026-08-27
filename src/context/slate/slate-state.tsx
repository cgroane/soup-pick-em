import { useGroupContext } from "context/group";
import { usePickState } from "context/pick/pick-state";
import { LoadingState } from "context/ui";
import { useGlobalContext } from "context/user";
import { GamesAPIResult } from "model";
import { createContext, useContext, useMemo } from "react";
import { UserRoles } from "utils/constants";
import { arePicksLocked } from "utils/pickLock";

export type SlateState = {
  games: GamesAPIResult[];
  selectedGames: GamesAPIResult[];
  filterText: string;
  /** Tracks `fetchMatchups` only — submits present their progress locally. */
  status: keyof typeof LoadingState;
}

export const initialSlateState: SlateState = {
  games: [],
  selectedGames: [],
  filterText: '',
  status: LoadingState.IDLE,
}

export const SlateStateContext = createContext(initialSlateState);

/**
 * Indices into the persisted slate's games that are no longer selected.
 * `addSlate` treats these as positional, so they must be derived against
 * `slate.games` — not against `selectedGames`.
 *
 * Lives outside the hook because the provider needs it too (submitSlate).
 */
export const computeDeletions = (slateGames: GamesAPIResult[] = [], selected: GamesAPIResult[]) => {
  const kept = new Set(selected.map((g) => g.id))
  return (slateGames ?? []).flatMap((g, i) => kept.has(g.id) ? [] : [i])
};

export const useSlateStateContext = () => {
  const { slate } = usePickState();
  const s = useContext(SlateStateContext);
  const { user } = useGlobalContext();
  const { isSlatePicker } = useGroupContext();

  const isAdmin = !!user?.roles?.includes(UserRoles.ADMIN);
  const canEdit = useMemo(() => {
    return (isSlatePicker && !arePicksLocked(s.games, isAdmin)) || isAdmin;
  }, [s.games, isAdmin, isSlatePicker]);
  const filteredGames = useMemo(() => {
    const q = s.filterText.trim().toLowerCase();
    if (!q) return s.games;
    // Object.values, not the whole object: stringifying keys makes terms like
    // "home" or "season" match every game.
    return s.games?.filter((g) => JSON.stringify(Object.values(g)).toLowerCase().includes(q))
  }, [s.filterText, s.games]);
  const deletions = useMemo(() => {
    return computeDeletions(slate?.games, s.selectedGames);
  }, [slate?.games, s.selectedGames]);
  return {
    ...s,
    filteredGames,
    deletions,
    canEdit
  }
}
