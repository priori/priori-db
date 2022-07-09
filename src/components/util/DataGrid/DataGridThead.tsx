import { FieldDef } from 'pg';
import React from 'react';

interface DataGridTheadProps {
  fields: FieldDef[];
  finalWidths: number[];
}

export const DataGridThead = React.memo(
  ({ fields, finalWidths }: DataGridTheadProps) => (
    <thead>
      <tr>
        {fields.map((f, index) => (
          <th
            key={index}
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
    prev.fields === next.fields && prev.finalWidths === next.finalWidths
);
