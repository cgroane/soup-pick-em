import React from 'react';
import { Picks } from '../../model';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { PicksColumnDef } from '.';

export const StyledCell = ({ className, children, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={`rounded-tl-xl rounded-bl-xl text-xs bg-white text-black ${className ?? ''}`}
    style={style}
    {...props}
  >
    {children}
  </td>
);

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
  columns: ColumnDef<PicksColumnDef>[];
}

const PicksTable: React.FC<PicksTableProps> = ({ data, columns }: PicksTableProps) => {
  const tableInstance = useReactTable({
    data,
    columns,
    defaultColumn: { enableResizing: false },
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnPinning: { left: ['soup'] },
    },
  });

  return (
    <div className="w-full h-[400px] overflow-x-auto p-2">
      <table className="border-separate border-spacing-y-2">
        <thead className="sticky top-0 bg-background">
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: `${header.getSize()}px`, textAlign: 'center' }}
                  scope="col"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {tableInstance.getRowModel().rows.map((row) => (
            <tr key={row.id} className="mt-1 mb-1">
              {row.getVisibleCells().map((cell) => (
                <React.Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="h-4" />
    </div>
  );
};

export default PicksTable;

PicksTable.displayName = 'PicksTable';
