import { Dialog } from 'components/util/Dialog/Dialog';
import React, { useState } from 'react';
import { currentState } from 'state/state';
import { useEvent } from 'util/useEvent';
import { TdCheck } from '../TableInfoFrame/TableInfoFrame';
import { PrivilegesDialog } from './PrivilegesDialog';

type PrivilegesProps = {
  // eslint-disable-next-line react/no-unused-prop-types
  entityType: string;
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

function PrivilegesTable({
  entityType,
  privileges,
  privilegesTypes,
  onUpdate,
}: PrivilegesProps) {
  const [edit, set] = useState({
    newPrivilege: false,
    updatePrivilegeRole: null as null | string,
    updatePrivilegeHost: null as null | string | undefined,
    hideInternalRoles: true,
  });

  const internalRoles = React.useMemo(
    () => privileges.filter((r) => r.internal).length,
    [privileges],
  );

  const internalPrefix = React.useMemo(() => {
    const internalRoles2 = privileges.filter((r) => r.internal);
    if (internalRoles2.length === 0) {
      return null;
    }
    const prefix = internalRoles2[0].roleName.split('_')[0];
    if (internalRoles2.every((r) => r.roleName.startsWith(prefix))) {
      return prefix;
    }
    return null;
  }, [privileges]);

  async function onDialogUpdate(form: {
    role: string;
    privileges: {
      [k: string]: boolean | undefined;
    };
    host?: string;
  }) {
    await onUpdate({
      ...form,
      newPrivilege: false,
    });
    set({
      ...edit,
      updatePrivilegeRole: null,
      updatePrivilegeHost: null,
    });
  }

  const onNewPrivilege = useEvent(
    async (form: {
      role: string;
      privileges: {
        [k: string]: boolean | undefined;
      };
      host?: string;
    }) => {
      await onUpdate({
        ...form,
        newPrivilege: true,
      });
      set({
        ...edit,
        newPrivilege: false,
      });
    },
  );

  return !privileges.length ? (
    <>
      <h2>Privileges</h2>

      <div className="empty">
        No privileges found for {entityType}.{' '}
        <button
          type="button"
          className="simple-button"
          onClick={() => set({ ...edit, newPrivilege: true })}
        >
          Grant new privilege <i className="fa fa-plus" />
        </button>
        {edit.newPrivilege ? (
          <PrivilegesDialog
            privilegesTypes={privilegesTypes}
            relativeTo="previousSibling"
            type="by_role"
            onCancel={() => set({ ...edit, newPrivilege: false })}
            onUpdate={onNewPrivilege}
          />
        ) : null}
      </div>
    </>
  ) : (
    <>
      <h2>Privileges</h2>
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
          {privileges
            ?.filter((r) => !edit.hideInternalRoles || !r.internal)
            .map((p) => (
              <tr
                key={p.roleName}
                style={p.internal ? { color: '#ccc' } : undefined}
              >
                <td>
                  {p.roleName}
                  {p.host ? (
                    <span
                      style={p.host === '%' ? { color: '#bbb' } : undefined}
                    >
                      @{p.host}
                    </span>
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
                      set({
                        ...edit,
                        updatePrivilegeRole: p.roleName,
                        updatePrivilegeHost: p.host,
                      });
                    }}
                  >
                    Edit <i className="fa fa-pencil" />
                  </button>
                  {edit.updatePrivilegeRole === p.roleName &&
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
            key={edit.hideInternalRoles ? 1 : 0}
            className={`simple-button simple-button2 hide-button ${
              edit.hideInternalRoles ? ' hidden' : ' shown'
            }`}
            onClick={() => {
              set({
                ...edit,
                hideInternalRoles: !edit.hideInternalRoles,
              });
            }}
          >
            {internalRoles} {internalPrefix ? `${internalPrefix}*` : 'internal'}{' '}
            <i className="fa fa-eye-slash" />
            <i className="fa fa-eye" />
          </button>
        ) : null}{' '}
        <button
          type="button"
          className="simple-button"
          onClick={() => set({ ...edit, newPrivilege: true })}
        >
          New <i className="fa fa-plus" />
        </button>
        {edit.newPrivilege ? (
          <PrivilegesDialog
            privilegesTypes={privilegesTypes}
            relativeTo="previousSibling"
            onCancel={() => set({ ...edit, newPrivilege: false })}
            onUpdate={(form) => onNewPrivilege(form)}
            type="by_role"
          />
        ) : null}
      </div>
    </>
  );
}

function PrivilegesList(props: PrivilegesProps) {
  const [state, set] = useState({
    grant: false as false | true | { roleName: string; host?: string },
    revoke: false as false | { roleName: string; host?: string },
    hideInternalRoles: true,
  });

  const revokeYesClick = useEvent(async () => {
    if (!state.revoke) return;
    await props.onUpdate({
      role: state.revoke.roleName,
      host: state.revoke.host,
      newPrivilege: false,
      privileges: {
        [props.privilegesTypes[0]]: false,
      },
    });
    set({
      ...state,
      revoke: false,
    });
  });

  const grantClick = useEvent(async () => {
    if (typeof state.grant === 'object') {
      await props.onUpdate({
        role: state.grant.roleName,
        host: state.grant.host,
        newPrivilege: true,
        privileges: {
          [props.privilegesTypes[0]]: true,
        },
      });
      set({
        ...state,
        grant: false,
      });
    }
  });

  const internalRoles = React.useMemo(
    () => props.privileges.filter((r) => r.internal).length,
    [props.privileges],
  );

  const internalPrefix = React.useMemo(() => {
    const internalRoles2 = props.privileges.filter((r) => r.internal);
    if (internalRoles2.length === 0) {
      return null;
    }
    const prefix = internalRoles2[0].roleName.split('_')[0];
    if (internalRoles2.every((r) => r.roleName.startsWith(prefix))) {
      return prefix;
    }
    return null;
  }, [props.privileges]);

  const { roles } = currentState();

  return (
    <>
      <h2 style={{ marginBottom: 3 }}>
        Privileges /{' '}
        <span style={{ fontWeight: 'normal' }}>
          {' '}
          Roles &amp; Users with{' '}
          {props.privilegesTypes[0].replace(/[A-Z]/g, ' $&').toUpperCase()}{' '}
          GRANTs
        </span>
      </h2>
      <div>
        {props.privileges
          .filter((r) => !state.hideInternalRoles || !r.internal)
          .map((role) => (
            <React.Fragment key={role.roleName}>
              <span
                className="privileges-role"
                style={
                  role.roleName.startsWith('pg_') ? { opacity: 0.4 } : undefined
                }
              >
                {role.roleName}
                {role.host ? (
                  <span
                    style={role.host === '%' ? { color: '#aaa' } : undefined}
                  >
                    @{role.host}
                  </span>
                ) : null}
                <i
                  className="fa fa-close"
                  onClick={() =>
                    set({
                      ...state,
                      revoke: { roleName: role.roleName, host: role.host },
                    })
                  }
                />
              </span>
              {state.revoke &&
              role.roleName === state.revoke.roleName &&
              role.host === state.revoke.host ? (
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
        {internalRoles ? (
          <button
            type="button"
            className={`simple-button simple-button2 hide-button ${
              state.hideInternalRoles ? ' hidden' : ' shown'
            }`}
            key={state.hideInternalRoles ? 1 : 0}
            onClick={() => {
              set({
                ...state,
                hideInternalRoles: !state.hideInternalRoles,
              });
            }}
          >
            {internalRoles} {internalPrefix ? `${internalPrefix}*` : 'internal'}{' '}
            <i className="fa fa-eye-slash" />
            <i className="fa fa-eye" />
          </button>
        ) : null}{' '}
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
                    !props.privileges!.find((r2) => r2.roleName === r.name),
                )
                .map((r) => (
                  <option key={r.name} value={JSON.stringify([r.name, r.host])}>
                    {r.name}
                    {r.host ? `@${r.host}` : ''}
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
  );
}

export function Privileges(props: PrivilegesProps) {
  if (props.privilegesTypes.length === 1) return <PrivilegesList {...props} />;
  return <PrivilegesTable {...props} />;
}
