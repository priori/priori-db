import { useService } from 'util/useService';
import { useMemo, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog/Dialog';
import { YesNoDialog } from 'components/util/Dialog/YesNoDialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { InputDialog } from 'components/util/Dialog/InputDialog';
import { useIsMounted } from 'util/hooks';
import { assert } from 'util/assert';
import { currentState } from 'state/state';
import { ColTableInfo, db } from 'db/db';
import { TableInfoFrameProps, TablePrivileges } from '../../../types';
import {
  reloadNav,
  closeTab,
  renameEntity,
  changeSchema,
  showError,
} from '../../../state/actions';
import { ChangeSchemaDialog } from '../../util/Dialog/ChangeSchemaDialog';
import { ColumnForm, ColumnFormDialog } from './ColumnFormDialog';
import { IndexForm, IndexDialog } from './IndexDialog';
import { TablePrivilegesDialog } from './TablePrivilegesDialog';

export function TdCheck({ checked }: { checked: boolean }) {
  return (
    <td
      style={{
        fontWeight: 'bold',
        textAlign: 'center',
        userSelect: 'none',
        ...(!checked ? { fontSize: 20, color: '#ccc' } : {}),
      }}
    >
      {checked ? <i className="fa fa-check" /> : '-'}
    </td>
  );
}

export function TableInfoFrame(props: TableInfoFrameProps) {
  const service = useService(
    async () =>
      Promise.all([
        db().tableInfo(props.schema, props.table),
        db().privileges?.tablePrivilegesTypes(),
      ]).then(([tableInfo, privilegesTypes]) => ({
        privilegesTypes,
        ...tableInfo,
      })),
    [props.schema, props.table],
  );

  useTab({
    f5() {
      service.reload();
    },
  });

  const state = service.lastValidData || {
    indexes: null,
    cols: null,
    table: null,
    type: null,
    comment: null,
    view: null,
    mView: null,
    constraints: null,
    privileges: null,
    subType: null,
  };

  const [edit, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
    rename: false,
    updateSchema: false,
    removeColumn: null as string | null,
    removeIndex: null as string | null,
    renameIndex: null as string | null,
    renameColumn: null as string | null,
    commentIndex: null as string | null,
    commentColumn: null as string | null,
    updateColumn: null as string | null,
    newColumn: false,
    newIndex: false,
    openIndexComment: null as string | null,
    updatePrivilege: null as string | null,
    updatePrivilegeHost: null as string | null | undefined,
    newPrivilege: false,
    editOwner: false as boolean | string,
    hideInternalRoles: true,
  });

  const isMounted = useIsMounted();

  const onUpdateComment = useEvent(async (text: string) => {
    if (state.subType === 'mview')
      await db().updateMView(props.schema, props.table, { comment: text });
    else if (state.subType === 'view')
      await db().updateView(props.schema, props.table, { comment: text });
    else await db().updateTable(props.schema, props.table, { comment: text });
    await service.reload();
    if (isMounted()) set({ ...edit, editComment: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    if (state.subType === 'mview')
      await db().updateMView(props.schema, props.table, { schema });
    else if (state.subType === 'view')
      await db().updateView(props.schema, props.table, { schema });
    else await db().updateTable(props.schema, props.table, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    if (isMounted()) set({ ...edit, updateSchema: false });
  });

  const dropCascade = useEvent(() => {
    set({
      ...edit,
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      ...edit,
      dropCascadeConfirmation: false,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    if (edit.dropCascadeConfirmation)
      db()
        .dropTable(props.schema, props.table, true)
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
      db()
        .dropTable(props.schema, props.table)
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
      ...edit,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const onRename = useEvent(async (name: string) => {
    if (state.subType === 'mview')
      await db().updateMView(props.schema, props.table, { name });
    else if (state.subType === 'view')
      await db().updateView(props.schema, props.table, { name });
    else await db().updateTable(props.schema, props.table, { name });
    renameEntity(props.uid, name);
    if (!isMounted()) return;
    await reloadNav();
    if (!isMounted()) return;
    set({ ...edit, rename: false });
  });

  const removeColumn = useEvent(async (col: string) => {
    await db().removeCol(props.schema, props.table, col);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, removeColumn: null });
  });

  const renameColumn = useEvent(async (col: string, newName: string) => {
    await db().renameColumn(props.schema, props.table, col, newName);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, renameIndex: null });
  });

  const renameIndex = useEvent(async (index: string, newName: string) => {
    await db().renameIndex(props.schema, props.table, index, newName);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, renameIndex: null });
  });

  const removeIndex = useEvent(async (name: string) => {
    await db().removeIndex(props.schema, props.table, name);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, removeIndex: null });
  });

  const newPrivilege = useEvent(
    async (form: {
      role: string;
      host?: string;
      privileges: TablePrivileges;
    }) => {
      if (!db().privileges) return;
      await db().privileges?.updateTablePrivileges(
        props.schema,
        props.table,
        form.role,
        form.privileges,
        form.host,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...edit, newPrivilege: false });
    },
  );

  const onUpdatePrivileges = useEvent(
    async (roleName: string, update: TablePrivileges, host?: string) => {
      if (!db().privileges) return;
      await db().privileges?.updateTablePrivileges(
        props.schema,
        props.table,
        roleName,
        update,
        host,
      );
      if (!isMounted()) return;
      await service.reload();
      if (!isMounted()) return;
      set({ ...edit, updatePrivilege: null, updatePrivilegeHost: null });
    },
  );

  const commentIndex = useEvent(async (index: string, comment: string) => {
    await db().commentIndex!(props.schema, props.table, index, comment);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, commentIndex: null });
  });

  const commentColumn = useEvent(async (column: string, comment: string) => {
    await db().commentColumn(props.schema, props.table, column, comment);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, commentColumn: null });
  });

  const newColumn = useEvent(async (form: ColumnForm) => {
    await db().newColumn(props.schema, props.table, form);
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, newColumn: false });
  });

  const newIndex = useEvent(async (form: IndexForm) => {
    await db().newIndex(
      props.schema,
      props.table,
      form.cols,
      form.method,
      form.unique,
    );
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, newIndex: false });
  });

  const updateColumn = useMemo(() => {
    const col = state.cols?.find((c) => c.column_name === edit.updateColumn);
    if (col)
      return {
        name: col.column_name,
        default: col.column_default,
        type: col.data_type,
        comment: col.comment,
        notNull: col.not_null,
        length: col.length,
        scale: col.scale,
      } as ColumnForm;

    return null;
  }, [state.cols, edit.updateColumn]);

  const size = useService(
    () => db().tableSize(props.schema, props.table),
    [props.schema, props.table],
  );

  const onUpdateColumn = useEvent(async (form: ColumnForm) => {
    assert(updateColumn);
    const typeChanged =
      form.type !== updateColumn.type ||
      form.length !== updateColumn.length ||
      form.scale !== updateColumn.scale;
    const update = {
      name:
        form.name && form.name !== updateColumn.name ? form.name : undefined,
      default:
        (form.default || undefined) !== (updateColumn.default || undefined)
          ? form.default || null
          : undefined,
      type: typeChanged ? form.type : undefined,
      scale: typeChanged ? form.scale : undefined,
      length: typeChanged ? form.length : undefined,
      notNull:
        (form.notNull || undefined) !== (updateColumn.notNull || undefined)
          ? form.notNull
          : undefined,
      comment:
        (form.comment || undefined) !== (updateColumn.comment || undefined)
          ? form.comment || null
          : undefined,
    };
    await db().updateColumn(
      props.schema,
      props.table,
      updateColumn.name,
      update,
    );
    if (!isMounted()) return;
    await service.reload();
    if (!isMounted()) return;
    set({ ...edit, updateColumn: null });
  });

  const owner = state?.table?.tableowner ?? state?.view?.viewowner;

  const saveOwner = useEvent(() => {
    db()
      .alterTableOwner(props.schema, props.table, edit.editOwner as string)
      .then(
        () => {
          if (!isMounted()) return;
          service.reload();
          if (!isMounted()) return;
          set({ ...edit, editOwner: false });
        },
        (err) => {
          showError(err);
        },
      );
  });

  const internalRoles = useMemo(
    () =>
      service.lastValidData?.privileges?.filter((v) =>
        v.roleName.startsWith('pg_'),
      ).length,
    [service.lastValidData?.privileges],
  );

  const { roles } = currentState();

  return (
    <>
      <h1>
        {props.schema}.{props.table}
      </h1>
      <div className="table-info-frame__actions">
        <button
          type="button"
          onClick={() => set({ ...edit, editComment: true })}
        >
          Comment <i className="fa fa-file-text-o" />
        </button>{' '}
        <button
          type="button"
          onClick={() => {
            set({ ...edit, rename: true });
          }}
        >
          Rename <i className="fa fa-pencil" />
        </button>{' '}
        {edit.rename ? (
          <RenameDialog
            relativeTo="previousSibling"
            value={props.table}
            onCancel={() => set({ ...edit, rename: false })}
            onUpdate={onRename}
          />
        ) : null}
        <button
          type="button"
          onClick={() => set({ ...edit, updateSchema: true })}
        >
          Change Schema{' '}
          <i
            className="fa fa-arrow-right"
            style={{ transform: 'rotate(-45deg)' }}
          />
        </button>{' '}
        {edit.updateSchema ? (
          <ChangeSchemaDialog
            relativeTo="previousSibling"
            value={props.schema}
            onCancel={() => set({ ...edit, updateSchema: false })}
            onUpdate={onChangeSchema}
          />
        ) : null}
        <button
          type="button"
          onClick={
            edit.dropCascadeConfirmation || edit.dropConfirmation
              ? undefined
              : drop
          }
        >
          Drop{' '}
          {state.subType === 'view' || state.subType === 'mview'
            ? 'View'
            : state.subType === 'table'
              ? 'Table'
              : ''}{' '}
          <i className="fa fa-close" />
        </button>{' '}
        {edit.dropCascadeConfirmation || edit.dropConfirmation ? (
          <Dialog
            onBlur={noClick}
            relativeTo={
              edit.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
            }
          >
            {edit.dropCascadeConfirmation
              ? 'Do you really want to drop cascade this table?'
              : 'Do you really want to drop this table?'}
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
            edit.dropCascadeConfirmation || edit.dropConfirmation
              ? undefined
              : dropCascade
          }
        >
          Drop Cascade <i className="fa fa-warning" />
        </button>
      </div>

      {state.comment || edit.editComment ? (
        <Comment
          value={state.comment || ''}
          edit={edit.editComment}
          onCancel={() => set({ ...edit, editComment: false })}
          onUpdate={onUpdateComment}
        />
      ) : null}

      <div
        className="hd"
        title={
          size.lastValidData?.size === 0 &&
          (state.subType === 'view' || state.subType === 'mview')
            ? 'View'
            : undefined
        }
        style={size.status === 'starting' ? { opacity: 0.3 } : undefined}
      >
        <i
          className="fa-hdd-o fa"
          title={size.error?.message}
          style={
            size.error
              ? { color: '#e11', fontWeight: 'bold' }
              : { fontWeight: 'bold' }
          }
        />{' '}
        {size.lastValidData?.pretty}{' '}
        {size.lastValidData && size.lastValidData.size ? (
          <span
            style={{ color: '#aaa', fontWeight: 'normal' }}
            title={`${size.lastValidData.onlyTable} used by the table (including TOAST, free space map, and visibility map) + ${size.lastValidData.indexes} for indexes`}
          >
            ({size.lastValidData.onlyTable} + {size.lastValidData.indexes})
          </span>
        ) : null}
      </div>

      {owner ? (
        <div className="owner" title="OWNER">
          <i className="fa fa-user" /> <span className="name">{owner}</span>
          <i
            className="fa fa-pencil"
            onClick={() => set({ ...edit, editOwner: true })}
          />
          {edit.editOwner ? (
            <Dialog
              relativeTo="previousSibling"
              onBlur={() => set({ ...edit, editOwner: false })}
            >
              <select
                onChange={(e) => set({ ...edit, editOwner: e.target.value })}
                value={
                  typeof edit.editOwner === 'string' ? edit.editOwner : owner
                }
              >
                {roles?.map((r) => <option key={r.name}>{r.name}</option>)}
              </select>
              <div>
                <button
                  style={{ fontWeight: 'normal' }}
                  onClick={() => set({ ...edit, editOwner: false })}
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

      {(state.view && state.view.definition) ||
      (state.mView && state.mView.definition) ? (
        <div className="view">
          {(state.view && state.view.definition) ||
            (state.mView && state.mView.definition)}
        </div>
      ) : null}
      {state.cols ? (
        <>
          <h2>Columns</h2>
          {state.cols.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Default Value</th>
                  <th>Not Null</th>
                  <th>Comment</th>
                  <th>Length</th>
                  <th>Scale</th>
                  <th>Primary key</th>
                  {state.subType === 'table' ? <th colSpan={2} /> : null}
                </tr>
              </thead>
              <tbody>
                {state.cols &&
                  state.cols.map((col: ColTableInfo, i: number) => (
                    <tr key={i}>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <div style={{ flex: 1, marginRight: 10 }}>
                            {col.column_name}{' '}
                          </div>
                          {state.subType === 'table' ||
                          db().updateColumnViewName ? (
                            <div>
                              <button
                                type="button"
                                className="simple-button"
                                style={{ float: 'right' }}
                                onClick={() =>
                                  set({
                                    ...edit,
                                    renameColumn: col.column_name,
                                  })
                                }
                              >
                                Rename <i className="fa fa-pencil" />
                              </button>
                              {col.column_name === edit.renameColumn ? (
                                <RenameDialog
                                  value={col.column_name}
                                  relativeTo="previousSibling"
                                  onCancel={() =>
                                    set({ ...edit, renameColumn: null })
                                  }
                                  onUpdate={(name) =>
                                    renameColumn(col.column_name, name)
                                  }
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td>{col.data_type}</td>
                      <td
                        style={{
                          wordBreak: 'break-word',
                          fontFamily: 'Inconsolata, monospace',
                          letterSpacing: '-0.5px',
                        }}
                      >
                        {col.column_default}
                      </td>
                      <TdCheck checked={!!col.not_null} />
                      <td
                        style={{
                          wordBreak: 'break-word',
                          background: 'transparent',
                          ...(!col.comment
                            ? { textAlign: 'center' }
                            : undefined),
                        }}
                        className={!col.comment ? 'actions' : undefined}
                      >
                        {col.comment}
                        {(col.comment && state.subType === 'table') ||
                        db().updateColumnViewName ? (
                          <>
                            {' '}
                            <button
                              type="button"
                              className="simple-button"
                              onClick={() =>
                                set({ ...edit, commentColumn: col.column_name })
                              }
                              style={{ float: 'right' }}
                            >
                              <i className="fa fa-pencil" />
                            </button>
                          </>
                        ) : state.subType === 'table' ||
                          db().updateColumnViewName ? (
                          <button
                            type="button"
                            className="simple-button"
                            onClick={() =>
                              set({ ...edit, commentColumn: col.column_name })
                            }
                          >
                            Create Comment <i className="fa fa-pencil" />
                          </button>
                        ) : null}
                        {col.column_name === edit.commentColumn ? (
                          <InputDialog
                            type="textarea"
                            relativeTo="previousSibling"
                            value={col.comment || ''}
                            updateText="Update"
                            onCancel={() =>
                              set({ ...edit, commentColumn: null })
                            }
                            onUpdate={(comment) =>
                              commentColumn(col.column_name, comment)
                            }
                          />
                        ) : null}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                        }}
                      >
                        {col.length}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                        }}
                      >
                        {col.scale || null}
                      </td>
                      <TdCheck checked={col.is_primary} />
                      {state.subType === 'table' ? (
                        <td
                          className="actions"
                          style={{
                            textAlign: 'right',
                          }}
                        >
                          <button
                            type="button"
                            className="simple-button"
                            onClick={() =>
                              set({ ...edit, updateColumn: col.column_name })
                            }
                          >
                            Edit <i className="fa fa-pencil" />
                          </button>{' '}
                          {col.column_name === edit.updateColumn &&
                          updateColumn ? (
                            <ColumnFormDialog
                              column={updateColumn}
                              relativeTo="previousSibling"
                              onUpdate={onUpdateColumn}
                              onCancel={() =>
                                set({ ...edit, updateColumn: null })
                              }
                            />
                          ) : null}{' '}
                          <button
                            type="button"
                            className="simple-button"
                            onClick={() =>
                              set({ ...edit, removeColumn: col.column_name })
                            }
                          >
                            Remove <i className="fa fa-close" />
                          </button>
                          {col.column_name === edit.removeColumn ? (
                            <YesNoDialog
                              relativeTo="previousSibling"
                              question="Do you really want to remove this column?"
                              onYes={() => removeColumn(col.column_name)}
                              onNo={() => set({ ...edit, removeColumn: null })}
                            />
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              No columns found for table.{' '}
              <button
                type="button"
                className="simple-button"
                onClick={() => set({ ...edit, newColumn: true })}
              >
                Create new column <i className="fa fa-plus" />
              </button>
              {edit.newColumn ? (
                <ColumnFormDialog
                  relativeTo="previousSibling"
                  onCancel={() => set({ ...edit, newColumn: false })}
                  onUpdate={(form) => newColumn(form)}
                />
              ) : null}
            </div>
          )}
        </>
      ) : null}
      {state.cols?.length && state.subType === 'table' ? (
        <div className="actions">
          <button
            type="button"
            className="simple-button"
            onClick={() => set({ ...edit, newColumn: true })}
          >
            New <i className="fa fa-plus" />
          </button>
          {edit.newColumn ? (
            <ColumnFormDialog
              relativeTo="previousSibling"
              onCancel={() => set({ ...edit, newColumn: false })}
              onUpdate={(form) => newColumn(form)}
            />
          ) : null}
        </div>
      ) : null}
      {state.indexes && state.indexes.filter((i) => !i.pk).length ? (
        <div>
          <h2>Indexes</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Method</th>
                <th>Columns</th>
                <th>Comment</th>
                <th style={{ width: 23 }} />
                <th />
              </tr>
            </thead>
            <tbody>
              {state.indexes
                .filter((i) => !i.pk)
                .map((index, k) => (
                  <tr key={k}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>{index.name}</div>
                        <div>
                          <button
                            type="button"
                            className="simple-button"
                            style={{ float: 'right' }}
                            onClick={() =>
                              set({ ...edit, renameIndex: index.name })
                            }
                          >
                            Rename <i className="fa fa-pencil" />
                          </button>
                          {index.name === edit.renameIndex ? (
                            <RenameDialog
                              value={index.name}
                              relativeTo="previousSibling"
                              onCancel={() =>
                                set({ ...edit, renameIndex: null })
                              }
                              onUpdate={(name) => renameIndex(index.name, name)}
                            />
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td>{index.type}</td>
                    <td>
                      {index.cols.map((c: string, k2: number) => (
                        <span
                          className="column"
                          key={k2}
                          style={{
                            marginRight: 4,
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </td>
                    <td
                      style={
                        !index.comment ? { textAlign: 'center' } : undefined
                      }
                      className={!index.comment ? 'actions' : undefined}
                    >
                      {index.comment}
                      {index.comment && db().commentIndex ? (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="simple-button"
                            onClick={() =>
                              set({ ...edit, commentIndex: index.name })
                            }
                            style={{ float: 'right' }}
                          >
                            <i className="fa fa-pencil" />
                          </button>
                        </>
                      ) : db().commentIndex ? (
                        <button
                          type="button"
                          className="simple-button"
                          onClick={() =>
                            set({ ...edit, commentIndex: index.name })
                          }
                        >
                          Create Comment <i className="fa fa-pencil" />
                        </button>
                      ) : null}
                      {index.name === edit.commentIndex ? (
                        <InputDialog
                          type="textarea"
                          relativeTo="previousSibling"
                          value={index.comment || ''}
                          updateText="Update"
                          onCancel={() => set({ ...edit, commentIndex: null })}
                          onUpdate={(comment) =>
                            commentIndex(index.name, comment)
                          }
                        />
                      ) : null}
                    </td>
                    <td>
                      {index.name === edit.openIndexComment ? (
                        <Dialog
                          onBlur={() => {
                            set({ ...edit, openIndexComment: null });
                          }}
                          relativeTo="nextSibling"
                        >
                          <textarea
                            className="code"
                            value={index.definition}
                            readOnly
                            onKeyDown={(e) => {
                              if (e.key === 'Escape')
                                set({ ...edit, openIndexComment: null });
                            }}
                            ref={(el) => {
                              setTimeout(() => {
                                if (
                                  el &&
                                  // eslint-disable-next-line no-underscore-dangle
                                  !(el as { _selected?: boolean })._selected
                                ) {
                                  // eslint-disable-next-line no-underscore-dangle
                                  (el as { _selected?: boolean })._selected =
                                    true;
                                  el.select();
                                }
                              }, 10);
                            }}
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                set({ ...edit, openIndexComment: null })
                              }
                            >
                              Ok
                            </button>
                          </div>
                        </Dialog>
                      ) : null}
                      <i
                        className="fa fa-eye"
                        tabIndex={0}
                        role="button"
                        aria-label="Show"
                        onKeyDown={(e) => {
                          if (
                            e.key === ' ' ||
                            e.key === 'Enter' ||
                            e.key === 'Space'
                          )
                            set({ ...edit, openIndexComment: index.name });
                        }}
                        onClick={() =>
                          set({
                            ...edit,
                            openIndexComment: index.name,
                          })
                        }
                      />
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="simple-button"
                        onClick={() =>
                          set({ ...edit, removeIndex: index.name })
                        }
                      >
                        Remove <i className="fa fa-close" />
                      </button>
                      {index.name === edit.removeIndex ? (
                        <YesNoDialog
                          relativeTo="previousSibling"
                          question="Do you really want to remove this index?"
                          onYes={() => removeIndex(index.name)}
                          onNo={() => set({ ...edit, removeIndex: null })}
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
              onClick={() => set({ ...edit, newIndex: true })}
            >
              New <i className="fa fa-plus" />
            </button>
            {state.cols && edit.newIndex ? (
              <IndexDialog
                relativeTo="previousSibling"
                onCancel={() => set({ ...edit, newIndex: false })}
                onUpdate={(form) => newIndex(form)}
                cols={state.cols.map((c) => c.column_name)}
              />
            ) : null}
          </div>
        </div>
      ) : state.indexes && !state.view ? (
        <div>
          <h2>Indexes</h2>
          <div className="empty">
            No indexes found for table.{' '}
            <button
              type="button"
              className="simple-button"
              onClick={() => set({ ...edit, newIndex: true })}
            >
              Create new index <i className="fa fa-plus" />
            </button>
            {state.cols && edit.newIndex ? (
              <IndexDialog
                relativeTo="previousSibling"
                onCancel={() => set({ ...edit, newIndex: false })}
                onUpdate={(form) => newIndex(form)}
                cols={state.cols.map((c) => c.column_name)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {state.view ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_views</h2>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{state.view.viewowner}</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
      {state.mView ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_matviews</h2>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Table Space</th>
                <th>Has Indexes</th>
                <th>Is Populated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{state.mView.matviewowner}</td>
                <td>{state.mView.tablespace || '-'}</td>
                <td>
                  {typeof state.mView.hasindexes === 'string'
                    ? state.mView.hasindexes
                    : JSON.stringify(state.mView.hasindexes)}
                </td>
                <td>
                  {typeof state.mView.ispopulated === 'string'
                    ? state.mView.ispopulated
                    : JSON.stringify(state.mView.ispopulated)}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
      {state.constraints?.length ? (
        <>
          <h2>Constraints</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Comment</th>
                <th>Type</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              {state.constraints.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{c.comment}</td>
                  <td>{c.type}</td>
                  <td>
                    {c.definition && c.definition.startsWith(c.type)
                      ? c.definition.substring(c.type.length)
                      : c.definition}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {service.lastValidData && state.privileges && !state.privileges.length ? (
        <>
          <h2>Privileges</h2>

          <div className="empty">
            No privileges found for table.{' '}
            {service.lastValidData.privilegesTypes ? (
              <>
                <button
                  type="button"
                  className="simple-button"
                  onClick={() => set({ ...edit, newPrivilege: true })}
                >
                  Grant new privilege <i className="fa fa-plus" />
                </button>
                {state.cols && edit.newPrivilege ? (
                  <TablePrivilegesDialog
                    privilegesTypes={service.lastValidData.privilegesTypes}
                    relativeTo="previousSibling"
                    type="by_role"
                    onCancel={() => set({ ...edit, newPrivilege: false })}
                    onUpdate={(form) => newPrivilege(form)}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </>
      ) : service.lastValidData?.privileges &&
        service.lastValidData.privilegesTypes ? (
        <>
          <h2 style={{ userSelect: 'text' }}>Privileges</h2>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                {service.lastValidData.privilegesTypes.map((p) => (
                  <th style={{ width: 75 }} key={p}>
                    {p[0].toUpperCase()}
                    {p.substring(1).replace(/[A-Z]/g, ' $&')}
                  </th>
                ))}
                <th style={{ width: 62 }} />
              </tr>
            </thead>
            <tbody>
              {state.privileges
                ?.filter(
                  (r) =>
                    !edit.hideInternalRoles || !r.roleName.startsWith('pg_'),
                )
                .map((p) => (
                  <tr
                    key={p.roleName}
                    style={
                      p.roleName.startsWith('pg_')
                        ? { color: '#ccc' }
                        : undefined
                    }
                  >
                    <td>
                      {p.roleName}
                      {p.host ? '@' : ''}
                      {p.host}
                    </td>
                    {service.lastValidData!.privilegesTypes!.map((t) => (
                      <TdCheck checked={!!p.privileges[t]} key={t} />
                    ))}
                    <td className="actions">
                      <button
                        type="button"
                        className="simple-button"
                        onClick={() => {
                          set({
                            ...edit,
                            updatePrivilege: p.roleName,
                            updatePrivilegeHost: p.host,
                          });
                        }}
                      >
                        Edit <i className="fa fa-pencil" />
                      </button>
                      {edit.updatePrivilege === p.roleName &&
                      edit.updatePrivilegeHost === p.host ? (
                        <TablePrivilegesDialog
                          relativeTo="previousSibling"
                          privilegesTypes={
                            service.lastValidData!.privilegesTypes!
                          }
                          privileges={p.privileges}
                          type="by_role"
                          onUpdate={(e) =>
                            onUpdatePrivileges(p.roleName, e.privileges, p.host)
                          }
                          onCancel={() =>
                            set({
                              ...edit,
                              updatePrivilege: null,
                              updatePrivilegeHost: null,
                            })
                          }
                          roleName={
                            p.host ? `${p.roleName}@${p.host}` : p.roleName
                          }
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
              <TablePrivilegesDialog
                privilegesTypes={service.lastValidData.privilegesTypes}
                relativeTo="previousSibling"
                onCancel={() => set({ ...edit, newPrivilege: false })}
                onUpdate={(form) => newPrivilege(form)}
                type="by_role"
              />
            ) : null}
          </div>
        </>
      ) : null}
      {state.table ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_tables</h2>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Table Space</th>
                <th>Has Indexes</th>
                <th>Has Rules</th>
                <th>Has Triggers</th>
                <th>Row Security</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{state.table.tableowner}</td>
                <td>{state.table.tablespace || '-'}</td>
                <td>
                  <strong>
                    {typeof state.table.hasindexes === 'string'
                      ? state.table.hasindexes
                      : JSON.stringify(state.table.hasindexes)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {typeof state.table.hasrules === 'string'
                      ? state.table.hasrules
                      : JSON.stringify(state.table.hasrules)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {typeof state.table.hastriggers === 'string'
                      ? state.table.hastriggers
                      : JSON.stringify(state.table.hastriggers)}
                  </strong>
                </td>
                <td>
                  <strong>
                    {typeof state.table.rowsecurity === 'string'
                      ? state.table.rowsecurity
                      : JSON.stringify(state.table.rowsecurity)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
      {state.type ? (
        <>
          <h2 style={{ userSelect: 'text' }}>pg_catalog.pg_type</h2>
          <div className="fields">
            {Object.entries(state.type).map(([k, v]) => (
              <div key={k} className="field">
                <strong>{k.startsWith('typ') ? k.substring(3) : k}:</strong>{' '}
                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {/*
        <h2>Triggers</h2>
        <table>
            <thead>
            <tr>
                <th>Name</th>
                <th>...</th>
            </tr>
            </thead>
        </table> */}
      {service?.error?.message && (
        <div className="error-message">
          <i className="fa fa-exclamation-triangle" />
          {service.error.message}
        </div>
      )}
    </>
  );
}
