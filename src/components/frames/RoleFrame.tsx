import { useTab } from 'components/main/connected/ConnectedApp';
import { Comment } from 'components/util/Comment';
import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { UpdatePasswordDialog } from 'components/util/Dialog/UpdatePasswordDialog';
import { db } from 'db/db';
import React, { useState } from 'react';
import { closeTab, reloadNav, renameEntity, showError } from 'state/actions';
import { currentState } from 'state/state';
import { RoleFrameProps } from 'types';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { Info } from './Info';
import { RolePrivileges } from './Privileges/Privileges';

export function RoleFrame(props: RoleFrameProps) {
  const { name } = props;

  const service = useService(
    () =>
      Promise.all([
        db().privileges!.role?.(props.name, props.host),
        db().privileges?.tablePrivilegesTypes?.(),
        db().privileges?.schemaPrivilegesTypes?.(),
        db().sequences?.privilegesTypes?.(),
        db().domains?.privilegesTypes?.(),
        db().functions?.privilegesTypes?.(),
      ]).then(
        ([
          role,
          tablePrivilegesTypes,
          schemaPrivilegesTypes,
          sequencesPrivilegesTypes,
          domainsPrivilegesTypes,
          functionsPrivilegesTypes,
        ]) => ({
          ...role,
          tablePrivilegesTypes,
          schemaPrivilegesTypes,
          sequencesPrivilegesTypes,
          domainsPrivilegesTypes,
          functionsPrivilegesTypes,
        }),
      ),
    [props.name],
  );

  const isUser = !!service?.lastValidData?.isUser;

  const [state, set] = useState({
    dropConfirmation: false,
    editComment: false,
    rename: false,
    dropPasswordConfirmation: false,
    updatePassword: false,
  });

  const drop = useEvent(() => {
    set({
      ...state,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    db()
      .privileges!.dropRole?.(props.name, props.host)
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
    await db().privileges!.updateRoleComment?.(props.name, text, props.host);
    await service.reload();
    set({ ...state, editComment: false });
  });

  const noClick = useEvent(() => {
    set({
      ...state,
      dropConfirmation: false,
    });
  });

  const onRename = useEvent(async (newName: string) => {
    await db().privileges!.renameRole?.(name, newName, props.host);
    renameEntity(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const onUpdatePassword = useEvent(async (newName: string) => {
    await db().privileges!.updatePassword?.(name, newName, props.host);
    reloadNav();
    service.reload();
    set({ ...state, updatePassword: false });
  });

  const isMounted = useIsMounted();

  const grantTable = useEvent(
    async (
      schema: string,
      table: string,
      privileges: { [k: string]: boolean | undefined },
    ) => {
      await db().privileges!.updateTablePrivileges(
        schema,
        table,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
    },
  );

  const grantSchema = useEvent(
    async (
      schema: string,
      privileges: { [k: string]: boolean | undefined },
    ) => {
      await db().privileges!.updateSchemaPrivileges?.(
        schema,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
    },
  );

  const grantSequence = useEvent(
    async (
      schema: string,
      table: string,
      privileges: { [k: string]: boolean | undefined },
    ) => {
      await db().sequences?.updateSequencePrivileges?.(
        schema,
        table,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
    },
  );

  const currentSchema = React.useMemo(
    () => currentState().schemas?.find((s) => s.current)?.name,
    [],
  );

  useTab({
    f5() {
      service.reload();
    },
  });

  const reloading = useMoreTime(service.status === 'reloading', 100);

  if (!service.lastValidData)
    return (
      <div>
        <h1>
          <span className="adjustment-icon--big">
            <div />
          </span>
          {props.name}
          {props.host ? (
            <span
              style={{
                opacity: 0.33,
                fontWeight: 'normal',
                fontSize: 24,
              }}
            >
              @
              <span style={{ position: 'relative', top: '-0.04em' }}>
                {props.host}
              </span>
            </span>
          ) : (
            ''
          )}
        </h1>
      </div>
    );

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
        {props.name}
        {props.host ? (
          <span
            style={{
              opacity: 0.33,
              fontWeight: 'normal',
              fontSize: 24,
            }}
          >
            @
            <span style={{ position: 'relative', top: '-0.04em' }}>
              {props.host}
            </span>
          </span>
        ) : (
          ''
        )}
      </h1>
      <div className="table-info-frame__actions">
        {db().privileges?.updateRoleComment ? (
          <button
            className="button"
            onClick={() => set({ ...state, editComment: true })}
          >
            Comment <i className="fa fa-file-text-o" />
          </button>
        ) : null}{' '}
        <button
          className="button"
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
        {isUser ? (
          <>
            {db().privileges?.dropPassword && isUser ? (
              <>
                <button
                  className="button"
                  onClick={() => {
                    set({
                      ...state,
                      dropPasswordConfirmation: true,
                    });
                  }}
                >
                  Drop Password <i className="fa fa-exclamation-triangle" />
                </button>
                {state.dropPasswordConfirmation ? (
                  <Dialog
                    onBlur={() => {
                      set({
                        ...state,
                        dropPasswordConfirmation: false,
                      });
                    }}
                    relativeTo="previousSibling"
                  >
                    Do you really want to drop the user password?
                    <div>
                      <button
                        className="button"
                        onClick={() => {
                          db()
                            .privileges?.dropPassword?.(props.name, props.host)
                            .then(() => {
                              set({
                                ...state,
                                dropPasswordConfirmation: false,
                              });
                              reloadNav();
                              service.reload();
                            });
                        }}
                      >
                        Yes
                      </button>{' '}
                      <button
                        className="button"
                        onClick={() => {
                          set({
                            ...state,
                            dropPasswordConfirmation: false,
                          });
                        }}
                      >
                        No
                      </button>
                    </div>
                  </Dialog>
                ) : null}
              </>
            ) : null}{' '}
            {db().privileges?.updatePassword ? (
              <button
                className="button"
                onClick={() => {
                  set({ ...state, updatePassword: true });
                }}
              >
                Update Password <i className="fa fa-key" />
              </button>
            ) : null}
          </>
        ) : db().privileges?.updatePassword ? (
          <button
            className="button"
            onClick={() => {
              set({ ...state, updatePassword: true });
            }}
          >
            Set Password <i className="fa fa-key" />
          </button>
        ) : null}
        {state.updatePassword ? (
          <UpdatePasswordDialog
            relativeTo="previousSibling"
            value=""
            onCancel={() => set({ ...state, updatePassword: false })}
            onUpdate={onUpdatePassword}
          />
        ) : null}{' '}
        {service.lastValidData ? (
          <>
            <button className="button" onClick={drop}>
              Drop {isUser ? 'User' : 'Role'} <i className="fa fa-close" />
            </button>{' '}
            {state.dropConfirmation ? (
              <Dialog onBlur={noClick} relativeTo="previousSibling">
                Do you really want to drop this {isUser ? 'user' : 'role'}?
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
          </>
        ) : null}
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

      {service?.lastValidData?.privileges?.schemas &&
      service.lastValidData.schemaPrivilegesTypes ? (
        <RolePrivileges
          privileges={service.lastValidData.privileges.schemas.map((p) => ({
            schema: p.name,
            entityName: p.name,
            privileges: p.privileges,
            internal: p.internal,
            highlight: p.name === currentSchema,
          }))}
          privilegesTypes={service.lastValidData.schemaPrivilegesTypes}
          entitiesType="schema"
          onUpdate={async (form) => {
            await grantSchema(form.schema!, form.privileges);
          }}
        />
      ) : null}

      {service?.lastValidData?.tablePrivilegesTypes &&
      service.lastValidData?.privileges?.tables ? (
        <RolePrivileges
          privileges={service.lastValidData.privileges.tables.map((p) => ({
            schema: p.schema,
            entityName: p.table,
            privileges: p.privileges,
            internal: p.internal,
          }))}
          privilegesTypes={service.lastValidData.tablePrivilegesTypes}
          entitiesType="table"
          onUpdate={async (form) => {
            grantTable(form.schema!, form.entityName, form.privileges);
          }}
        />
      ) : null}

      {service.lastValidData?.privileges?.functions &&
      service.lastValidData.functionsPrivilegesTypes ? (
        <RolePrivileges
          privileges={service.lastValidData.privileges.functions.map((p) => ({
            schema: p.schema,
            entityName: p.name,
            privileges: p.privileges,
            internal: p.internal,
          }))}
          privilegesTypes={service.lastValidData.functionsPrivilegesTypes}
          entitiesType="function"
          onUpdate={async (form) => {
            try {
              await db().functions?.updateFunctionPrivileges?.(
                form.schema!,
                form.entityName,
                props.name,
                form.privileges,
              );
              service.reload();
            } catch (e) {
              showError(grantError(e));
            }
          }}
        />
      ) : null}

      {service?.lastValidData?.privileges?.sequences &&
      service.lastValidData.sequencesPrivilegesTypes ? (
        <RolePrivileges
          privileges={service.lastValidData.privileges.sequences.map((p) => ({
            schema: p.schema,
            entityName: p.name,
            privileges: p.privileges,
            internal: p.internal,
          }))}
          privilegesTypes={service.lastValidData.sequencesPrivilegesTypes}
          entitiesType="sequence"
          onUpdate={async (form) => {
            await grantSequence(form.schema!, form.entityName, form.privileges);
          }}
        />
      ) : null}

      {service.lastValidData?.privileges?.types &&
      service.lastValidData.domainsPrivilegesTypes ? (
        <RolePrivileges
          privileges={service.lastValidData.privileges.types.map((p) => ({
            schema: p.schema,
            entityName: p.name,
            privileges: p.privileges,
            internal: p.internal,
          }))}
          privilegesTypes={service.lastValidData.domainsPrivilegesTypes}
          entitiesType="domain"
          onUpdate={async (form) => {
            try {
              await db().domains?.updateDomainPrivileges?.(
                form.schema!,
                form.entityName,
                props.name,
                form.privileges,
              );
              service.reload();
            } catch (e) {
              showError(grantError(e));
            }
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
