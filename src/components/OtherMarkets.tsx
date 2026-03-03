import React, { useCallback } from 'react';
import { GamesAPIResult } from '../model';

interface OtherMarketsProps {
  gameId: string;
  addToSlate: (game: GamesAPIResult) => void;
  addedToSlate: boolean;
  disableSelections: boolean;
}

const OtherMarkets: React.FC<OtherMarketsProps> = ({ gameId }: OtherMarketsProps) => {
  const fetchMoreMarkets = useCallback(() => {
    // placeholder for future market data
  }, [gameId]);

  return (
    <details className="mt-2" onToggle={(e) => (e.currentTarget.open ? fetchMoreMarkets() : null)}>
      <summary className="text-sm text-muted-foreground cursor-pointer select-none px-2 py-1 hover:text-foreground transition-colors">
        More Market Options
      </summary>
      <div className="p-3">{/* market options will appear here */}</div>
    </details>
  );
};

export default OtherMarkets;

OtherMarkets.displayName = 'OtherMarkets';
