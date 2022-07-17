import { useService } from 'util/useService';
import { throwError } from 'util/throwError';
import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog/Dialog';
import { YesNoDialog } from 'components/util/Dialog/YesNoDialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { Comment } from 'components/util/Comment';
import { TableInfoFrameProps } from '../../types';
import {
  reloadNav,
  closeTab,
  renameEntity,
  changeSchema,
} from '../../state/actions';
import { DB } from '../../db/DB';
import { ChangeSchemaDialog } from '../util/Dialog/ChangeSchemaDialog';

export interface ColTableInfo {
  column_name: string;
  data_type: string;
  column_default: string;
  is_nullable: boolean | string;
  comment: string;
  length: number;
  scale: number;
  is_primary: boolean;
}

export interface TableInfoFrameState {
  comment: string | null;
  cols?: ColTableInfo[];
  indexes?: {
    name: string;
    definition: string;
    comment: string;
    type: string;
    pk: boolean;
    cols: string[];
  }[];
  table: {
    tableowner: string;
    tablespace: string;
    hasindexes: boolean;
    hasrules: boolean;
    hastriggers: boolean;
    rowsecurity: boolean;
    uid: number;
    view_definition: string | null;
  } | null;
  view: {
    viewowner: string;
    definition: string;
  } | null;
  mView: {
    viewowner: string;
    matviewowner: string;
    tablespace: string;
    hasindexes: boolean;
    ispopulated: boolean;
    definition: string;
  } | null;
  type: {
    [k: string]: string | number | null | boolean;
  };
}

export function TableInfoFrame(props: TableInfoFrameProps) {
  const service = useService(async () => {
    const [comment, cols, indexes, table, view, mView, type] =
      await Promise.all([
        DB.tableComment(props.schema, props.table),
        DB.listCols(props.schema, props.table),
        DB.listIndexes(props.schema, props.table),
        DB.pgTable(props.schema, props.table),
        DB.pgView(props.schema, props.table),
        DB.pgMView(props.schema, props.table),
        DB.pgType(props.schema, props.table),
      ]);
    return {
      comment,
      cols,
      indexes,
      table,
      view,
      type,
      mView,
    } as TableInfoFrameState;
  }, []);

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
  });

  const onUpdateComment = useEvent(async (text: string) => {
    if (state.table)
      await DB.updateTable(props.schema, props.table, { comment: text });
    else if (state.mView)
      await DB.updateMView(props.schema, props.table, { comment: text });
    else if (state.view)
      await DB.updateView(props.schema, props.table, { comment: text });
    await service.reload();
    set({ ...edit, editComment: false });
  });

  const onChangeSchema = useEvent(async (schema: string) => {
    if (state.table)
      await DB.updateTable(props.schema, props.table, { schema });
    else if (state.mView)
      await DB.updateMView(props.schema, props.table, { schema });
    else if (state.view)
      await DB.updateView(props.schema, props.table, { schema });
    changeSchema(props.uid, schema);
    reloadNav();
    set({ ...edit, updateSchema: false });
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
      DB.dropTable(props.schema, props.table, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    else
      DB.dropTable(props.schema, props.table).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  });

  const noClick = useEvent(() => {
    set({
      ...edit,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const [state2, setState2] = useState({ indexDefinition: null } as {
    indexDefinition: string | null;
  });

  const onRename = useEvent(async (name: string) => {
    if (state.table) await DB.updateTable(props.schema, props.table, { name });
    else if (state.mView)
      await DB.updateMView(props.schema, props.table, { name });
    else if (state.view)
      await DB.updateView(props.schema, props.table, { name });
    renameEntity(props.uid, name);
    reloadNav();
    set({ ...edit, rename: false });
  });

  const removeColumn = useEvent(async (col: string) => {
    await DB.removeCol(props.schema, props.table, col);
    await service.reload();
    set({ ...edit, removeColumn: null });
  });

  const renameColumn = useEvent(async (col: string, newName: string) => {
    await DB.renameColumn(props.schema, props.table, col, newName);
    await service.reload();
    set({ ...edit, renameIndex: null });
  });

  const renameIndex = useEvent(async (index: string, newName: string) => {
    await DB.renameIndex(props.schema, props.table, index, newName);
    await service.reload();
    set({ ...edit, renameIndex: null });
  });

  const removeIndex = useEvent(async (name: string) => {
    await DB.removeIndex(props.schema, props.table, name);
    await service.reload();
    set({ ...edit, removeIndex: null });
  });

  function showQuery(q: string) {
    setState2({
      indexDefinition: q,
    });
  }

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
          Drop {state.view ? 'View' : state.table ? 'Table' : ''}{' '}
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
                  {state.table ? <th /> : null}
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
                          <div>
                            <button
                              type="button"
                              className="simple-button"
                              style={{ float: 'right' }}
                              onClick={() =>
                                set({ ...edit, renameColumn: col.column_name })
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
                        </div>
                      </td>
                      <td>{col.data_type}</td>
                      <td>{col.column_default}</td>
                      <td style={{ textAlign: 'center' }}>
                        {col.is_nullable === 'YES' ? (
                          <strong>yes</strong>
                        ) : (
                          'no'
                        )}
                      </td>
                      <td>{col.comment}</td>
                      <td>{col.length}</td>
                      <td>{col.scale || null}</td>
                      <td style={{ textAlign: 'center' }}>
                        {col.is_primary ? <strong>yes</strong> : 'no'}
                      </td>
                      {state.table ? (
                        <td className="actions">
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
            <div className="empty">No columns found for table.</div>
          )}
        </>
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
                        <div style={{ flex: 1 }}>{index.name} </div>
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
                        <span className="column" key={k2}>
                          {c}
                        </span>
                      ))}
                    </td>
                    <td>{index.comment}</td>
                    <td>
                      {index.name === state2.indexDefinition ? (
                        <Dialog
                          onBlur={() => {
                            setState2({ indexDefinition: null });
                          }}
                          relativeTo="nextSibling"
                        >
                          <textarea
                            className="code"
                            value={index.definition}
                            readOnly
                            onKeyDown={(e) => {
                              if (e.key === 'Escape')
                                setState2({ indexDefinition: null });
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
                                setState2({ indexDefinition: null })
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
                            showQuery(index.name);
                        }}
                        onClick={() => showQuery(index.name)}
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
          <div />
        </div>
      ) : state.indexes ? (
        <div>
          <h2>Indexes</h2>
          <div className="empty">No indexes found for table.</div>
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
            <h2>Constraints</h2>
            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>...</th>
                </tr>
                </thead>
            </table>
            <h2>Rules</h2>
            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>...</th>
                </tr>
                </thead>
            </table>
            <h2>Triggers</h2>
            <table>
                <thead>
                <tr>
                    <th>Name</th>
                    <th>...</th>
                </tr>
                </thead>
            </table> */}
    </>
  );
}
