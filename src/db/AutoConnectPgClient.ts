/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { useEffect, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { Connection } from './Connection';
import { PgClient } from './PgClient';
import { Result } from './util';

export class AutoConnectPgClient {
  db: PgClient | null = null;

  pid: number | undefined;

  pending: {
    resolve: any;
    fireError: any;
    query: string;
    arrayRowMode: boolean;
    args?: any[];
  }[] = [];

  listener: (n: NoticeMessage) => void;

  constructor(listener: (n: NoticeMessage) => void) {
    this.listener = listener;
  }

  async stopRunningQuery() {
    if (!this.pid) throw new Error('Invalid pid.');
    return Connection.query('SELECT pg_cancel_backend($1)', [this.pid]);
  }

  async pgQuery(query: string, args?: Array<any>): Promise<Result> {
    if (this.db)
      return new Promise<Result>((resolve, reject) => {
        if (!this.db) throw new Error('never');
        this.db.pgQuery(query, args).then(resolve).catch(reject);
      });
    return new Promise<Result>((resolve, reject) => {
      this.pending.push({
        resolve,
        fireError: reject,
        query,
        arrayRowMode: false,
        args,
      });
      if (this.pending.length === 1) this.openConnection();
    });
  }

  done() {
    if (this.db && this.db.done) this.db.done();
  }

  query(
    query: string,
    args?: (number | string | Date | null)[]
  ): Promise<Result> {
    if (this.db)
      return new Promise<Result>((resolve, reject) => {
        if (!this.db) throw new Error('never');
        this.db.query(query, args).then(resolve).catch(reject);
      });
    return new Promise<Result>((resolve, reject) => {
      this.pending.push({
        resolve,
        fireError: reject,
        query,
        arrayRowMode: true,
        args,
      });
      if (this.pending.length === 1) this.openConnection();
    });
  }

  private openConnection() {
    Connection.openConnection().then(
      (db) => {
        // eslint-disable-next-line promise/no-nesting
        db.query('SELECT pg_backend_pid()').then((result) => {
          const pid = result.rows[0][0];
          this.pid = pid as number;
          this.db = db;
          this.db.pgClient.on('notice', this.listener);
          this.execPendingQueries();
        });
      },
      // eslint-disable-next-line no-console
      (e) => console.error(e)
    );
  }

  private async execPendingQueries() {
    for (const e of this.pending) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.exec(e);
        e.resolve(res);
      } catch (err) {
        e.fireError(err);
      }
    }
  }

  private exec(e: {
    resolve: any;
    fireError: any;
    query: string;
    arrayRowMode: boolean;
    args?: any[];
  }) {
    assert(!!this.db);
    if (e.arrayRowMode)
      return this.db.query(e.query, e.args).then(e.resolve, e.fireError);
    return this.db.pgQuery(e.query, e.args).then(e.resolve, e.fireError);
  }

  async list(query: string) {
    let res = await this.pgQuery(query);
    if (res instanceof Array) {
      const res0 = res[0];
      res = res0;
    }
    if (!res.rows) throw new Error('Invalid result for list.');
    return res.rows;
  }

  async first(query: string) {
    const res = await this.list(query);
    return res[0] || null;
  }
}

export function useAutoConnectPgClient(notice: (a: NoticeMessage) => void) {
  const noticeCall = useEvent(notice);
  const [client] = useState(() => new AutoConnectPgClient(noticeCall));
  useEffect(() => {
    return () => client.done();
  }, [client]);
  return client;
}
