import pg, { QueryArrayResult, QueryResult } from 'pg';
import { assert } from 'util/assert';
import { grantError } from 'util/errors';
import hls from 'util/hotLoadSafe';
import { QueryExecutor } from './QueryExecutor';
import { DB } from './DB';

pg.types.setTypeParser(1082, (val) => val);
pg.types.setTypeParser(1114, (val) => val);
pg.types.setTypeParser(1184, (val) => val);
pg.types.setTypeParser(1186, (val) => val);

export interface ConnectionConfiguration {
  id?: number;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  requireSsl?: boolean;
}

export async function connect(c: ConnectionConfiguration, db?: string) {
  assert(!hls.pool);
  const database =
    db ||
    (c.database && c.database !== '*' ? c.database : 'postgres') ||
    undefined;
  const p = new pg.Pool(
    c.requireSsl
      ? ({
          user: c.user,
          database,
          password: c.password,
          host: c.host,
          port: c.port,
          allowExitOnIdle: false,
          ssl: {},
          sslmode: 'require',
        } as pg.PoolConfig)
      : {
          user: c.user,
          database,
          password: c.password,
          host: c.host,
          port: c.port,
          allowExitOnIdle: false,
        },
  );
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
  query: string,
  args?: (number | string | boolean | null)[] | undefined,
) {
  const client = new pg.Client(
    c.requireSsl
      ? ({
          user: c.user,
          database: c.database && c.database !== '*' ? c.database : 'postgres',
          password: c.password,
          host: c.host,
          port: c.port,
          ssl: {},
          sslmode: 'require',
        } as pg.ClientConfig)
      : {
          user: c.user,
          database: c.database && c.database !== '*' ? c.database : 'postgres',
          password: c.password,
          host: c.host,
          port: c.port,
        },
  );
  try {
    await client.connect();
    try {
      return await client.query(query, args ?? []);
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
  | { [key: string]: SimpleValue }
  | SimpleValue[];

export async function query(
  q: string,
  args?: (number | string | boolean | null)[],
): Promise<QueryResult<{ [key: string]: SimpleValue }>>;

export async function query(
  q: string,
  args: (number | string | boolean | null)[] | undefined,
  arrayRowMode: true,
): Promise<QueryArrayResult<SimpleValue[]>>;

export async function query(
  q: string,
  args?: Array<string | null | number | boolean>,
  arrayRowMode?: true,
): Promise<
  QueryResult<{ [key: string]: SimpleValue }> | QueryArrayResult<SimpleValue[]>
> {
  const p = hls.pool;
  assert(p);
  if (arrayRowMode)
    return p.query({
      text: q,
      rowMode: 'array',
      values: args,
    });
  return p.query<{ [key: string]: SimpleValue }>(q, args);
}

export async function list(
  q: string,
  args?: Array<string | null | number | boolean>,
) {
  const res = await query(q, args);
  return res.rows;
}

export async function first(
  q: string,
  args?: Array<string | null | number | boolean>,
) {
  const res = await list(q, args);
  return res[0] || null;
}

export async function hasOpenConnection() {
  if (!hls.pool || QueryExecutor.pids().length === 0) return false;
  const pids = QueryExecutor.pids();
  return DB.existsSomePendingProcess(...pids);
}

export async function closeAll() {
  try {
    await QueryExecutor.destroyAll();
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
    WHERE datistemplate = false
    ORDER BY datname != $1, datname`,
    [c.database],
  );
  return res.rows.map((r) => (r as { name: string }).name) as string[];
}
