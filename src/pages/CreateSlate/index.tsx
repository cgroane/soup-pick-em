import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Paragraph, TextInput, Toolbar } from 'grommet';
import Game from '../../components/Game';
import styled from 'styled-components';
import {  Search } from 'grommet-icons';
import { theme } from '../../theme';
import { useSlateContext } from '../../context/slate';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { useGlobalContext } from '../../context/user';
import { UserCollectionData } from '../../model';
import { usePickContext } from '../../context/pick';
import FBSlateClassInstance from '../../firebase/slate/slate';
import Loading from '../../components/Loading';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import SelectWeek from '../../components/SelectWeek';
 

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

  /** contexts */
  const {
    games,
    selectedGames,
    filteredGames,
    setFilteredGames,
    fetchMatchups,
    deletions,
    canEdit
  } = useSlateContext()
  const {
    fetchSlate
  } = usePickContext()
  const { 
    setModalOpen,
    modalOpen,
    seasonData,
    setStatus,
    status
  } = useUIContext()
  const {
    user,
    users,
    isSlatePicker
  } = useGlobalContext();

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({ week: seasonData?.ApiWeek, year: seasonData?.Season });
  /** hooks */
  const navigate = useNavigate();

  const disableSelection = useMemo(() => selectedGames?.length >= 10 || !canEdit, [selectedGames, canEdit]);

  /** stateful operations */
  const filterGames = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextFilter(e.target.value);
  }, [setTextFilter]);

  useEffect(() => {
    Promise.all([
      fetchSlate({
        week: selectedWeek?.week,
        year: selectedWeek?.year
      }).then((result) => result),
      fetchMatchups({ 
        weekNumber: selectedWeek?.week,
        year: selectedWeek?.year
       })
    ]).then(() => setStatus(LoadingState.IDLE));
    
  }, [fetchMatchups, fetchSlate, setStatus, selectedWeek]);

  useEffect(() => {
    if (textFilter) {
      setFilteredGames(() => {
        const filtered = games.filter((game) =>
          JSON.stringify(Object.values(game)).includes(textFilter));
        return filtered;
      })
    } else {
      setFilteredGames(games);
    }
  }, [games, setFilteredGames, textFilter]);
  
  /** api request */
  const submitSlate = useCallback( async () => {
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    const uniqueId = `w${seasonData?.ApiWeek}-${seasonData?.ApiSeason}`
    await FBSlateClassInstance.addSlate({ 
      week: seasonData?.ApiWeek as number,
      uniqueWeek: uniqueId,
      providedBy: user as UserCollectionData,
      games: selectedGames,
     }, users, deletions.length ? deletions : undefined).then(() => setStatus(LoadingState.IDLE));
  }, [seasonData?.ApiSeason, seasonData?.ApiWeek, user, setStatus, selectedGames, setModalOpen, deletions, users]);
  const viewingOldData = useMemo(() => {
    if ((seasonData?.Season as number) > (selectedWeek?.year as number)) {
      return true;
    } else if (( seasonData?.ApiWeek as number ) > (selectedWeek?.week as number)) {
      return true;
    } else {
      return false;
    }
  }, [selectedWeek, seasonData?.Season, seasonData?.ApiWeek]);

  return (
    <>
      <Box>
        <Toolbar margin={ { top: '8px', left: '8px', right: '8px', bottom: '0' }} pad={'4px'} >
          <TextInput size='medium' icon={<Search />} onChange={filterGames} ></TextInput>
        </Toolbar>
        <SelectWeek
          heading={<></>}
          onChange={(val, name) => setSelectedWeek((prev) => ({ ...prev, [name]: val }))}
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
              addedToSlate={!!selectedGames?.find((selectedGame) => game.gameID === selectedGame.gameID)}
              disable={disableSelection}
              hideCheckbox={viewingOldData}
              key={game.gameID}
              game={game}
            />)
          }
        </Box>
        {(isSlatePicker && canEdit && viewingOldData) && 
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

        </Modal>
      )}
    </>
  )
}
 
export default CreateSlate
 
CreateSlate.displayName = "CreateSlate"