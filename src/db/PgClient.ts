import { Result, toResut } from "./Connection";

export class PgClient {
  pgClient: any;
  done() {
    this._done();
  }
  _done: any;
  constructor(pgClient: any, done: () => void) {
    this.pgClient = pgClient;
    this._done = done;
  }
  async _query(query: string, args?: Array<any>): Promise<Result> {
    return new Promise<Result>((resolve, fireError) => {
      this.pgClient
        .query(query, args)
        .then(resolve)
        .catch(fireError);
    });
  }

  query(query: string, args?: Array<any>): Promise<Result> {
    return new Promise<Result>((resolve, fireError) => {
      this.pgClient
        .query({ text: query, rowMode: "array", values: args })
        .then((res: Result[] | Result) => resolve(toResut(res)))
        .catch(fireError);
    });
  }

  async list(query: string, args?: Array<any>) {
    const res = await this._query(query, args);
    return res.rows;
  }

  async first(query: string, args?: Array<any>) {
    const res = await this.list(query, args);
    return res[0] || null;
  }
}
