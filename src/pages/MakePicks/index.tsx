import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Picks } from '../../model';
import { useUserStateContext } from '../../context/user/user-state';
import { useUserDispatchContext } from '../../context/user/user-dispatch';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import FirebaseGroupsInstance from '../../firebase/group/group';
import { useGroupStateContext } from '../../context/group/group-state';
import { Button } from '../../components/ui/button';
import { UserRoles } from '../../utils/constants';
import { arePicksLocked } from '../../utils/pickLock';
import { usePickState } from 'context/pick/pick-state';
import { useUIStateContext } from 'context/ui/ui-state';
import { useUIDispatchContext } from 'context/ui/ui-dispatch';

const MakePicks: React.FC = () => {
  const { fetchSlate, getUserPicks } = usePickContext();
  const { picks, slate } = usePickState();
  const { user } = useUserStateContext();
  const userDispatch = useUserDispatchContext();
  const { activeGroupId } = useGroupStateContext();
  const navigate = useNavigate();
  const { modalOpen, seasonData, usePostSeason } = useUIStateContext();
  const dispatch = useUIDispatchContext();

  // fetchSlate reports its own progress on the pick context; this page only reads it.
  const getDataForPage = useCallback(async () => {
    await fetchSlate({
      week: seasonData?.ApiWeek,
      year: seasonData?.Season?.toString(),
      seasonType: !usePostSeason ? 'regular' : 'postseason',
    });
    getUserPicks();
  }, [fetchSlate, getUserPicks, seasonData?.ApiWeek, seasonData?.Season, usePostSeason]);

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

  // Submit progress is page UI: nothing outside this screen observes it, and a
  // shared flag would let an unrelated fetch resolve the modal.
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const submitPicks = useCallback(async () => {
    if (!user) navigate('/');
    if (!activeGroupId || !user?.uid || locked) return;
    setSubmitState('saving');
    dispatch({ type: "SET_MODAL", payload: true });
    try {
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
      userDispatch({ type: 'PATCH_USER', payload: { pickHistory: refreshed } });
      setSubmitState('saved');
    } catch (err) {
      console.error('Error saving picks:', err);
      setSubmitState('error');
    }
  }, [navigate, dispatch, picks, user, userDispatch, seasonData?.Season, slate?.week, ifMissingGames, activeGroupId, locked]);

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
          disabled={picksCount < 10 || locked || submitState === 'saving'}
          className="w-full max-w-xs"
        >
          {locked ? 'Picks Locked' : 'Submit Picks'}
        </Button>
      </div>

      {modalOpen && (
        <Modal
          actions={
            submitState === 'saved'
              ? [
                {
                  label: 'PROFILE',
                  onClick: () => {
                    navigate('/profile');
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
                  Could not save your picks. Please try again.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default MakePicks;

MakePicks.displayName = 'MakePicks';
