import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Game from '../../components/Game';
import { Search } from 'lucide-react';
import { useSlateContext } from '../../context/slate';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../../context/ui';
import Modal from '../../components/Modal';
import { useGroupContext } from '../../context/group';
import { usePickState } from '../../context/pick/pick-state';
import Loading from '../../components/Loading';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import SelectWeek from '../../components/SelectWeek';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { usePickContext } from 'context/pick';
import { useUIDispatchContext } from 'context/ui/ui-dispatch';
import { useUIStateContext } from 'context/ui/ui-state';
import { useSlateDispatchContext } from 'context/slate/slate-dispatch';
import { useSlateStateContext } from 'context/slate/slate-state';

const CreateSlate: React.FC = () => {

  const { selectedGames, filteredGames, filterText, canEdit, status: matchupStatus } =
    useSlateStateContext();
  const slateDispatch = useSlateDispatchContext();
  const { fetchMatchups, submitSlate } = useSlateContext();

  const dispatch = useUIDispatchContext();
  const {
    status,
    seasonData,
    modalOpen,
    useOffSeason
  } = useUIStateContext();

  const { isSlatePicker } = useGroupContext();

  const { fetchSlate } = usePickContext();
  const { status: pickStatus } = usePickState()

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek?.toString(),
    year: seasonData?.Season?.toString(),
    // CFBD only knows 'regular' | 'postseason'. Offseason queries the prior
    // completed season's regular games (the UI context already decrements
    // Season/ApiWeek), so anything that isn't postseason maps to regular.
    seasonType: seasonData?.seasonType === 'postseason' ? 'postseason' : 'regular',
  });

  const navigate = useNavigate();
  useEffect(() => {
    const matchupGetter = async () => {
      await fetchMatchups({
        weekNumber:
          selectedWeek.seasonType === 'postseason' ? 1 : parseInt(selectedWeek?.week as string),
        year: parseInt(selectedWeek?.year as string),
        seasonType: selectedWeek?.seasonType,
      });
      await fetchSlate({
        week: parseInt(selectedWeek?.week as string),
        year: selectedWeek?.year as string,
        seasonType: selectedWeek?.seasonType
      })
    }
    matchupGetter();
  }, [fetchMatchups, selectedWeek, fetchSlate]);


  // Submit progress is page UI: nothing outside this screen observes it, and
  // sharing a context flag would tie the modal to the game-list skeleton.
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const onSubmit = useCallback(async () => {
    setSubmitState('saving');
    dispatch({ type: "SET_MODAL", payload: true });
    try {
      await submitSlate({
        week: selectedWeek?.week,
        year: selectedWeek?.year,
        seasonType: selectedWeek?.seasonType,
      });
      setSubmitState('saved');
    } catch {
      setSubmitState('error');
    }
  }, [submitSlate, dispatch, selectedWeek]);

  const disableSelection = useMemo(
    () => selectedGames?.length >= 10 || !canEdit,
    [selectedGames, canEdit]
  );
  const isLoading =
    status === LoadingState.LOADING ||
    pickStatus === LoadingState.LOADING ||
    matchupStatus === LoadingState.LOADING;
  return (
    <>
      <div>
        {/* Search bar */}
        <div className="m-2 flex items-center gap-2 border border-border rounded-md px-3 bg-surface">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
            value={filterText}
            onChange={(e) => slateDispatch({ type: "SET_FILTER_TEXT", payload: e.target.value })}
            placeholder="Search games..."
          />
        </div>

        {useOffSeason && (
          <div className="bg-warning/10 border border-warning/30 text-warning text-sm px-4 py-2 text-center">
            The season is currently in the offseason. Showing matchups from the{' '}
            {seasonData?.Season} season.
          </div>
        )}

        <SelectWeek
          vals={{ week: selectedWeek.week as string, year: selectedWeek.year as string }}
          heading={<></>}
          onChange={setSelectedWeek}
        />

        {isLoading ? (
          <Loading iterations={3} type="gameCard" />
        ) : (
          <>
            <div className={`px-4 pb-4 flex flex-col items-center ${canEdit ? 'mb-32' : ''}`}>
              {filteredGames?.length ? (
                filteredGames?.map((game) => (
                  <Game
                    addedToSlate={!!selectedGames?.find((selectedGame) => game.id === selectedGame.id)}
                    disable={disableSelection}
                    hideCheckbox={!isSlatePicker}
                    key={game.id}
                    game={game}
                    canEdit={canEdit}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-8">
                  No games available for the selected week.
                </p>
              )}
            </div>

            {canEdit && (
              <div
                className="fixed bottom-0 left-0 w-full bg-surface border-t border-border flex flex-col items-center gap-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                style={{ boxShadow: '0px -1rem 2rem 0px rgba(0,0,0,0.28)' }}
              >
                <p className="text-sm text-muted-foreground">
                  Soup picks: {selectedGames?.length}/10
                </p>
                <div className="flex gap-2 w-full max-w-xs">
                  <Button variant="outline" className="flex-1">
                    Reset Slate
                  </Button>
                  <Button
                    onClick={onSubmit}
                    disabled={selectedGames?.length < 10 || submitState === 'saving'}
                    className="flex-1"
                  >
                    Submit Slate
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <Modal
          actions={
            submitState === 'saved'
              ? [
                {
                  label: 'Make your picks',
                  onClick: () => {
                    navigate('/pick');
                    dispatch({ type: "SET_MODAL", payload: false });
                  },
                },
              ]
              : []
          }
        >
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            {submitState === 'saving' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {submitState === 'saved' && <CheckCircle2 className="h-12 w-12 text-success" />}
            {submitState === 'error' && (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  Could not save the slate. Please try again.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default CreateSlate;

CreateSlate.displayName = 'CreateSlate';
