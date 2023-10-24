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
    <div
      className="new-schema-form"
      onMouseDown={(e) => {
        if (
          e.target instanceof HTMLDivElement &&
          e.target.className === 'new-schema-form'
        ) {
          onClose();
        }
      }}
    >
      <div>
        Name:{' '}
        <input
          type="text"
          onChange={(e) => {
            set(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && schemaName) {
              onCreateSchema(schemaName);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          ref={(el) => {
            if (el) {
              el.focus();
            }
          }}
        />{' '}
        <button
          disabled={!schemaName}
          style={schemaName ? undefined : { opacity: 0.5 }}
          type="button"
          onClick={schemaName ? () => onCreateSchema(schemaName) : undefined}
        >
          Ok
        </button>{' '}
        <button type="button" onClick={() => onClose()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
