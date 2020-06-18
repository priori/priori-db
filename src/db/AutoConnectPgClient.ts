import { Connection, Result } from "./Connection";
import { PgClient } from "./PgClient";
export class AutoConnectPgClient {
  db: PgClient | null = null;
  pid: number;
  pending: {
    resolve: any;
    fireError: any;
    query: string;
    arrayRowMode: boolean;
    args?: any[];
  }[] = [];
  listener: (n: any) => void;
  constructor(listener: (n: any) => void) {
    this.listener = listener;
  }

  async stopRunningQuery() {
    if (!this.pid) throw "Invalid pid.";
    return await Connection.query("SELECT pg_cancel_backend($1)", [this.pid]);
  }

  async _query(query: string, args?: Array<any>): Promise<Result> {
    if (this.db)
      return new Promise<Result>((resolve, fireError) => {
        if (!this.db) throw "never";
        this.db
          ._query(query, args)
          .then(resolve)
          .catch(fireError);
      });
    return new Promise<Result>((resolve, fireError) => {
      this.pending.push({
        resolve,
        fireError,
        query,
        arrayRowMode: false,
        args
      });
      if (this.pending.length == 1) this.openConnection();
    });
  }

  done() {
    if (this.db) this.db.done();
  }

  query(query: string, args?: any[]): Promise<Result> {
    if (this.db)
      return new Promise<Result>((resolve, fireError) => {
        if (!this.db) throw "never";
        this.db
          .query(query, args)
          .then(resolve)
          .catch(fireError);
      });
    return new Promise<Result>((resolve, fireError) => {
      this.pending.push({
        resolve,
        fireError,
        query,
        arrayRowMode: true,
        args
      });
      if (this.pending.length == 1) this.openConnection();
    });
  }
  private openConnection() {
    Connection.openConnection().then(
      db => {
        db.query("SELECT pg_backend_pid()").then(result => {
          this.pid = result.rows[0][0];
          this.db = db;
          this.db.pgClient.on("notice", this.listener);
          this.execPendingQueries();
        });
      },
      e => console.error(e)
    );
  }
  private async execPendingQueries() {
    for (const e of this.pending) {
      try {
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
    if (!this.db) throw "never";
    if (e.arrayRowMode)
      return this.db.query(e.query, e.args).then(e.resolve, e.fireError);
    else return this.db._query(e.query, e.args).then(e.resolve, e.fireError);
  }

  async list(query: string) {
    let res = await this._query(query);
    if (res instanceof Array) res = res[0];
    if (!res.rows) throw "Invalid result for list.";
    return res.rows;
  }

  async first(query: string) {
    const res = await this.list(query);
    return res[0] || null;
  }
}
