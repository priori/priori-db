import { QueryArrayResult } from 'pg';
import { CSSProperties, memo } from 'react';
import { equals } from 'util/equals';
import { SizeControlledArea } from '../SizeControlledArea';
import { DataGridCore } from './DataGridCore';
import { Filter } from './DataGridFilterDialog';

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
      values: { [fieldName: string]: string | null };
    }[],
  ) => Promise<boolean>;
  pks?: string[];
  currentSort?: DataGridSort;
  defaultSort?: DataGridSort;
  currentFilter?: Filter;
  onChangeSort?: (sort: DataGridSort) => void;
  className?: string;
  onChangeFilter?: (filter: Filter) => void;
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
              currentFilter={props.currentFilter}
              width={width}
              onScroll={props.onScroll}
              height={height}
              pks={props.pks}
              emptyTable={props.emptyTable}
              onUpdate={props.onUpdate}
              currentSort={props.currentSort}
              onChangeSort={props.onChangeSort}
              onChangeFilter={props.onChangeFilter}
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
    a.onScroll === b.onScroll &&
    a.currentFilter === b.currentFilter &&
    a.onChangeFilter === b.onChangeFilter,
);
