import React, { useCallback, useMemo } from 'react';
import { CFPRound, GamesAPIResponseOutcome, GamesAPIResult, Picks } from '../../model';
import { cfpRound } from '../../context/cfp';
import { cn } from 'lib/utils';

const ROUND_ORDER: CFPRound[] = ['firstRound', 'quarterfinal', 'semifinal', 'championship'];
const ROUND_LABELS: Record<CFPRound, string> = {
  firstRound: 'First Round',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  championship: 'Championship',
};
const EXPECTED_GAMES: Record<CFPRound, number> = {
  firstRound: 4,
  quarterfinal: 4,
  semifinal: 2,
  championship: 1,
};

interface BracketDisplayProps {
  games: GamesAPIResult[];
  userPicks: Picks[];
  onPick: (pick: Picks) => void;
  userId: string;
}

const TBDSlot: React.FC = () => (
  <div className="rounded-xl border border-border bg-surface/50 p-2 my-1.5 w-44 flex flex-col items-center justify-center cursor-default">
    <p className="text-xs text-muted-foreground">TBD vs TBD</p>
    <p className="text-xs text-muted-foreground/60">Matchup not yet determined</p>
  </div>
);

const GameSlotCard: React.FC<{
  game: GamesAPIResult;
  userPick: Picks | undefined;
  onPick: (pick: Picks) => void;
  userId: string;
}> = ({ game, userPick, onPick, userId }) => {
  const pastDate = useMemo(() => Date.parse(game.startDate) < Date.now(), [game.startDate]);

  const pickTeam = useCallback(
    (outcome: GamesAPIResponseOutcome) => {
      if (pastDate) return;
      onPick({ matchup: game.id, userId, isCorrect: false, week: 1, selection: outcome });
    },
    [game.id, onPick, userId, pastDate]
  );

  const homeOutcome = game.outcomes?.home;
  const awayOutcome = game.outcomes?.away;
  const homeSelected = userPick?.selection?.id === 1;
  const awaySelected = userPick?.selection?.id === 2;

  return (
    <div className="rounded-xl border border-primary/40 bg-white/5 p-2 my-1.5 w-44 cursor-pointer">
      {/* Away team row */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 my-0.5 cursor-pointer transition-colors',
          awaySelected ? 'bg-primary text-white' : 'hover:bg-primary/15'
        )}
        onClick={awayOutcome && !pastDate ? () => pickTeam(awayOutcome) : undefined}
      >
        {game.awayTeamData?.logos?.[0] && (
          <img
            src={game.awayTeamData.logos[0]}
            alt={game.awayTeam}
            className="w-5 h-5 object-contain flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-xs truncate',
              awaySelected ? 'font-bold text-white' : 'text-foreground'
            )}
          >
            {game.awayTeam}
          </p>
          {awayOutcome && (
            <p className="text-xs text-primary/80">{awayOutcome.point}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">at</p>

      {/* Home team row */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1 my-0.5 cursor-pointer transition-colors',
          homeSelected ? 'bg-primary text-white' : 'hover:bg-primary/15'
        )}
        onClick={homeOutcome && !pastDate ? () => pickTeam(homeOutcome) : undefined}
      >
        {game.homeTeamData?.logos?.[0] && (
          <img
            src={game.homeTeamData.logos[0]}
            alt={game.homeTeam}
            className="w-5 h-5 object-contain flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-xs truncate',
              homeSelected ? 'font-bold text-white' : 'text-foreground'
            )}
          >
            {game.homeTeam}
          </p>
          {homeOutcome && (
            <p className="text-xs text-primary/80">{homeOutcome.point}</p>
          )}
        </div>
      </div>

      {pastDate && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          {game.completed ? `${game.awayPoints} - ${game.homePoints}` : 'In Progress'}
        </p>
      )}
    </div>
  );
};

const BracketDisplay: React.FC<BracketDisplayProps> = ({ games, userPicks, onPick, userId }) => {
  const gamesByRound = useMemo(() => {
    const map: Partial<Record<CFPRound, GamesAPIResult[]>> = {};
    games.forEach((g) => {
      const round = cfpRound(g);
      if (!map[round]) map[round] = [];
      map[round]!.push(g);
    });
    return map;
  }, [games]);

  return (
    <div className="flex flex-row gap-4 overflow-x-auto p-4">
      {ROUND_ORDER.map((round) => {
        const roundGames = gamesByRound[round] ?? [];
        const expected = EXPECTED_GAMES[round];
        const tbdCount = Math.max(0, expected - roundGames.length);

        return (
          <div key={round} className="flex flex-col items-center min-w-[180px]">
            <h5 className="text-sm font-semibold text-foreground mb-2 text-center">
              {ROUND_LABELS[round]}
            </h5>
            {roundGames.map((game) => (
              <GameSlotCard
                key={game.id}
                game={game}
                userPick={userPicks.find((p) => p.matchup === game.id)}
                onPick={onPick}
                userId={userId}
              />
            ))}
            {Array.from({ length: tbdCount }).map((_, i) => (
              <TBDSlot key={`tbd-${round}-${i}`} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default BracketDisplay;

BracketDisplay.displayName = 'BracketDisplay';
