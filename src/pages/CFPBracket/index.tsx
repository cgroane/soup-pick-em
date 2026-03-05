import React, { useCallback } from 'react';
import { useCFPContext } from '../../context/cfp';
import { useGlobalContext } from '../../context/user';
import { useUIContext } from '../../context/ui';
import BracketDisplay from '../../components/BracketDisplay';
import { Picks } from '../../model';
import { Button } from '../../components/ui/button';
import { Loader2 } from 'lucide-react';

const CFPBracket: React.FC = () => {
  const { bracket, cfpPicks, addCfpPick, saveCfpPicks, isSaving } = useCFPContext();
  const { user } = useGlobalContext();
  const { seasonData } = useUIContext();

  const handlePick = useCallback(
    (pick: Picks) => {
      addCfpPick(pick);
    },
    [addCfpPick]
  );

  if (!bracket?.games?.length) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <p className="text-muted-foreground text-center">
          The CFP bracket has not been published yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-xl font-bold text-foreground">
          CFP Bracket — {seasonData?.Season}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {cfpPicks.picks.length} pick{cfpPicks.picks.length !== 1 ? 's' : ''} made
          </span>
          <Button
            size="sm"
            onClick={saveCfpPicks}
            disabled={isSaving || cfpPicks.picks.length === 0}
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {isSaving ? 'Saving...' : 'Save Picks'}
          </Button>
        </div>
      </div>

      <BracketDisplay
        games={bracket.games}
        userPicks={cfpPicks.picks}
        onPick={handlePick}
        userId={user?.uid ?? ''}
      />

      <div className="flex justify-center p-4">
        <Button
          onClick={saveCfpPicks}
          disabled={isSaving || cfpPicks.picks.length === 0}
          className="w-full max-w-xs"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isSaving ? 'Saving...' : 'Save Picks'}
        </Button>
      </div>
    </div>
  );
};

export default CFPBracket;

CFPBracket.displayName = 'CFPBracket';
