import { useEffect, useState } from 'react';
import { useEvent } from 'util/useEvent';

export function Comment({
  value,
  edit,
  onUpdate,
  onCancel,
}: {
  value: string;
  edit: boolean;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState(value);
  useEffect(() => {
    setState(value);
  }, [value, setState, edit]);
  const focusRef = useEvent((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });
  if (!value && !edit) return null;
  if (edit)
    return (
      <div className="comment--form">
        <textarea
          className="comment"
          value={state}
          onChange={(e) => setState(e.target.value)}
          ref={focusRef}
        />
        <button type="button" onClick={() => onUpdate(state)}>
          Save <i className="fa fa-check" />
        </button>
        <button
          type="button"
          onClick={() => onCancel()}
          style={{ fontWeight: 'normal' }}
        >
          Discard Changes <i className="fa fa-undo" />
        </button>
      </div>
    );
  return (
    <div
      className="comment"
      style={
        value && value.length < 35 && value.indexOf('\n') === -1
          ? { fontSize: '45px' }
          : undefined
      }
    >
      {value}
    </div>
  );
}
