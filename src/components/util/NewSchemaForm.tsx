import { useState } from 'react';

export function NewSchemaForm({
  onCreateSchema,
  onClose,
}: {
  onCreateSchema: (v: string) => void;
  onClose: () => void;
}) {
  const [schemaName, set] = useState('');
  return (
    <div className="new-schema-form">
      <div>
        Name:{' '}
        <input
          type="text"
          onChange={(e) => {
            set(e.target.value);
          }}
        />{' '}
        <button type="button" onClick={() => onCreateSchema(schemaName)}>
          Ok
        </button>{' '}
        <button type="button" onClick={() => onClose()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
