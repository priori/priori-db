import { ConnectionConfiguration } from "./pgpass";
import { pg } from "./pg";
import { PgClient } from "./PgClient";

(window as any).pg = pg;

export interface ResultField {
  name: string;
  sort?: string; // ASC, DESC
}

export interface Result {
  rows: Array<{ [_: string]: any }>;
  fields: Array<ResultField>;
  prev?: Result;
}

export function toResut(res: Result[] | Result) {
  if (res instanceof Array) {
    res.forEach((result, index) => {
      if (index > 0) {
        result.prev = res[index - 1];
      }
    });
    return res[res.length - 1];
  }
  return res;
}

export const Connection = {
  database: null as null | string,

  async connect(c: ConnectionConfiguration, database?: string) {
    if ( (window as any).pool) throw "Conexão já inciada!";
    if (!database)
      database = c.database && c.database != "*" ? c.database : "postgres";
    Connection.database = database || null;
    (window as any).config = {
      user: c.user,
      database: database,
      password: c.password,
      host: c.host,
      port: c.port
    };
    (window as any).pool = new pg.Pool((window as any).config);
    let success: (_?: any) => void;
    let error: (_?: any) => void;
    const promise = new Promise<void>((resolve, fireError) => {
      success = resolve;
      error = fireError;
    });
    (window as any).pool.connect((err: any, client: any, done: () => void) => {
      Connection.done = done;
      if (err) {
        error(err);
      } else {
        const title = document.createElement("title");
        title.innerText =
          c.user +
          "@" +
          c.host +
          (c.port != 5432 ? ":" + c.port : "") +
          "/" +
          database;
        document.head.appendChild(title);
        success(client);
      }
    });
    return promise;
  },

  done: null as null | (() => void),

  openConnection() {
    let success: (_?: any) => void;
    let error: (_?: any) => void;
    const promise = new Promise<PgClient>((resolve, fireError) => {
      success = resolve;
      error = fireError;
    });
    ((window as any).pool as any).connect((err: any, client: any, done: any) => {
      if (err) {
        error(err);
        done();
      } else {
        success(new PgClient(client, done as () => void));
      }
    });
    return promise;
  },

  async _query(query: string, args?: Array<any>): Promise<Result> {
    return new Promise<Result>((resolve, fireError) => {
      ((window as any).pool as any)
        .query(query, args)
        .then(resolve)
        .catch(fireError);
    });
  },

  async query(query: string, args?: Array<any>): Promise<Result> {
    return new Promise<Result>((resolve, fireError) => {
      ((window as any).pool as any)
        .query({ text: query, rowMode: "array", values: args })
        .then((res: Result[] | Result) => resolve(toResut(res)))
        .catch(fireError);
    });
  },

  async listFromConfiguration(c: ConnectionConfiguration, query: string) {
    const pg2 = pg as any;
    const database = c.database && c.database != "*" ? c.database : "postgres";
    let success: (_?: any) => void;
    let error: (_?: any) => void;
    const promise = new Promise<Array<any>>((resolve, fireError) => {
      success = resolve;
      error = fireError;
    });
    const client: any = new pg2.Client({
      user: c.user,
      database: database,
      password: c.password,
      host: c.host,
      port: c.port
    });
    client.connect((err: any) => {
      if (err) {
        error(err);
      } else {
        client.query(query, [], (err: any, result: any) => {
          if (err) {
            error(err);
          } else {
            success(result.rows);
            client.end((err: any) => {
              if (err) throw err;
            });
          }
        });
      }
    });
    return promise;
  },

  async list(query: string, args?: Array<any>) {
    const res = await Connection._query(query, args);
    return res.rows;
  },

  async first(query: string, args?: Array<any>) {
    const res = await Connection.list(query, args);
    return res[0] || null;
  }
};

(window as any).Connection = Connection;
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
