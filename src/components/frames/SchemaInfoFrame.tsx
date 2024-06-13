import { useMemo, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { db } from 'db/db';
import { Dialog } from 'components/util/Dialog/Dialog';
import { useService } from 'util/useService';
import { currentState } from 'state/state';
import { useIsMounted } from 'util/hooks';
import { Comment } from 'components/util/Comment';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { SchemaInfoFrameProps, SchemaPrivileges } from '../../types';
import {
  closeTab,
  reloadNav,
  renameSchema,
  showError,
} from '../../state/actions';
import { SchemaPrivilegesDialog } from './SchemaPrivilegesDialog';

export function SchemaInfoFrame(props: SchemaInfoFrameProps) {
  const service = useService(
    async () => db().schema(props.schema),
    [props.schema],
  );

  const privileges = service?.lastValidData?.privileges;

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editOwner: '' as string | boolean,
    editComment: false,
    rename: false,
    newPrivilege: false,
    updatePrivilege: null as string | null,
    hideInternalRoles: true,
  });

  const dropCascade = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: true,
      dropConfirmation: false,
      editOwner: false,
      editComment: false,
      rename: false,
      newPrivilege: false,
      updatePrivilege: null,
    });
  });

  const drop = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: true,
      editOwner: false,
      editComment: false,
      rename: false,
      newPrivilege: false,
      updatePrivilege: null,
    });
  });

  const yesClick = useEvent(() => {
    if (state.dropCascadeConfirmation) {
      db()
        .dropSchema(props.schema, true)
        .then(
          () => {
            setTimeout(() => closeTab(props), 10);
            reloadNav();
          },
          (err) => {
            showError(err);
          },
        );
    } else {
      db()
        .dropSchema(props.schema)
        .then(
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
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
      editOwner: false,
      editComment: false,
      rename: false,
      newPrivilege: false,
      updatePrivilege: null,
    });
  });

  const owner = service?.lastValidData?.owner;
  const { roles } = currentState();
  const isMounted = useIsMounted();
  const saveOwner = useEvent(() => {
    db()
      .alterSchemaOwner(props.schema, state.editOwner as string)
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

  const onUpdateComment = useEvent(async (text: string) => {
    await db().updateSchemaComment!(props.schema, text);
    await service.reload();
    set({ ...state, editComment: false });
  });

  const onRename = useEvent(async (newName: string) => {
    await db().renameSchema!(props.schema, newName);
    renameSchema(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const newPrivilege = useEvent(
    async (form: { role: string; privileges: SchemaPrivileges }) => {
      await db().privileges?.updateSchemaPrivileges?.(
        props.schema,
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
      curr: SchemaPrivileges,
      update: SchemaPrivileges,
    ) => {
      await db().privileges?.updateSchemaPrivileges?.(props.schema, roleName, {
        create: update.create === curr.create ? undefined : update.create,
        usage: update.usage === curr.usage ? undefined : update.usage,
      });
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
        <span className="adjustment-icon2">
          <div />
        </span>
        {props.schema}
      </h1>
      <div className="table-info-frame__actions">
        {db().updateSchemaComment ? (
          <>
            <button
              type="button"
              onClick={() => set({ ...state, editComment: true })}
            >
              Comment <i className="fa fa-file-text-o" />
            </button>{' '}
          </>
        ) : null}
        {db().renameSchema ? (
          <>
            <button
              type="button"
              onClick={() => set({ ...state, rename: true })}
            >
              Rename <i className="fa fa-pencil" />
            </button>{' '}
          </>
        ) : null}
        {state.rename ? (
          <RenameDialog
            relativeTo="previousSibling"
            value={props.schema}
            onCancel={() => set({ ...state, rename: false })}
            onUpdate={onRename}
          />
        ) : null}{' '}
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
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
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
      {service.lastValidData &&
      privileges &&
      db().privileges &&
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
              <SchemaPrivilegesDialog
                relativeTo="previousSibling"
                type="by_role"
                onCancel={() => set({ ...state, newPrivilege: false })}
                onUpdate={(form) => newPrivilege(form)}
              />
            ) : null}
          </div>
        </>
      ) : service.lastValidData && db().privileges && privileges ? (
        <>
          <h2 style={{ userSelect: 'text' }}>Privileges</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th style={{ width: 75 }}>Usage</th>
                <th style={{ width: 75 }}>Create</th>
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

                    <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                      {p.privileges.usage ? <i className="fa fa-check" /> : '-'}
                    </td>

                    <td
                      style={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        padding: '0',
                        ...(!p.privileges.create
                          ? { fontSize: 20, color: '#ccc' }
                          : {}),
                      }}
                    >
                      {p.privileges.create ? (
                        <i className="fa fa-check" />
                      ) : (
                        '-'
                      )}
                    </td>
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
                        <SchemaPrivilegesDialog
                          relativeTo="previousSibling"
                          privileges={{
                            create: p.privileges.create,
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
              <SchemaPrivilegesDialog
                relativeTo="previousSibling"
                onCancel={() => set({ ...state, newPrivilege: false })}
                onUpdate={(form) => newPrivilege(form)}
                type="by_role"
              />
            ) : null}
          </div>
        </>
      ) : null}
      {service.lastValidData?.pgNamesspace ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_namesspace</h2>
          <div className="fields">
            {Object.entries(service.lastValidData.pgNamesspace).map(
              ([k, v]) => (
                <div key={k} className="field">
                  <strong>{k.startsWith('nsp') ? k.substring(3) : k}:</strong>{' '}
                  <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                </div>
              ),
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
