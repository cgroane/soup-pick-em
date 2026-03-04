import React, { useMemo } from 'react';
import { useCFPContext, cfpRound } from '../../context/cfp';
import { useUIContext } from '../../context/ui';
import { CFPRound, GamesAPIResult } from '../../model';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';

const ROUND_LABELS: Record<CFPRound, string> = {
  firstRound: 'First Round',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  championship: 'Championship',
};

const ROUND_ORDER: CFPRound[] = ['firstRound', 'quarterfinal', 'semifinal', 'championship'];

const AdminCFP: React.FC = () => {
  const { bracket, refreshAndSaveBracket, isRefreshing } = useCFPContext();
  const { seasonData } = useUIContext();
  const year = seasonData?.Season ?? new Date().getFullYear();

  const gamesByRound = useMemo(() => {
    if (!bracket?.games) return {} as Partial<Record<CFPRound, GamesAPIResult[]>>;
    const map: Partial<Record<CFPRound, GamesAPIResult[]>> = {};
    bracket?.games?.forEach((g) => {
      const round = cfpRound(g);
      if (!map[round]) map[round] = [];
      map[round]!.push(g);
    });
    return map;
  }, [bracket?.games]);

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-foreground mb-2">CFP Bracket Management</h3>

      {bracket?.updatedAt && (
        <p className="text-xs text-muted-foreground mb-3">
          Last updated: {new Date(bracket.updatedAt).toLocaleString()}
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => refreshAndSaveBracket(year)}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          {isRefreshing && <Loader2 className="h-4 w-4 animate-spin" />}
          {isRefreshing ? 'Fetching...' : `Fetch & Publish CFP Games (${year})`}
        </Button>
      </div>

      {bracket?.games?.length ? (
        <div>
          <h5 className="text-sm font-semibold text-foreground mb-2">
            {bracket?.games?.length} CFP games published
          </h5>
          {ROUND_ORDER.map((round) => {
            const games = gamesByRound[round];
            if (!games?.length) return null;
            return (
              <div key={round} className="mb-4">
                <h6 className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
                  {ROUND_LABELS[round]} ({games.length} games)
                </h6>
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex justify-between items-center px-3 py-2 mb-1 bg-surface-elevated rounded-lg"
                  >
                    <span className="text-sm text-foreground">
                      {game.awayTeam} at {game.homeTeam}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {game.pointSpread !== undefined
                        ? `Spread: ${game.pointSpread}`
                        : 'No spread yet'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">
            No CFP bracket published yet. Click "Fetch & Publish" to load the current bracket.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminCFP;

AdminCFP.displayName = 'AdminCFP';
