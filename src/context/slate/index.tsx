
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from 'react';
import { Matchup } from '../../model';
import { getGames } from '../../api/getGames';
import { getWeek } from '../../utils/getWeek';

type SlateProps = {
  games: Matchup[];
  selectedGames: Matchup[];
  filteredGames: Matchup[];
  setGames: Dispatch<SetStateAction<Matchup[]>>;
  setFilteredGames: Dispatch<SetStateAction<Matchup[]>>;
  setSelectedGames: Dispatch<SetStateAction<Matchup[]>>;
  addAndRemove: (game: Matchup) => void;
}

type ContextProp = {
  children: React.ReactNode
}

export const SlateContext = React.createContext({} as SlateProps); //create the context API

//function body
export default function CreateSlateContext({ children }: ContextProp) {
  const [games, setGames] = useState<Matchup[]>([]);
  // const [textFilter, setTextFilter] = useState('');
  const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);

  const fetchMatchups = useCallback(async () => {

    const results = await getGames(getWeek() + 1);
    setGames(results);
    setFilteredGames(results);
  }, [setGames]);
  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  const addAndRemove = useCallback((game: Matchup) => {
    const found = selectedGames.findIndex((selectedGame) => game.gameID === selectedGame.gameID);
    
    const newSelections = [...selectedGames];
    if (found >= 0) {
      newSelections.splice(found, 1);
    } else {
      newSelections.push(game);
    }
    setSelectedGames(newSelections);
  }, [setSelectedGames, selectedGames]);

  return (
    <SlateContext.Provider value={{
      games,
      setGames,
      filteredGames,
      setFilteredGames,
      selectedGames,
      setSelectedGames,
      addAndRemove
    }}>
      {children}
    </SlateContext.Provider>
  )
}

export const useSlateContext = ():SlateProps => {
    return useContext(SlateContext);
}