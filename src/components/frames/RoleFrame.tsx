import React, { useMemo, useState } from 'react';
import {
  RoleFrameProps,
  SchemaPrivileges,
  SequencePrivileges,
  TablePrivileges,
} from 'types';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { db } from 'db/db';
import { closeTab, reloadNav, renameEntity, showError } from 'state/actions';
import { useIsMounted } from 'util/hooks';
import { currentState } from 'state/state';
import { TablePrivilegesDialog } from './TableInfoFrame/TablePrivilegesDialog';
import { SchemaPrivilegesDialog } from './SchemaPrivilegesDialog';
import { TdCheck } from './TableInfoFrame/TableInfoFrame';
import { SequencePrivilegesDialog } from './SequencePrivilegesDialog';

function FunctionDialog({
  onBlur,
  onSave,
}: {
  onBlur: () => void;
  onSave: (schema: string, func: string) => void;
}) {
  const [schema, setSchema] = useState('');
  const [f, setF] = useState('');
  const onSaveClick = useEvent(() => {
    if (schema && f) onSave(schema, f);
  });
  const { schemas } = currentState();
  const functions = schemas?.find((s) => s.name === schema)?.functions;
  return (
    <Dialog relativeTo="previousSibling" onBlur={onBlur}>
      <select onChange={(e) => setSchema(e.target.value)}>
        <option value="" />
        {schemas?.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>
      <select onChange={(e) => setF(e.target.value)}>
        <option value="" />
        {functions?.map((f2) => (
          <option key={f2.name} value={f2.name}>
            {f2.name}
          </option>
        ))}
      </select>
      <div>
        <button style={{ fontWeight: 'normal' }} type="button" onClick={onBlur}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveClick}
          disabled={
            !f ||
            !schema ||
            !functions ||
            !functions.find((f2) => f2.name === f)
          }
        >
          Save
          <i className="fa fa-check" />
        </button>
      </div>
    </Dialog>
  );
}

function TypeDialog({
  onBlur,
  onSave,
}: {
  onBlur: () => void;
  onSave: (schema: string, func: string) => void;
}) {
  const [schema, setSchema] = useState('');
  const [f, setF] = useState('');
  const onSaveClick = useEvent(() => {
    if (schema && f) onSave(schema, f);
  });
  const { schemas } = currentState();
  const types = schemas?.find((s) => s.name === schema)?.domains;
  return (
    <Dialog relativeTo="previousSibling" onBlur={onBlur}>
      <select onChange={(e) => setSchema(e.target.value)}>
        <option value="" />
        {schemas?.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>
      <select onChange={(e) => setF(e.target.value)}>
        <option value="" />
        {types?.map((f2) => (
          <option key={f2.name} value={f2.name}>
            {f2.name}
          </option>
        ))}
      </select>
      <div>
        <button style={{ fontWeight: 'normal' }} type="button" onClick={onBlur}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveClick}
          disabled={
            !f || !schema || !types || !types.find((f2) => f2.name === f)
          }
        >
          Save
          <i className="fa fa-check" />
        </button>
      </div>
    </Dialog>
  );
}

