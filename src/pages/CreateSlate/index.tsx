import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Page, Paragraph, TextInput, Toolbar } from 'grommet';
import Game from '../../components/Game';
import styled from 'styled-components';
import { Search } from 'grommet-icons';
import { theme } from '../../theme';
import { useSlateContext } from '../../context/slate';
 
const BottomToolbar = styled(Toolbar)`
  position: fixed;
  bottom: 0%;
  left: 0;
  width: 100%;
  height: 8rem;
  background-color: ${({theme}) => theme.colors.darkBlue};
`
interface CreateSlateProps {
  week?: number;
}
const CreateSlate: React.FC<CreateSlateProps> = ({
  week
}) => {

  // const [games, setGames] = useState<Matchup[]>([]);
  const [textFilter, setTextFilter] = useState('');
  // const [filteredGames, setFilteredGames] = useState<Matchup[]>([]);
  // const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);
  const {
    games,
    selectedGames,
    filteredGames,
    setFilteredGames,
  } = useSlateContext()

  const disableSelection = useMemo(() => selectedGames.length >= 10, [selectedGames]);

  const filterGames = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextFilter(e.target.value);
  }, [setTextFilter]);

  // useEffect(() => {
  //   if (textFilter) {
  //     setFilteredGames(() => {
  //       const filtered = games.filter((game) =>
  //         Object.values(game).some((val) => typeof val === 'string' && val.toLowerCase().includes(textFilter.toLowerCase())
  //       ));
  //       return filtered;
  //     })
  //   } else {
  //     setFilteredGames(games);
  //   }
  // }, [games, setFilteredGames, textFilter]);

  return (
    <Box>
      <Toolbar margin={ { top: '8px', left: '8px', right: '8px', bottom: '0' }} pad={'4px'} >
        <TextInput size='medium' icon={<Search />} onChange={filterGames} ></TextInput>
      </Toolbar>
      <Box height={'calc(100% - 6rem)'} pad={'medium'} >
        {
          filteredGames?.sort((a, b) => Date.parse(a?.dateTimeUTC) - Date.parse(b?.dateTimeUTC)).map((game) => 
          <Game
            addedToSlate={!!selectedGames.find((selectedGame) => game.gameID === selectedGame.gameID)}
            disable={disableSelection}
            key={game.gameID}
            game={game}
          />)
        }
      </Box>
      <BottomToolbar style={{
        boxShadow: '0px -1rem 2rem 0px rgba(0,0,0,0.28)'
      }} pad={'4px'} flex direction='column' justify='evenly' align='center' width={'100%'} >
          <Paragraph color={theme.colors.lightBlue} > Soup picks: {selectedGames.length}/10</Paragraph>
        <Box width={'100%'} flex direction='row' justify='center' align='center'>
          <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Reset Slate"/>
          <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate"/>
        </Box>
      </BottomToolbar>
    </Box>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"