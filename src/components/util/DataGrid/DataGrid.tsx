import { QueryArrayResult } from 'pg';
import { CSSProperties, memo } from 'react';
import { equals } from 'util/equals';
import { SizeControlledArea } from '../SizeControlledArea';
import { DataGridCore } from './DataGridCore';

export type DataGridSort = {
  field: string;
  direction: 'asc' | 'desc';
}[];

export interface GridProps {
  style: CSSProperties;
  result: QueryArrayResult | undefined;
  onScroll?: (() => void) | undefined;
  emptyTable?: string | undefined;
  onUpdate?: (
    update: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string };
    }[],
  ) => Promise<boolean>;
  pks?: string[];
  currentSort?: DataGridSort;
  onChangeSort?: (sort: DataGridSort) => void;
  className?: string;
}

export const DataGrid = memo(
  (props: GridProps) => {
    const res = props.result;
    if (res) {
      return (
        <SizeControlledArea
          style={props.style}
          className={`grid${props.className ? ` ${props.className}` : ''}`}
          render={(width: number, height: number) => (
            <DataGridCore
              result={res}
              width={width}
              onScroll={props.onScroll}
              height={height}
              pks={props.pks}
              emptyTable={props.emptyTable}
              onUpdate={props.onUpdate}
              currentSort={props.currentSort}
              onChangeSort={props.onChangeSort}
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
    equals(a.currentSort, b.currentSort) &&
    a.onChangeSort === b.onChangeSort &&
    equals(a.pks, b.pks) &&
    a.onUpdate === b.onUpdate &&
    a.className === b.className &&
    a.onScroll === b.onScroll,
);
