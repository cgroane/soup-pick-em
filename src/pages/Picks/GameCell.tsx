import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Matchup, Outcome } from '../../model'
import { TableCell, TableCellProps } from 'grommet';

const StyledGameCell = styled(TableCell)<{ correct?: boolean }>`
  background-color: ${({correct, theme}) => correct ? theme.colors.brand : `red`};
  color: black;
  :first-of-type {
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
  }
  :last-of-type {
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
  }
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
      const homePick = (game?.homeTeamName.toLowerCase().replace(/ /g , '') === outcome?.name?.toLowerCase().replace(/ /g , '')) ? 'homeTeam' : 'awayTeam';
    
      const newScore = game[`${homePick}Score`] + outcome?.point;
      return newScore > game[`${homePick === 'homeTeam' ? 'awayTeam' : 'homeTeam'}Score`];
    } else return false
  }, [game, outcome?.name, outcome?.point]);
  return (
    <StyledGameCell correct={correct}>
      {children}
    </StyledGameCell>
  )
}
 
export default GameCell
 
GameCell.displayName = "GameCell"