import { FieldDef } from 'pg';
import React from 'react';
import { equals } from 'util/equals';
import { cellClassName, getType, getValString } from './util';

interface DataGridTableProps {
  visibleStartingInEven: boolean;
  visibleRows: (string | null | number)[][];
  slice: [number, number];
  selection:
    | {
        colIndex: [number, number];
        rowIndex: [number, number];
      }
    | undefined;
  gridContentTableTop: string;
  gridContentTableWidth: number | undefined;
  fields: FieldDef[];
  finalWidths: number[];
  update: { [k: number]: { [k: number]: string | null } };
}

export const DataGridTable = React.memo(
  ({
    visibleStartingInEven,
    visibleRows,
    slice,
    selection,
    gridContentTableTop,
    gridContentTableWidth,
    fields,
    finalWidths,
    update,
  }: DataGridTableProps) => {
    return (
      <table
        className="content-table"
        style={{
          width: gridContentTableWidth,
          position: 'relative',
          top: gridContentTableTop,
        }}
      >
        <thead style={{ visibility: 'hidden' }}>
          <tr>
            {fields.map((f, index) => (
              <th key={index} style={{ width: finalWidths[index] }}>
                {f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleStartingInEven ? <tr style={{ display: 'none' }} /> : null}
          {visibleRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={
                rowIndex === visibleRows.length - 1 &&
                row.length === 0 &&
                (!update?.[slice[0] + rowIndex] ||
                  Object.values(update?.[slice[0] + rowIndex]).length === 0)
                  ? 'spare'
                  : undefined
              }
            >
              {fields.map((_, index) => {
                const hasChange =
                  typeof update?.[slice[0] + rowIndex]?.[index] !== 'undefined';
                const val = hasChange
                  ? update[slice[0] + rowIndex][index]
                  : row[index];
                const type = getType(val);
                const valString = getValString(val);
                const className = cellClassName(
                  index,
                  slice[0] + rowIndex,
                  selection,
                  hasChange,
                );
                return (
                  <td key={index} className={className}>
                    <div className={type}>
                      <div className="cell">
                        {valString && valString.length > 200
                          ? `${valString.substring(0, 200)}...`
                          : valString}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  (prev, next) => {
    return (
      prev.visibleStartingInEven === next.visibleStartingInEven &&
      prev.visibleRows === next.visibleRows &&
      prev.slice[0] === next.slice[0] &&
      prev.slice[1] === next.slice[1] &&
      prev.selection === next.selection &&
      prev.gridContentTableTop === next.gridContentTableTop &&
      prev.gridContentTableWidth === next.gridContentTableWidth &&
      prev.fields === next.fields &&
      prev.finalWidths === next.finalWidths &&
      equals(prev.update, next.update)
    );
  },
);
