import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Matchup, Outcome } from '../../model'
import { Box, TableCell, TableCellProps } from 'grommet';

const StyledGameCell = styled(TableCell)`
  text-align: center;
  background-color: white;
  color: black;
  border-left: 1px solid grey;
  font-size: 12px;
  :last-of-type {
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
  }
`;

const TextContainer = styled(Box)<{ correct?: boolean }>`
  border-radius: 4px;
`
 
interface GameCellProps extends TableCellProps, React.PropsWithChildren {
  game: Matchup;
  outcome: Outcome;
}

const GameCell: React.FC<GameCellProps> = ({
  game,
  outcome,
  children
}: GameCellProps) => {
  const correct = useMemo(() => {
    if (game) {
      const homePick = (game?.homeTeamName?.toLowerCase().replace(/ /g , '') === outcome?.name?.toLowerCase().replace(/ /g , '')) ? 'homeTeam' : 'awayTeam';
      
      const newScore = game[`${homePick}Score`] + outcome?.point;
      return newScore > game[`${homePick === 'homeTeam' ? 'awayTeam' : 'homeTeam'}Score`];
    } else return false
  }, [game, outcome?.name, outcome?.point]);
  return (
    <StyledGameCell border={'between'} pad={'4px'}>
      <TextContainer background={correct ? 'brand' : 'error'} >
        {children}
      </TextContainer>
    </StyledGameCell>
  )
}
 
export default GameCell
 
GameCell.displayName = "GameCell"