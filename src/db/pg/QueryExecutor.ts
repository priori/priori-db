import {
  Notice,
  QueryExecutor,
  QueryOptions,
  QueryResult,
  QueryResultDataField,
  SimpleValue,
} from 'db/db';
import { ipcRenderer } from 'electron';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import { PoolClient, QueryArrayResult } from 'pg';
import { CopyStreamQuery, CopyToStreamQuery, from, to } from 'pg-copy-streams';
import PgCursor from 'pg-cursor';
import { assert } from 'util/assert';
import { grantError } from 'util/errors';
import { openConnection } from './Connection';
import { cancelBackend } from './DB';
import { coerceArraysToText } from './valueTransform';

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
    !!query.match(
      /(?<!\n)^([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*COPY/gim,
    ) &&
    !!query.match(
      /(?<!\n)^([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*to\s+stdout/gim,
    )
  );
}

function hasFromStdIn(query: string) {
  return (
    !!query.match(
      /(?<!\n)^([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*COPY/gim,
    ) &&
    !!query.match(
      /(?<!\n)^([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*from\s+stdin/gim,
    )
  );
}

function hasMultipleToStdOut(query: string) {
  return (
    !!query.match(
      /(?<!\n)^(([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*COPY){2}/gim,
    ) &&
    !!query.match(
      /(?<!\n)^(([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*to\s+stdout){2}/gim,
    )
  );
}

function hasMultipleFromStdIn(query: string) {
  return (
    !!query.match(
      /(?<!\n)^(([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*COPY){2}/gim,
    ) &&
    !!query.match(
      /(?<!\n)^(([^'/-]|'([^']|'')*'|-[^-]|--[^\n]*(\n|$)|\/[^*]|\/\*.*\*\/)*from\s+stdin){2}/gim,
    )
  );
}

const fetchSize = 500;

export class PgQueryExecutor implements QueryExecutor {
  private db: PoolClient | null = null;

  private pid: number | undefined;

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

  private openConnectionP: Promise<void> | null = null;

  async query(q: string, ops?: QueryOptions): Promise<QueryResult> {
    if (this.lastCursor) {
      await this.lastCursor.close();
      this.lastCursor = null;
    }
    if (!this.db) {
      if (!this.openConnectionP) this.openConnectionP = this.openConnection();
      await this.openConnectionP;
    }
    assert(this.db);
    const queryHastoStdOut = hasToStdOut(q);
    const queryHasFromStdIn = hasFromStdIn(q);

    if (queryHasFromStdIn && queryHastoStdOut)
      throw new Error('Cannot use STDIN and STDOUT at the same time');
    if (queryHastoStdOut && hasMultipleToStdOut(q))
      throw new Error('Cannot use multiple COPY TO STDOUT at the same time');
    if (queryHasFromStdIn && hasMultipleFromStdIn(q))
      throw new Error('Cannot use multiple COPY FROM STDIN at the same time');

    let stdOutFile = ops?.stdOutFile;
    let stdInFile = ops?.stdInFile;
    if (!stdOutFile && queryHastoStdOut) {
      stdOutFile = await ipcRenderer.invoke('dialog:saveAny');
    } else if (!stdInFile && queryHasFromStdIn) {
      stdInFile = await ipcRenderer.invoke('dialog:openAny');
    }

    const stdOutMode = stdOutFile && queryHastoStdOut;
    const stdInMode = stdInFile && queryHasFromStdIn;

    if (stdOutMode || stdInMode) {
      const res = stdOutMode
        ? (this.db.query(to(q)) as unknown as
            | QueryArrayResult
            | (CopyStreamQuery & { fields: undefined })
            | (CopyToStreamQuery & { fields: undefined }))
        : (this.db.query(from(q)) as unknown as
            | QueryArrayResult
            | (CopyStreamQuery & { fields: undefined })
            | (CopyToStreamQuery & { fields: undefined }));

      if (stdOutMode && stdOutFile)
        await pipeline(res as CopyToStreamQuery, createWriteStream(stdOutFile));
      if (stdInMode && stdInFile) {
        const stream = res as CopyStreamQuery;
        const fileStream = createReadStream(stdInFile);
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
              stdOutResult: stdOutFile as string,
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
      const res2: {
        rows?: SimpleValue[][];
        fields?: QueryResultDataField[];
        rowCount?: null | number;
      } = await this.db.query({
        text: q as string,
        rowMode: 'array',
        values: [],
      });
      if (res2.rows?.length && res2.fields?.length)
        coerceArraysToText(
          res2.rows as SimpleValue[][],
          res2.fields as unknown as QueryResultDataField[],
        );
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
        // eslint-disable-next-line no-underscore-dangle
        const fields = (c as any)._result.fields as QueryResultDataField[];
        coerceArraysToText(rows, fields);
        const ret = {
          rows,
          fields,
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
                        coerceArraysToText(newRows, fields);
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
  }

  private async openConnection() {
    try {
      const db = await openConnection();
      const pid = (db as { processID?: number }).processID;
      assert(typeof pid === 'number');
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
      throw grantError(err);
    }
  }
}
