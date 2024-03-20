import React, { useEffect, useMemo } from 'react'
import { Box, Button } from 'grommet';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import PicksTable from './PicksTable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { Matchup, Outcome, UserCollectionData } from '../../model';
import SelectWeek from '../../components/SelectWeek';
 

/**
 * 
 * @returns 
 * needs horizontal scroll body for picks
 * needs each user
 * needs users picks
 * needs week number selector - current week as default
 * needs this week's slate
 * each cell will populate with a team name (outcome.name) or selection.name or 'PUSH'
 * header will be matchup info
 */

export interface PicksColumnDef {
  user: { name: string; id: string };
  game: Matchup;
  [key: string]: Outcome | Matchup | { name: string; id: string } | string;
};

const columnHelper = createColumnHelper<PicksColumnDef>();
const Picks: React.FC = () => {

  const {
    fetchUsers,
    allPickHistories,
  } = useGlobalContext();
  const {
    slate,
    fetchSlate,
    refreshSlatePicksStatus
  } = usePickContext()
  
  useEffect(() => {
    fetchUsers();
    fetchSlate({  });
  }, [fetchUsers, fetchSlate]);

  const thisWeeksPickHistory = useMemo(() => {
    return allPickHistories?.map((userPicks) => {
      return {
        user: { name: userPicks?.name, id: userPicks?.userId },
        ...userPicks?.picks.reduce((acc, pick) => {
          const game = slate?.games.find((g) => g.gameID === pick.matchup);
          return {
            ...acc,
            game: game as Matchup,
            [pick.matchup]: pick.selection
          };
        }, {})
      } 
    }) as PicksColumnDef[]
    ;
  }, [slate, allPickHistories]);
  
  const columns: ColumnDef<PicksColumnDef>[] = useMemo(() => {

    if (slate?.games) {
      const cols = [
        {...columnHelper.accessor('user', {
          cell: info => info.getValue<UserCollectionData>(),
          header: 'Soup',
          size: 200
        }),
      },
          ...slate?.games?.map((game) => (
            {
              ...columnHelper.accessor(`${game.gameID}`, {
              cell: info => info.getValue<PicksColumnDef>(),
              header: `${game.awayTeamName} at ${game.homeTeamName}`,
              size: 500,
              minSize: undefined,
              maxSize: undefined
            }),
          })
        )
      ];
      return cols as ColumnDef<PicksColumnDef>[]
    } else {
      return []
    }
  }, [slate?.games])
  
  return (
    <>
      <Box>
        {<PicksTable data={thisWeeksPickHistory as PicksColumnDef[]} columns={columns} />}
        <SelectWeek onChange={fetchSlate} />
        <Button label='Update Scores' onClick={() => refreshSlatePicksStatus({ week: 9 })} />
      </Box>
    </>
  )
}
 
export default Picks
 
Picks.displayName = "Picks"