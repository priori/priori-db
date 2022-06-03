/* eslint-disable @typescript-eslint/no-explicit-any */
import { PoolClient } from 'pg';
import { Result, toResut } from './util';

export class PgClient {
  pgClient: PoolClient;

  done: (() => void) | null;

  constructor(pgClient: PoolClient, done: () => void) {
    this.pgClient = pgClient;
    this.done = done;
  }

  async pgQuery(query: string, args?: Array<any>): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      this.pgClient.query(query, args).then(resolve).catch(reject);
    });
  }

  query(query: string, args?: Array<unknown>): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      this.pgClient
        .query({ text: query, rowMode: 'array', values: args })
        .then((res) => resolve(toResut(res)))
        .catch(reject);
    });
  }

  async list(query: string, args?: Array<any>) {
    const res = await this.pgQuery(query, args);
    return res.rows;
  }

  async first(query: string, args?: Array<any>) {
    const res = await this.list(query, args);
    return res[0] || null;
  }
}
