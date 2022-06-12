import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { SchemaInfoFrameProps } from '../../types';
import { dropSchema, dropSchemaCascade } from '../../actions';

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
    if (state.dropCascadeConfirmation) dropSchemaCascade(props.schema);
    else dropSchema(props.schema);
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
        <div className="dialog">
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
