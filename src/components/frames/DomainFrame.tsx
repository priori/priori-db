import {
  showError,
  closeTab,
  reloadNav,
  renameEntity,
  changeSchema,
} from 'state/actions';
import { DB } from 'db/DB';
import React, { useState } from 'react';
import { DomainFrameProps } from 'types';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { Dialog } from 'components/util/Dialog/Dialog';
import { first } from 'db/Connection';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { currentState } from 'state/state';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';

interface DomainFrameServiceState {
  type: {
    [k: string]: string | number | null | boolean;
  };
  comment: string | null;
  privileges: string[];
}

export function DomainFrame(props: DomainFrameProps) {
  const { roles } = currentState();
  const service = useService(async () => {
    const [type, comment, privileges] = await Promise.all([
      DB.pgType(props.schema, props.name),
      (
        first(
          `SELECT obj_description(pg_type.oid) "comment"
          FROM pg_type
          JOIN pg_namespace n ON n.oid = typnamespace
          WHERE nspname = $1 AND pg_type.typname = $2`,
          [props.schema, props.name],
        ) as Promise<{ comment: string | null }>
      ).then((res: { comment: string | null }) => res.comment),
      DB.domainPrivileges(props.schema, props.name),
    ]);
    return { type, comment, privileges } as DomainFrameServiceState;
  }, [props.schema, props.name]);

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
    changeSchema: false,
    revoke: '',
    grant: false as string | boolean,
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
      DB.dropDomain(props.schema, props.name, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
      );
    else
      DB.dropDomain(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          showError(err);
        },
      );
  });

  const noClick = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const onUpdateComment = useEvent(async (text: string) => {
    await DB.updateDomain(props.schema, props.name, { comment: text });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const onRename = useEvent(async (name: string) => {
    await DB.updateDomain(props.schema, props.name, { name });
    renameEntity(props.uid, name);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await DB.updateDomain(props.schema, props.name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  const revokeYesClick = useEvent(() => {
    DB.revokeDomain(props.schema, props.name, state.revoke).then(
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
      DB.grantDomain(props.schema, props.name, state.grant).then(
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
          Drop Domain <i className="fa fa-close" />
        </button>{' '}
        {state.dropCascadeConfirmation || state.dropConfirmation ? (
          <Dialog
            onBlur={noClick}
            relativeTo={
              state.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
            }
          >
            {state.dropCascadeConfirmation
              ? 'Do you really want to drop cascade this domain?'
              : 'Do you really want to drop this domain?'}
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
      {service?.lastValidData?.comment || state.editComment ? (
        <Comment
          value={service?.lastValidData?.comment || ''}
          edit={state.editComment}
          onUpdate={onUpdateComment}
          onCancel={() => set({ ...state, editComment: false })}
        />
      ) : null}
      {service.lastValidData && service.lastValidData.type ? (
        <>
          <h2>pg_catalog.pg_type</h2>
          <div className="fields">
            {Object.entries(service.lastValidData.type).map(([k, v]) => (
              <div key={k} className="field">
                <strong>{k.startsWith('typ') ? k.substring(3) : k}:</strong>{' '}
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

      {service?.lastValidData?.privileges ? (
        <>
          <h2 style={{ marginBottom: 3 }}>
            Privileges /{' '}
            <span style={{ fontWeight: 'normal' }}>
              {' '}
              Roles &amp; Users with USAGE GRANTs
            </span>
          </h2>
          <div>
            {service?.lastValidData?.privileges.map((role) => (
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
              disabled={
                roles?.length === service?.lastValidData?.privileges.length
              }
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
                        !service?.lastValidData?.privileges.find(
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
