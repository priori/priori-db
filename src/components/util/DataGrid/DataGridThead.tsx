import { FieldDef } from 'pg';
import React from 'react';
import { equals } from 'util/equals';
import { DataGridSort } from './DataGrid';

interface DataGridTheadProps {
  fields: FieldDef[];
  finalWidths: number[];
  pks?: string[];
  onChangeSort?: (sort: DataGridSort) => void;
  currentSort?: DataGridSort;
}

export const DataGridThead = React.memo(
  ({
    fields,
    finalWidths,
    pks,
    onChangeSort,
    currentSort,
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
              width: finalWidths[index],
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
          </th>
        ))}
      </tr>
    </thead>
  ),
  (prev, next) =>
    prev.fields === next.fields &&
    prev.finalWidths === next.finalWidths &&
    prev.onChangeSort === next.onChangeSort &&
    equals(prev.currentSort, next.currentSort) &&
    equals(prev.pks, next.pks),
);
