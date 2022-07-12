import pg, { QueryArrayResult, QueryResult } from 'pg';
import assert from 'assert';
import { grantError } from 'util/errors';
import hls from 'util/hotLoadSafe';
import { ConnectionConfiguration } from './pgpass';
import { exclusives } from './ExclusiveConnection';
import { DB } from './DB';

pg.types.setTypeParser(1082, (val) => val);
pg.types.setTypeParser(1114, (val) => val);
pg.types.setTypeParser(1184, (val) => val);
pg.types.setTypeParser(1186, (val) => val);

export async function connect(c: ConnectionConfiguration, db?: string) {
  assert(!hls.pool);
  const database =
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
  const p = new pg.Pool(config);
  hls.pool = p;
  try {
    const client = await p.connect();
    try {
      const title = document.createElement('title');
      title.innerText = `${c.user}@${c.host}${
        c.port !== 5432 ? `:${c.port}` : ''
      }/${database}`;
      document.head.appendChild(title);
      client.release(true);
      assert(p);
    } catch (err2) {
      client.release(true);
      throw grantError(err2);
    }
  } catch (err) {
    throw grantError(err);
  }
}

export function openConnection() {
  const { pool } = hls;
  assert(pool);
  return pool.connect();
}

export async function listFromConfiguration(
  c: ConnectionConfiguration,
  query: string
) {
  const client = new pg.Client({
    user: c.user,
    database: c.database && c.database !== '*' ? c.database : 'postgres',
    password: c.password,
    host: c.host,
    port: c.port,
  });
  try {
    await client.connect();
    try {
      return await client.query(query, []);
    } catch (err2) {
      try {
        client.end();
      } catch (err3) {
        throw grantError(err3);
      }
      throw grantError(err2);
    }
  } catch (err) {
    throw grantError(err);
  }
}

export type SimpleValue =
  | number
  | string
  | boolean
  | null
  | { [key: string]: SimpleValue };

export async function query(
  q: string,
  args?: (number | string | boolean | null)[]
): Promise<QueryResult>;
export async function query(
  q: string,
  args: (number | string | boolean | null)[] | undefined,
  arrayRowMode: true
): Promise<QueryArrayResult<SimpleValue[]>>;
export async function query(
  q: string,
  args?: Array<string | null | number | boolean>,
  arrayRowMode?: true
): Promise<QueryResult | QueryArrayResult<SimpleValue[]>> {
  const p = hls.pool;
  assert(p);
  if (arrayRowMode)
    return p.query({
      text: q,
      rowMode: 'array',
      values: args,
    });
  return p.query(q, args);
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
  if (!hls.pool || exclusives.length === 0) return false;
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
    await hls.pool?.end();
  } catch (err) {
    try {
      if (hls.pool?.end) await hls.pool?.end();
    } catch (err2) {
      throw grantError(err2);
    }
    throw grantError(err);
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
