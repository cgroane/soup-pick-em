import React from 'react'
import styled from 'styled-components'
import { Matchup } from '../../model'
import { Box, TableCell, TableCellProps } from 'grommet';

export const StyledGameCell = styled(TableCell)`
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
  game: Matchup & { isCorrect: boolean };
}

const GameCell: React.FC<GameCellProps> = ({
  game,
  children
}: GameCellProps) => {
  return (
    <StyledGameCell border={'between'} pad={'4px'}>
      <TextContainer background={game?.isCorrect ? 'brand' : 'error'} >
        {children}
      </TextContainer>
    </StyledGameCell>
  )
}
 
export default GameCell
 
GameCell.displayName = "GameCell"