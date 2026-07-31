import React, { useCallback, useEffect, useMemo } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Picks } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { CheckCircle2, Loader2 } from 'lucide-react';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { useGroupContext } from '../../context/group';
import { Button } from '../../components/ui/button';
import { UserRoles } from '../../utils/constants';
import { arePicksLocked } from '../../utils/pickLock';

const MakePicks: React.FC = () => {
  const { picks, slate, fetchSlate, getUserPicks } = usePickContext();
  const { user, setUser } = useGlobalContext();
  const { activeGroupId } = useGroupContext();
  const navigate = useNavigate();
  const { modalOpen, setModalOpen, status, setStatus, seasonData } = useUIContext();

  const getDataForPage = useCallback(async () => {
    const compoundRequest = Promise.all([await fetchSlate({}), await getUserPicks()]);
    const [slateResult] = await compoundRequest;
    if (slateResult) setStatus(LoadingState.IDLE);
  }, [fetchSlate, setStatus, getUserPicks]);

  useEffect(() => {
    getDataForPage();
  }, [getDataForPage]);

  const ifMissingGames = useCallback(
    (picksToCheck: Picks[]) => {
      if (picksToCheck.length < 10) {
        const missingGames = slate?.games?.filter(
          (game) => !picksToCheck.find((pick) => pick.matchup === game.id)
        );
        return Array.from([
          ...picksToCheck,
          ...missingGames?.map((game) => ({
            matchup: game.id,
            isCorrect: false,
            userId: user?.uid,
            selection: { name: 'PUSH', point: '0', pointValue: 0, id: 0 },
            week: seasonData?.ApiWeek,
          })),
        ]);
      } else return picksToCheck;
    },
    [slate?.games, seasonData?.ApiWeek, user?.uid]
  );

  const isAdmin = !!user?.roles?.includes(UserRoles.ADMIN);

  const locked = useMemo(
    () => arePicksLocked(slate?.games, isAdmin),
    [slate?.games, isAdmin]
  );

  const submitPicks = useCallback(async () => {
    if (!user) navigate('/');
    if (!activeGroupId || !user?.uid || locked) return;
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    await FirebaseGroupsInstance.saveMemberPicks(activeGroupId, user.uid, picks.slateId, {
      name: `${user?.fName} ${user?.lName}`,
      slateId: picks?.slateId,
      week: slate?.week as number,
      year: seasonData?.Season as number,
      picks: ifMissingGames(picks?.picks) as Picks[],
      userId: user?.uid,
    });
    // Refresh the current user's group picks so the UI reflects the save.
    const refreshed = await FirebaseGroupsInstance.getMemberPicks(activeGroupId, user.uid);
    setUser((prev) => (prev ? { ...prev, pickHistory: refreshed } : prev));
    setStatus(LoadingState.IDLE);
  }, [navigate, setModalOpen, picks, user, setUser, setStatus, seasonData?.Season, slate?.week, ifMissingGames, activeGroupId, locked]);

  const picksCount = picks.picks.filter((p) => !!p.selection).length;

  return (
    <>
      <div className="flex flex-col items-center px-4 pb-32">
        {slate?.games?.map((game) => (
          <PickCard key={game.id} game={game} />
        ))}
      </div>

      {/* Fixed bottom toolbar */}
      <div
        className="fixed bottom-0 left-0 w-full bg-surface border-t border-border flex flex-col items-center justify-center gap-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        style={{ boxShadow: '0px -1rem 2rem 0px rgba(0,0,0,0.28)' }}
      >
        <p className="text-sm text-muted-foreground">
          {locked ? 'Picks are locked — the first game has started.' : `Picks: ${picksCount}/10`}
        </p>
        <Button
          onClick={() => submitPicks()}
          disabled={picksCount < 10 || locked}
          className="w-full max-w-xs"
        >
          {locked ? 'Picks Locked' : 'Submit Picks'}
        </Button>
      </div>

      {modalOpen && (
        <Modal
          actions={[
            {
              label: 'PROFILE',
              onClick: () => {
                navigate('/profile');
                setModalOpen(false);
              },
            },
          ]}
        >
          <div className="flex items-center justify-center py-4">
            {status === LoadingState.LOADING && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === LoadingState.IDLE && (
              <CheckCircle2 className="h-12 w-12 text-success" />
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default MakePicks;

MakePicks.displayName = 'MakePicks';
