import { PoolConnection } from 'mysql2';
import { PoolConnection as PoolConnectionP } from 'mysql2/promise';
import {
  Notice,
  QueryExecutor,
  QueryResult,
  QueryResultDataField,
  SimpleValue,
} from 'types';
import { assert } from 'util/assert';
import { grantError } from 'util/errors';
import hotLoadSafe from 'util/hotLoadSafe';
import { execute } from './mysql';
import { openIds } from './mysqlDb';

const fetchSize = 500;
export function newQueryExecutor(
  _onNotice: (n: Notice) => void,
  onPid: (pid: number | null) => void,
  // _onError: (e: Error) => void,
): QueryExecutor {
  const pool = hotLoadSafe.mysql;
  assert(pool);
  let pid: number | null = null;
  let conP: Promise<PoolConnectionP> | null = null;
  async function openCon() {
    assert(pool);
    if (!conP) conP = pool.getConnection();
    const con = await conP;
    if (pid !== con.threadId) {
      pid = con.threadId;
      openIds.add(pid);
      onPid(con.threadId);
    }
    return con.connection as unknown as PoolConnection;
  }
  let prev: any;
  return {
    async query(q: string): Promise<QueryResult> {
      const con = await openCon();
      if (prev) {
        prev.resume();
      }
      return new Promise((resolve, reject) => {
        const queryExecution = con.query({
          sql: q,
          rowsAsArray: true,
        });
        const data: SimpleValue[][] = [];
        let resolved = false;
        const stream = queryExecution.stream();
        prev = stream;
        let fields: QueryResultDataField[] | null = null;
        stream.on('data', (row: SimpleValue[]) => {
          if (resolved) return;
          // eslint-disable-next-line no-underscore-dangle
          const dataFields = (
            queryExecution as { _fields?: { name: string; type: number }[][] }
          )._fields;
          if (dataFields && dataFields.length) {
            fields =
              dataFields[dataFields.length - 1].map((f) => ({
                name: f.name,
                type:
                  f.type === 7 || (f.type && f.type >= 10 && f.type < 14)
                    ? 'date'
                    : undefined,
              })) || [];
          }
          data.push(row);
          if (data.length % fetchSize === 0) {
            resolved = true;
            stream.pause();
            const fetchMoreRows: () => Promise<{
              rows: SimpleValue[][];
              fields: QueryResultDataField[];
              rowCount: number;
            }> = () => {
              return new Promise<{
                rows: SimpleValue[][];
                fields: QueryResultDataField[];
                rowCount: number;
                fetchMoreRows?: () => Promise<{
                  rows: SimpleValue[][];
                  fields: QueryResultDataField[];
                  rowCount: number;
                }>;
              }>((_resolve, _reject) => {
                let resolved2 = false;
                stream.resume();
                stream.on('data', (row2: SimpleValue[]) => {
                  if (resolved2) return;
                  data.push(row2);
                  if (data.length % fetchSize === 0) {
                    stream.pause();
                    resolved2 = true;
                    _resolve({
                      fields: fields || [],
                      rows: [...data],
                      rowCount: 0,
                      fetchMoreRows,
                    });
                  }
                });
                stream.on('end', () => {
                  if (resolved2) return;
                  _resolve({
                    fields: fields || [],
                    rows: [...data],
                    rowCount: 0,
                  });
                });

                stream.on('error', (error) => {
                  _reject(grantError(error));
                });
              });
            };
            resolve({
              rows: [...data],
              fields: fields || [],
              rowCount: 0,
              fetchMoreRows,
            });
          }
        });
        stream.on('end', () => {
          if (resolved) return;
          resolve({
            rows: [...data],
            fields: fields || [],
            rowCount: 0,
          });
        });

        stream.on('error', (error) => {
          reject(grantError(error));
        });
      });
      /*
        const all = await qe;
        const [rows, fields] = all;
        return {
          rows: rows instanceof Array ? (rows as SimpleValue[][]) : [],
          fields:
            fields?.map((f) => ({
              name: f.name,
              type:
                f.columnType === 7 ||
                (f.columnType && f.columnType >= 10 && f.columnType < 14)
                  ? 'date'
                  : undefined,
            })) || [],
          rowCount: 0,
        };
        */
    },
    async stopRunningQuery() {
      if (prev) {
        prev.resume();
      }
      if (pid) await execute(`KILL QUERY ${pid}`);
      if (pid) openIds.delete(pid);
      // mysql allows the reuse of transactions after errors or kills
      // if (conP) {
      //   try {
      //     const con = await conP;
      //     con.release();
      //   } finally {
      //     conP = null;
      //     if (pid) {
      //       onPid(null);
      //       openIds.delete(pid);
      //     }
      //   }
      // }
    },
    async destroy() {
      if (prev) {
        prev.resume();
      }
      if (pid) await execute(`KILL QUERY ${pid}`);
      if (conP) {
        try {
          const con = await conP;
          con.release();
        } finally {
          conP = null;
          if (pid) {
            onPid(null);
            openIds.delete(pid);
          }
        }
      }
    },
  };
}
