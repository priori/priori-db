import {
  closeTab,
  reloadNav,
  renameEntity,
  changeSchema,
  showError,
} from 'state/actions';
import { DB } from 'db/DB';
import React, { useState } from 'react';
import { FunctionFrameProps } from 'types';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { first } from 'db/Connection';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { currentState } from 'state/state';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';

export function FunctionFrame(props: FunctionFrameProps) {
  const { roles } = currentState();
  const name =
    props.name.lastIndexOf('(') > 0
      ? props.name.substring(0, props.name.lastIndexOf('('))
      : props.name;
  const service = useService(() => {
    return Promise.all([
      first(
        `
      SELECT
        pg_get_functiondef(oid) definition,
        obj_description(oid) "comment"
      FROM pg_proc
      WHERE
        proname = $2 AND
        pronamespace = $1::regnamespace
    `,
        [props.schema, name],
      ) as Promise<{
        definition: string;
        comment: string;
      }>,
      DB.functionsPrivileges(props.schema, props.name),
    ]);
  }, [props.schema, props.name]);

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
    changeSchema: false,
    revoke: '',
    grant: false as string | false | true,
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
      DB.dropFunction(props.schema, props.name, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
      );
    else
      DB.dropFunction(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
      );
  });

  const revokeYesClick = useEvent(() => {
    DB.revokeFunction(props.schema, props.name, state.revoke).then(
      () => {
        service.reload();
        set({
          ...state,
          revoke: '',
        });
      },
      (err) => {
        showError(err);
      },
    );
  });

  const grantClick = useEvent(() => {
    if (typeof state.grant === 'string')
      DB.grantFunction(props.schema, props.name, state.grant).then(
        () => {
          service.reload();
          set({
            ...state,
            grant: false,
          });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const onUpdateComment = useEvent(async (text: string) => {
    await DB.updateFunction(props.schema, name, { comment: text });
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
    await DB.updateFunction(props.schema, name, { name: newName });
    renameEntity(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await DB.updateFunction(props.schema, name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  return (
    <div>
      <h1>
        {props.schema}.{props.name}
      </h1>
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
            value={name}
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
          Drop Function <i className="fa fa-close" />
        </button>{' '}
        {state.dropCascadeConfirmation || state.dropConfirmation ? (
          <Dialog
            onBlur={noClick}
            relativeTo={
              state.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
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
      </div>
      {service?.lastValidData?.[0].definition ? (
        <div className="view">{service.lastValidData[0].definition}</div>
      ) : null}
      {service?.lastValidData?.[0].comment || state.editComment ? (
        <Comment
          value={service?.lastValidData?.[0].comment || ''}
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
      {service?.lastValidData?.[1] ? (
        <>
          <h2 style={{ marginBottom: 3 }}>
            Privileges /{' '}
            <span style={{ fontWeight: 'normal' }}>
              {' '}
              Roles &amp; Users with EXECUTE GRANTs
            </span>
          </h2>
          <div>
            {service?.lastValidData?.[1].map((role) => (
              <React.Fragment key={role}>
                <span className="privileges-role">
                  {role}
                  <i
                    className="fa fa-close"
                    onClick={() =>
                      set({
                        ...state,
                        revoke: role,
                      })
                    }
                  />
                  {role === state.revoke ? (
                    <Dialog
                      onBlur={() =>
                        set({
                          ...state,
                          revoke: '',
                        })
                      }
                      relativeTo="previousSibling"
                    >
                      Do you really want to revoke this role?
                      <div>
                        <button type="button" onClick={revokeYesClick}>
                          Yes
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() =>
                            set({
                              ...state,
                              revoke: '',
                            })
                          }
                        >
                          No
                        </button>
                      </div>
                    </Dialog>
                  ) : null}
                </span>{' '}
              </React.Fragment>
            ))}
            <button
              type="button"
              className="simple-button new-privileges-role"
              disabled={roles?.length === service?.lastValidData?.[1].length}
              onClick={() => set({ ...state, grant: true })}
            >
              New <i className="fa fa-plus" />
            </button>
            {state.grant !== false ? (
              <Dialog
                relativeTo="previousSibling"
                onBlur={() =>
                  set({
                    ...state,
                    grant: false,
                  })
                }
              >
                <select
                  onChange={(e) => set({ ...state, grant: e.target.value })}
                >
                  <option value="" />
                  {roles
                    ?.filter(
                      (r) =>
                        !service?.lastValidData?.[1].find(
                          (r2) => r2 === r.name,
                        ),
                    )
                    .map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <div>
                  <button
                    style={{ fontWeight: 'normal' }}
                    type="button"
                    onClick={() =>
                      set({
                        ...state,
                        grant: false,
                      })
                    }
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={grantClick}>
                    Save
                    <i className="fa fa-check" />
                  </button>
                </div>
              </Dialog>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
