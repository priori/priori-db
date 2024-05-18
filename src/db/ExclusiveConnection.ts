import { assert } from 'util/assert';
import { FieldDef, PoolClient, QueryArrayResult } from 'pg';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { useEffect, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { CopyStreamQuery, CopyToStreamQuery, from, to } from 'pg-copy-streams';
import { grantError } from 'util/errors';
import PgCursor from 'pg-cursor';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import { openConnection, SimpleValue } from './Connection';
import { DB } from './DB';

export interface QueryResult {
  rows: SimpleValue[][];
  fields: FieldDef[];
  rowCount: number;
  stdOutResult?: string;
  stdOutMode?: boolean;
  stdInMode?: boolean;
  fetchMoreRows?: () => Promise<{
    rows: SimpleValue[][];
    fields: FieldDef[];
    rowCount: number;
  }>;
}

interface QueryOptions {
  stdOutFile?: string | null;
  stdInFile?: string | null;
}

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

function temToStdOut(query: string) {
  return (
    !!query.match(/^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/^([^']|'([^']|'')*')*to\s+stdout/gim)
  );
}
function temFromStdIn(query: string) {
  return (
    !!query.match(/^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/^([^']|'([^']|'')*')*from\s+stdin/gim)
  );
}

const fetchSize = 500;

class ExclusiveConnection {
  db: PoolClient | null = null;

  public pid: number | undefined;

  pending: {
    resolve: (r: QueryResult) => void;
    reject: (e: unknown) => void;
    query: string;
    ops?: QueryOptions;
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

  async query(q: string, ops?: QueryOptions): Promise<QueryResult> {
    if (this.lastCursor) {
      await this.lastCursor.close();
      this.lastCursor = null;
    }
    if (this.db) {
      const stdOutMode = ops?.stdOutFile && temToStdOut(q);
      const stdInMode = ops?.stdInFile && temFromStdIn(q);
      if (stdOutMode && stdInMode)
        throw new Error('Cannot use STDIN and STDOUT at the same time');
      if (stdOutMode || stdInMode) {
        const res = stdOutMode
          ? ((await this.db.query(to(q))) as unknown as
              | QueryArrayResult
              | (CopyStreamQuery & { fields: undefined })
              | (CopyToStreamQuery & { fields: undefined }))
          : ((await this.db.query(from(q))) as unknown as
              | QueryArrayResult
              | (CopyStreamQuery & { fields: undefined })
              | (CopyToStreamQuery & { fields: undefined }));

        if (stdOutMode && ops?.stdOutFile)
          await pipeline(
            res as CopyToStreamQuery,
            createWriteStream(ops.stdOutFile),
          );
        if (stdInMode && ops?.stdInFile) {
          const stream = res as CopyStreamQuery;
          const fileStream = createReadStream(ops.stdInFile);
          fileStream.pipe(stream);
          await new Promise((resolve, reject) => {
            fileStream.on('error', reject);
            stream.on('error', reject);
            stream.on('finish', resolve);
          });
        }
        return {
          ...(stdOutMode
            ? {
                stdOutResult: ops.stdOutFile as string,
                stdOutMode: true,
              }
            : {}),
          ...(stdInMode
            ? {
                stdInMode: true,
              }
            : {}),
          rows: [],
          fields: [],
          rowCount: res.rowCount || 0,
        };
      }
      if (isMultipleQueries(q)) {
        const res2 = await this.db.query({
          text: q as string,
          rowMode: 'array',
          values: [],
        });
        return {
          rows: res2.rows,
          fields: res2.fields as FieldDef[],
          rowCount: res2.rowCount || 0,
        };
      }
      const c = this.db.query(new PgCursor(q, [], { rowMode: 'array' }));
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
        ops,
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
      try {
        const ret = await this.query(e.query, e.ops);
        e.resolve(ret);
      } catch (err) {
        e.reject(err);
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
