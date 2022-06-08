import pg, { Pool, PoolClient, QueryArrayResult, QueryResult } from 'pg';
import assert from 'assert';
import nodeConsole from 'console';
import { ConnectionConfiguration } from './pgpass';
import { exclusives } from './ExclusiveConnection';

pg.types.setTypeParser(1082, (val) => val);
pg.types.setTypeParser(1114, (val) => val);
pg.types.setTypeParser(1184, (val) => val);
pg.types.setTypeParser(1186, (val) => val);

let database = undefined as undefined | string;
let pool = null as null | pg.Pool;

export function databaseName() {
  return database || null;
}

export function connect(c: ConnectionConfiguration, db?: string) {
  if (pool) throw new Error('Conexão já inciada!');
  database =
    db ||
    (c.database && c.database !== '*' ? c.database : 'postgres') ||
    undefined;
  const config = {
    user: c.user,
    database,
    password: c.password,
    host: c.host,
    port: c.port,
  };
  let success: (pc: Pool) => void;
  let error: (e: Error) => void;
  const promise = new Promise<Pool>((resolve, reject) => {
    success = resolve;
    error = reject;
  });
  pool = new pg.Pool(config);
  pool.connect((err, client) => {
    if (err) {
      try {
        client.release();
        // eslint-disable-next-line no-empty
      } catch {}
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
      client.release();
      assert(pool);
      success(pool);
    }
  });
  return promise;
}

export function openConnection() {
  let success: (pc: PoolClient) => void;
  let error: (e: Error) => void;
  const promise = new Promise<PoolClient>((resolve, reject) => {
    success = resolve;
    error = reject;
  });
  assert(pool);
  pool.connect((err, client) => {
    if (err) {
      if (typeof err === 'string' || typeof err === 'undefined')
        error(new Error(err));
      else if (err instanceof Error) error(err);
      else error(new Error(`${err}`));
      client.release();
    } else {
      success(client);
    }
  });
  return promise;
}

export async function listFromConfiguration(
  c: ConnectionConfiguration,
  query: string
) {
  const pg2 = pg;
  let success: (
    rows: Array<
      | string
      | null
      | number
      | boolean
      | { [k: string]: string | null | number | boolean }
    >
  ) => void;
  let error: (e: Error) => void;
  const promise = new Promise<
    Array<
      | string
      | null
      | number
      | boolean
      | { [k: string]: string | null | number | boolean }
    >
  >((resolve, reject) => {
    success = resolve;
    error = reject;
  });
  const client = new pg2.Client({
    user: c.user,
    database: c.database && c.database !== '*' ? c.database : 'postgres',
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
}

export async function query(
  q: string,
  args?: (number | string | boolean | null)[]
): Promise<QueryResult>;
export async function query(
  q: string,
  args: (number | string | boolean | null)[] | undefined,
  arrayRowMode: true
): Promise<QueryArrayResult>;
export async function query(
  q: string,
  args?: Array<string | null | number | boolean>,
  arrayRowMode?: true
): Promise<QueryResult | QueryArrayResult> {
  assert(pool);
  if (arrayRowMode)
    return pool.query({
      text: q,
      rowMode: 'array',
      values: args,
    });
  return pool.query(q, args);
}

export async function list(
  q: string,
  args?: Array<string | null | number | boolean>
) {
  const res = await query(q, args);
  return res.rows;
}

export async function first(
  q: string,
  args?: Array<string | null | number | boolean>
) {
  const res = await list(q, args);
  return res[0] || null;
}

let state = 'on' as 'on' | 'closing' | 'close';
window.addEventListener(`beforeunload`, async (e) => {
  if (!pool) return;
  if (state === 'close') return;
  e.preventDefault();
  e.returnValue = '';
  // if ( autoClients.filter((ac) => ac.pid).length  && !confirm() ) return;
  if (state === 'closing') return;
  // document.body.append(lock); document.activeElement.blur();...
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    state = 'closing';
    await Promise.all(
      exclusives
        .filter((ac) => ac.pid)
        .map(async (ac) => {
          await ac.stopRunningQuery();
          await ac.db?.release();
        })
    );
    await pool?.end();
  } catch (err) {
    nodeConsole.error('PostgreSQL close Fail', err);
    try {
      if (pool?.end) await pool?.end();
    } catch (err2) {
      nodeConsole.error('PostgreSQL close Fail2', err2);
    }
  }
  state = 'close';
  window.close();
});
