import { useState } from 'react';
import { showError } from 'state/actions';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { Dialog } from './Dialog';

export function InputDialog({
  value,
  onUpdate,
  onCancel,
  relativeTo,
  updateText,
  type,
  options,
}: {
  value: string;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
  updateText: string;
  type?: 'text' | 'number' | 'textarea' | 'password';
  options?: string[];
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  const [state, setState] = useState(value);
  const [error, setError] = useState<Error | null>(null);
  const [executing, setExecuting] = useState(false);
  const onBlur = useEvent(() => {
    if (executing) return;
    onCancel();
  });
  const isMounted = useIsMounted();
  const onSave = useEvent(async () => {
    try {
      setExecuting(true);
      await onUpdate(state);
    } catch (e) {
      if (isMounted()) setError(grantError(e));
      else showError(grantError(e));
    } finally {
      if (isMounted()) setExecuting(false);
    }
  });
  const focusRef = useEvent(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (el) {
        setTimeout(() => {
          el.focus();
          if (type !== 'number')
            el.setSelectionRange(el.value.length, el.value.length);
        }, 10);
      }
    },
  );
  return (
    <Dialog relativeTo={relativeTo} onBlur={onBlur}>
      {error ? (
        <div className="dialog-error">
          <div className="dialog-error--main">
            <div className="dialog-error--message">{error.message}</div>
          </div>
          <div className="dialog-error--buttons">
            <button
              className="button"
              onClick={() => setError(null)}
              style={{
                padding: '6px 14px !important',
                boxShadow: 'none',
              }}
            >
              Ok
            </button>
          </div>
        </div>
      ) : null}
      {options ? (
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          disabled={!!error || executing}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          disabled={!!error || executing}
          ref={focusRef}
          value={state}
          onChange={(e) => setState(e.target.value)}
          onKeyDown={(e) => {
            if (executing) return;
            if (e.key === 'Escape') {
              onCancel();
            } else if (e.key === 'Enter') {
              if (state === value) onCancel();
              else onSave();
            }
          }}
        />
      ) : (
        <input
          disabled={!!error || executing}
          type={
            type === 'number'
              ? 'number'
              : type === 'text'
                ? 'text'
                : type === 'password'
                  ? 'password'
                  : 'text'
          }
          ref={focusRef}
          value={state}
          onChange={(e) => setState(e.target.value)}
          onKeyDown={(e) => {
            if (executing) return;
            if (e.key === 'Escape') {
              onCancel();
            } else if (e.key === 'Enter') {
              if (state === value) onCancel();
              else onSave();
            }
          }}
        />
      )}
      <button
        className="button"
        disabled={!!error || executing}
        style={{ fontWeight: 'normal' }}
        onClick={onCancel}
      >
        Cancel
      </button>{' '}
      <button
        className="button"
        disabled={!!error || executing || state === value}
        onClick={state === value ? undefined : onSave}
      >
        {updateText} <i className="fa fa-check" />
      </button>
    </Dialog>
  );
}
