import React from 'react'
import styled from 'styled-components'
import { Picks } from '../../model';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { PicksColumnDef } from '.';
import { Box, Table, TableBody, TableCell, TableRow } from 'grommet';


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

export const StyledCell = styled(TableCell)`
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
  height: 400px;
  overflow-x: scroll;
`;
const TableHead = styled.thead`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.blackBackground}
`
export interface PickHistory {
  slateId: string;
  name: string;
  userId: string;
  week: number;
  year: number;
  picks: Picks[];
  processed?: boolean;
  processedAt?: string;
  correctCount?: number;
  incorrectCount?: number;
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
    defaultColumn: {
      enableResizing: false
    },
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
          <TableHead>
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell style={{
                    textAlign: 'center',
                    width: `${header.getSize()}px`,
                  }} scope='col' key={header.id}>
                    {header.id === 'user' ?
                      flexRender(header.column.columnDef.header, header.getContext()) :
                      flexRender(header.column.columnDef.header, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {tableInstance.getRowModel().rows.map(row => (
              <Row key={row.id}>
                {row.getVisibleCells().map(cell => {
                  return (<>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </>
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