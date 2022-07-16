import { useService } from 'util/useService';
import { throwError } from 'util/throwError';
import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useTab } from 'components/main/connected/ConnectedApp';
import { Dialog } from 'components/util/Dialog';
import { TableInfoFrameProps } from '../../types';
import { reloadNav, closeTab } from '../../state/actions';
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

export interface TableInfoFrameState {
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
  };
  type: {
    [k: string]: string | number | null | boolean;
  };
}
export function TableInfoFrame(props: TableInfoFrameProps) {
  const service = useService(async () => {
    const [cols, indexes, table, type] = await Promise.all([
      DB.listCols(props.schema, props.table),
      DB.listIndexes(props.schema, props.table),
      DB.pgTable(props.schema, props.table),
      DB.pgType(props.schema, props.table),
      // DB.listTableMetadata(this.props.schema,this.props.table).then(res=>console.log('meta:',res))
    ]);
    return { cols, indexes, table, type } as TableInfoFrameState;
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
  };

  const [dropState, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
  });
  const dropCascade = useEvent(() => {
    set({
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    if (dropState.dropCascadeConfirmation)
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
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  const [state2, setState2] = useState({ indexDefinition: null } as {
    indexDefinition: string | null;
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
          onClick={
            dropState.dropCascadeConfirmation || dropState.dropConfirmation
              ? undefined
              : drop
          }
        >
          Drop Table
        </button>{' '}
        {dropState.dropCascadeConfirmation || dropState.dropConfirmation ? (
          <Dialog
            onBlur={noClick}
            relativeTo={
              dropState.dropCascadeConfirmation
                ? 'nextSibling'
                : 'previousSibling'
            }
          >
            {dropState.dropCascadeConfirmation
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
            dropState.dropCascadeConfirmation || dropState.dropConfirmation
              ? undefined
              : dropCascade
          }
        >
          Drop Cascade
        </button>
      </div>
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
