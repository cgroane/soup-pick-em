import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Paragraph, Spinner, TextInput, Toolbar } from 'grommet';
import Game from '../../components/Game';
import styled from 'styled-components';
import {  Search } from 'grommet-icons';
import { theme } from '../../theme';
import { useSlateContext } from '../../context/slate';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { useGlobalContext } from '../../context/user';
import { Matchup, UserCollectionData } from '../../model';
import { usePickContext } from '../../context/pick';
import FBSlateClassInstance from '../../firebase/slate/slate';
import Loading from '../../components/Loading';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import SelectWeek from '../../components/SelectWeek';
import { StatusGood } from 'grommet-icons';
 

/**
 * TODO
 * style fixes
 * bottom bar overlaps content
 * narrow screen content overlaps
 */
const BottomToolbar = styled(Toolbar)`
  position: sticky;
  bottom: 0%;
  left: 0;
  width: 100%;
  height: 8rem;
  background-color: ${({theme}) => theme.colors.darkBlue};
`

const CreateSlate: React.FC = () => {
  const [textFilter, setTextFilter] = useState('');
  /**
   * should use local state
   * submit slate affixed with POST if week is POST
   */
  
  /** contexts */
  const {
    games,
    filteredGames,
    setFilteredGames,
    fetchMatchups,
    canEdit,
  } = useSlateContext()
  const {
    fetchSlate,
    slate
  } = usePickContext()
  const { 
    setModalOpen,
    modalOpen,
    seasonData,
    setStatus,
    status,
  } = useUIContext()
  const {
    user,
    users,
    isSlatePicker
  } = useGlobalContext();
  const [selectedGames, setSelectedGames] = useState<Matchup[]>([]);
  const [deletions, setDeletions] = useState<number[]>([]);
  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek,
    year: seasonData?.Season,
    seasonType: seasonData?.seasonType as 'postseason' | 'regular'
  });
  /** hooks */
  const navigate = useNavigate();
  useEffect(() => {
    setSelectedGames(slate?.games ?? []);
  }, [slate, setSelectedGames])

  /** stateful operations */
  const filterGames = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextFilter(e.target.value);
  }, [setTextFilter]);

  useEffect(() => {
    Promise.all([
      fetchSlate({
        week: selectedWeek?.week,
        year: selectedWeek?.seasonType === 'postseason' ? selectedWeek?.year?.toString() + 'POST' : selectedWeek?.year?.toString()
      }).then((result) => result),
      fetchMatchups({ 
        weekNumber: selectedWeek?.week,
        year: selectedWeek?.year,
        seasonType: selectedWeek?.seasonType
       })
    ]).then(() => setStatus(LoadingState.IDLE));
    
  }, [fetchMatchups, fetchSlate, setStatus, selectedWeek]);

  useEffect(() => {
    if (textFilter) {
      setFilteredGames(() => {
        const filtered = games.filter((game) => 
          JSON.stringify(Object.values(game)).toLowerCase().includes(textFilter.toLowerCase()));
        return filtered;
      })
    } else {
      setFilteredGames(games);
    }
  }, [games, setFilteredGames, textFilter]);

  const addAndRemove = (game: Matchup) => {
    const found = selectedGames.findIndex((selectedGame) => game.gameID === selectedGame.gameID);
    const dels = [...deletions];
    const newSelections = [...selectedGames];
    if (found >= 0) {
      newSelections.splice(found, 1);
      const deletedItem = slate?.games.find((g) => g.gameID === selectedGames[found].gameID)
      if (deletedItem) {
        dels.push(found);
        setDeletions(dels);
      }
    } else {
      const newGame = Object.assign({}, game);
      newGame.awayTeamData = Object.assign({}, game.awayTeamData);
      newGame.homeTeamData = Object.assign({}, game.homeTeamData);
      newSelections.push(newGame as Matchup);
      
    }
    setSelectedGames(newSelections);
  }
  
  /** api request */
  const submitSlate = useCallback( async () => {
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    const uniqueId = `w${selectedWeek.week}-${selectedWeek.year}${selectedWeek?.seasonType === 'postseason' ? 'POST' : ''}`
    await FBSlateClassInstance.addSlate({ 
      week: selectedWeek?.week as number,
      uniqueWeek: uniqueId,
      providedBy: user as UserCollectionData,
      games: selectedGames,
     }, users, deletions.length ? deletions : undefined).then(() => setStatus(LoadingState.IDLE));
  }, [selectedWeek, user, setStatus, selectedGames, setModalOpen, deletions, users]);
  
  const disableSelection = useMemo(() => selectedGames?.length >= 10 || !canEdit, [selectedGames, canEdit]);

  return (
    <>
      <Box>
        <Toolbar margin={ { top: '8px', left: '8px', right: '8px', bottom: '0' }} pad={'4px'} >
          <TextInput size='medium' icon={<Search />} onChange={filterGames} ></TextInput>
        </Toolbar>
        <SelectWeek
          vals={{ week: selectedWeek.week as number, year: selectedWeek.year as number }}
          heading={<></>}
          onChange={setSelectedWeek}
        />
        {
          status === LoadingState.LOADING ? (
            <Loading iterations={3} type='gameCard'/>
          ) : (
            <>
            <Box height={'calc(100% - 6rem)'} pad={'medium'} align='center' >
          {
            filteredGames?.map((game) => 
            <Game
              addAndRemove={addAndRemove}
              addedToSlate={!!selectedGames?.find((selectedGame) => game.gameID === selectedGame.gameID)}
              disable={disableSelection}
              hideCheckbox={!isSlatePicker}
              key={game.gameID}
              game={game}
            />)
          }
        </Box>
        {(canEdit) && 
        <BottomToolbar style={{
          boxShadow: '0px -1rem 2rem 0px rgba(0,0,0,0.28)'
        }} pad={'4px'} flex direction='column' justify='evenly' align='center' width={'100%'} >
            <Paragraph color={theme.colors.lightBlue} > Soup picks: {selectedGames?.length}/10</Paragraph>
          <Box width={'100%'} flex direction='row' justify='center' align='center'>
            <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Reset Slate"/>
            <Button onClick={() => submitSlate()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={selectedGames?.length < 10} />
          </Box>
        </BottomToolbar>}
            </>
          )
        }
        
      </Box>
      {modalOpen && (
        <Modal actions={[
          {
            label: 'Make your picks',
            onClick: () => {
              navigate('/pick')
              setModalOpen(false)
            }
          }
        ]} >
          
            <Box margin={'0 auto'}>
              {status === LoadingState.LOADING && <Spinner color={'accent-1'} size='large' />}
              {status === LoadingState.IDLE && <StatusGood color='accent-1' size='xlarge' />}
            </Box>
          
        </Modal>
      )}
    </>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"