import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { CFPBracket } from '../../model';
import { FirebaseCFPInstance } from '../../firebase/cfp/cfp';
import { getCFPGames } from '../../api/getGames';
import { useUserStateContext } from '../user/user-state';
import { useGroupStateContext } from '../group/group-state';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { PickHistory } from '../../pages/Picks/PicksTable';
import { useUIStateContext } from 'context/ui/ui-state';
import { CFPActions, CFPDispatchContext } from './cfp-dispatch';
import { CFPState, CFPStateContext, initialCFPState } from './cfp-state';

export { cfpRound } from './cfp-state';

export const cfpReducer = (state: CFPState, action: CFPActions): CFPState => {
  switch (action.type) {
    case 'SET_BRACKET':
      return { ...state, bracket: action.payload };
    case 'SET_CFP_PICKS':
      return { ...state, cfpPicks: action.payload };
    case 'ADD_CFP_PICK': {
      const idx = state.cfpPicks.picks.findIndex((p) => p.matchup === action.payload.matchup);
      const picks = idx >= 0
        ? state.cfpPicks.picks.map((p, i) => i === idx ? action.payload : p)
        : [...state.cfpPicks.picks, action.payload];
      return { ...state, cfpPicks: { ...state.cfpPicks, picks } };
    }
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    default:
      return state;
  }
};

export type CFPProviderValue = {
  fetchBracket: (year: number) => Promise<void>;
  refreshAndSaveBracket: (year: number) => Promise<void>;
  saveCfpPicks: () => Promise<void>;
};

export const CFPContext = createContext({} as CFPProviderValue);

export default function CFPContextProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(cfpReducer, initialCFPState);
  const { user } = useUserStateContext();
  const { seasonData } = useUIStateContext();
  const { activeGroupId } = useGroupStateContext();
  const { cfpPicks } = state;

  const fetchBracket = useCallback(async (year: number) => {
    const data = await FirebaseCFPInstance.getBracket(year);
    dispatch({ type: 'SET_BRACKET', payload: data ?? null });
  }, []);

  const refreshAndSaveBracket = useCallback(async (year: number) => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    try {
      const games = await getCFPGames(year);
      const newBracket: CFPBracket = {
        year,
        games,
        updatedAt: new Date().toISOString(),
      };
      await FirebaseCFPInstance.saveBracket(newBracket);
      dispatch({ type: 'SET_BRACKET', payload: newBracket });
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, []);

  const saveCfpPicks = useCallback(async () => {
    // CFP picks are group-scoped and must land on the same group path the cron
    // grader and Picks page read from (groups/{gid}/members/{uid}/picks/{cfp-year}).
    if (!user?.uid || !activeGroupId || !cfpPicks.slateId) return;
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      await FirebaseGroupsInstance.saveMemberPicks(activeGroupId, user.uid, cfpPicks.slateId, {
        name: `${user.fName} ${user.lName}`,
        slateId: cfpPicks.slateId,
        week: 1,
        year: seasonData?.Season as number,
        picks: cfpPicks.picks,
        userId: user.uid,
      });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [user, activeGroupId, cfpPicks, seasonData?.Season]);

  // Load existing picks from user's pick history
  useEffect(() => {
    if (!user?.uid || !seasonData?.Season) return;
    const slateId = `cfp-${seasonData.Season}`;
    const existing = user.pickHistory?.find((p: PickHistory) => p.slateId === slateId);
    dispatch({ type: 'SET_CFP_PICKS', payload: { slateId, picks: existing?.picks ?? [] } });
  }, [user?.uid, user?.pickHistory, seasonData?.Season]);

  // Fetch bracket once season is known AND the user is authed — the cfpBracket
  // read requires a signed-in request, so firing before auth resolves would be
  // rejected by the rules.
  useEffect(() => {
    if (!seasonData?.Season || !user?.uid) return;
    fetchBracket(seasonData.Season);
  }, [fetchBracket, seasonData?.Season, user?.uid]);

  const value = useMemo<CFPProviderValue>(
    () => ({ fetchBracket, refreshAndSaveBracket, saveCfpPicks }),
    [fetchBracket, refreshAndSaveBracket, saveCfpPicks]
  );

  return (
    <CFPContext.Provider value={value}>
      <CFPDispatchContext.Provider value={dispatch}>
        <CFPStateContext.Provider value={state}>
          {children}
        </CFPStateContext.Provider>
      </CFPDispatchContext.Provider>
    </CFPContext.Provider>
  );
}

export const useCFPContext = (): CFPProviderValue => useContext(CFPContext);
