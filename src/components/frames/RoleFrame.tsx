import { useState } from 'react';
import { RoleFrameProps, TablePrivileges } from 'types';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { first } from 'db/Connection';
import { DB } from 'db/DB';
import { closeTab, reloadNav, renameEntity, showError } from 'state/actions';
import { useIsMounted } from 'util/hooks';
import { TablePrivilegesDialog } from './TableInfoFrame/TablePrivilegesDialog';

export function RoleFrame(props: RoleFrameProps) {
  const { name } = props;

  const service = useService(async () => {
    const [role, info, user, tables] = await Promise.all([
      first(
        `
        SELECT * FROM pg_roles WHERE rolname = $1
      `,
        [props.name],
      ),
      first(
        `
        SELECT description AS comment
        FROM pg_roles r
        JOIN pg_shdescription c ON c.objoid = r.oid
        WHERE rolname = $1;
      `,
        [props.name],
      ),
      first(
        `
        SELECT *
        FROM pg_user
        WHERE
          usename = $1
      `,
        [props.name],
      ),
      DB.roleTablePrivileges(props.name),
    ]);
    return { role, info, user, tables } as {
      role: {
        [k: string]: string | number | null | boolean;
      };
      info: {
        definition: string;
        comment: string;
      };
      user: {
        [k: string]: string | number | null | boolean;
      };
      tables: {
        schema: string;
        table: string;
        privileges: TablePrivileges;
      }[];
    };
  }, [props.name]);

  const isUser = !!service?.lastValidData?.user;

  const [state, set] = useState({
    dropConfirmation: false,
    editComment: false,
    rename: false,
    changeSchema: false,
    newPrivilege: false,
    updatePrivilege: null as { schema: string; table: string } | null,
  });

  const drop = useEvent(() => {
    set({
      ...state,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    DB.dropRole(props.name).then(
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
    await DB.updateRoleComment(props.name, text);
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
    await DB.renameRole(name, newName);
    renameEntity(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const isMounted = useIsMounted();

  const newPrivilege = useEvent(
    async (schema: string, table: string, privileges: TablePrivileges) => {
      await DB.updatePrivileges(schema, table, props.name, privileges);
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, newPrivilege: false });
    },
  );

  const onUpdatePrivileges = useEvent(
    async (
      schema: string,
      table: string,
      curr: TablePrivileges,
      update: TablePrivileges,
    ) => {
      await DB.updatePrivileges(schema, table, props.name, {
        update: update.update === curr.update ? undefined : update.update,
        select: update.select === curr.select ? undefined : update.select,
        insert: update.insert === curr.insert ? undefined : update.insert,
        delete: update.delete === curr.delete ? undefined : update.delete,
        truncate:
          update.truncate === curr.truncate ? undefined : update.truncate,
        references:
          update.references === curr.references ? undefined : update.references,
        trigger: update.trigger === curr.trigger ? undefined : update.trigger,
      });
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, updatePrivilege: null });
    },
  );

  return (
    <div>
      <h1>{props.name}</h1>
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
        {service.lastValidData ? (
          <>
            <button type="button" onClick={drop}>
              Drop {isUser ? 'User' : 'Role'} <i className="fa fa-close" />
            </button>{' '}
            {state.dropConfirmation ? (
              <Dialog onBlur={noClick} relativeTo="previousSibling">
                Do you really want to drop this {isUser ? 'user' : 'role'}?
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
          </>
        ) : null}
      </div>

      {service?.lastValidData?.info?.comment || state.editComment ? (
        <Comment
          value={service?.lastValidData?.info?.comment || ''}
          edit={state.editComment}
          onUpdate={onUpdateComment}
          onCancel={() => set({ ...state, editComment: false })}
        />
      ) : null}

      {service?.lastValidData?.role ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_roles</h2>
          <div className="fields">
            {Object.entries(service.lastValidData?.role).map(([k, v]) => (
              <div key={k} className="field">
                <strong>{k.startsWith('typ') ? k.substring(3) : k}:</strong>{' '}
                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {service?.lastValidData?.tables ? (
        service?.lastValidData?.tables?.length === 0 ? (
          <>
            <h2 style={{ userSelect: 'text' }}>Table Privileges</h2>

            <div className="empty">
              No privileges found for {isUser ? 'user' : 'role'}.{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newPrivilege: true })}
              >
                Grant new privilege <i className="fa fa-plus" />
              </button>
              {state.newPrivilege ? (
                <TablePrivilegesDialog
                  relativeTo="previousSibling"
                  type="by_table"
                  onCancel={() => set({ ...state, newPrivilege: false })}
                  onUpdate={(form) =>
                    newPrivilege(form.schema, form.table, form.privileges)
                  }
                />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ userSelect: 'text' }}>Table Privileges</h2>
            <table>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Update</th>
                  <th>Insert</th>
                  <th>Select</th>
                  <th>Delete</th>
                  <th>Truncate</th>
                  <th>References</th>
                  <th>Trigger</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {service?.lastValidData?.tables?.map((p) => (
                  <tr key={`${p.schema}\n${p.table}`}>
                    <td>
                      {p.schema}.{p.table}
                    </td>
                    <td>{p.privileges.update ? 'yes' : 'no'}</td>
                    <td>{p.privileges.insert ? 'yes' : 'no'}</td>
                    <td>{p.privileges.select ? 'yes' : 'no'}</td>
                    <td>{p.privileges.delete ? 'yes' : 'no'}</td>
                    <td>{p.privileges.truncate ? 'yes' : 'no'}</td>
                    <td>{p.privileges.references ? 'yes' : 'no'}</td>
                    <td>{p.privileges.trigger ? 'yes' : 'no'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="simple-button"
                        onClick={() =>
                          set({
                            ...state,
                            updatePrivilege: {
                              table: p.table,
                              schema: p.schema,
                            },
                          })
                        }
                      >
                        Edit <i className="fa fa-pencil" />
                      </button>
                      {state.updatePrivilege &&
                      state.updatePrivilege.schema === p.schema &&
                      state.updatePrivilege.table === p.table ? (
                        <TablePrivilegesDialog
                          relativeTo="previousSibling"
                          privileges={{
                            update: p.privileges.update,
                            insert: p.privileges.insert,
                            select: p.privileges.select,
                            delete: p.privileges.delete,
                            truncate: p.privileges.truncate,
                            references: p.privileges.references,
                            trigger: p.privileges.trigger,
                          }}
                          type="by_table"
                          onUpdate={(e) =>
                            onUpdatePrivileges(
                              p.schema,
                              p.table,
                              p.privileges,
                              e.privileges,
                            )
                          }
                          onCancel={() =>
                            set({ ...state, updatePrivilege: null })
                          }
                          schema={p.schema}
                          table={p.table}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="actions">
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newPrivilege: true })}
              >
                New <i className="fa fa-plus" />
              </button>
              {state.newPrivilege ? (
                <TablePrivilegesDialog
                  relativeTo="previousSibling"
                  onCancel={() => set({ ...state, newPrivilege: false })}
                  onUpdate={(form) =>
                    newPrivilege(form.schema, form.table, form.privileges)
                  }
                  type="by_table"
                />
              ) : null}
            </div>
          </>
        )
      ) : null}

      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
    </div>
  );
}
