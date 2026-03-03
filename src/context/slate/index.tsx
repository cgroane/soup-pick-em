
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getGames } from '../../api/getGames';
import { LoadingState, useUIContext } from '../ui';
import { usePickContext } from '../pick';
import { useGlobalContext } from '../user';
import { UserRoles } from '../../utils/constants';
import { GamesAPIResult } from '../../model';

export type SlateValueProps = {
  games: GamesAPIResult[];
  selectedGames: GamesAPIResult[];
  filteredGames: GamesAPIResult[];
  setGames: Dispatch<SetStateAction<GamesAPIResult[]>>;
  setFilteredGames: Dispatch<SetStateAction<GamesAPIResult[]>>;
  setSelectedGames: Dispatch<SetStateAction<GamesAPIResult[]>>;
  addAndRemove: (game: GamesAPIResult) => void;
  fetchMatchups: ({ weekNumber, year, seasonType }: { weekNumber?: number; year?: number, seasonType: 'postseason' | 'regular' }) => void;
  deletions: number[];
  canEdit: boolean;
}

type ContextProp = {
  children: React.ReactNode
}

export const SlateContext = React.createContext({} as SlateValueProps); //create the context API

//function body
export default function CreateSlateContext({ children }: ContextProp) {

  const {
    slate
  } = usePickContext();
  const {
    setStatus
  } = useUIContext();
  const {
    user
  } = useGlobalContext()
  const [games, setGames] = useState<GamesAPIResult[]>([]);
  const [filteredGames, setFilteredGames] = useState<GamesAPIResult[]>([]);
  const [selectedGames, setSelectedGames] = useState<GamesAPIResult[]>([]);
  const [deletions, setDeletions] = useState<number[]>([])
  const { seasonData } = useUIContext();

  useEffect(() => {
    setSelectedGames(slate?.games ?? []);
  }, [slate, setSelectedGames])

  const canEdit = useMemo(() => {
    const today = new Date();
    const earliestGame = Date.parse(games?.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate))[0]?.startDate)
    const now = Date.parse(today.toDateString())
    const pastDate = now > earliestGame;
    return !!((!pastDate && user?.roles?.includes(UserRoles.SLATE_PICKER)) || user?.roles?.includes(UserRoles.ADMIN))
  }, [games, user?.roles])
  /**
   * update fetchMatchups to accept a week param
   */
  const fetchMatchups = useCallback(async ({ weekNumber, seasonType, year }: { weekNumber?: number; year?: number; seasonType: 'postseason' | 'regular' }) => {
    try {
      setStatus(LoadingState.LOADING);
      const week = weekNumber ? weekNumber?.toString() : seasonData?.ApiWeek ? seasonData.ApiWeek?.toString() : '1';
      const results = await getGames({
        weekNumber: week,
        season: year?.toString(),
        seasonType,
      })
      if (results?.length) {
        const filtered = seasonType === 'postseason'
          ? results.filter((g) => !(g.notes as string)?.includes('College Football Playoff'))
          : results;
        setGames(filtered.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate)));
        setFilteredGames(filtered.sort((a, b) => Date.parse(a?.startDate) - Date.parse(b?.startDate)));
      }
      return results;
    } catch (err) {
      console.error(err);
      return;
    }
  }, [setGames, seasonData?.ApiWeek, setStatus]);


  const addAndRemove = useCallback((game: GamesAPIResult) => {
    /**
     * this runs either if updating or adding from scratch
     * need to differentiate between edit and new
     * on remove, if slate.games includes removed -- edit bc slate.games is the original from the api
     * otherwise it is new
     */
    const found = selectedGames.findIndex((selectedGame) => game.id === selectedGame.id);
    const dels = [...deletions];
    const newSelections = [...selectedGames];
    if (found >= 0) {
      newSelections.splice(found, 1);
      const deletedItem = slate?.games.find((g) => g.id === selectedGames[found].id)
      if (deletedItem) {
        dels.push(found);
        setDeletions(dels);
      }
    } else {
      const newGame: GamesAPIResult = {
        id: game.id ?? 0,
        season: game.season ?? 0,
        seasonType: game.seasonType ?? 0,
        week: game.week ?? 0,
        startDate: game.startDate ?? '',
        awayTeam: game.awayTeam ?? '',
        homeTeam: game.homeTeam ?? '',
        awayPoints: game.awayPoints ?? 0,
        homePoints: game.homePoints ?? 0,
        pointSpread: game.pointSpread ?? 0,
        attendance: game.attendance ?? 0,
        awayTeamAPRanking: game.awayTeamAPRanking ?? 0,
        homeTeamAPRanking: game.homeTeamAPRanking ?? 0,
        awayTeamCFPRanking: game.awayTeamCFPRanking ?? 0,
        homeTeamCFPRanking: game.homeTeamCFPRanking ?? 0,
        awayTeamData: {
          ...game.awayTeamData,
          playoffRank: game.awayTeamData.playoffRank ?? undefined,
          apRank: game.awayTeamData.apRank ?? undefined,
          coachesRank: game.awayTeamData.coachesRank ?? undefined
        },
        homeTeamData: {
          ...game.homeTeamData,
          playoffRank: game.homeTeamData?.playoffRank ?? undefined,
          apRank: game.homeTeamData.apRank ?? undefined,
          coachesRank: game.homeTeamData.coachesRank ?? undefined
        },
        notes: game.notes ?? '',
        startTimeTBD: game?.startTimeTBD ?? false,
        venueId: game?.venueId ?? 0,
        venue: game?.venue ?? '',
        outcomes: game.outcomes ?? undefined,
        neutralSite: game.neutralSite ?? false,
        conferenceGame: game.conferenceGame ?? false,
        homeId: game.homeId ?? 0,
        homeConference: game.homeConference ?? '',
        homeLineScores: game.homeLineScores ?? [],
        homePostgameWinProbability: game.homePostgameWinProbability ?? 0,
        homePregameElo: game.homePregameElo ?? 0,
        homePostgameElo: game.homePostgameElo ?? 0,
        awayId: game.awayId ?? 0,
        awayConference: game.awayConference ?? '',
        awayLineScores: game.awayLineScores ?? [],
        awayPostgameWinProbability: game.awayPostgameWinProbability ?? 0,
        awayPregameElo: game.awayPregameElo ?? 0,
        awayPostgameElo: game.awayPostgameElo ?? 0,
        excitementIndex: game.excitementIndex ?? 0,
        highlights: game.highlights ?? '',
        completed: game.completed ?? false,
        homeClassification: game.homeClassification ?? null,
        awayClassification: game.awayClassification ?? null,
      }
      newSelections.push(newGame as GamesAPIResult);
    }
    setSelectedGames(newSelections);
  }, [setSelectedGames, selectedGames, deletions, setDeletions, slate?.games]);

  return (
    <SlateContext.Provider value={{
      games,
      setGames,
      filteredGames,
      setFilteredGames,
      selectedGames,
      setSelectedGames,
      addAndRemove,
      fetchMatchups,
      deletions,
      canEdit
    }}>
      {children}
    </SlateContext.Provider>
  )
}

export const useSlateContext = (): SlateValueProps => {
  return useContext(SlateContext);
}