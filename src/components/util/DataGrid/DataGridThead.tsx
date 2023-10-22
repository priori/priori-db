import { FieldDef } from 'pg';
import React from 'react';
import { equals } from 'util/equals';

interface DataGridTheadProps {
  fields: FieldDef[];
  finalWidths: number[];
  pks?: string[];
}

export const DataGridThead = React.memo(
  ({ fields, finalWidths, pks }: DataGridTheadProps) => (
    <thead>
      <tr>
        {fields.map((f, index) => (
          <th
            key={index}
            className={pks && pks.includes(f.name) ? 'pk' : undefined}
            style={{
              width: finalWidths[index],
              ...(f.name === '?column?'
                ? {
                    color: 'rgba(256,256,256,.3)',
                  }
                : undefined),
            }}
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
    equals(prev.pks, next.pks)
);
