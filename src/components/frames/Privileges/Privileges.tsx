import { Dialog } from 'components/util/Dialog/Dialog';
import React, { useState } from 'react';
import { currentState } from 'state/state';
import { useEvent } from 'util/useEvent';
import { TdCheck } from '../TableInfoFrame/TableInfoFrame';
import { PrivilegesDialog } from './PrivilegesDialog';
import { useInternals } from './useInternals';

type PrivilegesProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  entityType: 'domain' | 'table' | 'sequence' | 'schema' | 'function';
  privileges: {
    roleName: string;
    host?: string;
    internal?: boolean;
    privileges: { [k: string]: boolean | undefined };
  }[];
  privilegesTypes: string[];
  onUpdate: (update: {
    role: string;
    host?: string;
    newPrivilege: boolean;
    privileges: { [k: string]: boolean | undefined };
  }) => Promise<void>;
};
type RolePrivilegesProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  entitiesType: 'domain' | 'table' | 'sequence' | 'schema' | 'function';
  privileges: {
    schema?: string;
    entityName: string;
    internal?: boolean;
    privileges: { [k: string]: boolean | undefined };
  }[];
  privilegesTypes: string[];
  onUpdate: (update: {
    entityName: string;
    schema?: string;
    newPrivilege: boolean;
    privileges: { [k: string]: boolean | undefined };
  }) => Promise<void>;
};

