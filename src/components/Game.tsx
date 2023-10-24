import React from 'react'
import styled from 'styled-components'
import { Matchup } from '../model'
import {
  Box,
  CardBody,
  CardFooter,
  CardHeader,
  CheckBox,
  Heading,
  Paragraph
} from 'grommet';
import { useSlateContext } from '../context/slate';
import { GameCard, TeamLogo } from './Styled';
import { useGetTeamData } from '../hooks/useGetTeamData';
 

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
}
const Game: React.FC<GameProps> = ({
  game,
  addedToSlate,
  disable = false
}: GameProps) => {

  const {
    addAndRemove
  } = useSlateContext();
  
  const {
    rankings,
    dateTime
  } = useGetTeamData(game);


  return (
    <GameCard pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <Box flex align='stretch' justify='center'>
        <CardHeader width={'100%'} pad={"medium"} >
            <Paragraph>Away</Paragraph>
            <Paragraph>{game.homeTeam} {game.pointSpread > 0 ? `+${game.pointSpread}` : game.pointSpread}</Paragraph>
            <Paragraph>Home</Paragraph>
        </CardHeader>
        <CardBody flex direction='row' align='stretch' >
          <Box width={'40%'} height={'100%'} align='center' justify='center' >
            <TeamLogo src={game?.awayTeamData?.teamLogoUrl} fit='contain' />
            <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.awayRank ? `#${rankings.awayRank}` : ``} {game.awayTeamName}</Heading>
          </Box>
          <Box flex align='center' justify='center' >
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}, {dateTime.year} 
            </Paragraph>
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
            </Paragraph>

          </Box>
          <Box width={'40%'} height={'100%'} align='center' justify='center' >
            <TeamLogo src={game?.homeTeamData?.teamLogoUrl} fit='contain' />
            <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeamName}</Heading>
          </Box>
        </CardBody>
        <CheckboxContainer
          height={'2rem'}
          margin={'4px'}
        >
          <CheckBox
            label='Add to slate'
            checked={addedToSlate}
            onChange={() => addAndRemove(game)}
            disabled={disable && !addedToSlate}
          />
          {/* {
            game.theOddsId && (
              <OtherMarkets
                gameId={game.theOddsId}
                addToSlate={addToSlate}
                addedToSlate={addedToSlate}
                disableSelections={disable}
              />
            )
          } */}
        </CheckboxContainer>
      </Box>
    </GameCard>
  )
}
 
export default Game
 
Game.displayName = "Game"