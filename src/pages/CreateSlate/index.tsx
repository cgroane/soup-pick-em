import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Paragraph, Spinner, Text, TextInput, Toolbar } from 'grommet';
import Game from '../../components/Game';
import styled from 'styled-components';
import { Checkmark, Search } from 'grommet-icons';
import { theme } from '../../theme';
import { useSlateContext } from '../../context/slate';
import { getWeek } from '../../utils/getWeek';
import { useNavigate } from 'react-router-dom';
import { useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { useGlobalContext } from '../../context/user';
import { UserCollectionData } from '../../model';
import { createSlate } from '../../firebase/slate/create';
 
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
    loading,
    setLoading,
    fetchMatchups
  } = useSlateContext()
  const { 
    setModalOpen,
    modalOpen
  } = useUIContext()
  const {
    user
  } = useGlobalContext()

  const navigate = useNavigate();

  const disableSelection = useMemo(() => selectedGames.length >= 10, [selectedGames]);

  const filterGames = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextFilter(e.target.value);
  }, [setTextFilter]);

  useEffect(() => {
    fetchMatchups();
  }, [fetchMatchups]);


  useEffect(() => {
    if (textFilter) {
      setFilteredGames(() => {
        const filtered = games.filter((game) =>
          Object.values(game).some((val) => typeof val === 'string' && val.toLowerCase().includes(textFilter.toLowerCase())
        ));
        return filtered;
      })
    } else {
      setFilteredGames(games);
    }
  }, [games, setFilteredGames, textFilter]);
  const submitSlate = async () => {
    setLoading('loading');
    setModalOpen(true);
    await createSlate(getWeek().week, selectedGames, user as UserCollectionData).then(() => {
      setLoading('idle');
    })
  }

  return (
    <>
      <Box>
        <Toolbar margin={ { top: '8px', left: '8px', right: '8px', bottom: '0' }} pad={'4px'} >
          <TextInput size='medium' icon={<Search />} onChange={filterGames} ></TextInput>
        </Toolbar>
        <Box height={'calc(100% - 6rem)'} pad={'medium'} align='center' >
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
            <Button onClick={() => submitSlate()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={selectedGames.length < 10} />
          </Box>
        </BottomToolbar>
      </Box>
      {modalOpen && (
        <Modal actions={[
          {
            label: 'Make your picks',
            onClick: () => {
              navigate('/slate')
              setModalOpen(false)
            }
          }
        ]} >
          { loading === 'loading' ? <Spinner /> :  (
            <Box width={'100%'} >
              <Text color={'black'} >Done</Text>
              <Checkmark color='primary' />
            </Box>
          )}
        </Modal>
      )}
    </>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"