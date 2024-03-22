import React, { useEffect, useMemo } from 'react'
import { Box, Button } from 'grommet';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import PicksTable, { PickHistory } from './PicksTable';
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
  numberCorrect: number;
  [key: string]: Outcome | Matchup | { name: string; id: string } | string | number;
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

  /**
   * allpickhistoryies -- each obj in array contains user data, and array of games
   * first column is 
   * first column is user
   */

  const thisWeeksPickHistory = useMemo(() => {
    const reduccePicks = (uPicks: PickHistory[]) => {
    }
    return allPickHistories?.filter((pickSet) => pickSet.slateId === slate?.uniqueWeek)?.map((userPicks) => {
      let sumCorrect = 0;
      return {
        user: { name: userPicks?.name, id: userPicks?.userId },
        ...userPicks?.picks.reduce((acc, pick) => {
          const game = slate?.games.find((g) => g.gameID === pick.matchup);
          if (game) {
            /**
             * get selection is correct
             * identify which value 
             */
            const homePick = (game?.homeTeamName?.toLowerCase().replace(/ /g , '') === pick.selection?.name?.toLowerCase().replace(/ /g , '')) ? 'homeTeam' : 'awayTeam';
            const newScore = game[`${homePick}Score`] + pick.selection?.point;
            if (newScore > game[`${homePick === 'homeTeam' ? 'awayTeam' : 'homeTeam'}Score`]) { sumCorrect++ }
             
          }
          
          return {
            ...acc,
            [pick.matchup]: { selection: pick.selection, ...game as Matchup },
            numberCorrect: sumCorrect
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
          size: 200,
          enablePinning: true
          
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