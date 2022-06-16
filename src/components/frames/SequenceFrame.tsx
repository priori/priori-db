import { closeTab, reloadNav } from 'actions';
import { query } from 'db/Connection';
import { useState } from 'react';
import { SequenceFrameProps } from 'types';
import { throwError } from 'util/throwError';
import { useEvent } from 'util/useEvent';

export function SequenceFrame(props: SequenceFrameProps) {
  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
  });
  const dropCascade = useEvent(() => {
    set({
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    if (state.dropCascadeConfirmation)
      query(`DROP SEQUENCE "${props.schema}"."${props.name}" CASCADE`).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    else
      query(`DROP SEQUENCE "${props.schema}"."${props.name}"`).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  });

  const noClick = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  return (
    <div>
      <h1>
        {props.schema}.{props.name}
      </h1>
      {state.dropCascadeConfirmation || state.dropConfirmation ? (
        <div
          className="dialog"
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          tabIndex={0}
          ref={(el) => {
            if (el) el.focus();
          }}
          onBlur={(e) => {
            const dialogEl = e.currentTarget;
            setTimeout(() => {
              if (dialogEl.contains(document.activeElement)) return;
              noClick();
            }, 1);
          }}
        >
          {state.dropCascadeConfirmation
            ? 'Do you really want to drop cascade this sequence?'
            : 'Do you really want to drop this sequence?'}
          <div>
            <button type="button" onClick={yesClick}>
              Yes
            </button>{' '}
            <button type="button" onClick={noClick}>
              No
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={
          state.dropCascadeConfirmation || state.dropConfirmation
            ? undefined
            : drop
        }
      >
        Drop Sequence
      </button>{' '}
      <button
        type="button"
        onClick={
          state.dropCascadeConfirmation || state.dropConfirmation
            ? undefined
            : dropCascade
        }
      >
        Drop Cascade
      </button>
    </div>
  );
}
