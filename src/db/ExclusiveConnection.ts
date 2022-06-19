import assert from 'assert';
import { PoolClient, QueryArrayResult, QueryResult } from 'pg';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { useEffect, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { openConnection } from './Connection';
import { DB } from './DB';

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

  onPid: (pid: number | null) => void;

  onError: (err: Error) => void;

  constructor(
    onNotice: (n: NoticeMessage) => void,
    onPid: (pid: number | null) => void,
    onError: (e: Error) => void
  ) {
    this.listener = onNotice;
    this.onPid = onPid;
    this.onError = onError;
  }

  async stopRunningQuery(): Promise<void> {
    if (this.pid) await DB.cancelBackend(this.pid);
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
      if (e.arrayRowMode) {
        try {
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
          const ret = await this.db.query(e.query, e.args);
          e.resolve(ret);
        } catch (err) {
          e.reject(err);
        }
      }
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
  onNotice: (a: NoticeMessage) => void,
  onPid: (pid: number | null) => void,
  onClientError: (e: Error) => void
) {
  const onNotice2 = useEvent(onNotice);
  const onPid2 = useEvent(onPid);
  const onClientError2 = useEvent(onClientError);
  const [client] = useState(
    () => new ExclusiveConnection(onNotice2, onPid2, onClientError2)
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
      client.db?.release(true);
    };
  }, [client]);
  return client;
}
