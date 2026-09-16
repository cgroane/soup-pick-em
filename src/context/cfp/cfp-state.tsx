import { createContext, useContext } from "react";
import { CFPBracket, CFPRound, GamesAPIResult, Picks } from "../../model";

export type CFPState = {
  bracket: CFPBracket | null;
  cfpPicks: { slateId: string; picks: Picks[] };
  /** Tracks `refreshAndSaveBracket` only. */
  isRefreshing: boolean;
  /** Tracks `saveCfpPicks` only. */
  isSaving: boolean;
};

export const initialCFPState: CFPState = {
  bracket: null,
  cfpPicks: { slateId: '', picks: [] },
  isRefreshing: false,
  isSaving: false,
};

export const CFPStateContext = createContext(initialCFPState);

export const cfpRound = (game: GamesAPIResult): CFPRound => {
  const notes = (game.notes as string) ?? '';
  if (notes.includes('First Round')) return 'firstRound';
  if (notes.includes('Quarterfinal')) return 'quarterfinal';
  if (notes.includes('Semifinal')) return 'semifinal';
  return 'championship';
};

export const useCFPStateContext = () => useContext(CFPStateContext);
