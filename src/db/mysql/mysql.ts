import mysql from 'mysql2/promise';
import { ConnectionConfiguration } from 'types';
import hotLoadSafe from 'util/hotLoadSafe';

export async function mysqlListDatabases(
  c: Omit<ConnectionConfiguration, 'id'>,
) {
  const connection = await mysql.createConnection({
    host: c.host,
    user: c.user,
    password: c.password,
    port: c.port,
    dateStrings: true,
    ...(c.requireSsl
      ? {
          ssl: {
            rejectUnauthorized: true,
          },
        }
      : undefined),
  });
  const [rows] = await connection.query('SHOW DATABASES');
  connection.end();
  const dbs = (rows as { Database: string }[]).map((r: any) => r.Database);
  const currentDb = c.database;
  dbs.sort((a, b) => {
    const aInternal =
      a === 'information_schema' ||
      a === 'mysql' ||
      a === 'sys' ||
      a === 'performance_schema';
    const bInternal =
      b === 'information_schema' ||
      b === 'mysql' ||
      b === 'sys' ||
      b === 'performance_schema';
    if (a === currentDb) return -1;
    if (b === currentDb) return 1;
    if (aInternal && !bInternal) return 1;
    if (!aInternal && bInternal) return -1;
    return a.localeCompare(b);
  });
  return dbs;
}

export async function mysqlConnect(c: ConnectionConfiguration, name: string) {
  const connection = mysql.createPool({
    host: c.host,
    user: c.user,
    password: c.password,
    database: name,
    port: c.port,
    dateStrings: true,
    ...(c.requireSsl
      ? {
          ssl: {
            rejectUnauthorized: true,
          },
        }
      : undefined),
  });
  hotLoadSafe.mysql = connection;
  (window as any).mysql = connection;
}

export async function execute(
  query: string,
  params: (string | number | null)[] = [],
) {
  if (!hotLoadSafe.mysql) throw new Error('No connection');
  const con = hotLoadSafe.mysql;
  return con.query(query, params);
}

export async function list(
  query: string,
  params: (string | number | null)[] = [],
) {
  if (!hotLoadSafe.mysql) throw new Error('No connection');
  const con = hotLoadSafe.mysql;
  const [rows] = await con.query(query, params);
  if (!(rows instanceof Array)) {
    throw new Error('Rows is not an array');
  }
  return rows as Array<{ [k: string]: any }>;
}

export async function first(
  query: string,
  params: (string | number | null)[] = [],
) {
  const rows = await list(query, params);
  return rows[0];
}

export async function val(
  query: string,
  params: (string | number | null)[] = [],
) {
  const row = await first(query, params);
  return row ? Object.values(row)[0] : undefined;
}

export function openConnection() {
  if (!hotLoadSafe.mysql) throw new Error('No connection');
  const con = hotLoadSafe.mysql;
  return con.getConnection();
}
