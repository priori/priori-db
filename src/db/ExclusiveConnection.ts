import assert from 'assert';
import { PoolClient, QueryArrayResult, QueryResult } from 'pg';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { useEffect, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { query, openConnection } from './Connection';

class ExclusiveConnection {
  db: PoolClient | null = null;

  public pid: number | undefined;

  pending: {
    resolve: (r: QueryArrayResult) => void;
    reject: (e: unknown) => void;
    query: string;
    arrayRowMode: boolean;
    args?: Array<string | number | null | boolean>;
  }[] = [];

  listener: (n: NoticeMessage) => void;

  onCreatePid: (pid: number) => void;

  constructor(
    listener: (n: NoticeMessage) => void,
    onCreatePid: (pid: number) => void
  ) {
    this.listener = listener;
    this.onCreatePid = onCreatePid;
  }

  async stopRunningQuery(): Promise<void> {
    if (this.pid) await query('SELECT pg_cancel_backend($1)', [this.pid]);
  }

  async query(
    q: string,
    args?: (number | string | boolean | null)[]
  ): Promise<QueryResult>;
  async query(
    q: string,
    args: (number | string | boolean | null)[] | undefined,
    arrayRowMode: true
  ): Promise<QueryArrayResult>;
  async query(
    q: string,
    args?: (number | string | boolean | null)[],
    arrayRowMode?: true
  ) {
    if (this.db) {
      if (arrayRowMode)
        return this.db.query({ text: q, rowMode: 'array', values: args });
      return this.db.query(q, args);
    }
    return new Promise((resolve, reject) => {
      this.pending.push({
        resolve,
        reject,
        query: q,
        arrayRowMode: arrayRowMode || false,
        args,
      });
      if (this.pending.length === 1) this.openConnection();
    });
  }

  private async openConnection() {
    try {
      const db = await openConnection();
      const result = await db.query({
        text: 'SELECT pg_backend_pid()',
        rowMode: 'array',
      });
      const pid = result.rows[0][0];
      this.pid = pid as number;
      this.onCreatePid(this.pid);
      this.db = db;
      this.db.on('notice', this.listener);
      const { pending } = this;
      this.pending = [];
      for (const e of pending) {
        assert(!!this.db);
        if (e.arrayRowMode) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const ret = await this.db.query({
              text: e.query,
              rowMode: 'array',
              values: e.args,
            });
            e.resolve(ret);
          } catch (err) {
            e.reject(err);
          }
        } else {
          try {
            // eslint-disable-next-line no-await-in-loop
            const ret = await this.db.query(e.query, e.args);
            e.resolve(ret);
          } catch (err) {
            e.reject(err);
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  async list(q: string, args?: Array<string | null | number | boolean>) {
    const res = await this.query(q, args);
    return res.rows;
  }

  async first(q: string, args?: Array<string | null | number | boolean>) {
    const res = await this.list(q, args);
    return res[0] || null;
  }
}

export const exclusives = [] as ExclusiveConnection[];
export function useExclusiveConnection(
  notice: (a: NoticeMessage) => void,
  onCreatePid: (pid: number) => void
) {
  const noticeCall = useEvent(notice);
  const onCreatePidCall = useEvent(onCreatePid);
  const [client] = useState(
    () => new ExclusiveConnection(noticeCall, onCreatePidCall)
  );
  useEffect(() => {
    exclusives.push(client);
    return () => {
      if (client.pid) {
        client.stopRunningQuery().then(() => {
          exclusives.splice(exclusives.indexOf(client), 1);
          client.db?.release(true);
        });
        return;
      }
      exclusives.splice(exclusives.indexOf(client), 1);
      client.db?.release();
    };
  }, [client]);
  return client;
}
