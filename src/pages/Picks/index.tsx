import React, { useEffect, useMemo } from 'react'
import { Box, Button } from 'grommet';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import PicksTable, { StyledCell } from './PicksTable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { Matchup, Outcome } from '../../model';
import SelectWeek from '../../components/SelectWeek';
import GameCell, { StyledGameCell } from './GameCell';
import styled from 'styled-components';

const HeaderCell = styled.td`
border-radius: 12px;
background: white;
color: black;
display: flex;
flex-direction: column;
align-items: center;
text-align: center;
justify-content: center;
padding: 8px;
p {
  margin: 2px;
}

`

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
  game: Matchup & { isCorrect: boolean };
  numberCorrect: number;
  [key: string]: Outcome | Matchup & { isCorrect: boolean} | { name: string; id: string } | string | number;
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
    return allPickHistories?.filter((pickSet) => pickSet.slateId === slate?.uniqueWeek)?.map((userPicks) => {
      let sumCorrect = 0;
      return {
        user: { name: userPicks?.name, id: userPicks?.userId },
        ...userPicks?.picks.reduce((acc, pick) => {
          const game = slate?.games.find((g) => g.gameID === pick.matchup);
          const fav = game?.outcomes.find((o) => o.point < 0);
          let isCorrect = pick.isCorrect;
          if (game) {
            if (pick.selection?.name === 'PUSH' && ((fav?.point ?? 0 + game?.pointSpread) === 0)) {
              sumCorrect++;
              isCorrect = true;
            } else {
              const homePick = (game?.homeTeamName?.toLowerCase().replace(/ /g , '') === pick.selection?.name?.toLowerCase().replace(/ /g , '')) ? 'homeTeam' : 'awayTeam';
              const newScore = game[`${homePick}Score`] + pick.selection?.point;
              if (newScore > game[`${homePick === 'homeTeam' ? 'awayTeam' : 'homeTeam'}Score`]) { sumCorrect++; isCorrect = true }
            }
          }
          
          return {
            ...acc,
            [pick.matchup]: { selection: pick.selection, isCorrect,...game as Matchup },
            numberCorrect: sumCorrect
          };
        }, {})
      }
    }) as PicksColumnDef[]
    ;
  }, [slate, allPickHistories]);
  /**
   * picks column def needs to just be id, name, 
   */
  const columns: ColumnDef<PicksColumnDef>[] = useMemo(() => {

    if (slate?.games) {
      const cols = [
        {...columnHelper.accessor('user', {
          cell: info => {
            return (
              <StyledCell
                key={info.cell.id}
                style={{ textAlign: 'center' }}
                border={'horizontal'}
                background={'white'}
              >
                {info.row.original.user.name}
              </StyledCell>
            )
          },
          
          header: 'Soup',
          size: 100,
          enablePinning: true
          
        }),
      },
          ...slate?.games?.map((game) => ({
              ...columnHelper.accessor(`${game.gameID}`, {
              header: () => <HeaderCell >
                  <p>{game.awayTeamName}</p>
                  <p><span style={{ fontWeight: 600 }} >at</span></p>
                  <p>{game.homeTeamName}</p>
                </HeaderCell>,
              minSize: undefined,
              maxSize: undefined,
              size: 250,
              cell: (props) => {
                // get row
                const selection = props.row.original[props.column.id] as Matchup & {isCorrect: boolean; selection: Outcome };
                return <GameCell scope='row' game={selection as Matchup & {isCorrect: boolean}} >
                  { selection?.selection?.name }
                </GameCell>
              }
            }),
          })
        ),
        {
          ...columnHelper.accessor('numberCorrect', {
            header: `Record`,
            cell: info => {
              const incorrect = Math.abs((info.row.original.numberCorrect) - 10)
              return <StyledGameCell >
                { info.row.original.numberCorrect } - { incorrect }
              </StyledGameCell>
            },
            size: 100,
            minSize: undefined,
            maxSize: undefined
          })
        }
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