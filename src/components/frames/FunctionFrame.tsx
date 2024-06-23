import { useTab } from 'components/main/connected/ConnectedApp';
import { Comment } from 'components/util/Comment';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { Dialog } from 'components/util/Dialog/Dialog';
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
import { FunctionFrameProps } from 'types';
import { assert } from 'util/assert';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';
import { Info } from './Info';
import { Privileges } from './Privileges/Privileges';

function functionsDb() {
  const d = db();
  assert(d.functions, 'Functions not loaded');
  return d.functions;
}

export function FunctionFrame(props: FunctionFrameProps) {
  const { roles } = currentState();
  const name =
    props.name.lastIndexOf('(') > 0
      ? props.name.substring(0, props.name.lastIndexOf('('))
      : props.name;
  const service = useService(
    () =>
      Promise.all([
        functionsDb().function(props.schema, props.name),
        functionsDb().privilegesTypes?.() ?? Promise.resolve(undefined),
      ]).then(([data, privilegesTypes]) => ({
        ...data,
        privilegesTypes,
      })),
    [props.schema, props.name],
  );

  const info = service?.lastValidData;

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
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
      functionsDb()
        .dropFunction(props.schema, props.name, true)
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
      functionsDb()
        .dropFunction(props.schema, props.name)
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

  const onUpdateComment = useEvent(async (text: string) => {
    await functionsDb().updateFunction(props.schema, name, { comment: text });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const noClick = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const onRename = useEvent(async (newName: string) => {
    await functionsDb().updateFunction(props.schema, name, { name: newName });
    renameEntity(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await functionsDb().updateFunction(props.schema, name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  const isMounted = useIsMounted();

  const saveOwner = useEvent(() => {
    functionsDb().alterFuncOwner!(
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
    async (form: {
      role: string;
      host?: string;
      newPrivilege: boolean;
      privileges: { [k: string]: boolean | undefined };
    }) => {
      if (!db().privileges) return;
      await db().functions?.updateFunctionPrivileges?.(
        props.schema,
        props.name,
        form.role,
        form.privileges,
        form.host,
      );
      if (!isMounted()) return;
      await service.reload();
    },
  );
  useTab({
    f5() {
      service.reload();
    },
  });

  const isProcedure = info?.type === 'procedure';
  const reloading = useMoreTime(service.status === 'reloading', 100);
  return (
    <div
      style={{
        opacity: reloading ? 0.5 : 1,
        transition: 'opacity 0.1s',
      }}
    >
      <h1>
        <span className="adjustment-icon2">
          <div />
        </span>
        {props.schema}.{props.name}
      </h1>
      <div className="table-info-frame__actions">
        <button
          type="button"
          onClick={() => set({ ...state, editComment: true })}
        >
          Comment <i className="fa fa-file-text-o" />
        </button>{' '}
        {functionsDb()?.rename ? (
          <>
            <button
              type="button"
              onClick={() => set({ ...state, rename: true })}
            >
              Rename <i className="fa fa-pencil" />
            </button>{' '}
            {state.rename ? (
              <RenameDialog
                relativeTo="previousSibling"
                value={name}
                onCancel={() => set({ ...state, rename: false })}
                onUpdate={onRename}
              />
            ) : null}
          </>
        ) : null}
        {functionsDb()?.move ? (
          <>
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
          </>
        ) : null}
        {isProcedure === undefined ? null : (
          <>
            <button
              type="button"
              onClick={
                state.dropCascadeConfirmation || state.dropConfirmation
                  ? undefined
                  : drop
              }
            >
              Drop {isProcedure ? 'Procedure' : 'Function'}{' '}
              <i className="fa fa-close" />
            </button>{' '}
            {state.dropCascadeConfirmation || state.dropConfirmation ? (
              <Dialog
                onBlur={noClick}
                relativeTo={
                  state.dropCascadeConfirmation
                    ? 'nextSibling'
                    : 'previousSibling'
                }
              >
                {state.dropCascadeConfirmation
                  ? 'Do you really want to drop cascade this function?'
                  : 'Do you really want to drop this function?'}
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
            {functionsDb()?.dropCascade && (
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
            )}
          </>
        )}
      </div>
      {info?.definition ? <div className="view">{info.definition}</div> : null}
      {info?.comment || state.editComment ? (
        <Comment
          value={info?.comment || ''}
          edit={state.editComment}
          onUpdate={onUpdateComment}
          onCancel={() => set({ ...state, editComment: false })}
        />
      ) : null}
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}

      {info?.owner ? (
        <div className="owner" title="OWNER">
          <i className="fa fa-user" />{' '}
          <span className="name">{info.owner}</span>
          {db().functions?.alterFuncOwner ? (
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
                        : info.owner
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
      {info?.privileges && info.privilegesTypes ? (
        <Privileges
          entityType="function"
          privileges={info.privileges}
          onUpdate={onUpdatePrivileges}
          privilegesTypes={info.privilegesTypes}
        />
      ) : null}
      {service.lastValidData?.info
        ? Object.entries(service.lastValidData.info).map(([title, info2]) => (
            <Info title={title} info={info2} key={title} />
          ))
        : null}
    </div>
  );
}
