import React, { useMemo } from 'react'
import styled from 'styled-components'
import {
  Box,
  CardBody,
  CardFooter,
  CardHeader,
  CheckBox,
  Heading,
  Paragraph,
  Text
} from 'grommet';
import { useSlateContext } from '../context/slate';
import { GameCard, TeamLogo } from './Styled';
import { useGetTeamData } from '../hooks/useGetTeamData';
import { useGlobalContext } from '../context/user';
import { GamesAPIResult } from '@/model';


const CheckboxContainer = styled(CardFooter)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
interface GameProps {
  game: GamesAPIResult;
  disable?: boolean;
  addedToSlate: boolean;
  hideCheckbox: boolean;
}
const Game: React.FC<GameProps> = ({
  game,
  addedToSlate,
  disable,
  hideCheckbox
}: GameProps) => {

  const {
    addAndRemove,
    canEdit
  } = useSlateContext();
  const {
    isSlatePicker
  } = useGlobalContext();


  const {
    rankings,
    dateTime
  } = useGetTeamData(game);
  const final = useMemo(() => (game?.completed), [game?.completed])

  return (
    <GameCard pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <Box flex align='stretch' justify='center'>
        <CardHeader width={'100%'} pad={"medium"} >
          <Paragraph>Away</Paragraph>
          <Paragraph>{game.homeTeam} {(game?.pointSpread || 0) > 0 ? `+${game.pointSpread}` : game.pointSpread}</Paragraph>
          <Paragraph>Home</Paragraph>
        </CardHeader>
        <CardBody flex direction='row' align='stretch' >
          <Box width={'30%'} height={'100%'} align='center' justify='center' >
            <TeamLogo src={game?.awayTeamData?.logos?.[0]} fit='contain' />
            <Text>{final && game?.awayPoints}</Text>
            <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.awayRank ? `#${rankings.awayRank}` : ``} {game.awayTeam}</Heading>
          </Box>
          <Box flex align='center' justify='center' >
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}, {dateTime.year}
            </Paragraph>
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
            </Paragraph>

          </Box>
          <Box width={'30%'} height={'100%'} align='center' justify='center' >
            <TeamLogo src={game?.homeTeamData?.logos?.[0]} fit='contain' />
            <Text>{final && game?.homePoints}</Text>
            <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeam}</Heading>
          </Box>
        </CardBody>
        {
          (isSlatePicker && !hideCheckbox) && (
            <CheckboxContainer
              height={'2rem'}
              margin={'4px'}
            >
              <CheckBox
                label={`Add${addedToSlate ? 'ed' : ''} to slate`}
                checked={addedToSlate}
                onChange={() => addAndRemove(game)}
                disabled={(disable && !addedToSlate) || !canEdit}
              />
            </CheckboxContainer>
          )
        }

      </Box>
    </GameCard>
  )
}

export default Game

Game.displayName = "Game"