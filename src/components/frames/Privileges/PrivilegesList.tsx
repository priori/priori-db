import { Dialog } from 'components/util/Dialog/Dialog';
import React, { useState } from 'react';
import { currentState } from 'state/state';
import { useEvent } from 'util/useEvent';
import { PrivilegesProps, RolePrivilegesProps } from './Privileges';
import { useInternals } from './useInternals';

export function PrivilegesList(props: PrivilegesProps | RolePrivilegesProps) {
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
              <React.Fragment key={internal.name}>
                {' '}
                <button
                  type="button"
                  className={`simple-button simple-button2 hide-button ${
                    !internal.isOpen ? ' hidden' : ' shown'
                  }`}
                  key={internal.isOpen ? 1 : 0}
                  onClick={internal.open}
                >
                  {internal.count} {internal.name}{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              </React.Fragment>
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
