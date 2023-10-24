import React, { useCallback, useState } from 'react'
import styled from 'styled-components'
import { GameCard, TeamLogo } from '../../components/Styled'
import { Box, Button, CardBody, CardHeader, Heading, Paragraph } from 'grommet'
import { Matchup, Outcome, Picks } from '../../model'
import { useGetTeamData } from '../../hooks/useGetTeamData'
import { usePickContext } from '../../context/pick'
import { useGlobalContext } from '../../context/user'
import { getWeek } from '../../utils/getWeek'

const Team = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  opacity: 1;
`
const TeamWrapper = styled(Box)<{selected: boolean}>`
  cursor: pointer;
  position: relative;
  border-radius: 12px;
  ${({selected}) => selected ? `
    background: radial-gradient(circle, rgba(144, 209, 240, 0.2) 0%, rgba(144, 209, 240, 0.3) 15%, rgba(144, 209, 240,0.8) 100%);
  ` : ``}
  :hover {
    background-color:  rgba(0, 0, 0, 0.1);
  }
`;
const Push = styled(Button)<{selected: boolean}>`
  ${({ selected, theme }) => selected ? `
    background: ${theme.colors.brand};
    color: white;
  ` : ``}
`

interface PickCardProps {
  game: Matchup
}
const PickCard: React.FC<PickCardProps> = ({
  game,
}: PickCardProps) => {
  const {
    user
  } = useGlobalContext();

  const {
    rankings,
    dateTime,
  } = useGetTeamData(game);

  const {
    addPick,
  } = usePickContext();

  const [choice, setChoice] = useState('PUSH' as Outcome | 'PUSH');

  const getSelected = useCallback((ouctomeIndex: number) => {
    if (typeof choice === 'object') {
      return choice?.name?.toLowerCase().replace(/ /g, '') === game?.outcomes[ouctomeIndex]?.name?.toLowerCase().replace(/ /g, '');
    } else {
      return false;
    }
  }, [choice, game?.outcomes]);

  const makeSelection = useCallback((outcome: Outcome | "PUSH") => {
    const pick: Picks = {
      matchup: game.gameID,
      userId: user?.uid as string,
      isCorrect: false,
      week: getWeek().week,
      selection: outcome
    }
    addPick(pick);
    setChoice(outcome);
  }, [addPick, game.gameID, user?.uid]);
  
  return (
    <>
      <GameCard pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
      <Box flex align='stretch' justify='center'>
        <CardHeader width={'100%'} pad={"medium"} >
            <Paragraph>Away</Paragraph>
            <Paragraph>{game.homeTeam} {game.pointSpread > 0 ? `+${game.pointSpread}` : game.pointSpread}</Paragraph>
            <Paragraph>Home</Paragraph>
        </CardHeader>
        <CardBody flex direction='row' align='stretch' >
          <TeamWrapper 
            onClick={() => makeSelection(game.outcomes[1])}
            selected={getSelected(1)}
            width={'37%'}
            height={'100%'}
          >
            <Team pad={'8px'} width={'100%'} height={'100%'} align='center' justify='center'  >
              <TeamLogo src={game?.awayTeamData?.teamLogoUrl} fit='contain' />
              <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.awayRank ? `#${rankings.awayRank}` : ``} {game.awayTeamName}</Heading>
            </Team>
          </TeamWrapper>
          <Box flex align='center' justify='center' >
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}, {dateTime.year} 
            </Paragraph>
            <Paragraph margin={'4px'} size='12px' textAlign='center' >
              {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
            </Paragraph>
            {
              !(game.pointSpread % 0.5) &&
              <Push
                margin={{ top: '4px' }}
                label="PUSH"
                onClick={() => makeSelection("PUSH")}
                selected={choice === "PUSH"}
              />
            }

          </Box>
          <TeamWrapper
            onClick={() => makeSelection(game.outcomes[0])} 
            width={'37%'} 
            height={'100%'}  
            selected={getSelected(0)}
          >
            <Team pad={'8px'} width={'100%'} height={'100%'} align='center' justify='center' >
              <TeamLogo src={game?.homeTeamData?.teamLogoUrl} fit='contain' />
              <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeamName}</Heading>
            </Team>
          </TeamWrapper>
        </CardBody>
      </Box>
    </GameCard>
    </>
  )
}
 
export default PickCard
 
PickCard.displayName = "PickCard"