export function RoleFrame(props: RoleFrameProps) {
  const { name } = props;

  const service = useService(
    () =>
      Promise.all([
        db().privileges!.role?.(props.name),
        db().privileges!.tablePrivilegesTypes(),
      ]).then(([role, tablePrivilegesTypes]) => ({
        ...role,
        tablePrivilegesTypes,
      })),
    [props.name],
  );

  const { schemas } = currentState();
  const currentSchemas = useMemo(
    () => schemas?.filter((v) => v.current).map((v) => v.name),
    [schemas],
  );

  const isUser = !!service?.lastValidData?.user;

  const [state, set] = useState({
    dropConfirmation: false,
    editComment: false,
    rename: false,
    changeSchema: false,
    newTablePrivilege: false,
    newSchemaPrivilege: false,
    updatePrivilege: null as { schema: string; table: string } | null,
    hideInternalSchemas: true,
    hideInternalsTables: true,
    hideInternalsTables2: true,
    hideInternalsFunctions: true,
    hideInternalsSequences: true,
    hideInternalsTypes: true,
    hideInternalsFunctions2: true,
    hideInternalsSequences2: true,
    hideInternalsTypes2: true,
    updateSchemaPrivileges: null as string | null,
    newSequencePrivilege: false,
    updateSequencePrivilege: null as {
      schema: string;
      sequence: string;
    } | null,
    newFunctionPrivilege: false,
    revokeFunction: null as {
      schema: string;
      function: string;
    } | null,
    newTypePrivilege: false,
    revokeType: null as {
      schema: string;
      type: string;
    } | null,
  });

  const drop = useEvent(() => {
    set({
      ...state,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    db()
      .privileges!.dropRole?.(props.name)
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
    await db().privileges!.updateRoleComment?.(props.name, text);
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
    await db().privileges!.renameRole?.(name, newName);
    renameEntity(props.uid, newName);
    reloadNav();
    set({ ...state, rename: false });
  });

  const isMounted = useIsMounted();

  const grantTable = useEvent(
    async (schema: string, table: string, privileges: TablePrivileges) => {
      await db().privileges!.updateTablePrivileges(
        schema,
        table,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, newTablePrivilege: false });
    },
  );

  const grantSchema = useEvent(
    async (schema: string, privileges: SchemaPrivileges) => {
      await db().privileges!.updateSchemaPrivileges?.(
        schema,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, newSchemaPrivilege: false });
    },
  );

  const grantSequence = useEvent(
    async (schema: string, table: string, privileges: SequencePrivileges) => {
      await db().sequences?.updateSequencePrivileges?.(
        schema,
        table,
        props.name,
        privileges,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, newSequencePrivilege: false });
    },
  );

  const onUpdateSequencePrivileges = useEvent(
    async (
      schema: string,
      table: string,
      current: SequencePrivileges,
      update: SequencePrivileges,
    ) => {
      await db().sequences?.updateSequencePrivileges?.(
        schema,
        table,
        props.name,
        {
          update: update.update === current.update ? undefined : update.update,
          select: update.select === current.select ? undefined : update.select,
          usage: update.usage === current.usage ? undefined : update.usage,
        },
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, updateSequencePrivilege: null });
    },
  );

  const onUpdateSchemaPrivileges = useEvent(
    async (
      schema: string,
      curr: SchemaPrivileges,
      update: SchemaPrivileges,
    ) => {
      await db().privileges!.updateSchemaPrivileges?.(schema, props.name, {
        create: update.create === curr.create ? undefined : update.create,
        usage: update.usage === curr.usage ? undefined : update.usage,
      });
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...state, updateSchemaPrivileges: null });
    },
  );

  const onUpdateTablePrivileges = useEvent(
    async (
      schema: string,
      table: string,
      curr: TablePrivileges,
      update: TablePrivileges,
    ) => {
      await db().privileges!.updateTablePrivileges(schema, table, props.name, {
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

  const revokeFunctionYesClick = useEvent(() => {
    if (!state.revokeFunction) return;
    db()
      .functions?.revokeFunction?.(
        state.revokeFunction.schema,
        state.revokeFunction.function,
        props.name,
      )
      .then(
        () => {
          service.reload();
          set({
            ...state,
            revokeFunction: null,
          });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const revokeTypeYesClick = useEvent(() => {
    if (!state.revokeType) return;
    db()
      .domains?.revokeDomain?.(
        state.revokeType.schema,
        state.revokeType.type,
        props.name,
      )
      .then(
        () => {
          service.reload();
          set({
            ...state,
            revokeType: null,
          });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const newFunctionPrivilegeSave = useEvent((schema: string, fName: string) => {
    db()
      .functions?.grantFunction?.(schema, fName, props.name)
      .then(
        () => {
          service.reload();
          set({
            ...state,
            newFunctionPrivilege: false,
          });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const newTypePrivilegeSave = useEvent((schema: string, tName: string) => {
    db()
      .domains?.grantDomain?.(schema, tName, props.name)
      .then(
        () => {
          service.reload();
          set({
            ...state,
            newTypePrivilege: false,
          });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const privilegesSizes = useMemo(
    () => ({
      tables: {
        internals: service.lastValidData?.privileges?.tables.filter(
          (v) => v.schema === 'pg_catalog',
        ).length,
        internals2: service.lastValidData?.privileges?.tables.filter(
          (v) => v.schema === 'information_schema',
        ).length,
      },
      functions: {
        internals: service.lastValidData?.privileges?.functions.filter(
          (v) => v.schema === 'pg_catalog',
        ).length,
        internals2: service.lastValidData?.privileges?.functions.filter(
          (v) => v.schema === 'information_schema',
        ).length,
      },
      sequences: {
        internals: service.lastValidData?.privileges?.sequences.filter(
          (v) => v.schema === 'pg_catalog',
        ).length,
        internals2: service.lastValidData?.privileges?.sequences.filter(
          (v) => v.schema === 'information_schema',
        ).length,
      },
      types: {
        internals: service.lastValidData?.privileges?.types.filter(
          (v) => v.schema === 'pg_catalog',
        ).length,
        internals2: service.lastValidData?.privileges?.types.filter(
          (v) => v.schema === 'information_schema',
        ).length,
      },
      internalSchemas: service.lastValidData?.privileges?.schemas.filter(
        (s) => s.name === 'pg_catalog' || s.name === 'information_schema',
      ).length,
    }),
    [service.lastValidData?.privileges],
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

      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}

      {service?.lastValidData?.privileges?.schemas ? (
        service?.lastValidData?.privileges.schemas?.length === 0 ? (
          <>
            <h2 style={{ userSelect: 'text' }}>Schemas Privileges</h2>
            <div className="empty">
              No privileges found for {isUser ? 'user' : 'role'}.{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newSchemaPrivilege: true })}
              >
                Grant new privilege <i className="fa fa-plus" />
              </button>
              {state.newSchemaPrivilege ? (
                <SchemaPrivilegesDialog
                  relativeTo="previousSibling"
                  type="by_schema"
                  onCancel={() => set({ ...state, newSchemaPrivilege: false })}
                  onUpdate={(form) => grantSchema(form.schema, form.privileges)}
                />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ userSelect: 'text' }}>Schema Privileges</h2>
            <table>
              <thead>
                <tr>
                  <th>Schema</th>
                  <th style={{ width: 75 }}>Usage</th>
                  <th style={{ width: 75 }}>Create</th>
                  <th style={{ width: 62 }} />
                </tr>
              </thead>
              <tbody>
                {service?.lastValidData?.privileges.schemas
                  .filter(
                    (s) =>
                      !state.hideInternalSchemas ||
                      (s.name !== 'pg_catalog' &&
                        s.name !== 'information_schema'),
                  )
                  .map((p) => (
                    <tr
                      key={`${p.name}`}
                      style={
                        p.name === 'pg_catalog' ||
                        p.name === 'information_schema'
                          ? { color: '#ccc' }
                          : undefined
                      }
                    >
                      <td
                        style={
                          currentSchemas?.find((p2) => p2 === p.name)
                            ? { fontWeight: 'bold' }
                            : undefined
                        }
                      >
                        {p.name}
                      </td>
                      <TdCheck checked={!!p.privileges.usage} />
                      <TdCheck checked={!!p.privileges.create} />
                      <td className="actions">
                        <button
                          type="button"
                          className="simple-button"
                          onClick={() => {
                            set({
                              ...state,
                              updateSchemaPrivileges: p.name,
                            });
                          }}
                        >
                          Edit <i className="fa fa-pencil" />
                        </button>
                        {state.updateSchemaPrivileges === p.name ? (
                          <SchemaPrivilegesDialog
                            relativeTo="previousSibling"
                            schema={p.name}
                            onCancel={() =>
                              set({ ...state, updateSchemaPrivileges: null })
                            }
                            privileges={p.privileges}
                            onUpdate={(form) =>
                              onUpdateSchemaPrivileges(
                                form.schema,
                                p.privileges,
                                form.privileges,
                              )
                            }
                            type="by_schema"
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="actions">
              {privilegesSizes.internalSchemas ? (
                <button
                  type="button"
                  key={state.hideInternalSchemas ? 1 : 0}
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalSchemas ? ' hidden' : ' shown'
                  }`}
                  onClick={() => {
                    set({
                      ...state,
                      hideInternalSchemas: !state.hideInternalSchemas,
                    });
                  }}
                >
                  {privilegesSizes.internalSchemas} internals{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              ) : null}{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newSchemaPrivilege: true })}
              >
                New <i className="fa fa-plus" />
              </button>
              {state.newSchemaPrivilege ? (
                <SchemaPrivilegesDialog
                  relativeTo="previousSibling"
                  onCancel={() => set({ ...state, newSchemaPrivilege: false })}
                  onUpdate={(form) => grantSchema(form.schema, form.privileges)}
                  type="by_schema"
                />
              ) : null}
            </div>
          </>
        )
      ) : null}

      {service?.lastValidData?.privileges?.tables ? (
        service?.lastValidData?.privileges.tables?.length === 0 ? (
          <>
            <h2 style={{ userSelect: 'text' }}>Table Privileges</h2>
            <div className="empty">
              No privileges found for {isUser ? 'user' : 'role'}.{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newTablePrivilege: true })}
              >
                Grant new privilege <i className="fa fa-plus" />
              </button>
              {state.newTablePrivilege ? (
                <TablePrivilegesDialog
                  privilegesTypes={service.lastValidData.tablePrivilegesTypes}
                  relativeTo="previousSibling"
                  type="by_table"
                  onCancel={() => set({ ...state, newTablePrivilege: false })}
                  onUpdate={(form) =>
                    grantTable(form.schema, form.table, form.privileges)
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
                  <th style={{ width: 75 }}>Update</th>
                  <th style={{ width: 75 }}>Insert</th>
                  <th style={{ width: 75 }}>Select</th>
                  <th style={{ width: 75 }}>Delete</th>
                  <th style={{ width: 75 }}>Truncate</th>
                  <th style={{ width: 80 }}>References</th>
                  <th style={{ width: 75 }}>Trigger</th>
                  <th style={{ width: 62 }} />
                </tr>
              </thead>
              <tbody>
                {service?.lastValidData?.privileges.tables
                  ?.filter(
                    (p) =>
                      (!state.hideInternalsTables ||
                        p.schema !== 'pg_catalog') &&
                      (!state.hideInternalsTables2 ||
                        p.schema !== 'information_schema'),
                  )
                  .map((p) => (
                    <tr
                      key={`${p.schema}\n${p.table}`}
                      style={
                        p.schema === 'pg_catalog' ||
                        p.schema === 'information_schema'
                          ? { color: '#ccc' }
                          : undefined
                      }
                    >
                      <td>
                        {p.schema}.{p.table}
                      </td>
                      <TdCheck checked={!!p.privileges.update} />
                      <TdCheck checked={!!p.privileges.insert} />
                      <TdCheck checked={!!p.privileges.select} />
                      <TdCheck checked={!!p.privileges.delete} />
                      <TdCheck checked={!!p.privileges.truncate} />
                      <TdCheck checked={!!p.privileges.references} />
                      <TdCheck checked={!!p.privileges.trigger} />
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
                        service.lastValidData &&
                        state.updatePrivilege.table === p.table ? (
                          <TablePrivilegesDialog
                            privilegesTypes={
                              service.lastValidData.tablePrivilegesTypes
                            }
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
                              onUpdateTablePrivileges(
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
              {privilegesSizes.tables.internals ? (
                <button
                  type="button"
                  key={state.hideInternalsTables ? 1 : 0}
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalsTables ? ' hidden' : ' shown'
                  }`}
                  onClick={() => {
                    set({
                      ...state,
                      hideInternalsTables: !state.hideInternalsTables,
                    });
                  }}
                >
                  {privilegesSizes.tables.internals} pg_catalog.*{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              ) : null}{' '}
              {privilegesSizes.tables.internals2 ? (
                <button
                  type="button"
                  key={state.hideInternalsTables2 ? 2 : 3}
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalsTables2 ? ' hidden' : ' shown'
                  }`}
                  onClick={() => {
                    set({
                      ...state,
                      hideInternalsTables2: !state.hideInternalsTables2,
                    });
                  }}
                >
                  {privilegesSizes.tables.internals2} information_schema.*{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              ) : null}{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => {
                  set((s) => ({ ...s, newTablePrivilege: true }));
                }}
              >
                New <i className="fa fa-plus" />
              </button>
              {state.newTablePrivilege ? (
                <TablePrivilegesDialog
                  privilegesTypes={service.lastValidData.tablePrivilegesTypes}
                  relativeTo="previousSibling"
                  onCancel={() => {
                    set({ ...state, newTablePrivilege: false });
                  }}
                  onUpdate={(form) =>
                    grantTable(form.schema, form.table, form.privileges)
                  }
                  type="by_table"
                />
              ) : null}
            </div>
          </>
        )
      ) : null}

      {service.lastValidData ? (
        <>
          <h2 style={{ userSelect: 'text' }}>
            Function Privileges /{' '}
            <span style={{ fontWeight: 'normal' }}> EXECUTE GRANTs</span>
          </h2>
          <div>
            {service.lastValidData?.privileges?.functions
              .filter(
                (r) =>
                  (!state.hideInternalsFunctions ||
                    r.schema !== 'pg_catalog') &&
                  (!state.hideInternalsFunctions2 ||
                    r.schema !== 'information_schema'),
              )
              .map((f) => (
                <React.Fragment key={`${f.name}\n${f.schema}`}>
                  <span
                    className="privileges-role"
                    style={
                      f.schema.startsWith('pg_') ? { opacity: 0.4 } : undefined
                    }
                  >
                    {f.schema}.{f.name}
                    <i
                      className="fa fa-close"
                      onClick={() =>
                        set({
                          ...state,
                          revokeFunction: {
                            schema: f.schema,
                            function: f.name,
                          },
                        })
                      }
                    />
                  </span>
                  {f.name === state.revokeFunction?.function &&
                  f.schema === state.revokeFunction?.schema ? (
                    <Dialog
                      onBlur={() =>
                        set({
                          ...state,
                          revokeFunction: null,
                        })
                      }
                      relativeTo="previousSibling"
                    >
                      Do you really want to revoke this role?
                      <div>
                        <button type="button" onClick={revokeFunctionYesClick}>
                          Yes
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() =>
                            set({
                              ...state,
                              revokeFunction: null,
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
            {privilegesSizes.functions.internals ? (
              <button
                type="button"
                className={`simple-button simple-button2 hide-button ${
                  state.hideInternalsFunctions ? ' hidden' : ' shown'
                }`}
                key={state.hideInternalsFunctions ? 1 : 0}
                onClick={() => {
                  set({
                    ...state,
                    hideInternalsFunctions: !state.hideInternalsFunctions,
                  });
                }}
              >
                {privilegesSizes.functions.internals} pg_catalog.*{' '}
                <i className="fa fa-eye-slash" />
                <i className="fa fa-eye" />
              </button>
            ) : null}{' '}
            {privilegesSizes.functions.internals2 ? (
              <button
                type="button"
                className={`simple-button simple-button2 hide-button ${
                  state.hideInternalsFunctions2 ? ' hidden' : ' shown'
                }`}
                key={state.hideInternalsFunctions2 ? 2 : 3}
                onClick={() => {
                  set({
                    ...state,
                    hideInternalsFunctions2: !state.hideInternalsFunctions2,
                  });
                }}
              >
                {privilegesSizes.functions.internals2} information_schema.*{' '}
                <i className="fa fa-eye-slash" />
                <i className="fa fa-eye" />
              </button>
            ) : null}{' '}
            <button
              type="button"
              className="simple-button new-privileges-role"
              onClick={() => set({ ...state, newFunctionPrivilege: true })}
            >
              New <i className="fa fa-plus" />
            </button>
            {state.newFunctionPrivilege !== false ? (
              <FunctionDialog
                onBlur={() => set({ ...state, newFunctionPrivilege: false })}
                onSave={newFunctionPrivilegeSave}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {service?.lastValidData?.privileges?.sequences ? (
        service?.lastValidData?.privileges.sequences?.length === 0 ? (
          <>
            <h2 style={{ userSelect: 'text' }}>Sequence Privileges</h2>
            <div className="empty">
              No privileges found for {isUser ? 'user' : 'role'}.{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...state, newSequencePrivilege: true })}
              >
                Grant new privilege <i className="fa fa-plus" />
              </button>
              {state.newSequencePrivilege ? (
                <SequencePrivilegesDialog
                  relativeTo="previousSibling"
                  type="by_sequence"
                  onCancel={() =>
                    set({ ...state, newSequencePrivilege: false })
                  }
                  onUpdate={(form) =>
                    grantSequence(form.schema, form.sequence, form.privileges)
                  }
                />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ userSelect: 'text' }}>Sequence Privileges</h2>
            <table>
              <thead>
                <tr>
                  <th>Sequence</th>
                  <th style={{ width: 75 }}>Usage</th>
                  <th style={{ width: 75 }}>Select</th>
                  <th style={{ width: 75 }}>Update</th>
                  <th style={{ width: 62 }} />
                </tr>
              </thead>
              <tbody>
                {service?.lastValidData?.privileges.sequences
                  ?.filter(
                    (p) =>
                      (!state.hideInternalsTables ||
                        p.schema !== 'pg_catalog') &&
                      (!state.hideInternalsTables2 ||
                        p.schema !== 'information_schema'),
                  )
                  .map((p) => (
                    <tr
                      key={`${p.schema}\n${p.name}`}
                      style={
                        p.schema === 'pg_catalog' ||
                        p.schema === 'information_schema'
                          ? { color: '#ccc' }
                          : undefined
                      }
                    >
                      <td>
                        {p.schema}.{p.name}
                      </td>
                      <TdCheck checked={!!p.privileges.usage} />
                      <TdCheck checked={!!p.privileges.select} />
                      <TdCheck checked={!!p.privileges.update} />
                      <td className="actions">
                        <button
                          type="button"
                          className="simple-button"
                          onClick={() =>
                            set({
                              ...state,
                              updateSequencePrivilege: {
                                sequence: p.name,
                                schema: p.schema,
                              },
                            })
                          }
                        >
                          Edit <i className="fa fa-pencil" />
                        </button>
                        {state.updateSequencePrivilege &&
                        state.updateSequencePrivilege.schema === p.schema &&
                        state.updateSequencePrivilege.sequence === p.name ? (
                          <SequencePrivilegesDialog
                            relativeTo="previousSibling"
                            privileges={{
                              update: p.privileges.update,
                              select: p.privileges.select,
                              usage: p.privileges.usage,
                            }}
                            type="by_sequence"
                            onUpdate={(form) =>
                              onUpdateSequencePrivileges(
                                form.schema,
                                form.sequence,
                                p.privileges,
                                form.privileges,
                              )
                            }
                            onCancel={() =>
                              set({ ...state, updateSequencePrivilege: null })
                            }
                            schema={p.schema}
                            sequence={p.name}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="actions">
              {privilegesSizes.sequences.internals ? (
                <button
                  type="button"
                  key={state.hideInternalsTables ? 1 : 0}
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalsTables ? ' hidden' : ' shown'
                  }`}
                  onClick={() => {
                    set({
                      ...state,
                      hideInternalsSequences: !state.hideInternalsSequences,
                    });
                  }}
                >
                  {privilegesSizes.sequences.internals} pg_catalog.*{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              ) : null}{' '}
              {privilegesSizes.sequences.internals2 ? (
                <button
                  type="button"
                  key={state.hideInternalsSequences2 ? 2 : 3}
                  className={`simple-button simple-button2 hide-button ${
                    state.hideInternalsSequences2 ? ' hidden' : ' shown'
                  }`}
                  onClick={() => {
                    set({
                      ...state,
                      hideInternalsSequences2: !state.hideInternalsSequences2,
                    });
                  }}
                >
                  {privilegesSizes.sequences.internals2} information_schema.*{' '}
                  <i className="fa fa-eye-slash" />
                  <i className="fa fa-eye" />
                </button>
              ) : null}{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => {
                  set((s) => ({ ...s, newSequencePrivilege: true }));
                }}
              >
                New <i className="fa fa-plus" />
              </button>
              {state.newSequencePrivilege ? (
                <SequencePrivilegesDialog
                  relativeTo="previousSibling"
                  onCancel={() => {
                    set({ ...state, newSequencePrivilege: false });
                  }}
                  onUpdate={() => {
                    // newPrivilege(form.schema, form.table, form.privileges)
                    return Promise.resolve();
                  }}
                  type="by_sequence"
                />
              ) : null}
            </div>
          </>
        )
      ) : null}

      {service.lastValidData && service.lastValidData.privileges ? (
        <>
          <h2 style={{ userSelect: 'text' }}>
            Domains Privileges /{' '}
            <span style={{ fontWeight: 'normal' }}> USAGE GRANTs</span>
          </h2>
          <div>
            {service.lastValidData?.privileges.types
              .filter(
                (r) =>
                  (!state.hideInternalsTypes || r.schema !== 'pg_catalog') &&
                  (!state.hideInternalsTypes2 ||
                    r.schema !== 'information_schema'),
              )
              .map((f) => (
                <React.Fragment key={`${f.name}\n${f.schema}`}>
                  <span
                    className="privileges-role"
                    style={
                      f.schema.startsWith('pg_') ? { opacity: 0.4 } : undefined
                    }
                  >
                    {f.schema}.{f.name}
                    <i
                      className="fa fa-close"
                      onClick={() =>
                        set({
                          ...state,
                          revokeType: {
                            schema: f.schema,
                            type: f.name,
                          },
                        })
                      }
                    />
                  </span>
                  {f.name === state.revokeType?.type &&
                  f.schema === state.revokeType?.schema ? (
                    <Dialog
                      onBlur={() =>
                        set({
                          ...state,
                          revokeType: null,
                        })
                      }
                      relativeTo="previousSibling"
                    >
                      Do you really want to revoke this grant?
                      <div>
                        <button type="button" onClick={revokeTypeYesClick}>
                          Yes
                        </button>{' '}
                        <button
                          type="button"
                          onClick={() =>
                            set({
                              ...state,
                              revokeType: null,
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
            {privilegesSizes.functions.internals ? (
              <button
                type="button"
                className={`simple-button simple-button2 hide-button ${
                  state.hideInternalsTypes ? ' hidden' : ' shown'
                }`}
                key={state.hideInternalsTypes ? 1 : 0}
                onClick={() => {
                  set({
                    ...state,
                    hideInternalsTypes: !state.hideInternalsTypes,
                  });
                }}
              >
                {privilegesSizes.functions.internals} pg_catalog.*{' '}
                <i className="fa fa-eye-slash" />
                <i className="fa fa-eye" />
              </button>
            ) : null}{' '}
            {privilegesSizes.functions.internals2 ? (
              <button
                type="button"
                className={`simple-button simple-button2 hide-button ${
                  state.hideInternalsTypes2 ? ' hidden' : ' shown'
                }`}
                key={state.hideInternalsTypes2 ? 2 : 3}
                onClick={() => {
                  set({
                    ...state,
                    hideInternalsTypes2: !state.hideInternalsTypes2,
                  });
                }}
              >
                {privilegesSizes.functions.internals2} information_schema.*{' '}
                <i className="fa fa-eye-slash" />
                <i className="fa fa-eye" />
              </button>
            ) : null}{' '}
            <button
              type="button"
              className="simple-button new-privileges-role"
              onClick={() => set({ ...state, newTypePrivilege: true })}
            >
              New <i className="fa fa-plus" />
            </button>
            {state.newTypePrivilege !== false ? (
              <TypeDialog
                onBlur={() => set({ ...state, newTypePrivilege: false })}
                onSave={newTypePrivilegeSave}
              />
            ) : null}
          </div>
        </>
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
    </div>
  );
}
