import { Comment } from 'components/util/Comment';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { db } from 'db/db';
import { useState } from 'react';
import { currentState } from 'state/state';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { useTab } from 'components/main/connected/ConnectedApp';
import {
  closeTab,
  reloadNav,
  renameSchema,
  showError,
} from '../../state/actions';
import { SchemaInfoFrameProps } from '../../types';
import { Privileges } from './Privileges/Privileges';
import { Info } from './Info';

export function SchemaInfoFrame(props: SchemaInfoFrameProps) {
  const service = useService(
    async () =>
      Promise.all([
        db().schema(props.schema),
        db().privileges?.schemaPrivilegesTypes?.() ??
          Promise.resolve(undefined),
      ]).then(([info, privilegesTypes]) => ({ ...info, privilegesTypes })),
    [props.schema],
  );

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
    db().alterSchemaOwner!(props.schema, state.editOwner as string).then(
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

  const onUpdatePrivileges = useEvent(
    async ({
      role,
      privileges,
      host,
    }: {
      role: string;
      privileges: { [k: string]: boolean | undefined };
      host?: string;
    }) => {
      await db().privileges?.updateSchemaPrivileges?.(
        props.schema,
        role,
        privileges,
        host,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, updatePrivilege: null });
    },
  );

  useTab({
    f5() {
      service.reload();
    },
  });

  const reloading = useMoreTime(service.status === 'reloading', 100);

  return (
    <div
      style={{
        transition: 'opacity 0.1s',
        opacity: reloading ? 0.6 : 1,
      }}
    >
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
          {db().alterSchemaOwner ? (
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
            </>
          ) : null}
        </div>
      ) : null}
      {service.lastValidData?.privilegesTypes &&
      service.lastValidData.privileges ? (
        <Privileges
          privileges={service.lastValidData.privileges}
          privilegesTypes={service.lastValidData.privilegesTypes}
          onUpdate={onUpdatePrivileges}
          entityType="schema"
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
