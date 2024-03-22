import React from 'react'
import styled from 'styled-components'
import { Matchup, Outcome, Picks } from '../../model';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { PicksColumnDef } from '.';
import { Box, Table, TableBody, TableCell, TableHeader, TableRow } from 'grommet';
import GameCell from './GameCell';
 

/**
 * COLUMNS
 * user
 * slate.games
 * correct / incorrect sum
 * 
 * CELL
 * user.pick.slate.games
 * 
 *
 * data -- maybe map user.picks into just this slate's picks?
 */
const StyledCell = styled(TableCell)`
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  font-size: 12px;
`;
const Row = styled(TableRow)`
  margin-top: 4px;
  margin-bottom: 4px;
`
const StyledTable = styled(Table)`
  border-collapse: separate;
  border-spacing: 0 0.5rem;
`

const TableWrapper = styled(Box)`
  width: 100%;
  min-height: 100%;
  height: 100%;
  overflow-x: scroll;
`;
export interface PickHistory {
  slateId: string;
  name: string;
  userId: string;
  week: number;
  year: number;
  picks: Picks[];
}
interface PicksTableProps {
  data: PicksColumnDef[];
  columns: ColumnDef<PicksColumnDef>[]
}
const PicksTable: React.FC<PicksTableProps> = ({
  data,
  columns
}: PicksTableProps) => {

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnPinning: {
        left: ['soup']
      }
    }
  });

  return (
    <>
      <TableWrapper className="p-2" pad={'3rem'} >
        <StyledTable>
          <TableHeader>
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell style={{
                    textAlign: 'center',
                  }} scope='col' key={header.id}>
                    {header.id === 'user' ?
                    flexRender(header.column.columnDef.header, header.getContext()) :
                    flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tableInstance.getRowModel().rows.map(row => (
              <Row key={row.id}>
                {row.getVisibleCells().map(cell => {
                    const cellVal = cell?.getValue<Matchup & { selection: Outcome }>() ?? "No selection"
                    console.log(cell.getValue(), row.original)
                    return (
                      cell.column.id === 'user' ? (
                        <StyledCell key={cell.id} style={{ textAlign: 'center' }} border={'horizontal'} background={'white'} >
                          {cell.getValue<{ name: string; id: string }>().name ?? ''}
                        </StyledCell>
                      ) :
                      <GameCell game={row.original[cell.column.id] as Matchup} outcome={cellVal.selection as Outcome} scope='row' key={cell.id}>
                        {cellVal?.selection.name ?? 'No selection'}
                      </GameCell>
                    )
                  })
                }
              </Row>
            ))}
          </TableBody>
        </StyledTable>
      <div className="h-4" />
    </TableWrapper>
    </>
  )
}
 
export default PicksTable
 
PicksTable.displayName = "PicksTable"