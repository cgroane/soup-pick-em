import React, { useCallback, useEffect, useState } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Box, Button, Paragraph, Spinner, Text, Toolbar } from 'grommet';
import styled from 'styled-components';
import { theme } from '../../theme';
import { UserCollectionData } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { Checkmark } from 'grommet-icons';
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
    getUserPicks
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
    setStatus
  } = useUIContext()

  useEffect(() => {
    fetchSlate({ })
    getUserPicks()
  }, [fetchSlate, getUserPicks]);

  const submitPicks = useCallback( async () => {
    if (!user) navigate('/login');
    setStatus(LoadingState.LOADING)
    setModalOpen(true);
    await FirebaseUsersClassInstance.updateDocumentInCollection(user?.uid as string, { pickHistory: [...user?.pickHistory ?? [], picks] }).then(() => {
      setStatus(LoadingState.IDLE)
      FirebaseUsersClassInstance.getDocumentInCollection(user?.uid as string).then((resp) => setUser(resp as UserCollectionData))
    })
  }, [navigate, setModalOpen, picks, user, setUser]);
  

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
          <Paragraph color={theme.colors.lightBlue} >Picks: {picks.picks.length}/10</Paragraph>
          <Box width={'100%'} flex direction='row' justify='center' align='center'>
            <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Reset Slate"/>
            <Button onClick={() => submitPicks()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={picks.picks.length < 10} />
          </Box>
        </BottomToolbar>
      {modalOpen && (
        <Modal actions={[
          {
            label: 'Return to dashboard',
            onClick: () => {
              navigate('/dashboard')
              setModalOpen(false)
            }
          }
        ]} >
          { status === LoadingState.LOADING ? <Spinner /> :  (
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
 
export default MakePicks
 
MakePicks.displayName = "MakePicks"