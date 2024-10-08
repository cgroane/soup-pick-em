import React, { useCallback, useEffect } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Box, Button, Paragraph, Spinner, Toolbar } from 'grommet';
import styled from 'styled-components';
import { theme } from '../../theme';
import { Picks, UserCollectionData } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { StatusGood } from 'grommet-icons';
import FirebaseUsersClassInstance from '../../firebase/user/user';

/**
 * TODO
 * style fixes
 * bottom bar overlaps content
 * narrow screen content overlaps
 */

const BottomToolbar = styled(Toolbar)`
  position: fixed;
  bottom: 0%;
  left: 0;
  width: 100%;
  height: 8rem;
  background-color: ${({theme}) => theme.colors.darkBlue};
`;
 
const MakePicks: React.FC = () => {
  const {
    picks,
    slate,
    fetchSlate,
    getUserPicks,
  } = usePickContext()
  const {
    user,
    setUser
  } = useGlobalContext();
  const navigate = useNavigate();

  const {
    modalOpen,
    setModalOpen,
    status,
    setStatus,
    seasonData
  } = useUIContext();

  const getDataForPage = useCallback(async () => {
    const compoundRequest = Promise.all([
      await fetchSlate({ }),
      await getUserPicks()
    ]);
    const [slateResult] = await compoundRequest;
    if (slateResult) setStatus(LoadingState.IDLE);
  }, [fetchSlate, setStatus, getUserPicks]);

  useEffect(() => {
    getDataForPage();
  }, [getDataForPage]);

  const ifMissingGames = useCallback((picksToCheck: Picks[]) => {
    if (picksToCheck.length < 10) {
      const missingGames = slate?.games?.filter((game) => !picksToCheck.find((pick) => pick.matchup === game.gameID));
      return Array.from([...picksToCheck, ...missingGames?.map((game) => ({
          matchup: game.gameID,
          isCorrect: false,
          userId: user?.uid,
          selection: {
            name: 'PUSH',
            point: 0,
            price: 0,
          },
          week: seasonData?.ApiWeek
        }))
      ])
    }
    else return picksToCheck;
  }, [slate?.games, seasonData?.ApiWeek, user?.uid]);

  const submitPicks = useCallback( async () => {
    if (!user) navigate('/');
    setStatus(LoadingState.LOADING)
    setModalOpen(true);
    await FirebaseUsersClassInstance.addDocument({ 
      name: `${user?.fName} ${user?.lName}`,
      slateId: picks?.slateId,
      week: slate?.week,
      year: seasonData?.Season,
      picks: ifMissingGames(picks?.picks),
      userId: user?.uid
    }, user?.uid, ['picks', picks.slateId]).then(() => {
      FirebaseUsersClassInstance.getDocumentInCollection(user?.uid as string).then((resp) => setUser(resp as UserCollectionData))
      setStatus(LoadingState.IDLE);
    })
  }, [navigate, setModalOpen, picks, user, setUser, setStatus, seasonData?.Season, slate?.week, ifMissingGames]);

  return (
    <>
        <Box height={'calc(100% - 6rem)'} margin={{ bottom: '8rem' }} pad={'medium'} align='center'>
          {slate?.games?.map((game) => <PickCard key={game.gameID} game={game} />)}
        </Box>
        <BottomToolbar 
          style={{
            boxShadow: '0px -1rem 2rem 0px rgba(0,0,0,0.28)'
          }}
          pad={'4px'}
          flex
          direction='column'
          justify='evenly'
          align='center'
          width={'100%'}
        >
          <Paragraph color={theme.colors.lightBlue} >Picks: {picks.picks.filter((p) => !!p.selection).length}/10</Paragraph>
          <Box width={'100%'} flex direction='row' justify='center' align='center'>
          <Button onClick={() => submitPicks()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={picks.picks.filter(p => !!p.selection).length < 10} />
          </Box>
        </BottomToolbar>
      {modalOpen && (
        <Modal actions={[
          {
            label: 'PROFILE',
            onClick: () => {
              navigate('/profile')
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
 
export default MakePicks
 
MakePicks.displayName = "MakePicks"