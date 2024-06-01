import { assert } from 'util/assert';
import { PoolClient, QueryArrayResult } from 'pg';
import { CopyStreamQuery, CopyToStreamQuery, from, to } from 'pg-copy-streams';
import { grantError } from 'util/errors';
import PgCursor from 'pg-cursor';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import {
  Notice,
  QueryExecutor,
  QueryOptions,
  QueryResultDataField,
  QueryResult,
  SimpleValue,
} from 'db/db';
import { openConnection } from './Connection';
import { cancelBackend } from './DB';

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

function hasToStdOut(query: string) {
  return (
    !!query.match(/(?<!\n)^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/(?<!\n)^([^']|'([^']|'')*')*to\s+stdout/gim)
  );
}

function hasFromStdIn(query: string) {
  return (
    !!query.match(/(?<!\n)^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/(?<!\n)^([^']|'([^']|'')*')*from\s+stdin/gim)
  );
}

const fetchSize = 500;

export class PgQueryExecutor implements QueryExecutor {
  private db: PoolClient | null = null;

  private pid: number | undefined;

  private pending: {
    resolve: (r: QueryResult) => void;
    reject: (e: unknown) => void;
    query: string;
    ops?: QueryOptions;
  }[] = [];

  private onNotice: (n: Notice) => void;

  private onPid: (pid: number | null) => void;

  private onError: (err: Error) => void;

  private static instances = [] as PgQueryExecutor[];

  static destroyAll() {
    return Promise.all(
      PgQueryExecutor.instances
        .filter((ac) => ac.pid)
        .map(async (ac) => {
          await ac.stopRunningQuery();
          return ac.db?.release(true);
        }),
    );
  }

  static pids() {
    return this.instances
      .map((ac) => ac.pid)
      .filter((pid) => typeof pid === 'number') as number[];
  }

  constructor(
    onNotice: (n: Notice) => void,
    onPid: (pid: number | null) => void,
    onError: (e: Error) => void,
  ) {
    this.onNotice = onNotice;
    this.onPid = onPid;
    this.onError = onError;
    PgQueryExecutor.instances.push(this);
  }

  async stopRunningQuery(): Promise<void> {
    if (this.pid) await cancelBackend(this.pid);
  }

  destroy() {
    if (this.pid) {
      this.stopRunningQuery().then(() => {
        PgQueryExecutor.instances.splice(
          PgQueryExecutor.instances.indexOf(this),
          1,
        );
        this.db?.release(true);
      });
      return;
    }
    PgQueryExecutor.instances.splice(
      PgQueryExecutor.instances.indexOf(this),
      1,
    );
    this.db?.release(true);
  }

  private lastCursor: PgCursor | null = null;

  async query(q: string, ops?: QueryOptions): Promise<QueryResult> {
    if (this.lastCursor) {
      await this.lastCursor.close();
      this.lastCursor = null;
    }
    if (this.db) {
      const stdOutMode = ops?.stdOutFile && hasToStdOut(q);
      const stdInMode = ops?.stdInFile && hasFromStdIn(q);
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
          fields: res2.fields as unknown as QueryResultDataField[],
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
            fields: (c as any)._result.fields as QueryResultDataField[],
            // eslint-disable-next-line no-underscore-dangle
            rowCount: (c as any)._result.rowCount,
            fetchMoreRows:
              rows.length === fetchSize
                ? () => {
                    return new Promise<{
                      rows: SimpleValue[][];
                      fields: QueryResultDataField[];
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
      this.db.on('notice', (n) => {
        const values: { [key: string]: string | undefined } = {};
        for (const k of Object.keys(n) as (keyof typeof n)[]) {
          if (k !== 'message' && k !== 'severity' && k !== 'name') {
            if (typeof n[k] === 'string') values[k] = n[k] as string;
            else if (typeof n[k] === 'number')
              values[k] = (n[k] as number).toString();
          }
        }
        this.onNotice({
          message: n.message,
          type: n.severity,
          values,
        });
      });
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
