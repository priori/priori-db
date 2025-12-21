import { PoolConnection } from 'mysql2';
import { QueryResultData, QueryResultDataField, SimpleValue } from 'types';
import { assert } from 'util/assert';
import { grantError } from 'util/errors';
import hotLoadSafe from 'util/hotLoadSafe';

const fetchSize = 500;
export async function selectExecution(
  sql: string,
  params: SimpleValue[],
): Promise<QueryResultData> {
  const pool = hotLoadSafe.mysql;
  assert(pool);
  const con0 = await pool.getConnection();
  let conError: unknown;
  con0.on('error', (err2) => {
    conError = err2;
  });
  const con = con0.connection as unknown as PoolConnection;
  try {
    const queryExecution2 = con.query({
      sql,
      values: params,
      rowsAsArray: true,
    });
    // besides type especification
    // queryExecution2 can be undefined here in same cases
    if (conError) {
      throw grantError(conError);
    }
    if (!queryExecution2) {
      throw new Error('Query execution failed!');
    }
    let currentFields: QueryResultDataField[] | null = null;
    const fields = () => {
      if (currentFields) return currentFields;
      // eslint-disable-next-line no-underscore-dangle
      const dataFields = (
        queryExecution2 as {
          _fields?: { name: string; type: number }[][];
        }
      )._fields;
      if (dataFields && dataFields.length) {
        currentFields =
          dataFields[dataFields.length - 1]?.map((f) => ({
            name: f.name,
            type:
              f.type === 7 || (f.type && f.type >= 10 && f.type < 14)
                ? 'date'
                : undefined,
          })) || [];
        return currentFields;
      }
      return null;
    };
    const data: SimpleValue[][] = [];
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      con0.destroy();
    };
    const stream = queryExecution2.stream();
    return new Promise((resolve, reject) => {
      let ended = false;
      let resolved = false;
      try {
        stream.on('data', (row: SimpleValue[]) => {
          if (resolved) return;
          fields();
          data.push(row);
          if (data.length % fetchSize === 0) {
            resolved = true;
            stream.pause();
            const fetchMoreRows: () => Promise<QueryResultData> = () => {
              if (ended) {
                release();
                return Promise.resolve({
                  fields: fields() || [],
                  rows: [...data],
                });
              }
              return new Promise<QueryResultData>((_resolve, _reject) => {
                let resolved2 = false;
                stream.resume();
                const prevSize = data.length;
                stream.on('data', (row2: SimpleValue[]) => {
                  if (resolved2) return;
                  data.push(row2);
                  if (data.length % fetchSize === 0) {
                    stream.pause();
                    resolved2 = true;
                    if (data.length < prevSize + fetchSize) release();
                    _resolve({
                      fields: fields() || [],
                      rows: [...data],
                      fetchMoreRows:
                        data.length < prevSize + fetchSize
                          ? undefined
                          : fetchMoreRows,
                      release,
                    });
                  }
                });
                stream.on('end', () => {
                  release();
                  if (resolved2) return;
                  resolved2 = true;
                  _resolve({
                    fields: fields() || [],
                    rows: [...data],
                  });
                });

                stream.on('error', (error) => {
                  release();
                  if (resolved2) return;
                  resolved2 = true;
                  _reject(grantError(error));
                });
              });
            };
            resolve({
              rows: [...data],
              fields: fields() || [],
              fetchMoreRows:
                data.length < fetchSize ? undefined : fetchMoreRows,
              release,
            });
          }
        });
        stream.on('end', () => {
          release();
          ended = true;
          if (resolved) return;
          resolve({
            rows: [...data],
            fields: fields() || [],
          });
        });
        stream.on('error', (error) => {
          release();
          reject(grantError(error));
        });
      } catch (error) {
        release();
        reject(grantError(error));
      }
    });
  } catch (error) {
    con0.destroy();
    throw grantError(error);
  }
}
