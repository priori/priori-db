import { assert } from 'util/assert';
import { FieldDef, PoolClient } from 'pg';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { useEffect, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { CopyStreamQuery, CopyToStreamQuery } from 'pg-copy-streams';
import { grantError } from 'util/errors';
import PgCursor from 'pg-cursor';
import { openConnection, SimpleValue } from './Connection';
import { DB } from './DB';

function isMultipleQueries(q: string) {
  let inString = false;
  let semicolon = false;
  for (const c of q) {
    if (semicolon) {
      if (c !== ' ' && c !== '\n' && c !== '\t') return true;
    } else {
      if (c === "'") inString = !inString;
      if (c === ';' && !inString) semicolon = true;
    }
  }
  return false;
}

const fetchSize = 500;

class ExclusiveConnection {
  db: PoolClient | null = null;

  public pid: number | undefined;

  pending: {
    resolve: (
      r:
        | {
            rows: SimpleValue[][];
            fields: FieldDef[];
            rowCount: number;
          }
        | CopyStreamQuery,
    ) => void;
    reject: (e: unknown) => void;
    query: string | CopyToStreamQuery | CopyStreamQuery;
    args?: Array<string | number | null | boolean>;
  }[] = [];

  listener: (n: NoticeMessage) => void;

  onPid: (pid: number | null) => void;

  onError: (err: Error) => void;

  constructor(
    onNotice: (n: NoticeMessage) => void,
    onPid: (pid: number | null) => void,
    onError: (e: Error) => void,
  ) {
    this.listener = onNotice;
    this.onPid = onPid;
    this.onError = onError;
  }

  async stopRunningQuery(): Promise<void> {
    if (this.pid) await DB.cancelBackend(this.pid);
  }

  lastCursor: PgCursor | null = null;

  async query(
    q: string,
    args: (number | string | boolean | null)[] | undefined,
  ): Promise<{
    rows: SimpleValue[][];
    fields: FieldDef[];
    rowCount: number;
    fetchMoreRows?: () => Promise<{
      rows: SimpleValue[][];
      fields: FieldDef[];
      rowCount: number;
    }>;
  }>;

  async query(q: CopyToStreamQuery): Promise<CopyToStreamQuery>;

  async query(q: CopyStreamQuery): Promise<CopyStreamQuery>;

  async query(
    q: string | CopyToStreamQuery | CopyStreamQuery,
    args?: (number | string | boolean | null)[],
  ) {
    if (this.lastCursor) {
      await this.lastCursor.close();
      this.lastCursor = null;
    }
    if (this.db) {
      if (q && !(typeof q === 'string')) {
        const r = this.db.query(q);
        return Promise.resolve(r as CopyToStreamQuery | CopyStreamQuery);
      }
      if (isMultipleQueries(q)) {
        const res = this.db.query({
          text: q as string,
          rowMode: 'array',
          values: args,
        });
        return res;
      }
      const c = this.db.query(
        new PgCursor(q as string, args, { rowMode: 'array' }),
      );
      this.lastCursor = c;
      if ('state' in c && c.state === 'error') {
        await c.close();
        // eslint-disable-next-line no-underscore-dangle
        throw grantError('_error' in c ? c._error : c);
      }
      return new Promise((resolve, reject) => {
        c.read(fetchSize, (err: unknown, rows: SimpleValue[][]) => {
          if (err) {
            this.lastCursor = c;
            // eslint-disable-next-line promise/no-promise-in-callback
            c.close().then(() => reject(grantError(err)));
            return;
          }
          const ret = {
            rows,
            // eslint-disable-next-line no-underscore-dangle
            fields: (c as any)._result.fields as FieldDef[],
            // eslint-disable-next-line no-underscore-dangle
            rowCount: (c as any)._result.rowCount,
            fetchMoreRows:
              rows.length === fetchSize
                ? () => {
                    return new Promise<{
                      rows: SimpleValue[][];
                      fields: FieldDef[];
                      rowCount: number;
                    }>((_resolve, _reject) => {
                      c.read(
                        fetchSize,
                        (err2: unknown, newRows: SimpleValue[][]) => {
                          if (err2) {
                            c.close();
                            this.lastCursor = null;
                            _reject(grantError(err2));
                            return;
                          }
                          ret.rows = [...ret.rows, ...newRows];
                          ret.fetchMoreRows =
                            newRows.length === fetchSize
                              ? ret.fetchMoreRows
                              : undefined;
                          _resolve({
                            ...ret,
                          });
                        },
                      );
                    });
                  }
                : undefined,
          };
          resolve({ ...ret });
        });
      });
      /* */
    }
    return new Promise((resolve, reject) => {
      this.pending.push({
        resolve,
        reject,
        query: q,
        args,
      });
      if (this.pending.length === 1) this.openConnection();
    });
  }

  private async openConnection() {
    const { pending } = this;
    try {
      const db = await openConnection();
      const result = await db.query({
        text: 'SELECT pg_backend_pid()',
        rowMode: 'array',
      });
      const pid = result.rows[0][0];
      this.pid = pid as number;
      this.onPid(this.pid);
      this.db = db;
      this.db.on('notice', this.listener);
      this.db.on('error', (err) => {
        this.onPid(null);
        this.onError(err);
      });
    } catch (err) {
      for (const { reject } of pending) {
        reject(err);
      }
      return;
    } finally {
      this.pending = [];
    }
    for (const e of pending) {
      assert(!!this.db);
      if (e.query && !(typeof e.query === 'string')) {
        try {
          const ret: CopyStreamQuery = (await this.db.query(
            e.query,
          )) as unknown as CopyStreamQuery;
          e.resolve(ret);
        } catch (err) {
          e.reject(err);
        }
      } else {
        try {
          const ret = await this.query(e.query as string, e.args);
          e.resolve(ret);
        } catch (err) {
          e.reject(err);
        }
      }
    }
  }
}

export const exclusives = [] as ExclusiveConnection[];
export function useExclusiveConnection(
  onNotice: (a: NoticeMessage) => void,
  onPid: (pid: number | null) => void,
  onClientError: (e: Error) => void,
): [ExclusiveConnection, () => void] {
  const onNotice2 = useEvent(onNotice);
  const onPid2 = useEvent(onPid);
  const onClientError2 = useEvent(onClientError);
  const [client, setClient] = useState(
    () => new ExclusiveConnection(onNotice2, onPid2, onClientError2),
  );
  const destroy = useEvent(() => {
    if (client.pid) {
      client.stopRunningQuery().then(() => {
        exclusives.splice(exclusives.indexOf(client), 1);
        client.db?.release(true);
      });
      return;
    }
    exclusives.splice(exclusives.indexOf(client), 1);
    client.db?.release(true);
  });
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    else exclusives.push(client);
    return () => {
      timeout.current = setTimeout(destroy, 10);
    };
  }, [client, destroy]);
  return [
    client,
    useEvent(() => {
      setClient(
        () => new ExclusiveConnection(onNotice2, onPid2, onClientError2),
      );
    }),
  ];
}
