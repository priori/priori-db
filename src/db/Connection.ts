import pg, { PoolClient, QueryArrayResult, QueryResult } from 'pg';
import assert from 'assert';
import { grantError } from 'util/errors';
import { ConnectionConfiguration } from './pgpass';
import { exclusives } from './ExclusiveConnection';
import { DB } from './DB';

pg.types.setTypeParser(1082, (val) => val);
pg.types.setTypeParser(1114, (val) => val);
pg.types.setTypeParser(1184, (val) => val);
pg.types.setTypeParser(1186, (val) => val);

let database = undefined as undefined | string;
let pool = null as null | pg.Pool;

export function databaseName() {
  return database || null;
}

export async function connect(c: ConnectionConfiguration, db?: string) {
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
    allowExitOnIdle: false,
  };
  pool = new pg.Pool(config);
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const title = document.createElement('title');
    title.innerText = `${c.user}@${c.host}${
      c.port !== 5432 ? `:${c.port}` : ''
    }/${database}`;
    document.head.appendChild(title);
    client.release(true);
    assert(pool);
    return;
  } catch (err) {
    try {
      client?.release(true);
    } catch (err2) {
      throw grantError(err2);
    }
    throw grantError(err);
  }
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
      error(grantError(err));
      client.release(true);
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
  let success: (rows: QueryResult) => void;
  let error: (e: Error) => void;
  const promise = new Promise<QueryResult>((resolve, reject) => {
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
      error(grantError(err));
    } else {
      client.query(query, [], (err2, result) => {
        if (err2) {
          error(grantError(err2));
        } else {
          client.end((err3) => {
            if (err3) throw err3;
          });
          success(result);
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

export async function hasOpenConnection() {
  if (!pool || exclusives.length === 0) return false;
  const pids = exclusives
    .map((ac) => ac.pid)
    .filter((pid) => typeof pid === 'number') as number[];
  return DB.existsSomePendingProcess(...pids);
}

export async function closeAll() {
  try {
    await Promise.all(
      exclusives
        .filter((ac) => ac.pid)
        .map(async (ac) => {
          await ac.stopRunningQuery();
          await ac.db?.release(true);
        })
    );
    await pool?.end();
  } catch (err) {
    try {
      if (pool?.end) await pool?.end();
    } catch (err2) {
      throw new Error(err2 instanceof Error ? err2.message : `${err2}`);
    }
    throw new Error(err instanceof Error ? err.message : `${err}`);
  }
}

export async function listDatabases(c: ConnectionConfiguration) {
  const res = await listFromConfiguration(
    c,
    `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
  );
  return res.rows.map((r) => (r as { name: string }).name) as string[];
}
