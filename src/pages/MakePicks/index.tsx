import React, { useCallback, useState } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Box, Button, Paragraph, Spinner, Text, Toolbar } from 'grommet';
import styled from 'styled-components';
import { theme } from '../../theme';
import { makePicks } from '../../firebase/picks';
import { UserCollectionData } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useNavigate } from 'react-router-dom';
import { useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { Checkmark } from 'grommet-icons';

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
    // setPicks,
    slate,
    // setSlate
  } = usePickContext()
  const {
    user
  } = useGlobalContext();
  const navigate = useNavigate();

  const {
    modalOpen,
    setModalOpen
  } = useUIContext()

  const [loading, setLoading] = useState('');

  const submitPicks = useCallback( async () => {
    if (!user) navigate('/login');
    setLoading('loading');
    setModalOpen(true);
    await makePicks(user as UserCollectionData, {slateId: slate.uniqueWeek, picks}).then((res) => {
      setLoading('idle');
    })
  }, [navigate, setLoading, setModalOpen, picks, user, slate.uniqueWeek]);

  return (
    <>
      <Box>
        <Box height={'calc(100% - 6rem)'} pad={'medium'} align='center'>
          {slate?.games?.map((game) => <PickCard game={game} />)}
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
          <Paragraph color={theme.colors.lightBlue} >Picks: {picks.length}/10</Paragraph>
          <Box width={'100%'} flex direction='row' justify='center' align='center'>
            <Button margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Reset Slate"/>
            <Button onClick={() => submitPicks()} margin={'4px'} pad={'8px'} primary color={'white'} size='medium' label="Submit Slate" disabled={picks.length < 10} />
          </Box>
        </BottomToolbar>
      </Box>
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
 
export default MakePicks
 
MakePicks.displayName = "MakePicks"