import { CSSProperties, memo } from 'react';
import { equals } from 'util/equals';
import { Filter, Sort, QueryResultDataField } from 'db/db';
import { SizeControlledArea } from '../SizeControlledArea';
import { DataGridCore } from './DataGridCore';

export interface GridProps {
  style: CSSProperties;
  fetchMoreRows?: () => void;
  result:
    | {
        rows: any[];
        fields: QueryResultDataField[];
      }
    | undefined;
  onScroll?: (() => void) | undefined;
  emptyTable?: string | undefined;
  onUpdate?: (u: {
    updates: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string | null };
    }[];
    inserts: { [fieldName: string]: string | null }[];
    removals: { [fieldName: string]: string | number | null }[];
  }) => Promise<boolean>;
  pks?: string[];
  currentSort?: Sort;
  // eslint-disable-next-line react/no-unused-prop-types
  defaultSort?: Sort;
  currentFilter?: Filter;
  onChangeSort?: (sort: Sort) => void;
  className?: string;
  onChangeFilter?: (filter: Filter) => void;
  onTouch?: () => void;
  limit?: 1000 | 10000 | 'unlimited';
  onChangeLimit?: (limit: 1000 | 10000 | 'unlimited') => void;
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
              fetchMoreRows={props.fetchMoreRows}
              onTouch={props.onTouch}
              limit={props.limit}
              onChangeLimit={props.onChangeLimit}
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
    a.fetchMoreRows === b.fetchMoreRows &&
    a.onChangeFilter === b.onChangeFilter &&
    a.limit === b.limit &&
    a.onChangeLimit === b.onChangeLimit,
);
