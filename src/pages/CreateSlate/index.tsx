import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Game from '../../components/Game';
import { Search } from 'lucide-react';
import { useSlateContext } from '../../context/slate';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { useGlobalContext } from '../../context/user';
import { UserCollectionData } from '../../model';
import { usePickContext } from '../../context/pick';
import FBSlateClassInstance from '../../firebase/slate/slate';
import Loading from '../../components/Loading';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import SelectWeek from '../../components/SelectWeek';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const CreateSlate: React.FC = () => {
  const [textFilter, setTextFilter] = useState('');

  const { games, selectedGames, filteredGames, setFilteredGames, fetchMatchups, deletions, canEdit } =
    useSlateContext();
  const { fetchSlate } = usePickContext();
  const { setModalOpen, modalOpen, seasonData, setStatus, status, useOffSeason } = useUIContext();
  const { user, users, isSlatePicker } = useGlobalContext();

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek?.toString(),
    year: seasonData?.Season?.toString(),
    seasonType: seasonData?.seasonType as 'postseason' | 'regular',
  });

  const navigate = useNavigate();

  const filterGames = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTextFilter(e.target.value);
    },
    [setTextFilter]
  );

  useEffect(() => {
    Promise.all([
      fetchSlate({
        week: parseInt(selectedWeek?.week as string),
        year:
          selectedWeek?.seasonType === 'postseason'
            ? selectedWeek?.year + 'POST'
            : selectedWeek?.year,
      }).then((result) => result),
      fetchMatchups({
        weekNumber:
          selectedWeek.seasonType === 'postseason' ? 1 : parseInt(selectedWeek?.week as string),
        year: parseInt(selectedWeek?.year as string),
        seasonType: selectedWeek?.seasonType,
      }),
    ]).then(() => setStatus(LoadingState.IDLE));
  }, [fetchMatchups, fetchSlate, setStatus, selectedWeek]);

  useEffect(() => {
    if (textFilter) {
      setFilteredGames(() => {
        return games.filter((game) =>
          JSON.stringify(Object.values(game)).toLowerCase().includes(textFilter.toLowerCase())
        );
      });
    } else {
      setFilteredGames(games);
    }
  }, [games, setFilteredGames, textFilter]);

  const submitSlate = useCallback(async () => {
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    const uniqueId = `w${selectedWeek.week}-${selectedWeek.year}${
      selectedWeek?.seasonType === 'postseason' ? 'POST' : ''
    }`;
    await FBSlateClassInstance.addSlate(
      {
        week: parseInt(selectedWeek?.week as string),
        uniqueWeek: uniqueId,
        providedBy: user as UserCollectionData,
        processed: false,
        games: selectedGames,
      },
      users,
      deletions.length ? deletions : undefined
    ).then(() => setStatus(LoadingState.IDLE));
  }, [selectedWeek, user, setStatus, selectedGames, setModalOpen, deletions, users]);

  const disableSelection = useMemo(
    () => selectedGames?.length >= 10 || !canEdit,
    [selectedGames, canEdit]
  );

  return (
    <>
      <div>
        {/* Search bar */}
        <div className="m-2 flex items-center gap-2 border border-border rounded-md px-3 bg-surface">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
            onChange={filterGames}
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

        {status === LoadingState.LOADING ? (
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
                    onClick={() => submitSlate()}
                    disabled={selectedGames?.length < 10}
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
          actions={[
            {
              label: 'Make your picks',
              onClick: () => {
                navigate('/pick');
                setModalOpen(false);
              },
            },
          ]}
        >
          <div className="flex items-center justify-center py-4">
            {status === LoadingState.LOADING && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === LoadingState.IDLE && <CheckCircle2 className="h-12 w-12 text-success" />}
          </div>
        </Modal>
      )}
    </>
  );
};

export default CreateSlate;

CreateSlate.displayName = 'CreateSlate';
