import { useTab } from 'components/main/connected/ConnectedApp';
import { Comment } from 'components/util/Comment';
import { Dialog } from 'components/util/Dialog/Dialog';
import { InputDialog } from 'components/util/Dialog/InputDialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { db } from 'db/db';
import { useMemo, useState } from 'react';
import {
  changeSchema,
  closeTab,
  reloadNav,
  renameEntity,
  showError,
} from 'state/actions';
import { currentState } from 'state/state';
import { SequenceFrameProps, SequencePrivileges } from 'types';
import { assert } from 'util/assert';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';
import { SequencePrivilegesDialog } from './SequencePrivilegesDialog';
import { TdCheck } from './TableInfoFrame/TableInfoFrame';

function sequenceDb() {
  const db2 = db();
  assert(db2.sequences, 'Sequences not supported');
  return db2.sequences;
}

export function SequenceFrame(props: SequenceFrameProps) {
  const service = useService(
    async () => sequenceDb().sequence(props.schema, props.name),
    [props.schema, props.name],
  );

  const privileges = service.lastValidData?.privileges;

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
    updatePrivilege: null as string | null,
    newPrivilege: false,
    hideInternalRoles: true,
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
    sequenceDb()
      .alterSequenceOwner(props.schema, props.name, state.editOwner as string)
      .then(
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

  const newPrivilege = useEvent(
    async (form: { role: string; privileges: SequencePrivileges }) => {
      await db().privileges?.updateSequencePrivileges(
        props.schema,
        props.name,
        form.role,
        form.privileges,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, newPrivilege: false });
    },
  );

  const onUpdatePrivileges = useEvent(
    async (
      roleName: string,
      curr: SequencePrivileges,
      update: SequencePrivileges,
    ) => {
      await db().privileges?.updateSequencePrivileges(
        props.schema,
        props.name,
        roleName,
        {
          update: update.update === curr.update ? undefined : update.update,
          select: update.select === curr.select ? undefined : update.select,
          usage: update.usage === curr.usage ? undefined : update.usage,
        },
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, updatePrivilege: null });
    },
  );

  const internalRoles = useMemo(
    () =>
      service.lastValidData?.privileges?.filter((v) =>
        v.roleName.startsWith('pg_'),
      ).length,
    [service.lastValidData?.privileges],
  );

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
      {owner ? (
        <div className="owner" title="OWNER">
          <i className="fa fa-user" /> <span className="name">{owner}</span>
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
                onChange={(e) => set({ ...state, editOwner: e.target.value })}
                value={
                  typeof state.editOwner === 'string' ? state.editOwner : owner
                }
              >
                {roles?.map((r) => <option key={r.name}>{r.name}</option>)}
              </select>
              <div>
                <button
                  style={{ fontWeight: 'normal' }}
                  onClick={() => set({ ...state, editOwner: false })}
                  type="button"
                >
                  Cancel
                </button>
                <button onClick={saveOwner} type="button">
                  Save
                  <i className="fa fa-check" />
                </button>
              </div>
            </Dialog>
          ) : null}
        </div>
      ) : null}
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
      {service.lastValidData &&
      db().privileges &&
      privileges &&
      !privileges?.length ? (
        <>
          <h2>Privileges</h2>

          <div className="empty">
            No privileges found for table.{' '}
            <button
              type="button"
              className="simple-button"
              onClick={() => set({ ...state, newPrivilege: true })}
            >
              Grant new privilege <i className="fa fa-plus" />
            </button>
            {state.newPrivilege ? (
              <SequencePrivilegesDialog
                relativeTo="previousSibling"
                type="by_role"
                onCancel={() => set({ ...state, newPrivilege: false })}
                onUpdate={(form) => newPrivilege(form)}
              />
            ) : null}
          </div>
        </>
      ) : db().privileges && service.lastValidData ? (
        <>
          <h2 style={{ userSelect: 'text' }}>Privileges</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th style={{ width: 75 }}>Usage</th>
                <th style={{ width: 75 }}>Select</th>
                <th style={{ width: 75 }}>Update</th>
                <th style={{ width: 62 }} />
              </tr>
            </thead>
            <tbody>
              {privileges
                ?.filter(
                  (r) =>
                    !state.hideInternalRoles || !r.roleName.startsWith('pg_'),
                )
                .map((p) => (
                  <tr
                    key={p.roleName}
                    style={
                      p.roleName.startsWith('pg_')
                        ? { color: '#ccc' }
                        : undefined
                    }
                  >
                    <td>{p.roleName}</td>
                    <TdCheck checked={!!p.privileges.usage} />
                    <TdCheck checked={!!p.privileges.select} />
                    <TdCheck checked={!!p.privileges.update} />
                    <td className="actions">
                      <button
                        type="button"
                        className="simple-button"
                        onClick={() =>
                          set({ ...state, updatePrivilege: p.roleName })
                        }
                      >
                        Edit <i className="fa fa-pencil" />
                      </button>
                      {state.updatePrivilege === p.roleName ? (
                        <SequencePrivilegesDialog
                          relativeTo="previousSibling"
                          privileges={{
                            update: p.privileges.update,
                            select: p.privileges.select,
                            usage: p.privileges.usage,
                          }}
                          type="by_role"
                          onUpdate={(e) =>
                            onUpdatePrivileges(
                              p.roleName,
                              p.privileges,
                              e.privileges,
                            )
                          }
                          onCancel={() =>
                            set({ ...state, updatePrivilege: null })
                          }
                          roleName={p.roleName}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="actions">
            {internalRoles ? (
              <button
                type="button"
                key={state.hideInternalRoles ? 1 : 0}
                className={`simple-button simple-button2 hide-button ${
                  state.hideInternalRoles ? ' hidden' : ' shown'
                }`}
                onClick={() => {
                  set({
                    ...state,
                    hideInternalRoles: !state.hideInternalRoles,
                  });
                }}
              >
                {internalRoles} pg_* <i className="fa fa-eye-slash" />
                <i className="fa fa-eye" />
              </button>
            ) : null}{' '}
            <button
              type="button"
              className="simple-button"
              onClick={() => set({ ...state, newPrivilege: true })}
            >
              New <i className="fa fa-plus" />
            </button>
            {state.newPrivilege ? (
              <SequencePrivilegesDialog
                relativeTo="previousSibling"
                onCancel={() => set({ ...state, newPrivilege: false })}
                onUpdate={(form) => newPrivilege(form)}
                type="by_role"
              />
            ) : null}
          </div>
        </>
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
    </div>
  );
}
