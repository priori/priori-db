import { useTab } from 'components/main/connected/ConnectedApp';
import { Comment } from 'components/util/Comment';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { Dialog } from 'components/util/Dialog/Dialog';
import { InputDialog } from 'components/util/Dialog/InputDialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { db } from 'db/db';
import { useState } from 'react';
import {
  changeSchema,
  closeTab,
  reloadNav,
  renameEntity,
  showError,
} from 'state/actions';
import { currentState } from 'state/state';
import { SequenceFrameProps } from 'types';
import { assert } from 'util/assert';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';
import { Info } from './Info';
import { Privileges } from './Privileges/Privileges';

function sequenceDb() {
  const db2 = db();
  assert(db2.sequences, 'Sequences not supported');
  return db2.sequences;
}

export function SequenceFrame(props: SequenceFrameProps) {
  const service = useService(
    async () =>
      Promise.all([
        sequenceDb().sequence(props.schema, props.name),
        sequenceDb().privilegesTypes?.(),
      ]).then(([sequence, privilegesTypes]) => ({
        ...sequence,
        privilegesTypes,
      })),
    [props.schema, props.name],
  );

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
    editOwner: false as string | boolean,
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
      sequenceDb()
        .dropSequence(props.schema, props.name, true)
        .then(
          () => {
            setTimeout(() => closeTab(props), 10);
            reloadNav();
          },
          (err) => {
            showError(err);
          },
        );
    else
      sequenceDb()
        .dropSequence(props.schema, props.name)
        .then(
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
    await sequenceDb().updateSequence(props.schema, props.name, {
      comment: text,
    });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const onRename = useEvent(async (name: string) => {
    await sequenceDb().updateSequence(props.schema, props.name, { name });
    renameEntity(props.uid, name);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onUpdateCurrentValue = useEvent(async (value: string) => {
    await sequenceDb().updateSequenceValue(props.schema, props.name, value);
    await service.reload();
    reloadNav();
    set({ ...state, updateValue: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await sequenceDb().updateSequence(props.schema, props.name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  const isMounted = useIsMounted();
  const { roles } = currentState();
  const owner = service.lastValidData?.owner;
  const saveOwner = useEvent(() => {
    sequenceDb().alterSequenceOwner!(
      props.schema,
      props.name,
      state.editOwner as string,
    ).then(
      () => {
        if (!isMounted()) return;
        service.reload();
        if (!isMounted()) return;
        set({ ...state, editOwner: false });
      },
      (err) => {
        showError(err);
      },
    );
  });

  const onUpdatePrivileges = useEvent(
    async (
      roleName: string,
      update: { [key: string]: boolean | undefined },
      host?: string,
    ) => {
      await sequenceDb().updateSequencePrivileges?.(
        props.schema,
        props.name,
        roleName,
        update,
        host,
      );
      if (!isMounted()) return;
      await service.reload();
    },
  );

  const reloading = useMoreTime(service.status === 'reloading', 100);

  return (
    <div
      style={{
        opacity: reloading ? 0.5 : 1,
        transition: 'opacity 0.1s',
      }}
    >
      <h1>
        <span className="adjustment-icon--big">
          <div />
        </span>
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
            className="button"
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
          className="button"
          onClick={() => set({ ...state, editComment: true })}
        >
          Comment <i className="fa fa-file-text-o" />
        </button>{' '}
        <button
          className="button"
          onClick={() => set({ ...state, rename: true })}
        >
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
          className="button"
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
          className="button"
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
              <button className="button" onClick={yesClick}>
                Yes
              </button>{' '}
              <button className="button" onClick={noClick}>
                No
              </button>
            </div>
          </Dialog>
        ) : null}
        <button
          className="button"
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
      {owner ? (
        <div className="owner" title="OWNER">
          <i className="fa fa-user" /> <span className="name">{owner}</span>
          {db().sequences?.alterSequenceOwner ? (
            <>
              <i
                className="fa fa-pencil"
                onClick={() => set({ ...state, editOwner: true })}
              />
              {state.editOwner ? (
                <Dialog
                  relativeTo="previousSibling"
                  onBlur={() => set({ ...state, editOwner: false })}
                >
                  <select
                    onChange={(e) =>
                      set({ ...state, editOwner: e.target.value })
                    }
                    value={
                      typeof state.editOwner === 'string'
                        ? state.editOwner
                        : owner
                    }
                  >
                    {roles?.map((r) => (
                      <option key={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <div>
                    <button
                      className="button"
                      style={{ fontWeight: 'normal' }}
                      onClick={() => set({ ...state, editOwner: false })}
                    >
                      Cancel
                    </button>
                    <button className="button" onClick={saveOwner}>
                      Save
                      <i className="fa fa-check" />
                    </button>
                  </div>
                </Dialog>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
      {service.lastValidData?.privilegesTypes &&
      service.lastValidData?.privileges &&
      service.lastValidData.privilegesTypes ? (
        <Privileges
          entityType="sequence"
          privilegesTypes={service.lastValidData.privilegesTypes}
          privileges={service.lastValidData.privileges}
          onUpdate={async ({ role, privileges, host }) => {
            await onUpdatePrivileges(role, privileges, host);
          }}
        />
      ) : null}
      {service.lastValidData?.info
        ? Object.entries(service.lastValidData.info).map(([title, info]) => (
            <Info title={title} info={info} key={title} />
          ))
        : null}
    </div>
  );
}
