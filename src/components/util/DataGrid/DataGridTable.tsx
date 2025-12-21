import { QueryResultDataField } from 'db/db';
import React from 'react';
import { equals } from 'util/equals';
import { cellClassName, getType, getValString } from './util';

interface DataGridTableProps {
  visibleStartingInEven: boolean;
  visibleRows: (string | null | number | undefined)[][];
  slice: [number, number];
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
    gridContentTableWidth,
    fields,
    finalWidths,
    update,
    hoverRowIndex,
  }: DataGridTableProps) => {
    return (
      <table
        className="grid__table"
        style={{
          width: gridContentTableWidth,
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
          {visibleRows.map((row, i) => {
            const rowIndex = i + slice[0];
            const trClassName =
              update?.[rowIndex] === 'REMOVE'
                ? `remove${hoverRowIndex === rowIndex ? ' hover' : ''}`
                : i === visibleRows.length - 1 &&
                    row.length === 0 &&
                    (!update?.[rowIndex] ||
                      Object.values(update?.[rowIndex]).length === 0)
                  ? `spare${hoverRowIndex === rowIndex ? ' hover' : ''}`
                  : hoverRowIndex === rowIndex
                    ? 'hover'
                    : undefined;
            return (
              <tr key={i} className={trClassName}>
                {fields.map((field, index) => {
                  const hasChange =
                    update?.[rowIndex] !== 'REMOVE' &&
                    typeof update?.[rowIndex]?.[index] !== 'undefined';
                  const updateI = update[rowIndex];
                  const val = hasChange ? updateI![index] : row[index];
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
      prev.gridContentTableWidth === next.gridContentTableWidth &&
      prev.fields === next.fields &&
      prev.finalWidths === next.finalWidths &&
      prev.hoverRowIndex === next.hoverRowIndex &&
      equals(prev.update, next.update)
    );
  },
);
