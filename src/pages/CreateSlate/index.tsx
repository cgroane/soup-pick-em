import React, { useEffect, useState } from 'react'
import { getGames } from '../../api/getGames';
import { Box, Page } from 'grommet';
import { Matchup } from '../../model';
import Game from '../../components/Game';
import Navigation from '../../components/Navigation';
 
interface CreateSlateProps {
  week?: number;
}
const CreateSlate: React.FC<CreateSlateProps> = ({
  // week
}: CreateSlateProps) => {

  const [games, setGames] = useState<Matchup[]>([]);
  const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);

  useEffect(() => {
    fetchMatchups();
  }, []);

  const fetchMatchups = async () => {
    const results = await getGames(8);
    setFilteredGames(games);
    setGames(results);
  };

  return (
    <Page>
      <Box flex align='center' pad={'medium'} >
        {
          games?.sort((a, b) => Date.parse(a?.dateTimeUTC) - Date.parse(b?.dateTimeUTC)).map((game) => <Game key={game.gameId} game={game} />)
        }
      </Box>
    </Page>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"