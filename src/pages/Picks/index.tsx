import React, { useEffect, useMemo } from 'react';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import PicksTable, { StyledCell } from './PicksTable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { GamesAPIResponseOutcome, GamesAPIResult } from '../../model';
import SelectWeek from '../../components/SelectWeek';
import GameCell, { StyledGameCell } from './GameCell';
import { useUIContext } from '../../context/ui';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';
import { useCFPContext } from '../../context/cfp';

export interface PicksColumnDef {
  user: { name: string; id: string };
  game: GamesAPIResult & { isCorrect: boolean };
  numberCorrect: number;
  [key: string]: GamesAPIResponseOutcome | (GamesAPIResult & { isCorrect: boolean }) | { name: string; id: string } | string | number;
}

const HeaderCell = ({ children }: React.PropsWithChildren) => (
  <td className="rounded-xl bg-white text-black flex flex-col items-center text-center justify-center p-2">
    {children}
  </td>
);

const columnHelper = createColumnHelper<PicksColumnDef>();

const Picks: React.FC = () => {
  const { seasonData, useOffSeason, usePostSeason } = useUIContext();
  const { bracket } = useCFPContext();

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek?.toString(),
    year: seasonData?.Season?.toString(),
    seasonType: seasonData?.seasonType as 'postseason' | 'regular',
  });

  const { fetchUsers, allPickHistories } = useGlobalContext();
  const { slate, fetchSlate } = usePickContext();

  useEffect(() => {
    fetchUsers();
    fetchSlate({
      week: parseInt(
        selectedWeek?.seasonType === 'postseason' ? '1' : (selectedWeek.week as string)
      ),
      year:
        selectedWeek?.seasonType === 'postseason'
          ? selectedWeek?.year + 'POST'
          : selectedWeek?.year,
    });
  }, [fetchUsers, fetchSlate, selectedWeek]);

  const thisWeeksPickHistory = useMemo(() => {
    return allPickHistories
      ?.filter((pickSet) => pickSet.slateId === slate?.uniqueWeek)
      ?.map((userPicks) => {
        let sumCorrect = 0;
        return {
          user: { name: userPicks?.name, id: userPicks?.userId },
          ...userPicks?.picks.reduce((acc, pick) => {
            const game = slate?.games?.find((g) => g.id === pick.matchup);
            const favIsHome = game?.outcomes
              ? (game?.outcomes?.home?.pointValue as number) < 0
              : undefined;
            const favPointSpread =
              favIsHome !== undefined
                ? favIsHome
                  ? game?.outcomes?.home.pointValue
                  : game?.outcomes?.away.pointValue
                : undefined;
            const favScore = favIsHome ? game?.homePoints : game?.awayPoints;
            const underDogScore = favIsHome ? game?.awayPoints : game?.homePoints;
            let isCorrect = !!pick.isCorrect;
            if (Date.parse(game?.startDate as string) > Date.parse(new Date().toDateString())) {
              isCorrect = false;
            } else if (game) {
              if (pick.selection?.name === 'PUSH') {
                if ((favScore ?? 0) + (favPointSpread as number) === underDogScore) {
                  sumCorrect++;
                  isCorrect = true;
                }
              } else {
                const homePick = pick.selection?.name
                  ?.toLowerCase()
                  .replace(/ /g, '')
                  .includes(game?.homeTeam.toLowerCase().replace(/ /g, ''))
                  ? 'home'
                  : 'away';
                const newScore =
                  (game[`${homePick}Points`] ?? 0) + (pick.selection?.pointValue ?? 0);
                if (newScore > (game[`${homePick === 'home' ? 'away' : 'home'}Points`] ?? 0)) {
                  sumCorrect++;
                  isCorrect = true;
                }
              }
            }
            return {
              ...acc,
              [pick.matchup]: { selection: pick.selection, isCorrect, ...(game as GamesAPIResult) },
              numberCorrect: sumCorrect,
            };
          }, {}),
        };
      }) as PicksColumnDef[];
  }, [slate, allPickHistories]);

  const cfpSlateId = `cfp-${seasonData?.Season}`;

  const cfpPickHistory = useMemo(() => {
    if (!bracket?.games?.length || !usePostSeason) return [];
    return allPickHistories
      ?.filter((pickSet) => pickSet.slateId === cfpSlateId)
      ?.map((userPicks) => {
        let sumCorrect = 0;
        return {
          user: { name: userPicks?.name, id: userPicks?.userId },
          ...userPicks?.picks.reduce((acc, pick) => {
            const game = bracket.games?.find((g) => g.id === pick.matchup);
            const favIsHome = game?.outcomes
              ? (game?.outcomes?.home?.pointValue as number) < 0
              : undefined;
            const favPointSpread =
              favIsHome !== undefined
                ? favIsHome
                  ? game?.outcomes?.home.pointValue
                  : game?.outcomes?.away.pointValue
                : undefined;
            const favScore = favIsHome ? game?.homePoints : game?.awayPoints;
            const underDogScore = favIsHome ? game?.awayPoints : game?.homePoints;
            let isCorrect = !!pick.isCorrect;
            if (Date.parse(game?.startDate as string) > Date.parse(new Date().toDateString())) {
              isCorrect = false;
            } else if (game) {
              if (pick.selection?.name === 'PUSH') {
                if ((favScore ?? 0) + (favPointSpread as number) === underDogScore) {
                  sumCorrect++;
                  isCorrect = true;
                }
              } else {
                const homePick = pick.selection?.name
                  ?.toLowerCase()
                  .replace(/ /g, '')
                  .includes(game?.homeTeam.toLowerCase().replace(/ /g, ''))
                  ? 'home'
                  : 'away';
                const newScore =
                  (game[`${homePick}Points`] ?? 0) + (pick.selection?.pointValue ?? 0);
                if (newScore > (game[`${homePick === 'home' ? 'away' : 'home'}Points`] ?? 0)) {
                  sumCorrect++;
                  isCorrect = true;
                }
              }
            }
            return {
              ...acc,
              [pick.matchup]: { selection: pick.selection, isCorrect, ...(game as GamesAPIResult) },
              numberCorrect: sumCorrect,
            };
          }, {}),
        };
      }) as PicksColumnDef[];
  }, [bracket, allPickHistories, cfpSlateId, usePostSeason]);

  const cfpColumns: ColumnDef<PicksColumnDef>[] = useMemo(() => {
    if (!bracket?.games?.length) return [];
    return [
      {
        ...columnHelper.accessor('user', {
          cell: (info) => (
            <StyledCell key={info?.cell?.id} style={{ textAlign: 'center' }}>
              {info?.row?.original?.user?.name}
            </StyledCell>
          ),
          header: 'Soup',
          size: 100,
          enablePinning: true,
        }),
      },
      ...bracket.games.map((game) => ({
        ...columnHelper.accessor(`${game.id}`, {
          header: () => (
            <HeaderCell>
              <p style={{ margin: '2px' }}>{game.awayTeam}</p>
              <p style={{ margin: '2px' }}>
                <span style={{ fontWeight: 600 }}>at</span>
              </p>
              <p style={{ margin: '2px' }}>{game.homeTeam}</p>
              <p style={{ margin: '2px' }}>
                {game.homeTeamData?.abbreviation}{' '}
                {(game.pointSpread ?? 0) > 0 ? '+' : ''}
                {game.pointSpread}
              </p>
            </HeaderCell>
          ),
          size: 250,
          cell: (props) => {
            if (props?.row.original) {
              const selection = props?.row?.original[props?.column?.id] as GamesAPIResult & {
                isCorrect: boolean;
                selection: GamesAPIResponseOutcome;
              };
              return (
                <GameCell scope="row" game={selection as GamesAPIResult & { isCorrect: boolean }}>
                  {selection?.selection?.name}
                </GameCell>
              );
            }
            return null;
          },
        }),
      })),
      {
        ...columnHelper.accessor('numberCorrect', {
          header: 'Record',
          cell: (info) => {
            const incorrect = Math.abs(
              info?.row?.original?.numberCorrect - bracket.games.length
            );
            return (
              <StyledGameCell>
                {info?.row?.original?.numberCorrect} - {incorrect}
              </StyledGameCell>
            );
          },
          size: 100,
        }),
      },
    ] as ColumnDef<PicksColumnDef>[];
  }, [bracket?.games]);

  const columns: ColumnDef<PicksColumnDef>[] = useMemo(() => {
    if (!slate?.games) return [];
    return [
      {
        ...columnHelper.accessor('user', {
          cell: (info) => (
            <StyledCell key={info?.cell?.id} style={{ textAlign: 'center' }}>
              {info?.row?.original?.user?.name}
            </StyledCell>
          ),
          header: 'Soup',
          size: 100,
          enablePinning: true,
        }),
      },
      ...slate?.games?.map((game) => ({
        ...columnHelper.accessor(`${game?.id}`, {
          header: () => (
            <HeaderCell>
              <p>{game?.awayTeam}</p>
              <p>
                <span style={{ fontWeight: 600 }}>at</span>
              </p>
              <p>{game?.homeTeam}</p>
              <p>
                {game?.homeTeamData?.abbreviation}{' '}
                {(game?.pointSpread ?? 0) > 0 ? '+' : ''}
                {game?.pointSpread}
              </p>
            </HeaderCell>
          ),
          size: 250,
          cell: (props) => {
            if (props?.row.original) {
              const selection = props?.row?.original[props?.column?.id] as GamesAPIResult & {
                isCorrect: boolean;
                selection: GamesAPIResponseOutcome;
              };
              return (
                <GameCell scope="row" game={selection as GamesAPIResult & { isCorrect: boolean }}>
                  {selection?.selection?.name}
                </GameCell>
              );
            }
            return;
          },
        }),
      })),
      {
        ...columnHelper.accessor('numberCorrect', {
          header: 'Record',
          cell: (info) => {
            const incorrect = Math.abs(
              info?.row?.original?.numberCorrect - slate.games.length
            );
            return (
              <StyledGameCell>
                {info?.row?.original?.numberCorrect} - {incorrect}
              </StyledGameCell>
            );
          },
          size: 100,
        }),
      },
    ] as ColumnDef<PicksColumnDef>[];
  }, [slate?.games]);

  return (
    <div>
      {useOffSeason && (
        <div className="bg-warning/10 border border-warning/30 text-warning text-sm px-4 py-2 text-center">
          The season is currently in the offseason. Showing results from the {seasonData?.Season}{' '}
          season.
        </div>
      )}
      {slate?.games?.length ? (
        <PicksTable data={thisWeeksPickHistory as PicksColumnDef[]} columns={columns} />
      ) : (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">No slate found for the selected week.</p>
        </div>
      )}
      <SelectWeek
        vals={{ week: selectedWeek.week as string, year: selectedWeek.year as string }}
        heading={<h2 className="text-xl font-bold w-full">View Results from:</h2>}
        onChange={setSelectedWeek}
      />
      {usePostSeason && bracket?.games?.length ? (
        <div className="mt-4">
          <h4 className="text-base font-semibold px-4 mb-2 text-foreground">
            CFP Picks — {seasonData?.Season}
          </h4>
          {cfpPickHistory.length ? (
            <PicksTable data={cfpPickHistory as PicksColumnDef[]} columns={cfpColumns} />
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No CFP picks submitted yet.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Picks;

Picks.displayName = 'Picks';
