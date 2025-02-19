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
      <div
        style={{ outline: 'none' }}
        onBlurCapture={(e) => {
          const div = e.currentTarget;
          setTimeout(() => {
            if (
              !document.activeElement ||
              !div.contains(document.activeElement)
            ) {
              onClose();
            }
          }, 1);
        }}
        tabIndex={0}
      >
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
          className="button"
          disabled={!schemaName}
          style={
            schemaName
              ? { marginLeft: 2, paddingInline: 9 }
              : { opacity: 0.5, marginLeft: 2, paddingInline: 9 }
          }
          onClick={schemaName ? () => onCreateSchema(schemaName) : undefined}
        >
          Ok
        </button>{' '}
        <button
          className="button"
          onClick={() => onClose()}
          style={{ marginLeft: 4, paddingInline: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
