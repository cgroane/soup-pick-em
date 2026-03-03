import React from 'react';
import { GamesAPIResult } from '../../model';
import { cn } from 'lib/utils';

export const StyledGameCell = ({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn(
      'text-center bg-white text-black border-l border-gray-400 text-xs last:rounded-tr-xl last:rounded-br-xl',
      className
    )}
    {...props}
  >
    {children}
  </td>
);

interface GameCellProps extends React.TdHTMLAttributes<HTMLTableCellElement>, React.PropsWithChildren {
  game: GamesAPIResult & { isCorrect: boolean };
}

const GameCell: React.FC<GameCellProps> = ({ game, children, ...rest }: GameCellProps) => {
  return (
    <StyledGameCell {...rest}>
      <div
        className={cn(
          'rounded px-1 py-0.5',
          game?.isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
        )}
      >
        {children}
      </div>
    </StyledGameCell>
  );
};

export default GameCell;

GameCell.displayName = 'GameCell';
