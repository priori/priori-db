import {
  closeTab,
  reloadNav,
  renameEntity,
  changeSchema,
  showError,
} from 'state/actions';
import { DB } from 'db/DB';
import { useState } from 'react';
import { SequenceFrameProps } from 'types';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog/Dialog';
import { first } from 'db/Connection';
import { InputDialog } from 'components/util/Dialog/InputDialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';

type SequenceFrameState = {
  type: {
    [key: string]: string | number | boolean | null;
  };
  lastValue: number | string | null;
  comment: string | null;
};

export function SequenceFrame(props: SequenceFrameProps) {
  const service = useService(async () => {
    const [type, lastValue, comment] = await Promise.all([
      DB.pgClass(props.schema, props.name),
      DB.lastValue(props.schema, props.name),
      (
        first(
          `SELECT obj_description(oid) "comment"
          FROM pg_class
          WHERE relname = $1 AND relnamespace = $2::regnamespace`,
          [props.name, props.schema],
        ) as Promise<{ comment: string | null }>
      ).then((res: { comment: string | null }) => res.comment),
    ]);
    return { type, lastValue, comment } as SequenceFrameState;
  }, [props.schema, props.name]);

  const serviceState = service.lastValidData || {
    type: null,
    lastValue: null,
    comment: null,
  };

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
    updateValue: false,
    changeSchema: false,
  });

  const dropCascade = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      ...state,
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
          showError(err);
        },
      );
    else
      DB.dropSequence(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
      );
  });

  useTab({
    f5() {
      service.reload();
    },
  });

  const noClick = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const onUpdateComment = useEvent(async (text: string) => {
    await DB.updateSequence(props.schema, props.name, { comment: text });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const onRename = useEvent(async (name: string) => {
    await DB.updateSequence(props.schema, props.name, { name });
    renameEntity(props.uid, name);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onUpdateCurrentValue = useEvent(async (value: string) => {
    await DB.updateSequenceValue(props.schema, props.name, value);
    await service.reload();
    reloadNav();
    set({ ...state, updateValue: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await DB.updateSequence(props.schema, props.name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  return (
    <div>
      <h1>
        {props.schema}.{props.name}
      </h1>
      <div
        style={{}}
        className={`sequence-value${!serviceState.lastValue ? ' loading' : ''}`}
      >
        <div className="sequence-value--current-value">
          {serviceState.lastValue}
        </div>
        <div>
          <button
            type="button"
            onClick={() => set({ ...state, updateValue: true })}
          >
            Update Current Value <i className="fa fa-retweet" />
          </button>{' '}
        </div>
        {state.updateValue ? (
          <InputDialog
            updateText="Update"
            onUpdate={onUpdateCurrentValue}
            onCancel={() => set({ ...state, updateValue: false })}
            type="number"
            relativeTo="previousSibling"
            value={`${serviceState.lastValue || ''}`}
          />
        ) : null}
      </div>
      <div className="table-info-frame__actions">
        <button
          type="button"
          onClick={() => set({ ...state, editComment: true })}
        >
          Comment <i className="fa fa-file-text-o" />
        </button>{' '}
        <button type="button" onClick={() => set({ ...state, rename: true })}>
          Rename <i className="fa fa-pencil" />
        </button>{' '}
        {state.rename ? (
          <RenameDialog
            relativeTo="previousSibling"
            value={props.name}
            onCancel={() => set({ ...state, rename: false })}
            onUpdate={onRename}
          />
        ) : null}
        <button
          type="button"
          onClick={() => set({ ...state, changeSchema: true })}
        >
          Change Schema{' '}
          <i
            className="fa fa-arrow-right"
            style={{ transform: 'rotate(-45deg)' }}
          />
        </button>{' '}
        {state.changeSchema ? (
          <ChangeSchemaDialog
            relativeTo="previousSibling"
            value={props.schema}
            onCancel={() => set({ ...state, changeSchema: false })}
            onUpdate={onChangeSchema}
          />
        ) : null}
        <button
          type="button"
          onClick={
            state.dropCascadeConfirmation || state.dropConfirmation
              ? undefined
              : drop
          }
        >
          Drop Sequence <i className="fa fa-close" />
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
          Drop Cascade <i className="fa fa-warning" />
        </button>
      </div>{' '}
      {service?.lastValidData?.comment || state.editComment ? (
        <Comment
          value={service?.lastValidData?.comment || ''}
          edit={state.editComment}
          onUpdate={onUpdateComment}
          onCancel={() => set({ ...state, editComment: false })}
        />
      ) : null}
      {serviceState.type ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_type</h2>
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
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
    </div>
  );
}
