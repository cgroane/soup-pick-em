import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { GameCard, TeamLogo } from '../../components/Styled'
import { Box, Button, CardBody, CardHeader, Heading, Paragraph } from 'grommet'
import { GamesAPIResponseOutcome, GamesAPIResult, Picks } from '../../model'
import { useGetTeamData } from '../../hooks/useGetTeamData'
import { usePickContext } from '../../context/pick'
import { useGlobalContext } from '../../context/user'
import { useUIContext } from '../../context/ui'
import { Lock } from 'grommet-icons'

const Team = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  opacity: 1;
`
const TeamWrapper = styled(Box) <{ selected: boolean }>`
  cursor: pointer;
  position: relative;
  border-radius: 12px;
  ${({ selected }) => selected ? `
    background: radial-gradient(circle, rgba(144, 209, 240, 0.2) 0%, rgba(144, 209, 240, 0.3) 15%, rgba(144, 209, 240,0.8) 100%);
  ` : ``}
  :hover {
    background-color:  rgba(0, 0, 0, 0.1);
  }
`;
const Push = styled(Button) <{ selected: boolean }>`
  width: 80%;
  font-size: 12px;
  padding: 4px;
  ${({ selected, theme }) => selected ? `
    background: ${theme.colors.brand};
    color: white;
  ` : ``}
`

interface PickCardProps {
  game: GamesAPIResult
}
const PickCard: React.FC<PickCardProps> = ({
  game,
}: PickCardProps) => {
  const {
    user,
  } = useGlobalContext();

  const {
    rankings,
    dateTime,
  } = useGetTeamData(game);

  const {
    addPick,
    slate,
  } = usePickContext();
  const {
    seasonData
  } = useUIContext();

  const [choice, setChoice] = useState<GamesAPIResponseOutcome>({ name: 'PUSH', point: '0', pointValue: 0, id: 0 });
  const pastDate = useMemo(() => {
    return (Date.parse(game?.startDate) < Date.parse(new Date().toDateString()))
  }, [game])

  const getSelected = useCallback((choiceId: number) => {
    return typeof choice === 'object' ? choice?.id === choiceId : false
  }, [choice]);

  useEffect(() => {
    if (user?.pickHistory?.length) {
      const pick = user?.pickHistory?.find((p) => p.slateId === slate.uniqueWeek);
      const thisPick = pick?.picks.find((p) => p.matchup === game.id);
      setChoice(thisPick?.selection as GamesAPIResponseOutcome);
    }
  }, [setChoice, user?.pickHistory, game.id, slate.uniqueWeek]);


  const makeSelection = useCallback((outcome: GamesAPIResponseOutcome) => {
    const pick: Picks = {
      matchup: game.id,
      userId: user?.uid as string,
      isCorrect: false,
      week: seasonData?.ApiWeek as number,
      selection: outcome as GamesAPIResponseOutcome
    }
    addPick(pick);
    setChoice(outcome);
  }, [addPick, game.id, user?.uid, seasonData?.ApiWeek]);

  return (
    <>
      <GameCard disabled={pastDate} pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
        <Box flex align='stretch' justify='center'>
          <CardHeader width={'100%'} pad={"medium"} >
            <Paragraph>Away</Paragraph>
            <Paragraph>{game.homeTeam} {(game?.pointSpread || 0) > 0 ? `+${game.pointSpread}` : game.pointSpread}</Paragraph>
            <Paragraph>Home</Paragraph>
          </CardHeader>
          <CardBody flex direction='row' align='stretch' >
            <TeamWrapper
              onClick={!pastDate ? () => makeSelection(game.outcomes?.away as GamesAPIResponseOutcome) : undefined}
              selected={getSelected(2)}
              width={'37%'}
              height={'100%'}
            >
              <Team pad={'8px'} width={'100%'} height={'100%'} align='center' justify='center'  >
                <TeamLogo src={game?.awayTeamData?.logos?.[0]} fit='contain' />
                <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.awayRank ? `#${rankings.awayRank}` : ``} {game.awayTeam}</Heading>
              </Team>
            </TeamWrapper>
            <Box flex align='center' justify='center' width={'20%'} >
              {pastDate && <Lock color='brand' />}
              <Paragraph margin={'4px'} size='12px' textAlign='center' >
                {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}, {dateTime.year}
              </Paragraph>
              <Paragraph margin={'4px'} size='12px' textAlign='center' >
                {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
              </Paragraph>
              {
                !(game.pointSpread as number % 0.5) &&
                <Push
                  margin={{ top: '4px' }}
                  label="PUSH"
                  onClick={!pastDate ? () => makeSelection({ name: "PUSH", point: '0', pointValue: 0, id: 0 }) : undefined}
                  selected={choice?.name === "PUSH"}
                />
              }

            </Box>
            <TeamWrapper
              onClick={!pastDate ? () => makeSelection(game?.outcomes?.home as GamesAPIResponseOutcome) : undefined}
              width={'37%'}
              height={'100%'}
              selected={getSelected(1)}
            >
              <Team pad={'8px'} width={'100%'} height={'100%'} align='center' justify='center' >
                <TeamLogo src={game?.homeTeamData?.logos?.[0]} fit='contain' />
                <Heading textAlign='center' margin='0' level={'4'} size='12px'>{rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeam}</Heading>
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