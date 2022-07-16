import { closeTab, reloadNav } from 'state/actions';
import { DB } from 'db/DB';
import { useState } from 'react';
import { SequenceFrameProps } from 'types';
import { throwError } from 'util/throwError';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog';

type SequenceFrameState = {
  type: {
    [key: string]: string | number | boolean | null;
  };
  lastValue: number | string | null;
};

export function SequenceFrame(props: SequenceFrameProps) {
  const service = useService(async () => {
    const [type, lastValue] = await Promise.all([
      DB.pgClass(props.schema, props.name),
      DB.lastValue(props.schema, props.name),
    ]);
    return { type, lastValue } as SequenceFrameState;
  }, []);

  const serviceState = service.lastValidData || {
    type: null,
    lastValue: null,
  };

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
      DB.dropSequence(props.schema, props.name, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    else
      DB.dropSequence(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  });

  useTab({
    f5() {
      service.reload();
    },
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
      {typeof serviceState.lastValue === 'number' ||
      typeof serviceState.lastValue === 'string' ? (
        <h1 className="last-value">{serviceState.lastValue}</h1>
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
      {state.dropCascadeConfirmation || state.dropConfirmation ? (
        <Dialog
          onBlur={noClick}
          relativeTo={
            state.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
          }
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
      {serviceState.type ? (
        <>
          <h2>pg_catalog.pg_type</h2>
          <div className="fields">
            {Object.entries(serviceState.type).map(([k, v]) => (
              <div key={k} className="field">
                <strong>{k.startsWith('rel') ? k.substring(3) : k}:</strong>{' '}
                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
