import React, { useCallback, useEffect } from 'react';
import { usePickContext } from '../../context/pick';
import PickCard from './PickCard';
import { Picks, UserCollectionData } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useNavigate } from 'react-router-dom';
import { LoadingState, useUIContext } from '../../context/ui';
import Modal from '../../components/Modal';
import { CheckCircle2, Loader2 } from 'lucide-react';
import FirebaseUsersClassInstance from '../../firebase/user/user';
import { Button } from '../../components/ui/button';
import cfbdApi from 'api';

const MakePicks: React.FC = () => {
  const { picks, slate, fetchSlate, getUserPicks } = usePickContext();
  const { user, setUser } = useGlobalContext();
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
            selection: { name: 'PUSH', point: 0, price: 0 },
            week: seasonData?.ApiWeek,
          })),
        ]);
      } else return picksToCheck;
    },
    [slate?.games, seasonData?.ApiWeek, user?.uid]
  );

  const submitPicks = useCallback(async () => {
    if (!user) navigate('/');
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    await FirebaseUsersClassInstance.addDocument(
      {
        name: `${user?.fName} ${user?.lName}`,
        slateId: picks?.slateId,
        week: slate?.week,
        year: seasonData?.Season,
        picks: ifMissingGames(picks?.picks),
        userId: user?.uid,
      },
      user?.uid,
      ['picks', picks.slateId]
    ).then(() => {
      FirebaseUsersClassInstance.getDocumentInCollection(user?.uid as string).then((resp) =>
        setUser(resp as UserCollectionData)
      );
      setStatus(LoadingState.IDLE);
    });
  }, [navigate, setModalOpen, picks, user, setUser, setStatus, seasonData?.Season, slate?.week, ifMissingGames]);

  const picksCount = picks.picks.filter((p) => !!p.selection).length;

  const autoPickWithClaude = useCallback(async () => {
    if (!user) navigate('/');
    setStatus(LoadingState.LOADING);
    setModalOpen(true);
    try {
      await cfbdApi.post('/ai/agentic-picks', {
        slateId: slate?.uniqueWeek as string,
        userId: user?.uid as string,
        userName: `${user?.fName} ${user?.lName}`,
      });
      setStatus(LoadingState.IDLE);
    } catch (err) {
      console.error("Error generating picks:", err instanceof Error ? err.message : String(err));
      setStatus(LoadingState.IDLE);
    }
  }, [navigate, setModalOpen, user, slate?.uniqueWeek, setStatus]);

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
        <p className="text-sm text-muted-foreground">Picks: {picksCount}/10</p>
        <Button
          onClick={() => submitPicks()}
          disabled={picksCount < 10}
          className="w-full max-w-xs"
        >
          Submit Picks
        </Button>
        <Button
          onClick={() => autoPickWithClaude()}
          className="w-full max-w-xs"
        >
          Auto Pick With Claude
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
