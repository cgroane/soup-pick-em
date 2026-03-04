import React, { useMemo } from 'react';
import { useSlateContext } from '../context/slate';
import { useGetTeamData } from '../hooks/useGetTeamData';
import { useGlobalContext } from '../context/user';
import { GamesAPIResult } from '../model';
import { Checkbox } from './ui/checkbox';
import { cn } from 'lib/utils';

interface GameProps {
  game: GamesAPIResult;
  disable?: boolean;
  addedToSlate: boolean;
  hideCheckbox: boolean;
}

const Game: React.FC<GameProps> = ({ game, addedToSlate, disable, hideCheckbox }: GameProps) => {
  const { addAndRemove, canEdit } = useSlateContext();
  const { isSlatePicker } = useGlobalContext();
  const { rankings, dateTime } = useGetTeamData(game);
  const final = useMemo(() => game?.completed, [game?.completed]);

  return (
    <div
      className={cn(
        'w-full max-w-lg rounded-xl border border-border bg-surface my-1 p-5'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 text-sm text-muted-foreground">
        <span>Away</span>
        <span className="font-semibold text-foreground">
          {game.homeTeam} {(game?.pointSpread || 0) > 0 ? `+${game.pointSpread}` : game.pointSpread}
        </span>
        <span>Home</span>
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-2">
        {/* Away team */}
        <div className="flex-1 flex flex-col items-center justify-center p-2">
          <img
            src={game?.awayTeamData?.logos?.[0]}
            alt={game.awayTeam}
            className="w-12 h-12 object-contain"
          />
          {final && <p className="text-sm font-bold text-foreground">{game?.awayPoints}</p>}
          <p className="text-center text-xs mt-1 font-medium">
            {rankings.awayRank ? `#${rankings.awayRank}` : ''} {game.awayTeam}
          </p>
        </div>

        {/* Center: time */}
        <div className="flex flex-col items-center justify-center w-24">
          <p className="text-xs text-muted-foreground text-center">
            {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}, {dateTime.year}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
          </p>
        </div>

        {/* Home team */}
        <div className="flex-1 flex flex-col items-center justify-center p-2">
          <img
            src={game?.homeTeamData?.logos?.[0]}
            alt={game.homeTeam}
            className="w-12 h-12 object-contain"
          />
          {final && <p className="text-sm font-bold text-foreground">{game?.homePoints}</p>}
          <p className="text-center text-xs mt-1 font-medium">
            {rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeam}
          </p>
        </div>
      </div>

      {/* Checkbox footer */}
      {isSlatePicker && !hideCheckbox && (
        <div className="flex items-center justify-center mt-3 gap-2">
          <Checkbox
            id={`game-${game.id}`}
            checked={addedToSlate}
            onCheckedChange={() => addAndRemove(game)}
            disabled={(disable && !addedToSlate) || !canEdit}
          />
          <label htmlFor={`game-${game.id}`} className="text-sm text-foreground cursor-pointer">
            {addedToSlate ? 'Added to slate' : 'Add to slate'}
          </label>
        </div>
      )}
    </div>
  );
};

export default Game;

Game.displayName = 'Game';
