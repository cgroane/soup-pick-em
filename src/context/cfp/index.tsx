import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CFPBracket, CFPRound, GamesAPIResult, Picks } from '../../model';
import { FirebaseCFPInstance } from '../../firebase/cfp/cfp';
import { getCFPGames } from '../../api/getGames';
import { useGlobalContext } from '../user';
import { useUIContext } from '../ui';
import { useGroupContext } from '../group';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { PickHistory } from '../../pages/Picks/PicksTable';

export type CFPContextValue = {
  bracket: CFPBracket | null;
  cfpPicks: { slateId: string; picks: Picks[] };
  fetchBracket: (year: number) => Promise<void>;
  refreshAndSaveBracket: (year: number) => Promise<void>;
  addCfpPick: (pick: Picks) => void;
  saveCfpPicks: () => Promise<void>;
  cfpRound: (game: GamesAPIResult) => CFPRound;
  isRefreshing: boolean;
  isSaving: boolean;
};

type ContextProp = {
  children: React.ReactNode;
};

export const CFPContext = createContext({} as CFPContextValue);

export const cfpRound = (game: GamesAPIResult): CFPRound => {
  const notes = (game.notes as string) ?? '';
  if (notes.includes('First Round')) return 'firstRound';
  if (notes.includes('Quarterfinal')) return 'quarterfinal';
  if (notes.includes('Semifinal')) return 'semifinal';
  return 'championship';
};

export default function CFPContextProvider({ children }: ContextProp) {
  const { user } = useGlobalContext();
  const { seasonData } = useUIContext();
  const { activeGroupId } = useGroupContext();
  const [bracket, setBracket] = useState<CFPBracket | null>(null);
  const [cfpPicks, setCfpPicks] = useState<{ slateId: string; picks: Picks[] }>({
    slateId: '',
    picks: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBracket = useCallback(async (year: number) => {
    const data = await FirebaseCFPInstance.getBracket(year);
    setBracket(data ?? null);
  }, []);

  const refreshAndSaveBracket = useCallback(async (year: number) => {
    setIsRefreshing(true);
    try {
      const games = await getCFPGames(year);
      const newBracket: CFPBracket = {
        year,
        games,
        updatedAt: new Date().toISOString(),
      };
      await FirebaseCFPInstance.saveBracket(newBracket);
      setBracket(newBracket);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const addCfpPick = useCallback((pick: Picks) => {
    setCfpPicks((prev) => {
      const idx = prev.picks.findIndex((p) => p.matchup === pick.matchup);
      if (idx >= 0) {
        const updated = [...prev.picks];
        updated.splice(idx, 1, pick);
        return { ...prev, picks: updated };
      }
      return { ...prev, picks: [...prev.picks, pick] };
    });
  }, []);

  const saveCfpPicks = useCallback(async () => {
    // CFP picks are group-scoped and must land on the same group path the cron
    // grader and Picks page read from (groups/{gid}/members/{uid}/picks/{cfp-year}).
    if (!user?.uid || !activeGroupId || !cfpPicks.slateId) return;
    setIsSaving(true);
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
      setIsSaving(false);
    }
  }, [user, activeGroupId, cfpPicks, seasonData?.Season]);

  // Load existing picks from user's pick history
  useEffect(() => {
    if (!user?.uid || !seasonData?.Season) return;
    const slateId = `cfp-${seasonData.Season}`;
    const existing = user.pickHistory?.find((p: PickHistory) => p.slateId === slateId);
    setCfpPicks({
      slateId,
      picks: existing?.picks ?? [],
    });
  }, [user?.uid, user?.pickHistory, seasonData?.Season]);

  // Fetch bracket once season is known AND the user is authed — the cfpBracket
  // read requires a signed-in request, so firing before auth resolves would be
  // rejected by the rules.
  useEffect(() => {
    if (!seasonData?.Season || !user?.uid) return;
    fetchBracket(seasonData.Season);
  }, [fetchBracket, seasonData?.Season, user?.uid]);

  return (
    <CFPContext.Provider
      value={{
        bracket,
        cfpPicks,
        fetchBracket,
        refreshAndSaveBracket,
        addCfpPick,
        saveCfpPicks,
        cfpRound,
        isRefreshing,
        isSaving,
      }}
    >
      {children}
    </CFPContext.Provider>
  );
}

export const useCFPContext = (): CFPContextValue => useContext(CFPContext);
