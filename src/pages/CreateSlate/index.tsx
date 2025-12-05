import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Paragraph, Spinner, TextInput, Toolbar } from 'grommet';
import Game from '../../components/Game';
import styled from 'styled-components';
import { Search } from 'grommet-icons';
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
  background-color: ${({ theme }) => theme.colors.darkBlue};
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
    status,
  } = useUIContext()
  const {
    user,
    users,
    isSlatePicker
  } = useGlobalContext();

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek?.toString(),
    year: seasonData?.Season?.toString(),
    seasonType: seasonData?.seasonType as 'postseason' | 'regular'
  });
  /** hooks */
  const navigate = useNavigate();

  /** stateful operations */
  const filterGames = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextFilter(e.target.value);
  }, [setTextFilter]);

  useEffect(() => {
    Promise.all([
      fetchSlate({
        week: parseInt(selectedWeek?.week as string),
        year: selectedWeek?.seasonType === 'postseason' ? selectedWeek?.year + 'POST' : selectedWeek?.year
      }).then((result) => result),
      fetchMatchups({
        weekNumber: selectedWeek.seasonType === "postseason" ? 1 : parseInt(selectedWeek?.week as string),
        year: parseInt(selectedWeek?.year as string),
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

  /** api request */
  const submitSlate = useCallback(async () => {
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    const uniqueId = `w${selectedWeek.week}-${selectedWeek.year}${selectedWeek?.seasonType === 'postseason' ? 'POST' : ''}`
    await FBSlateClassInstance.addSlate({
      week: parseInt(selectedWeek?.week as string),
      uniqueWeek: uniqueId,
      providedBy: user as UserCollectionData,
      processed: false,
      games: selectedGames,
    }, users, deletions.length ? deletions : undefined).then(() => setStatus(LoadingState.IDLE));
  }, [selectedWeek, user, setStatus, selectedGames, setModalOpen, deletions, users]);

  const disableSelection = useMemo(() => selectedGames?.length >= 9 || !canEdit, [selectedGames, canEdit]);

  return (
    <>
      <Box>
        <Toolbar margin={{ top: '8px', left: '8px', right: '8px', bottom: '0' }} pad={'4px'} >
          <TextInput size='medium' icon={<Search />} onChange={filterGames} ></TextInput>
        </Toolbar>
        <SelectWeek
          vals={{ week: selectedWeek.week as string, year: selectedWeek.year as string }}
          heading={<></>}
          onChange={setSelectedWeek}
        />
        {
          status === LoadingState.LOADING ? (
            <Loading iterations={3} type='gameCard' />
          ) : (
            <>
              <Box height={'calc(100% - 6rem)'} pad={'medium'} align='center' >
                {
                  filteredGames?.map((game) =>
                    <Game
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
                  <Paragraph color={theme.colors.lightBlue} > Soup picks: {selectedGames?.length}/9</Paragraph>
                  <Box width={'100%'} flex direction='row' justify='center' align='center'>
                    <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Reset Slate" />
                    <Button onClick={() => submitSlate()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={selectedGames?.length < 9} />
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