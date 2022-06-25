import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { DB } from 'db/DB';
import { throwError } from 'util/throwError';
import { SchemaInfoFrameProps } from '../../types';
import { closeTab, reloadNav } from '../../state/actions';

export function SchemaInfoFrame(props: SchemaInfoFrameProps) {
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
    if (state.dropCascadeConfirmation) {
      DB.dropSchema(props.schema, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    } else {
      DB.dropSchema(props.schema).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    }
  });

  const noClick = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  return (
    <div>
      <h1>{props.schema}</h1>
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
            ? 'Do you really want to drop cascade this schema?'
            : 'Do you really want to drop this schema?'}
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
        Drop Schema
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
