import { QueryArrayResult } from 'pg';
import { CSSProperties, memo } from 'react';
import { equals } from 'util/equals';
import { SizeControlledArea } from '../SizeControlledArea';
import { DataGridCore } from './DataGridCore';

export interface GridProps {
  style: CSSProperties;
  result: QueryArrayResult | undefined;
  onScroll?: (() => void) | undefined;
  emptyTable?: string | undefined;
}

export const DataGrid = memo(
  (props: GridProps) => {
    const res = props.result;
    if (res) {
      return (
        <SizeControlledArea
          style={props.style}
          className="grid"
          render={(width: number, height: number) => (
            <DataGridCore
              result={res}
              width={width}
              onScroll={props.onScroll}
              height={height}
              emptyTable={props.emptyTable}
            />
          )}
        />
      );
    }
    return <div className="grid" />;
  },
  (a, b) =>
    a.result === b.result &&
    equals(a.style, b.style) &&
    a.onScroll === b.onScroll
);
