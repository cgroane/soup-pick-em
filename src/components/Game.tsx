import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Matchup } from '../model'
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
 

const CheckboxContainer = styled(CardFooter)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
interface GameProps {
  game: Matchup;
  disable?: boolean;
  addedToSlate: boolean;
  hideCheckbox: boolean;
  addAndRemove: (game: Matchup) => void;
}
const Game: React.FC<GameProps> = ({
  game,
  addedToSlate,
  disable,
  hideCheckbox,
  addAndRemove
}: GameProps) => {

  const {
    canEdit
  } = useSlateContext();
  const { 
    isSlatePicker
  } = useGlobalContext();

  
  const {
    rankings,
    dateTime
  } = useGetTeamData(game);
  const final = useMemo(() => (game?.homeLineScores.length >= 4) || (game?.awayLineScores.length === 4),[game?.homeLineScores, game?.awayLineScores])

  return (
    <GameCard pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <Box flex align='stretch' justify='center'>
        <CardHeader width={'100%'} pad={"medium"} >
            <Paragraph>Away</Paragraph>
            <Paragraph>{game.homeTeam} {game.pointSpread > 0 ? `+${game.pointSpread}` : game.pointSpread}</Paragraph>
            <Paragraph>Home</Paragraph>
        </CardHeader>
        <CardBody flex direction='row' align='stretch' >
          <Box width={'30%'} height={'100%'} align='center' justify='center' >
            <TeamLogo src={game?.awayTeamData?.teamLogoUrl} fit='contain' />
            <Text>{ final && game?.awayPoints }</Text>
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
            <TeamLogo src={game?.homeTeamData?.teamLogoUrl} fit='contain' />
            <Text>{ final && game?.homePoints }</Text>
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