function PrivilegesTable(props: PrivilegesProps | RolePrivilegesProps) {
  const { privileges, privilegesTypes } = props;
  const entityType =
    'entityType' in props ? props.entityType : props.entitiesType;
  const rolePriviliges = 'entitiesType' in props;
  const entitiesName =
    'entitiesType' in props
      ? `${props.entitiesType[0].toUpperCase()}${props.entitiesType.substring(1)}`
      : null;

  const onUpdate =
    'entityType' in props
      ? (props.onUpdate as (update: {
          role: string;
          host?: string;
          newPrivilege: boolean;
          privileges: { [k: string]: boolean | undefined };
        }) => Promise<void>)
      : undefined;
  const onUpdate2 =
    'entitiesType' in props
      ? (props.onUpdate as (update: {
          entityName: string;
          schema?: string;
          newPrivilege: boolean;
          privileges: { [k: string]: boolean | undefined };
        }) => Promise<void>)
      : undefined;

  const [edit, set] = useState({
    newPrivilege: false,
    updatePrivilegeRole: null as null | string,
    updatePrivilegeHost: null as null | string | undefined,
    updatePrivilegeEntity: null as null | string,
    updatePrivilegeSchema: null as null | string | undefined,
    hideInternalRoles: true,
  });

  const { internals, list } = useInternals(privileges);

  async function onDialogUpdate(
    form:
      | {
          role: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
          host?: string;
        }
      | {
          entityName: string;
          schema?: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
        },
  ) {
    if (onUpdate)
      await onUpdate({
        ...(form as {
          role: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
          host?: string;
        }),
        newPrivilege: false,
      });
    else if (onUpdate2) {
      onUpdate2({
        ...(form as {
          entityName: string;
          schema: string;
          privileges: {
            [k: string]: boolean | undefined;
          };
        }),
        newPrivilege: false,
      });
    }

    set({
      ...edit,
      updatePrivilegeRole: null,
      updatePrivilegeHost: null,
      updatePrivilegeEntity: null,
      updatePrivilegeSchema: null,
    });
  }

  const onNewPrivilege = useEvent(
    async (
      form:
        | {
            role: string;
            privileges: {
              [k: string]: boolean | undefined;
            };
            host?: string;
          }
        | {
            entityName: string;
            schema?: string;
            privileges: {
              [k: string]: boolean | undefined;
            };
          },
    ) => {
      if (onUpdate && 'role' in form)
        await onUpdate({
          ...form,
          newPrivilege: true,
        });
      else if (onUpdate2 && 'entityName' in form) {
        onUpdate2({
          ...form,
          newPrivilege: true,
        });
      }
      set({
        ...edit,
        newPrivilege: false,
      });
    },
  );

  return !list.length ? (
    <>
      <h2>{entitiesName} Privileges</h2>
      <div className="empty">
        No privileges found for {rolePriviliges ? 'role' : entityType}.{' '}
        <button
          type="button"
          className="simple-button"
          onClick={() => set({ ...edit, newPrivilege: true })}
        >
          Grant new privilege <i className="fa fa-plus" />
        </button>
        {edit.newPrivilege ? (
          <PrivilegesDialog
            entityType={entityType}
            privilegesTypes={privilegesTypes}
            relativeTo="previousSibling"
            onCancel={() => set({ ...edit, newPrivilege: false })}
            onUpdate={(
              form:
                | {
                    role: string;
                    privileges: {
                      [k: string]: boolean | undefined;
                    };
                    host?: string;
                  }
                | {
                    entityName: string;
                    schema?: string;
                    privileges: {
                      [k: string]: boolean | undefined;
                    };
                  },
            ) => onNewPrivilege(form)}
            entity={
              'entitiesType' in props ? props.entitiesType : props.entityType
            }
            type={'entitiesType' in props ? 'by_entity' : 'by_role'}
          />
        ) : null}
        {internals.map((internal) => (
          <React.Fragment key={internal.name}>
            {' '}
            <button
              type="button"
              key={edit.hideInternalRoles ? 1 : 0}
              className={`simple-button simple-button2 hide-button ${
                edit.hideInternalRoles ? ' hidden' : ' shown'
              }`}
              onClick={internal.open}
            >
              {internal.count} {internal.name} <i className="fa fa-eye-slash" />
              <i className="fa fa-eye" />
            </button>{' '}
          </React.Fragment>
        ))}
      </div>
    </>
  ) : (
    <>
      <h2>{entitiesName} Privileges</h2>
      <table>
        <thead>
          <tr>
            <th>Role</th>
            {privilegesTypes.map((p) => (
              <th style={{ width: 75 }} key={p}>
                {p[0].toUpperCase()}
                {p.substring(1).replace(/[A-Z]/g, ' $&')}
              </th>
            ))}
            <th style={{ width: 62 }} />
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr
              key={
                'roleName' in p ? p.roleName : `${p.schema}\n${p.entityName}`
              }
              style={p.internal ? { color: '#ccc' } : undefined}
            >
              <td>
                {'roleName' in p && p.roleName ? (
                  <>
                    {p.roleName}
                    {p.host ? (
                      <span
                        style={p.host === '%' ? { color: '#bbb' } : undefined}
                      >
                        @{p.host}
                      </span>
                    ) : null}
                  </>
                ) : 'entityName' in p ? (
                  entityType === 'schema' ? (
                    p.schema || p.entityName
                  ) : (
                    <>
                      {p.schema ? `${p.schema}.` : ''}
                      {p.entityName}
                    </>
                  )
                ) : null}
              </td>
              {privilegesTypes.map((t) => (
                <TdCheck checked={!!p.privileges[t]} key={t} />
              ))}
              <td className="actions">
                <button
                  type="button"
                  className="simple-button"
                  onClick={() => {
                    if ('roleName' in p)
                      set({
                        ...edit,
                        updatePrivilegeRole: p.roleName,
                        updatePrivilegeHost: p.host,
                      });
                    else if ('entityName' in p)
                      set({
                        ...edit,
                        updatePrivilegeEntity: p.entityName,
                        updatePrivilegeSchema: p.schema,
                      });
                  }}
                >
                  Edit <i className="fa fa-pencil" />
                </button>
                {'roleName' in p &&
                edit.updatePrivilegeRole === p.roleName &&
                edit.updatePrivilegeHost === p.host ? (
                  <PrivilegesDialog
                    relativeTo="previousSibling"
                    privilegesTypes={privilegesTypes}
                    privileges={p.privileges}
                    type="by_role"
                    onUpdate={(form) => onDialogUpdate(form)}
                    onCancel={() =>
                      set({
                        ...edit,
                        updatePrivilegeRole: null,
                        updatePrivilegeHost: null,
                      })
                    }
                    roleName={p.roleName}
                    host={p.host}
                  />
                ) : 'entityName' in p &&
                  edit.updatePrivilegeEntity === p.entityName &&
                  edit.updatePrivilegeSchema === p.schema ? (
                  <PrivilegesDialog
                    entityType={entityType}
                    relativeTo="previousSibling"
                    privilegesTypes={privilegesTypes}
                    privileges={p.privileges}
                    type="by_entity"
                    onUpdate={async (form) => {
                      onDialogUpdate(form);
                    }}
                    onCancel={() =>
                      set({
                        ...edit,
                        updatePrivilegeEntity: null,
                        updatePrivilegeSchema: null,
                      })
                    }
                    entity={p.entityName}
                    schema={p.schema}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="actions">
        {internals.map((internal) => (
          <React.Fragment key={internal.name}>
            <button
              type="button"
              key={edit.hideInternalRoles ? 1 : 0}
              className={`simple-button simple-button2 hide-button ${
                edit.hideInternalRoles ? ' hidden' : ' shown'
              }`}
              onClick={internal.open}
            >
              {internal.count} {internal.name} <i className="fa fa-eye-slash" />
              <i className="fa fa-eye" />
            </button>{' '}
          </React.Fragment>
        ))}
        <button
          type="button"
          className="simple-button"
          onClick={() => set({ ...edit, newPrivilege: true })}
        >
          New <i className="fa fa-plus" />
        </button>
        {edit.newPrivilege ? (
          <PrivilegesDialog
            entityType={entityType}
            privilegesTypes={privilegesTypes}
            relativeTo="previousSibling"
            onCancel={() => set({ ...edit, newPrivilege: false })}
            onUpdate={(
              form:
                | {
                    role: string;
                    privileges: {
                      [k: string]: boolean | undefined;
                    };
                    host?: string;
                  }
                | {
                    entityName: string;
                    schema?: string;
                    privileges: {
                      [k: string]: boolean | undefined;
                    };
                  },
            ) => onNewPrivilege(form)}
            type={'entitiesType' in props ? 'by_entity' : 'by_role'}
          />
        ) : null}
      </div>
    </>
  );
}

function PrivilegesList(props: PrivilegesProps | RolePrivilegesProps) {
  const entityType =
    'entityType' in props ? props.entityType : props.entitiesType;
  const onUpdate =
    'entityType' in props
      ? (props.onUpdate as (update: {
          role: string;
          host?: string;
          newPrivilege: boolean;
          privileges: { [k: string]: boolean | undefined };
        }) => Promise<void>)
      : undefined;
  const onUpdate2 =
    'entitiesType' in props
      ? (props.onUpdate as (update: {
          entityName: string;
          schema?: string;
          newPrivilege: boolean;
          privileges: { [k: string]: boolean | undefined };
        }) => Promise<void>)
      : undefined;
  const [state, set] = useState({
    grant: false as false | true | { roleName: string; host?: string },
    revoke: false as false | { roleName: string; host?: string },
    hideInternalRoles: true,
    schema: '',
    entityName: '',
  });

  const revokeYesClick = useEvent(async () => {
    if (!state.revoke) return;
    if (onUpdate)
      await onUpdate({
        role: state.revoke.roleName,
        host: state.revoke.host,
        newPrivilege: false,
        privileges: {
          [props.privilegesTypes[0]]: false,
        },
      });
    else if (onUpdate2) {
      onUpdate2({
        entityName: state.revoke.roleName,
        schema: state.revoke.host,
        newPrivilege: false,
        privileges: {
          [props.privilegesTypes[0]]: false,
        },
      });
    }
    set({
      ...state,
      revoke: false,
    });
  });

  const grantClick = useEvent(async () => {
    if (typeof state.grant === 'object' || state.entityName) {
      if (onUpdate && typeof state.grant === 'object') {
        await onUpdate({
          role: state.grant.roleName,
          host: state.grant.host,
          newPrivilege: true,
          privileges: {
            [props.privilegesTypes[0]]: true,
          },
        });
      } else if (onUpdate2 && state.entityName) {
        await onUpdate2({
          entityName: state.entityName,
          schema: state.schema,
          newPrivilege: true,
          privileges: {
            [props.privilegesTypes[0]]: true,
          },
        });
      }
      set({
        ...state,
        entityName: '',
        schema: '',
        grant: false,
      });
    }
  });

  const { list, internals } = useInternals(props.privileges);

  const { roles } = currentState();
  const entitiesName =
    'entitiesType' in props
      ? `${props.entitiesType[0].toUpperCase()}${props.entitiesType.substring(1)}`
      : null;

  return (
    <>
      <h2 style={{ marginBottom: 3 }}>
        {entitiesName} Privileges /{' '}
        <span style={{ fontWeight: 'normal' }}>
          {' '}
          {'entitiesType' in props ? '' : 'Roles & Users with'}{' '}
          {props.privilegesTypes[0].replace(/[A-Z]/g, ' $&').toUpperCase()}{' '}
          GRANTs
        </span>
      </h2>
      <div>
        {list.map((role) => (
          <React.Fragment
            key={
              'roleName' in role
                ? role.roleName
                : `${role.schema}\n${role.entityName}`
            }
          >
            <span
              className="privileges-role"
              style={role.internal ? { opacity: 0.4 } : undefined}
            >
              {'roleName' in role ? (
                <>
                  {role.roleName}
                  {role.host ? (
                    <span
                      style={role.host === '%' ? { color: '#aaa' } : undefined}
                    >
                      @{role.host}
                    </span>
                  ) : null}
                </>
              ) : entityType === 'schema' ? (
                role.schema || role.entityName
              ) : (
                `${role.schema ? `${role.schema}.` : ''}${role.entityName}`
              )}
              <i
                className="fa fa-close"
                onClick={() => {
                  if ('roleName' in role)
                    set({
                      ...state,
                      revoke: { roleName: role.roleName, host: role.host },
                    });
                  else
                    set({
                      ...state,
                      revoke: { roleName: role.entityName, host: role.schema },
                    });
                }}
              />
            </span>
            {state.revoke &&
            (('roleName' in role &&
              role.roleName === state.revoke.roleName &&
              role.host === state.revoke.host) ||
              ('entityName' in role &&
                role.entityName === state.revoke.roleName &&
                role.schema === state.revoke.host)) ? (
              <Dialog
                onBlur={() =>
                  set({
                    ...state,
                    revoke: false,
                  })
                }
                relativeTo="previousSibling"
              >
                Do you really want to revoke this role?
                <div>
                  <button type="button" onClick={revokeYesClick}>
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      set({
                        ...state,
                        revoke: false,
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
        {internals
          ? internals.map((internal) => (
              <>
                {' '}
                <button
                  type="button"
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalRoles ? ' hidden' : ' shown'
                  }`}
                  key={state.hideInternalRoles ? 1 : 0}
                  onClick={internal.open}
                >
                  {internal.count} {internal.name}{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              </>
            ))
          : null}{' '}
        <button
          type="button"
          className="simple-button new-privileges-role"
          disabled={roles?.length === props.privileges.length}
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
            {'entitiesType' in props ? (
              <>
                <select
                  onChange={(e) => {
                    set({
                      ...state,
                      schema: e.target.value,
                      grant: true,
                      entityName: '',
                    });
                  }}
                >
                  <option />
                  {currentState().schemas?.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    set({
                      ...state,
                      entityName: e.target.value,
                    });
                  }}
                >
                  <option />
                  {currentState()
                    ?.schemas?.find((s) => s.name === state.schema)
                    ?.[
                      entityType === 'function'
                        ? 'functions'
                        : entityType === 'domain'
                          ? 'domains'
                          : entityType === 'sequence'
                            ? 'sequences'
                            : 'tables'
                    ]?.map((t) => <option key={t.name}>{t.name}</option>)}
                </select>
              </>
            ) : (
              <select
                onChange={(e) => {
                  const [roleName, host] = JSON.parse(e.target.value);
                  set({
                    ...state,
                    grant: {
                      roleName,
                      host,
                    },
                  });
                }}
              >
                <option value="" />
                {roles
                  ?.filter(
                    (r) =>
                      !props.privileges!.find(
                        (r2) => 'roleName' in r2 && r2.roleName === r.name,
                      ),
                  )
                  .map((r) => (
                    <option
                      key={r.name}
                      value={JSON.stringify([r.name, r.host])}
                    >
                      {r.name}
                      {r.host ? `@${r.host}` : ''}
                    </option>
                  ))}
              </select>
            )}
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
              <button
                type="button"
                onClick={grantClick}
                disabled={typeof state.grant !== 'object' && !state.entityName}
              >
                Save
                <i className="fa fa-check" />
              </button>
            </div>
          </Dialog>
        ) : null}
      </div>
    </>
  );
}

export function Privileges(props: PrivilegesProps) {
  if (props.privilegesTypes.length === 1) return <PrivilegesList {...props} />;
  return <PrivilegesTable {...props} />;
}

export function RolePrivileges(props: RolePrivilegesProps) {
  if (props.privilegesTypes.length === 1) return <PrivilegesList {...props} />;
  return <PrivilegesTable {...props} />;
}
