import { QueryResultDataField } from 'db/db';
import React from 'react';
import { equals } from 'util/equals';
import { cellClassName, getType, getValString } from './util';

interface DataGridTableProps {
  visibleStartingInEven: boolean;
  visibleRows: (string | null | number)[][];
  slice: [number, number];
  gridContentTableTop: string;
  gridContentTableWidth: number | undefined;
  fields: QueryResultDataField[];
  finalWidths: number[];
  update: { [k: number]: { [k: number]: string | null } };
  hoverRowIndex: number | undefined;
}

export const DataGridTable = React.memo(
  ({
    visibleStartingInEven,
    visibleRows,
    slice,
    gridContentTableTop,
    gridContentTableWidth,
    fields,
    finalWidths,
    update,
    hoverRowIndex,
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
          {visibleRows.map((row, rowIndex) => {
            const trClassName =
              update?.[rowIndex + slice[0]] === 'REMOVE'
                ? `remove${hoverRowIndex === rowIndex ? ' hover' : ''}`
                : rowIndex === visibleRows.length - 1 &&
                    row.length === 0 &&
                    (!update?.[slice[0] + rowIndex] ||
                      Object.values(update?.[slice[0] + rowIndex]).length === 0)
                  ? `spare${hoverRowIndex === rowIndex ? ' hover' : ''}`
                  : hoverRowIndex === rowIndex
                    ? 'hover'
                    : undefined;
            return (
              <tr key={rowIndex} className={trClassName}>
                {fields.map((field, index) => {
                  const hasChange =
                    update?.[rowIndex + slice[0]] !== 'REMOVE' &&
                    typeof update?.[slice[0] + rowIndex]?.[index] !==
                      'undefined';
                  const val = hasChange
                    ? update[slice[0] + rowIndex][index]
                    : row[index];
                  const type = getType(val, field.type);
                  const valString = getValString(val);
                  const className = cellClassName(hasChange);
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
            );
          })}
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
      prev.gridContentTableTop === next.gridContentTableTop &&
      prev.gridContentTableWidth === next.gridContentTableWidth &&
      prev.fields === next.fields &&
      prev.finalWidths === next.finalWidths &&
      prev.hoverRowIndex === next.hoverRowIndex &&
      equals(prev.update, next.update)
    );
  },
);
