import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Matchup } from '../model'
import {
  Box,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CheckBox,
  Heading,
  Image,
  Paragraph
} from 'grommet';
import { daysOfTheWeek, months } from '../utils/getWeek';
 

const GameCard = styled(Card)`
  height: 18rem;
`;
const TeamLogo = styled(Image)`
  width: 3rem;
  height: 3rem;
`;

const CheckboxContainer = styled(CardFooter)`
  display: flex;
  align-items: center;
  justify-content: center;
`;
interface GameProps {
  game: Matchup;
  disable?: boolean;
  addToSlate: (game: Matchup) => void;
  addedToSlate: boolean;
}
const Game: React.FC<GameProps> = ({
  game,
  addToSlate,
  addedToSlate,
  disable = false
}: GameProps) => {

  const dateTime = useMemo(() => {
    const converted = new Date(game.dateTime)
    return {
      dayOfTheWeek: daysOfTheWeek[converted.getDay() - 1],
      minutes: converted.getMinutes().toLocaleString('en-US', {
        minimumIntegerDigits: 2
      }),
      hours: converted.getHours() > 12 ? converted.getHours() - 12 : converted.getHours(),
      amPm: converted.getHours() > 12 ? 'P.M.' : 'A.M.',
      dayOfTheMonth: converted.getDay(),
      year: converted.getFullYear(),
      month: months[converted.getMonth() - 1]
    }
  }, [game.dateTime]);

  const rankings = useMemo(() => {
    return {
      awayRank: game.awayTeamData.playoffRank ? game.awayTeamData.playoffRank : game.awayTeamData.apRank,
      homeRank: game.homeTeamData.playoffRank ? game.homeTeamData.playoffRank : game.homeTeamData.apRank,
    }
  }, [game.awayTeamData, game.homeTeamData]);


  return (
    <GameCard pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <Box flex align='start' justify='center'>
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
          <Box align='center' justify='center' >
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
        <CheckboxContainer height={'2rem'} margin={'4px'} >
          <CheckBox
            label='Add to slate'
            checked={addedToSlate}
            onChange={() => addToSlate(game)}
            disabled={disable && !addedToSlate}
          />
        </CheckboxContainer>
      </Box>
    </GameCard>
  )
}
 
export default Game
 
Game.displayName = "Game"