import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getGames } from '../../api/getGames';
import { Box, Page } from 'grommet';
import { Matchup } from '../../model';
import Game from '../../components/Game';
 
interface CreateSlateProps {
  week?: number;
}
const CreateSlate: React.FC<CreateSlateProps> = () => {

  const [games, setGames] = useState<Matchup[]>([]);
  // const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);

  const disableSelection = useMemo(() => selectedGames.length >= 10, [selectedGames]);

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

  const fetchMatchups = useCallback(async () => {
    const results = await getGames(8);
    // setFilteredGames(games);
    setGames(results);
  }, [setGames]);
  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);

  return (
    <Page>
      <Box flex align='center' pad={'medium'} >
        {
          games?.sort((a, b) => Date.parse(a?.dateTimeUTC) - Date.parse(b?.dateTimeUTC)).map((game) => 
          <Game
            addedToSlate={!!selectedGames.find((selectedGame) => game.gameID === selectedGame.gameID)}
            addToSlate={addAndRemove}
            disable={disableSelection}
            key={game.gameID}
            game={game}
          />)
        }
      </Box>
    </Page>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"