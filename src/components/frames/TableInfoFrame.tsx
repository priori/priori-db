import { useState, useEffect } from 'react';
import { TableInfoFrameProps } from '../../types';
import { Connection } from '../../db/Connection';
import { closeTab } from '../../actions';
import { reloadNav, throwError } from '../../state';
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
  const [state, setState] = useState({} as TableInfoFrameState);

  useEffect(() => {
    // DB.listCols(this.props.schema,this.props.table).then(r=>console.log(r))
    DB.listCols2(props.schema, props.table).then((res) => {
      // console.log(res)
      // AND udt_catalog = '${baseName}'
      setState((state2) => ({
        ...state2,
        cols: res,
      }));
    });
    DB.listIndexes(props.schema, props.table).then((res) =>
      setState({ indexes: res })
    );
    // DB.listTableMetadata(this.props.schema,this.props.table).then(res=>console.log('meta:',res))
  }, [props.schema, props.table]);

  function dropCascade() {
    if (window.confirm('Do you really want to drop cascade this table?'))
      Connection.query(
        `DROP TABLE "${props.schema}"."${props.table}" CASCADE`
      ).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  }

  function drop() {
    if (window.confirm('Do you really want to drop this table?'))
      Connection.query(`DROP TABLE "${props.schema}"."${props.table}"`).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  }

  // eslint-disable-next-line class-methods-use-this
  function showQuery(query: string) {
    alert(query);
  }

  return (
    <>
      <h1>
        {props.schema}.{props.table}
      </h1>
      <div>
        <button type="button" onClick={() => drop()}>
          Drop Table
        </button>{' '}
        <button type="button" onClick={() => dropCascade()}>
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
                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
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
