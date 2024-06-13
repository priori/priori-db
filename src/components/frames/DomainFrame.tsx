import { Comment } from 'components/util/Comment';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { db } from 'db/db';
import React, { useMemo, useState } from 'react';
import {
  changeSchema,
  closeTab,
  reloadNav,
  renameEntity,
  showError,
} from 'state/actions';
import { currentState } from 'state/state';
import { DomainFrameProps } from 'types';
import { assert } from 'util/assert';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';

function domainsDb() {
  const d = db();
  assert(d.domains, 'Domains not supported');
  return d.domains;
}

export function DomainFrame(props: DomainFrameProps) {
  const { roles } = currentState();
  const service = useService(
    () => domainsDb().domain(props.schema, props.name),
    [props.schema, props.name],
  );

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
    changeSchema: false,
    revoke: '',
    grant: false as string | boolean,
    editOwner: false as string | boolean,
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
      domainsDb()
        .dropDomain(props.schema, props.name, true)
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
      domainsDb()
        .dropDomain(props.schema, props.name)
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

  const noClick = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const onUpdateComment = useEvent(async (text: string) => {
    await domainsDb().updateDomain(props.schema, props.name, { comment: text });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const onRename = useEvent(async (name: string) => {
    await domainsDb().updateDomain(props.schema, props.name, { name });
    renameEntity(props.uid, name);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    await domainsDb().updateDomain(props.schema, props.name, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...state, changeSchema: false });
  });

  const revokeYesClick = useEvent(() => {
    domainsDb()
      ?.revokeDomain?.(props.schema, props.name, state.revoke)
      .then(
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
      domainsDb()
        ?.grantDomain?.(props.schema, props.name, state.grant)
        .then(
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
  const isMounted = useIsMounted();
  const owner = service.lastValidData?.owner;
  const saveOwner = useEvent(() => {
    domainsDb()
      .alterTypeOwner(props.schema, props.name, state.editOwner as string)
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

  const internalRoles = useMemo(
    () =>
      service.lastValidData?.privileges?.filter((v) => v.startsWith('pg_'))
        .length,
    [service.lastValidData?.privileges],
  );

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

      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}

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

      {service?.lastValidData?.privileges && db().privileges ? (
        <>
          <h2 style={{ marginBottom: 3 }}>
            Privileges /{' '}
            <span style={{ fontWeight: 'normal' }}>
              {' '}
              Roles &amp; Users with USAGE GRANTs
            </span>
          </h2>
          <div>
            {service?.lastValidData?.privileges
              .filter((r) => !state.hideInternalRoles || !r.startsWith('pg_'))
              .map((role) => (
                <React.Fragment key={role}>
                  <span
                    className="privileges-role"
                    style={
                      role.startsWith('pg_') ? { opacity: 0.4 } : undefined
                    }
                  >
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
                  </span>
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
                  ) : null}{' '}
                </React.Fragment>
              ))}
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
                        !service?.lastValidData?.privileges?.find(
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
    </div>
  );
}
