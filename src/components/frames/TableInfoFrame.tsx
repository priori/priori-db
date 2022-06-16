import { useService } from 'util/useService';
import { throwError } from 'util/throwError';
import { KeyboardEvent, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { TableInfoFrameProps } from '../../types';
import { reloadNav, closeTab } from '../../actions';
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
}
export function TableInfoFrame(props: TableInfoFrameProps) {
  const service = useService(async () => {
    const [cols, indexes] = await Promise.all([
      DB.listCols(props.schema, props.table),
      DB.listIndexes(props.schema, props.table),
      // DB.listTableMetadata(this.props.schema,this.props.table).then(res=>console.log('meta:',res))
    ]);
    return { cols, indexes } as TableInfoFrameState;
  }, []);
  const state = service.lastValidData || { indexes: null, cols: null };

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

  function showQuery(q: string) {
    alert(q);
  }

  return (
    <>
      <h1>
        {props.schema}.{props.table}
      </h1>
      {dropState.dropCascadeConfirmation || dropState.dropConfirmation ? (
        <div
          className="dialog"
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          tabIndex={0}
          ref={(el) => {
            if (el) el.focus();
          }}
          onBlur={(e) => {
            const dialogEl = e.currentTarget;
            setTimeout(() => {
              if (dialogEl.contains(document.activeElement)) return;
              noClick();
            }, 1);
          }}
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
        </div>
      ) : null}
      <div>
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
        <br />
        <br />
      </div>
      <h2>Columns</h2>
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
                  {col.is_nullable === 'YES' ? <strong>yes</strong> : 'no'}
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
      {state.indexes && state.indexes.filter((i) => !i.pk).length ? (
        <div>
          <h2>Indexes</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Method</th>
                <th>Columns</th>
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
                            showQuery(index.definition);
                        }}
                        onClick={() => showQuery(index.definition)}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div />
        </div>
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
