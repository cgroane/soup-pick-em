import React, { useEffect, useMemo } from 'react'
import { Box, Heading } from 'grommet';
import { useGlobalContext } from '../../context/user';
import { usePickContext } from '../../context/pick';
import PicksTable, { StyledCell } from './PicksTable';
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { GamesAPIResponseOutcome, GamesAPIResult } from '../../model';
import SelectWeek from '../../components/SelectWeek';
import GameCell, { StyledGameCell } from './GameCell';
import styled from 'styled-components';
import { useUIContext } from '../../context/ui';
import { useSelectedWeek } from '../../hooks/useSelectedWeek';


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
  game: GamesAPIResult & { isCorrect: boolean };
  numberCorrect: number;
  [key: string]: GamesAPIResponseOutcome | GamesAPIResult & { isCorrect: boolean } | { name: string; id: string } | string | number;
};

const columnHelper = createColumnHelper<PicksColumnDef>();
const Picks: React.FC = () => {
  const {
    seasonData
  } = useUIContext();

  const { selectedWeek, setSelectedWeek } = useSelectedWeek({
    week: seasonData?.ApiWeek?.toString(),
    year: seasonData?.Season?.toString(),
    seasonType: seasonData?.seasonType as 'postseason' | 'regular'
  });

  const {
    fetchUsers,
    allPickHistories,
  } = useGlobalContext();
  const {
    slate,
    fetchSlate,
  } = usePickContext()

  useEffect(() => {
    fetchUsers();
    fetchSlate({
      week: parseInt(selectedWeek?.seasonType === "postseason" ? '1' : selectedWeek.week as string),
      year: selectedWeek?.seasonType === 'postseason' ? selectedWeek?.year + 'POST' : selectedWeek?.year
    });
  }, [fetchUsers, fetchSlate, selectedWeek]);

  /**
   * allpickhistoryies -- each obj in array contains user data, and array of games
   * first column is 
   * first column is user
   * 
   * determining correct pick is not working
   * selection + its point > score difference between the two
   * it's different though for favorite vs not favorite
   * if selection point is positive, the sum of selection score and point should be >= awayscore
   * if selection is negative (favored), sum of selection score and point should be >= other team
   */

  const thisWeeksPickHistory = useMemo(() => {
    return allPickHistories?.filter((pickSet) => pickSet.slateId === slate?.uniqueWeek)?.map((userPicks) => {
      let sumCorrect = 0;
      return {
        user: { name: userPicks?.name, id: userPicks?.userId },
        ...userPicks?.picks.reduce((acc, pick) => {
          const game = slate?.games?.find((g) => g.id === pick.matchup);
          const favIsHome = game?.outcomes
            ? game?.outcomes?.home?.pointValue as number < 0
            : undefined;
          const favPointSpread = favIsHome !== undefined
            ? (favIsHome ? game?.outcomes?.home.pointValue : game?.outcomes?.away.pointValue)
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
              const homePick = (pick.selection?.name?.toLowerCase().replace(/ /g, '').includes(game?.homeTeam.toLowerCase().replace(/ /g, ''))) ? 'home' : 'away';
              const newScore = (game[`${homePick}Points`] ?? 0) + (pick.selection?.pointValue ?? 0);
              if (newScore > (game[`${homePick === 'home' ? 'away' : 'home'}Points`] ?? 0)) {
                sumCorrect++;
                isCorrect = true
              }
            }
          }

          return {
            ...acc,
            [pick.matchup]: { selection: pick.selection, isCorrect, ...game as GamesAPIResult },
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
        {
          ...columnHelper.accessor('user', {
            cell: info => {
              return (
                <StyledCell
                  key={info?.cell?.id}
                  style={{ textAlign: 'center' }}
                  border={'horizontal'}
                  background={'white'}
                >
                  {info?.row?.original?.user?.name}
                </StyledCell>
              )
            },

            header: 'Soup',
            size: 100,
            enablePinning: true

          }),
        },
        ...slate?.games?.map((game) => ({
          ...columnHelper.accessor(`${game?.id}`, {
            header: () => <HeaderCell >
              <p>{game?.awayTeam}</p>
              <p><span style={{ fontWeight: 600 }} >at</span></p>
              <p>{game?.homeTeam}</p>
              <p>{game?.homeTeamData?.abbreviation} {(game?.pointSpread ?? 0) > 0 ? '+' : ''}{game?.pointSpread}</p>
            </HeaderCell>,
            minSize: undefined,
            maxSize: undefined,
            size: 250,
            cell: (props) => {
              // get row
              if (props?.row.original) {
                const selection = props?.row?.original[props?.column?.id] as GamesAPIResult & { isCorrect: boolean; selection: GamesAPIResponseOutcome };
                return <GameCell scope='row' game={selection as GamesAPIResult & { isCorrect: boolean }} >
                  {selection?.selection?.name}
                </GameCell>
              }
              return;
            }
          }),
        })
        ),
        {
          ...columnHelper.accessor('numberCorrect', {
            header: `Record`,
            cell: info => {
              const incorrect = Math.abs((info?.row?.original?.numberCorrect) - 10)
              return <StyledGameCell >
                {info?.row?.original?.numberCorrect} - {incorrect}
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
        {thisWeeksPickHistory && <PicksTable data={thisWeeksPickHistory as PicksColumnDef[]} columns={columns} />}
        <SelectWeek
          vals={{ week: selectedWeek.week as string, year: selectedWeek.year as string }}
          heading={<Heading style={{ width: '100%' }} >
            View Results from:
          </Heading>}
          onChange={setSelectedWeek}
        />
      </Box>
    </>
  )
}

export default Picks

Picks.displayName = "Picks"