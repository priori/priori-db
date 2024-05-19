import { Sort } from 'db/util';
import { QueryResultDataField } from 'db/Connection';
import React from 'react';
import { equals } from 'util/equals';

interface DataGridTheadProps {
  fields: QueryResultDataField[];
  colsWidths: number[];
  pks?: string[];
  onChangeSort?: (sort: Sort) => void;
  currentSort?: Sort;
  onStartResize: (index: number, e: React.MouseEvent) => void;
}

export const DataGridThead = React.memo(
  ({
    fields,
    colsWidths,
    pks,
    onChangeSort,
    currentSort,
    onStartResize,
  }: DataGridTheadProps) => (
    <thead>
      <tr>
        {fields.map((f, index) => (
          <th
            key={index}
            className={[
              pks && pks.includes(f.name) ? 'pk' : undefined,
              currentSort?.find((s) => s.field === f.name) ? 'sort' : undefined,
              onChangeSort ? 'sortable' : undefined,
              currentSort?.find((s) => s.field === f.name)?.direction,
            ]
              .filter((v) => v)
              .join(' ')}
            style={{
              width: colsWidths[index],
              ...(f.name === '?column?'
                ? {
                    color: 'rgba(256,256,256,.3)',
                  }
                : undefined),
            }}
            onClick={
              onChangeSort
                ? (e: React.MouseEvent) => {
                    const curr = currentSort?.find((f2) => f2.field === f.name);
                    onChangeSort([
                      {
                        field: f.name,
                        direction:
                          curr?.direction === 'asc'
                            ? 'desc'
                            : curr?.direction === 'desc'
                              ? 'asc'
                              : ((e.ctrlKey ? 1 : 0) +
                                    (e.metaKey ? 1 : 0) +
                                    (e.altKey ? 1 : 0)) %
                                  2
                                ? 'desc'
                                : 'asc',
                      },
                      ...(e.shiftKey
                        ? currentSort?.filter((s) => s.field !== f.name) || []
                        : []),
                    ]);
                  }
                : undefined
            }
          >
            {f.name}
            <div onMouseDown={(e) => onStartResize(index + 1, e)} />
          </th>
        ))}
      </tr>
    </thead>
  ),
  (prev, next) =>
    prev.fields === next.fields &&
    prev.colsWidths === next.colsWidths &&
    prev.onChangeSort === next.onChangeSort &&
    equals(prev.currentSort, next.currentSort) &&
    equals(prev.pks, next.pks),
);
