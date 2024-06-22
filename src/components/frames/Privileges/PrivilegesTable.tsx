import React, { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { TdCheck } from '../TableInfoFrame/TableInfoFrame';
import { PrivilegesProps, RolePrivilegesProps } from './Privileges';
import { PrivilegesDialog } from './PrivilegesDialog';
import { useInternals } from './useInternals';

export function PrivilegesTable(props: PrivilegesProps | RolePrivilegesProps) {
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
              key={internal.isOpen ? 1 : 0}
              className={`simple-button simple-button2 hide-button ${
                !internal.isOpen ? ' hidden' : ' shown'
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
            <th>{'entitiesType' in props ? entitiesName : 'Role'}</th>
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
                'roleName' in p
                  ? p.host
                    ? `${p.roleName}\n${p.host}`
                    : p.roleName
                  : `${p.schema}\n${p.entityName}`
              }
              style={p.internal ? { color: '#ccc' } : undefined}
            >
              <td style={p.highlight ? { fontWeight: 'bold' } : undefined}>
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
              key={internal.isOpen ? 1 : 0}
              className={`simple-button simple-button2 hide-button ${
                !internal.isOpen ? ' hidden' : ' shown'
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
