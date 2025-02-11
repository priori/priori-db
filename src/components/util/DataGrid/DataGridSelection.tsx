import React from 'react';
import { headerHeight, rowHeight } from './util';

export const DataGridSelection = React.memo(
  ({
    selection,
    colsWidths,
  }: {
    selection: {
      rowIndex: [number, number];
      colIndex: [number, number];
    };
    colsWidths: number[];
  }) => (
    <div
      className="grid--selection"
      style={{
        top: headerHeight + selection.rowIndex[0] * rowHeight,
        left: colsWidths
          .slice(0, selection.colIndex[0])
          .reduce((a, b) => a + b, 0),
        height:
          (selection.rowIndex[1] - selection.rowIndex[0] + 1) * rowHeight + 1,
        width:
          colsWidths
            .slice(selection.colIndex[0], selection.colIndex[1] + 1)
            .reduce((a, b) => a + b, 0) + 1,
      }}
    />
  ),
  (prev, next) =>
    prev.selection === next.selection && prev.colsWidths === next.colsWidths,
);
