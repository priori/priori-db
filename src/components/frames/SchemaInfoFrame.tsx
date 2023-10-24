import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { DB } from 'db/DB';
import { Dialog } from 'components/util/Dialog/Dialog';
import { SchemaInfoFrameProps } from '../../types';
import { closeTab, reloadNav, showError } from '../../state/actions';

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
          showError(err);
        },
      );
    } else {
      DB.dropSchema(props.schema).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
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
      {state.dropCascadeConfirmation || state.dropConfirmation ? (
        <Dialog
          onBlur={noClick}
          relativeTo={
            state.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
          }
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
        </Dialog>
      ) : null}
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
