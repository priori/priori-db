import React from 'react';
import { headerHeight, rowHeight } from './util';

export function buildStyle({
  selection,
  colsWidths,
}: {
  selection: {
    rowIndex: [number, number];
    colIndex: [number, number];
  };
  colsWidths: number[];
}) {
  return {
    left: colsWidths.slice(0, selection.colIndex[0]).reduce((a, b) => a + b, 0),
    width:
      colsWidths
        .slice(selection.colIndex[0], selection.colIndex[1] + 1)
        .reduce((a, b) => a + b, 0) + 1,
  };
}

export const DataGridSelection = React.memo(
  ({
    selection,
    colsWidths,
    className,
  }: {
    selection: {
      rowIndex: [number, number];
      colIndex: [number, number];
    };
    colsWidths: number[];
    className?: 'grid--selection--rows';
  }) => (
    <div
      className={`grid--selection${className ? ` ${className}` : ''}`}
      style={{
        top: headerHeight + selection.rowIndex[0] * rowHeight,
        height:
          (selection.rowIndex[1] - selection.rowIndex[0] + 1) * rowHeight + 1,
        ...buildStyle({ selection, colsWidths }),
      }}
    />
  ),
  (prev, next) =>
    prev.selection === next.selection && prev.colsWidths === next.colsWidths,
);
