import { useService } from 'util/useService';
import { throwError } from 'util/throwError';
import { useEffect, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog';
import { grantError } from 'util/errors';
import assert from 'assert';
import { currentState } from 'state/state';
import { TableInfoFrameProps } from '../../types';
import {
  reloadNav,
  closeTab,
  renameEntity,
  changeSchema,
} from '../../state/actions';
import { DB } from '../../db/DB';

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

export function Comment({
  value,
  edit,
  onUpdate,
  onCancel,
}: {
  value: string;
  edit: boolean;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState(value);
  useEffect(() => {
    setState(value);
  }, [value, setState, edit]);
  const focusRef = useEvent((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });
  if (!value && !edit) return null;
  if (edit)
    return (
      <div className="comment--form">
        <textarea
          className="comment"
          value={state}
          onChange={(e) => setState(e.target.value)}
          ref={focusRef}
        />
        <button type="button" onClick={() => onUpdate(state)}>
          Save <i className="fa fa-check" />
        </button>
        <button
          type="button"
          onClick={() => onCancel()}
          style={{ fontWeight: 'normal' }}
        >
          Discard Changes <i className="fa fa-undo" />
        </button>
      </div>
    );
  return (
    <div
      className="comment"
      style={
        value && value.length < 35 && value.indexOf('\n') === -1
          ? { fontSize: '45px' }
          : undefined
      }
    >
      {value}
    </div>
  );
}

export function InputDialog({
  value,
  onUpdate,
  onCancel,
  relativeTo,
  updateText,
  type,
  options,
}: {
  value: string;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
  updateText: string;
  type?: 'text' | 'number';
  options?: string[];
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  const [state, setState] = useState(value);
  const [error, setError] = useState<Error | null>(null);
  const focusRef = useEvent((el: HTMLInputElement | null) => {
    if (el) {
      setTimeout(() => {
        el.focus();
        if (type !== 'number')
          el.setSelectionRange(el.value.length, el.value.length);
      }, 10);
    }
  });
  return (
    <Dialog relativeTo={relativeTo} onBlur={onCancel}>
      {error ? (
        <div className="dialog-error">
          <div className="dialog-error--main">
            <div className="dialog-error--message">{error.message}</div>
          </div>
          <div className="dialog-error--buttons">
            <button
              onClick={() => setError(null)}
              type="button"
              style={{
                padding: '6px 14px !important',
                boxShadow: 'none',
              }}
            >
              Ok
            </button>
          </div>
        </div>
      ) : null}
      {options ? (
        <select value={state} onChange={(e) => setState(e.target.value)}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type || 'text'}
          ref={focusRef}
          value={state}
          onChange={(e) => setState(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onCancel();
            } else if (e.key === 'Enter') {
              if (state === value) onCancel();
              else onUpdate(state).catch((err) => setError(grantError(err)));
            }
          }}
        />
      )}
      <button style={{ fontWeight: 'normal' }} type="button" onClick={onCancel}>
        Cancel
      </button>{' '}
      <button
        type="button"
        disabled={state === value}
        onClick={
          state === value
            ? undefined
            : () => {
                onUpdate(state).catch((e) => setError(grantError(e)));
              }
        }
      >
        {updateText} <i className="fa fa-check" />
      </button>
    </Dialog>
  );
}

export function Rename({
  value,
  onUpdate,
  onCancel,
  relativeTo,
}: {
  value: string;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  return (
    <InputDialog
      value={value}
      onUpdate={onUpdate}
      onCancel={onCancel}
      relativeTo={relativeTo}
      updateText="Rename"
    />
  );
}

export function ChangeSchema({
  value,
  onUpdate,
  onCancel,
  relativeTo,
}: {
  value: string;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  const appState = currentState();
  assert(appState.schemas);
  const schemas = appState.schemas.map((s) => s.name);
  return (
    <InputDialog
      value={value}
      onUpdate={onUpdate}
      onCancel={onCancel}
      options={schemas}
      relativeTo={relativeTo}
      updateText="Update"
    />
  );
}
export interface TableInfoFrameState {
  comment: string | null;
  cols?: ColTableInfo[];
  indexes?: {
    name: string;
    definition: string;
    type: string;
    pk: boolean;
    cols: {
      column_name: string;
      data_type: string;
      column_default: string;
      is_nullable: boolean | string;
      comment: string;
      length: number;
      view_definition: string | null;
      scale: number;
      is_primary: boolean;
    }[];
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

export function YesNoDialog({
  relativeTo,
  onYes,
  onNo,
  question,
}: {
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
  onYes: () => Promise<void>;
  onNo: () => void;
  question: string;
}) {
  const [state, setState] = useState({
    executing: false,
    error: null as Error | null,
  });
  const onYesClick = useEvent(async () => {
    setState({ executing: true, error: null });
    try {
      await onYes();
    } catch (e) {
      setState({
        executing: false,
        error: grantError(e),
      });
    }
  });
  return (
    <Dialog
      onBlur={onNo}
      relativeTo={relativeTo}
      className={state.executing ? 'executing' : ''}
    >
      {state.error ? (
        <div className="dialog-error">
          <div className="dialog-error--main">
            <div className="dialog-error--message">{state.error.message}</div>
          </div>
          <div className="dialog-error--buttons">
            <button
              onClick={() => setState({ error: null, executing: false })}
              type="button"
              style={{
                padding: '6px 14px !important',
                boxShadow: 'none',
              }}
            >
              Ok
            </button>
          </div>
        </div>
      ) : null}
      {question}
      <div>
        <button
          type="button"
          onClick={onYesClick}
          disabled={state.executing || !!state.error}
        >
          Yes
        </button>{' '}
        <button
          type="button"
          onClick={onNo}
          disabled={state.executing || !!state.error}
        >
          No
        </button>
      </div>
    </Dialog>
  );
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
          <Rename
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
          <ChangeSchema
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
                      <td>{col.column_name}</td>
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
                <th style={{ width: 23 }} />
                <th />
              </tr>
            </thead>
            <tbody>
              {state.indexes
                .filter((i) => !i.pk)
                .map((index, k) => (
                  <tr key={k}>
                    <td>{index.name}</td>
                    <td>{index.type}</td>
                    <td>
                      {index.cols.map((c: ColTableInfo, k2: number) => (
                        <span className="column" key={k2}>
                          {JSON.stringify(c)}
                        </span>
                      ))}
                    </td>
                    <td>
                      {index.name === state2.indexDefinition ? (
                        <Dialog
                          onBlur={() => {
                            setState2({ indexDefinition: null });
                          }}
                          relativeTo="nextSibling"
                        >
                          <textarea
                            value={index.definition}
                            readOnly
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
          <h2>pg_catalog.pg_table</h2>
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
          <h2>pg_catalog.pg_type</h2>
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
