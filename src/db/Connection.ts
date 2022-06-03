import pg, { PoolClient } from 'pg';
import assert from 'assert';
import { ConnectionConfiguration } from './pgpass';
import { PgClient } from './PgClient';
import { Result, toResut } from './util';

pg.types.setTypeParser(1082, (val) => val);
pg.types.setTypeParser(1114, (val) => val);
pg.types.setTypeParser(1184, (val) => val);
pg.types.setTypeParser(1186, (val) => val);

export const Connection = {
  database: null as null | string,
  pool: null as null | pg.Pool,

  async connect(c: ConnectionConfiguration, db?: string) {
    if (this.pool) throw new Error('Conexão já inciada!');
    let database = db;
    if (!database)
      database = c.database && c.database !== '*' ? c.database : 'postgres';
    Connection.database = database || null;
    const config = {
      user: c.user,
      database,
      password: c.password,
      host: c.host,
      port: c.port,
    };
    this.pool = new pg.Pool(config);
    let success: (pc: PoolClient) => void;
    let error: (e: Error) => void;
    const promise = new Promise<PoolClient>((resolve, reject) => {
      success = resolve;
      error = reject;
    });
    this.pool.connect((err, client, done) => {
      Connection.done = done;
      if (err) {
        if (typeof err === 'string' || typeof err === 'undefined')
          error(new Error(err));
        else if (err instanceof Error) error(err);
        else error(new Error(`${err}`));
      } else {
        const title = document.createElement('title');
        title.innerText = `${c.user}@${c.host}${
          c.port !== 5432 ? `:${c.port}` : ''
        }/${database}`;
        document.head.appendChild(title);
        success(client);
      }
    });
    return promise;
  },

  done: null as null | (() => void),

  openConnection() {
    let success: (pc: PgClient) => void;
    let error: (e: Error) => void;
    const promise = new Promise<PgClient>((resolve, reject) => {
      success = resolve;
      error = reject;
    });
    assert(this.pool);
    this.pool.connect((err, client, done) => {
      if (err) {
        if (typeof err === 'string' || typeof err === 'undefined')
          error(new Error(err));
        else if (err instanceof Error) error(err);
        else error(new Error(`${err}`));
        done();
      } else {
        success(new PgClient(client, done as () => void));
      }
    });
    return promise;
  },

  // eslint-disable-next-line no-underscore-dangle
  async _query(
    query: string,
    args?: Array<string | null | number | boolean>
  ): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      assert(this.pool);
      this.pool.query(query, args).then(resolve).catch(reject);
    });
  },

  async query(
    query: string,
    args?: Array<string | null | number | boolean>
  ): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      assert(this.pool);
      this.pool
        .query({ text: query, rowMode: 'array', values: args })
        .then((res) => resolve(toResut(res)))
        .catch(reject);
    });
  },

  async listFromConfiguration(c: ConnectionConfiguration, query: string) {
    const pg2 = pg;
    const database = c.database && c.database !== '*' ? c.database : 'postgres';
    let success: (rows: Array<string | null | number | boolean>) => void;
    let error: (e: Error) => void;
    const promise = new Promise<Array<string | null | number | boolean>>(
      (resolve, reject) => {
        success = resolve;
        error = reject;
      }
    );
    const client = new pg2.Client({
      user: c.user,
      database,
      password: c.password,
      host: c.host,
      port: c.port,
    });
    client.connect((err) => {
      if (err) {
        if (typeof err === 'string' || typeof err === 'undefined')
          error(new Error(err));
        else if (err instanceof Error) error(err);
        else error(new Error(`${err}`));
      } else {
        client.query(query, [], (err2, result) => {
          if (err2) {
            if (typeof err2 === 'string' || typeof err2 === 'undefined')
              error(new Error(err2));
            else if (err2 instanceof Error) error(err2);
            else error(new Error(`${err2}`));
          } else {
            success(result.rows);
            client.end((err3) => {
              if (err3) throw err3;
            });
          }
        });
      }
    });
    return promise;
  },

  async list(query: string, args?: Array<string | null | number | boolean>) {
    // eslint-disable-next-line no-underscore-dangle
    const res = await Connection._query(query, args);
    return res.rows;
  },

  async first(query: string, args?: Array<string | null | number | boolean>) {
    const res = await Connection.list(query, args);
    return res[0] || null;
  },
};

/*
 {
 user: 'foo', //env var: PGUSER
 database: 'my_db', //env var: PGDATABASE
 password: 'secret', //env var: PGPASSWORD
 host: 'localhost', // Server hosting the postgres database
 port: 5432, //env var: PGPORT
 max: 10, // max number of clients in the pool
 idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
 };
 */
