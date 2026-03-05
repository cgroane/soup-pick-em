import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import WinPercentage from '../../components/WinPercentage';
import { LoadingState, useUIContext } from '../../context/ui';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import Loading from '../../components/Loading';
import { useSlateContext } from '../../context/slate';
import { LeaderBoardData } from '../../model';
import Leaderboard from '../../components/Leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = () => {
  const { seasonData, setStatus, status, usePostSeason } = useUIContext();
  const { user, users, fetchUsers, userOverallRecord } = useGlobalContext();
  const { slate, fetchSlate } = usePickContext();
  const { canEdit } = useSlateContext();

  useEffect(() => {
    Promise.all([
      fetchUsers().then(() => null),
      fetchSlate({
        week: seasonData?.ApiWeek,
        year: !usePostSeason ? seasonData?.Season?.toString() : `${seasonData?.Season}POST`,
      }).then(() => null),
    ]).then(() => setStatus(LoadingState.IDLE));
  }, [fetchSlate, fetchUsers, setStatus, seasonData?.ApiWeek, seasonData?.Season, usePostSeason]);

  const hasPicksThisWeek = useMemo(() => {
    const allValid = user?.pickHistory
      ?.find((h) => h.slateId === slate?.uniqueWeek)
      ?.picks.filter((pick) => !!pick.selection);
    return allValid?.length === slate?.games?.length && slate?.games?.length;
  }, [user?.pickHistory, slate?.uniqueWeek, slate?.games?.length]);

  const leaderBoard = useMemo(() => {
    return users
      ?.reduce<LeaderBoardData[]>((acc, leader) => {
        const thisSeasonsRecord = leader?.record?.find((r) => {
          if (seasonData?.seasonType === 'offseason') return r.year === seasonData?.Season - 1;
          return r.year === seasonData?.Season;
        });
        const wins = thisSeasonsRecord?.wins ?? 0;
        const losses = thisSeasonsRecord?.losses ?? 0;
        const pctg = wins + losses > 0 ? wins / (wins + losses) : 0;
        return [...acc, { fName: leader.fName, lName: leader.lName, uid: leader?.id, winsAndLosses: wins + losses, wins, losses, pctg }];
      }, [])
      ?.sort((a, b) => b.pctg - a.pctg);
  }, [users, seasonData?.Season, seasonData?.seasonType]);

  const headingText = useMemo(
    () =>
      ({
        postseason: { text: 'Bowl Season, Week 1', weekNumber: '1', buttonText: canEdit ? 'Pick Slate' : 'View Games' },
        regular: { text: `Week ${seasonData?.ApiWeek ?? 1}, ${seasonData?.Season}`, weekNumber: seasonData?.ApiWeek?.toString() ?? '1', buttonText: canEdit ? 'Pick Slate' : 'View Games' },
        offseason: { text: 'Offseason', weekNumber: '', buttonText: 'View Games' },
      }[seasonData?.seasonType || 'regular']),
    [seasonData?.ApiWeek, seasonData?.seasonType, canEdit, seasonData?.Season]
  );

  if (status === LoadingState.LOADING) {
    return <Loading iterations={4} type="profileCard" />;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto w-full">
      {/* Current week card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{headingText.text}</CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/choose-matchups" style={{ textDecoration: 'none' }}>
            <Button className="w-full">{headingText.buttonText}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Make picks card */}
      <Card className={!hasPicksThisWeek ? 'border-warning' : ''}>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasPicksThisWeek ? 'Change ' : 'Make '}your picks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slate?.games?.length ? (
            <Link to="/pick">
              <Button className="w-full">Go to slate</Button>
            </Link>
          ) : (
            <Button className="w-full" disabled>
              Slate hasn't been chosen yet
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Win percentage carousel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Win Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2">
            {user?.record
              ?.filter((r) => !!r.year)
              ?.sort((a, b) => b.year - a.year)
              .map((r, ind) => (
                <div key={`r-${r.year}-${ind}`} className="snap-center flex-shrink-0">
                  <WinPercentage wins={r.wins} losses={r.losses} label={r.year?.toString()} />
                </div>
              ))}
            <div className="snap-center flex-shrink-0">
              <WinPercentage
                wins={userOverallRecord.wins}
                losses={userOverallRecord?.losses}
                label="Overall"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard items={leaderBoard ?? []} />
          <Link to="/picks">
            <Button variant="outline" className="w-full">
              See more
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

Profile.displayName = 'Profile';
