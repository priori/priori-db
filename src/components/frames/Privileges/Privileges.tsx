import React, { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { TdCheck } from '../TableInfoFrame/TableInfoFrame';
import { PrivilegesDialog } from './PrivilegesDialog';

export function Privileges({
  entityType,
  privileges,
  privilegesTypes,
  onUpdate,
}: {
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
}) {
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
      <h2 style={{ userSelect: 'text' }}>Privileges</h2>
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
                  {p.host ? '@' : ''}
                  {p.host}
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
            {internalRoles} pg_* <i className="fa fa-eye-slash" />
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
