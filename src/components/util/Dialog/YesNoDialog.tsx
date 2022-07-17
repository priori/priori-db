import { useState } from 'react';
import { grantError } from 'util/errors';
import { useEvent } from 'util/useEvent';
import { Dialog } from './Dialog';

export function YesNoDialog({
  relativeTo,
  onYes,
  onNo,
  question,
}: {
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
  onYes: () => Promise<void>;
  onNo: () => void;
  question: string;
}) {
  const [state, setState] = useState({
    executing: false,
    error: null as Error | null,
  });
  const onYesClick = useEvent(async () => {
    setState({ executing: true, error: null });
    try {
      await onYes();
    } catch (e) {
      setState({
        executing: false,
        error: grantError(e),
      });
    }
  });
  return (
    <Dialog
      onBlur={onNo}
      relativeTo={relativeTo}
      className={state.executing ? 'executing' : ''}
    >
      {state.error ? (
        <div className="dialog-error">
          <div className="dialog-error--main">
            <div className="dialog-error--message">{state.error.message}</div>
          </div>
          <div className="dialog-error--buttons">
            <button
              onClick={() => setState({ error: null, executing: false })}
              type="button"
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
      {question}
      <div>
        <button
          type="button"
          onClick={onYesClick}
          disabled={state.executing || !!state.error}
        >
          Yes
        </button>{' '}
        <button
          type="button"
          onClick={onNo}
          disabled={state.executing || !!state.error}
        >
          No
        </button>
      </div>
    </Dialog>
  );
}
