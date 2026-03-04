import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GamesAPIResponseOutcome, GamesAPIResult, Picks } from '../../model';
import { useGetTeamData } from '../../hooks/useGetTeamData';
import { usePickContext } from '../../context/pick';
import { useGlobalContext } from '../../context/user';
import { useUIContext } from '../../context/ui';
import { Lock } from 'lucide-react';
import { cn } from 'lib/utils';

interface PickCardProps {
  game: GamesAPIResult;
}

const PickCard: React.FC<PickCardProps> = ({ game }: PickCardProps) => {
  const { user } = useGlobalContext();
  const { rankings, dateTime } = useGetTeamData(game);
  const { addPick, slate } = usePickContext();
  const { seasonData } = useUIContext();

  const [choice, setChoice] = useState<GamesAPIResponseOutcome>({
    name: 'PUSH',
    point: '0',
    pointValue: 0,
    id: 0,
  });

  const pastDate = useMemo(() => {
    return Date.parse(game?.startDate) < Date.parse(new Date().toDateString());
  }, [game]);

  const getSelected = useCallback(
    (choiceId: number) => {
      return typeof choice === 'object' ? choice?.id === choiceId : false;
    },
    [choice]
  );

  useEffect(() => {
    if (user?.pickHistory?.length) {
      const pick = user?.pickHistory?.find((p) => p.slateId === slate.uniqueWeek);
      const thisPick = pick?.picks.find((p) => p.matchup === game.id);
      setChoice(thisPick?.selection as GamesAPIResponseOutcome);
    }
  }, [setChoice, user?.pickHistory, game.id, slate.uniqueWeek]);

  const makeSelection = useCallback(
    (outcome: GamesAPIResponseOutcome) => {
      const pick: Picks = {
        matchup: game.id,
        userId: user?.uid as string,
        isCorrect: false,
        week: seasonData?.ApiWeek as number,
        selection: outcome as GamesAPIResponseOutcome,
      };
      addPick(pick);
      setChoice(outcome);
    },
    [addPick, game.id, user?.uid, seasonData?.ApiWeek]
  );

  return (
    <div
      className={cn(
        'w-full max-w-lg rounded-xl border border-border bg-surface my-1 p-5',
        pastDate && 'opacity-60 cursor-not-allowed'
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
      <div className="flex items-stretch gap-2">
        {/* Away team */}
        <div
          onClick={!pastDate ? () => makeSelection(game.outcomes?.away as GamesAPIResponseOutcome) : undefined}
          className={cn(
            'flex-1 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer transition-colors relative',
            getSelected(2)
              ? 'bg-[radial-gradient(circle,rgba(144,209,240,0.2)_0%,rgba(144,209,240,0.3)_15%,rgba(144,209,240,0.8)_100%)]'
              : 'hover:bg-surface-elevated',
            pastDate && 'pointer-events-none'
          )}
        >
          <img
            src={game?.awayTeamData?.logos?.[0]}
            alt={game.awayTeam}
            className="w-12 h-12 object-contain"
          />
          <p className="text-center text-xs mt-1 font-medium">
            {rankings.awayRank ? `#${rankings.awayRank}` : ''} {game.awayTeam}
          </p>
        </div>

        {/* Center: time + push */}
        <div className="flex flex-col items-center justify-center w-20 gap-1">
          {pastDate && <Lock className="h-4 w-4 text-primary" />}
          <p className="text-xs text-muted-foreground text-center">
            {dateTime.dayOfTheWeek}, {dateTime.month} {dateTime.dayOfTheMonth}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            {dateTime.hours}:{dateTime.minutes} {dateTime.amPm}
          </p>
          {!(game.pointSpread as number % 0.5) && (
            <button
              onClick={!pastDate ? () => makeSelection({ name: 'PUSH', point: '0', pointValue: 0, id: 0 }) : undefined}
              disabled={pastDate}
              className={cn(
                'w-full text-xs py-1 px-2 rounded border border-border transition-colors',
                choice?.name === 'PUSH'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-elevated text-foreground hover:bg-border'
              )}
            >
              PUSH
            </button>
          )}
        </div>

        {/* Home team */}
        <div
          onClick={!pastDate ? () => makeSelection(game?.outcomes?.home as GamesAPIResponseOutcome) : undefined}
          className={cn(
            'flex-1 rounded-xl flex flex-col items-center justify-center p-3 cursor-pointer transition-colors relative',
            getSelected(1)
              ? 'bg-[radial-gradient(circle,rgba(144,209,240,0.2)_0%,rgba(144,209,240,0.3)_15%,rgba(144,209,240,0.8)_100%)]'
              : 'hover:bg-surface-elevated',
            pastDate && 'pointer-events-none'
          )}
        >
          <img
            src={game?.homeTeamData?.logos?.[0]}
            alt={game.homeTeam}
            className="w-12 h-12 object-contain"
          />
          <p className="text-center text-xs mt-1 font-medium">
            {rankings.homeRank ? `#${rankings.homeRank}` : ''} {game.homeTeam}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PickCard;

PickCard.displayName = 'PickCard';
