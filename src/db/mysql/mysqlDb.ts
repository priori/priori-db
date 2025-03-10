/* eslint-disable @typescript-eslint/no-unused-vars */
import { DBInterface } from 'db/DBInterface';
import { buildFilterWhere, buildFinalQueryWhere } from 'db/util';
import {
  EntityType,
  Filter,
  QueryResultData,
  SimpleValue,
  Sort,
  TableColumnType,
} from 'types';
import { assert } from 'util/assert';
import hotLoadSafe from 'util/hotLoadSafe';
import { execute, first, list, openConnection, val } from './mysql';
import { newQueryExecutor } from './newQueryExecutor';
import { selectExecution } from './selectExecution';
import { MysqlCol, fixCol, tableInfo } from './tableInfo';

function prettyBytes(bytes: number) {
  if (bytes === 0) return '0 byte';
  if (bytes === 1) return '1 byte';
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024) {
    n /= 1024;
    i += 1;
  }
  return `${Math.round(n)} ${units[i]}`;
}

export function label(s: string) {
  return `\`${s.replace(/`/g, '``')}\``;
}

function str(s: string) {
  return `'${s.replace(/'/g, "'").replace(/\\/g, '\\\\')}'`;
}

function privsToPrivileges(
  p: Record<string, string> | string,
  allowed: string[],
) {
  if (typeof p === 'string') {
    const parts = p.split(',');
    const privileges2: {
      [k: string]: boolean;
    } = {};
    for (const part of parts) {
      const type = `${part[0].toLowerCase()}${part.substring(1).replace(/ \w/g, (m) => m[1].toUpperCase())}`;
      if (type !== undefined && allowed.includes(type))
        privileges2[type] = true;
    }
    return privileges2;
  }
  const privileges: Record<string, boolean> = {};
  for (const k in p) {
    if (k.endsWith('_priv') && (p[k] === 'Y' || p[k] === 'N')) {
      const pName = `${k[0].toLowerCase()}${k
        .substring(1)
        .replace('_priv', '')
        .replace(/_(\w)/g, (_, v) => v.toUpperCase())}`;
      if (allowed.includes(pName)) privileges[pName] = p[k] === 'Y';
    }
  }
  return privileges;
}

export const openIds = new Set<number>();

export const mysqlDb: DBInterface = {
  async basicInfo() {
    const versionAndSize = await first('SELECT version() version');
    return { version: `MySQL Version: ${versionAndSize.version}` };
  },
  async extraInfo() {
    return {};
  },
  variables: {
    async update(name: string, value: string) {
      await execute(`SET GLOBAL ${name} = ${str(value)}`);
    },
    async load() {
      const paramsRes = await list('SHOW VARIABLES');
      const params = paramsRes as {
        Variable_name: string;
        Value: string;
      }[];
      return params.map((p) => ({
        name: p.Variable_name,
        setting: p.Value,
        description: '',
      }));
    },
    title: 'Params',
  },
  async listAll(): Promise<
    {
      name: string;
      internal: boolean;
      current: boolean;
      tables: {
        type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
        name: string;
      }[];
      functions?: {
        type: EntityType & ('FUNCTION' | 'PROCEDURE');
        name: string;
      }[];
      sequences?: {
        type: EntityType & 'SEQUENCE';
        name: string;
      }[];
      domains?: {
        type: EntityType & 'DOMAIN';
        name: string;
      }[];
    }[]
  > {
    const currentDbP = await val('SELECT DATABASE()');
    const dbsP = await list('SHOW DATABASES');
    const tablesP = await list(
      `SELECT table_name, table_schema, table_type
       FROM INFORMATION_SCHEMA.TABLES ORDER BY table_name`,
    );
    const functionsP = await list(`
      SELECT routine_name, routine_schema, routine_catalog, routine_type
      FROM information_schema.routines`);
    const [currentDb, dbs0, tables0, functions0] = await Promise.all([
      currentDbP,
      dbsP,
      tablesP,
      functionsP,
    ]);
    const functions = functions0.map((f) => ({
      type: f.ROUTINE_TYPE as EntityType & ('FUNCTION' | 'PROCEDURE'),
      name: f.ROUTINE_NAME,
      schema: f.ROUTINE_SCHEMA,
    }));
    const dbs = dbs0.map((db) => db.Database as string);
    const tables = tables0.map((t) => ({
      type: (t.TABLE_TYPE === 'SYSTEM VIEW' || t.TABLE_TYPE === 'VIEW'
        ? 'VIEW'
        : t.type === 'MAT_VIEW'
          ? 'MATERIALIZED VIEW'
          : 'BASE TABLE') as 'VIEW' | 'MATERIALIZED VIEW' | 'BASE TABLE',
      name: t.TABLE_NAME,
      DATABASE: t.TABLE_SCHEMA,
    }));
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
      if (aInternal && !bInternal) return 1;
      if (!aInternal && bInternal) return -1;
      if (a === currentDb) return -1;
      if (b === currentDb) return 1;
      return a.localeCompare(b);
    });
    const listAll = dbs.map((db) => ({
      name: db,
      internal:
        db === 'information_schema' ||
        db === 'mysql' ||
        db === 'performance_schema' ||
        db === 'sys',
      current: db === currentDb,
      tables: tables
        .filter((t) => t.DATABASE === db)
        .map((t) => ({
          type: t.type,
          name: t.name,
        })),
      functions: functions
        .filter((f) => f.schema === db)
        .map((f) => ({
          type: f.type,
          name: f.name,
        })),
    }));
    return listAll;
  },

  tableInfo,

  async updateColumn(
    schema: string,
    table: string,
    column: string,
    update: {
      name?: string;
      comment?: string | null;
      type?: string;
      length?: number;
      scale?: number;
      notNull?: boolean;
      default?: string | null;
      enum?: string[];
    },
  ) {
    const con = await openConnection();
    try {
      con.query('START TRANSACTION;');
      const [cols] = await con.query(
        `SHOW COLUMNS FROM ${label(schema)}.${label(table)}`,
      );
      const curr = (cols as MysqlCol[] | undefined)
        ?.map((c: MysqlCol) => fixCol(c as MysqlCol))
        .find((c) => c.column_name === column);
      if (!curr) throw new Error('Column not found');
      const merge = {
        comment: update?.comment ?? curr.comment,
        type: update?.type ?? curr.data_type,
        length: update?.length ?? curr.length,
        scale: update?.scale ?? curr.scale,
        notNull: update?.notNull ?? curr.not_null,
        default:
          update?.default !== undefined ? update.default : curr.column_default,
      };
      const q = `ALTER TABLE ${label(schema)}.${label(table)}
          MODIFY COLUMN ${label(column)} ${merge.type} ${
            merge.type?.toLowerCase() === 'enum'
              ? `(${update.enum?.map((v) => str(v)).join(', ') ?? ''})`
              : ''
          }${
            merge.length
              ? `(${merge.length}${merge.scale ? `, ${merge.scale}` : ''})`
              : ''
          } ${merge.notNull ? 'NOT NULL' : 'NULL'} ${
            merge.default
              ? `DEFAULT ${merge.default}`
              : merge.default === null
                ? 'DEFAULT NULL'
                : ''
          } ${merge.comment ? `COMMENT ?` : ''}`;
      await con.query(q, merge.comment ? [merge.comment] : []);
      if (update.name) {
        await con.query(
          `ALTER TABLE ${label(schema)}.${label(table)}
          RENAME COLUMN ${label(column)} TO ${label(update.name)}`,
        );
      }
      await con.query('COMMIT;');
    } catch (e) {
      await con.query('ROLLBACK;');
      throw e;
    }
  },
  async renameColumn(
    schema: string,
    table: string,
    col: string,
    newName: string,
  ): Promise<void> {
    await execute(
      `ALTER TABLE ${label(schema)}.${label(table)}
      RENAME COLUMN ${label(col)} TO ${label(newName)}`,
    );
  },
  async commentColumn(
    schema: string,
    table: string,
    col: string,
    comment: string,
  ): Promise<void> {
    const cols = await list(
      `SHOW COLUMNS FROM ${label(schema)}.${label(table)}`,
    );
    const curr = (cols as MysqlCol[] | undefined)
      ?.map((c: MysqlCol) => fixCol(c as MysqlCol))
      .find((c) => c.column_name === col);
    if (!curr) throw new Error('Column not found');
    await execute(
      `ALTER TABLE ${label(schema)}.${label(table)}
      MODIFY COLUMN ${label(col)} ${curr.data_type} ${
        curr.length
          ? `(${curr.length}${curr.scale ? `, ${curr.scale}` : ''})`
          : ''
      } ${curr.not_null ? 'NOT NULL' : 'NULL'} ${curr.column_default ? `DEFAULT ${curr.column_default}` : ''} COMMENT ?`,
      [comment],
    );
  },
  async newColumn(
    schema: string,
    table: string,
    col: {
      name: string;
      type: string;
      length?: number;
      scale?: number;
      comment: string | null;
      notNull?: boolean;
      default?: string;
      enum?: string[];
    },
  ): Promise<void> {
    const q = `ALTER TABLE ${label(schema)}.${label(table)}
      ADD COLUMN ${label(col.name)} ${col.type} ${
        col.enum && col.type.toLowerCase() === 'enum'
          ? `(${col.enum.map((v) => str(v)).join(', ')})`
          : ''
      }${
        col.length ? `(${col.length}${col.scale ? `, ${col.scale}` : ''})` : ''
      } ${col.notNull ? 'NOT NULL' : 'NULL'} ${col.default ? `DEFAULT ${col.default}` : ''} ${col.comment ? `COMMENT ?` : ''}`;
    await execute(q, col.comment ? [col.comment] : []);
  },

  async dropTable(schema: string, name: string, cascade = false) {
    await execute(
      `DROP TABLE ${label(schema)}.${label(name)} ${cascade ? 'CASCADE' : ''}`,
    );
  },

  async updateTable(
    schema: string,
    table: string,
    update: { comment?: string | null; name?: string; schema?: string },
  ): Promise<void> {
    if (
      update.comment &&
      update.name === undefined &&
      update.schema === undefined
    ) {
      await execute(
        `ALTER TABLE ${label(schema)}.${label(table)} COMMENT = ?`,
        [update.comment],
      );
      return;
    }
    if (update.comment === undefined) {
      await execute(
        `RENAME TABLE ${label(schema)}.${label(table)}
        TO ${update.schema ? `${label(update.schema)}.` : ''}${label(update.name || table)}`,
      );
      return;
    }
    const con = await openConnection();
    await con.query('START TRANSACTION;');
    try {
      if (update.name || update.schema) {
        await con.execute(
          `RENAME TABLE ${label(schema)}.${label(table)}
          TO ${update.schema ? `${label(update.schema)}.` : ''}${label(update.name || table)}`,
        );
      }
      if (update.comment) {
        await con.execute(
          `ALTER TABLE ${label(schema)}.${label(table)} COMMENT = ?`,
          [update.comment],
        );
      }
      con.query('COMMIT;');
    } catch (e) {
      con.query('ROLLBACK;');
      throw e;
    }
  },

  async defaultSort(): Promise<
    { field: string; direction: 'asc' | 'desc' }[] | null
  > {
    return [];
  },

  async pks(schema: string, table: string): Promise<string[]> {
    const cols = await list(
      `SHOW FULL COLUMNS FROM ${label(schema)}.${label(table)}`,
    );
    const cols2 = cols.map((c) => fixCol(c as MysqlCol));
    return cols2.filter((c) => c.is_primary).map((c) => c.column_name);
  },

  async select({
    schema,
    table,
    sort,
    filter,
    limit,
  }: {
    schema: string;
    table: string;
    sort: Sort | null;
    filter: Filter | undefined;
    limit: 1000 | 10000 | 'unlimited';
  }): Promise<QueryResultData> {
    const { where, params } = filter
      ? buildFinalQueryWhere(label, str, filter)
      : { where: '', params: [] };
    const sql = `SELECT * FROM ${label(schema)}.${label(table)} ${
      where ? `WHERE ${where} ` : ''
    }${
      sort && sort.length
        ? `ORDER BY ${sort
            .map(
              (x) =>
                `${label(x.field)}${x.direction === 'desc' ? ' DESC' : ''}`,
            )
            .join(', ')} `
        : ''
    }${typeof limit === 'number' ? `LIMIT ${limit}` : ''}`;
    const pool = hotLoadSafe.mysql;
    assert(pool);
    if (limit === 'unlimited') {
      return selectExecution(sql, params);
    }
    const [rows, cols] = await pool.query({
      sql,
      values: params,
      rowsAsArray: true,
    });
    const ret = {
      fields:
        cols?.map((f) => ({
          name: f.name,
          type:
            f.columnType === 7 ||
            (f.columnType && f.columnType >= 10 && f.columnType < 14)
              ? 'date'
              : undefined,
        })) ?? [],
      rows: rows as SimpleValue[][],
    };
    return ret;
  },

  buildFilterWhere(filter: Filter): string {
    return buildFilterWhere(label, str, filter);
  },

  async tableSize(
    schema: string,
    table: string,
  ): Promise<{
    size: number;
    pretty: string;
    onlyTable: string;
    indexes: string;
  }> {
    const size = await first(
      `SELECT data_length, index_length FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?`,
      [schema, table],
    );
    return {
      size: size.DATA_LENGTH + size.INDEX_LENGTH,
      pretty: prettyBytes(size.DATA_LENGTH + size.INDEX_LENGTH),
      onlyTable: prettyBytes(size.DATA_LENGTH),
      indexes: prettyBytes(size.INDEX_LENGTH),
    };
  },

  newQueryExecutor,

  async hasOpenConnection(): Promise<boolean> {
    if (openIds.size === 0) return false;
    const ids = Array.from(openIds).join(', ');
    return !!(await val(`SELECT count(*) > 0 \`active\`
      FROM performance_schema.events_transactions_current tx
      INNER JOIN performance_schema.threads t
      ON
        tx.thread_id = t.thread_id
      WHERE
        t.processlist_id IN (${ids}) AND
        tx.\`STATE\` = "ACTIVE"`));
  },

  async inOpenTransaction(id: number): Promise<boolean> {
    return !!(await val(`SELECT \`STATE\` = "ACTIVE" \`active\`
      FROM performance_schema.events_transactions_current
      WHERE thread_id = (SELECT t.thread_id
        FROM performance_schema.threads t
        WHERE
          t.processlist_id = ${id})`));
  },

  async types() {
    return [
      // text
      'CHAR(size)',
      'VARCHAR(size)',
      'BINARY(size)',
      'VARBINARY(size)',
      'TINYBLOB',
      'TINYTEXT',
      'TEXT(size)',
      'BLOB(size)',
      'MEDIUMTEXT',
      'MEDIUMBLOB',
      'LONGTEXT',
      'LONGBLOB',
      'BIT(size)',
      // numeric
      'TINYINT(size)',
      'BOOL',
      'BOOLEAN',
      'SMALLINT(size)',
      'MEDIUMINT(size)',
      'INT(size)',
      'INTEGER(size)',
      'BIGINT(size)',
      'FLOAT(size, d)',
      // 'FLOAT(p)',
      'DOUBLE(size, d)',
      'DOUBLE PRECISION(size, d)',
      'DECIMAL(size, d)',
      'DEC(size, d)',
      // date
      'DATE',
      'DATETIME',
      'TIMESTAMP',
      'TIME',
      'YEAR',
      'ENUM',
    ].map((v) => {
      return {
        name: v.replace(/\(.*\)/, ''),
        allowLength: !!v.match(/\(.*\)/),
        allowPrecision: !!v.match(/\(.*,.*\)/),
      };
    });
  },
  indexesTypes: undefined,
  commentIndex: undefined,
  async removeIndex(
    schema: string,
    table: string,
    index: string,
  ): Promise<void> {
    await execute(
      `DROP INDEX ${label(index)} ON ${label(schema)}.${label(table)}`,
    );
  },
  async renameIndex(
    schema: string,
    table: string,
    index: string,
    newName: string,
  ): Promise<void> {
    await execute(
      `ALTER TABLE ${label(schema)}.${label(table)}
      RENAME INDEX ${label(index)} TO ${label(newName)}`,
    );
  },
  async newIndex(
    schema: string,
    table: string,
    cols: {
      name: string;
      sort?: 'asc' | 'desc' | undefined;
      nulls?: 'last' | 'first' | undefined;
    }[],
    method?: string | undefined,
    unique?: boolean | undefined,
  ): Promise<void> {
    const is = await list(`SHOW INDEXES FROM ${label(schema)}.${label(table)}`);
    let name = `idx_${table}_${cols.map((c) => c.name).join('_')}`;
    let count = 1;
    // eslint-disable-next-line no-loop-func
    while (is.find((i) => i.Key_name === name)) {
      count += 1;
      name = `idx_${table}_${cols.map((c) => c.name).join('_')}_${count}`;
    }
    const q = `CREATE ${unique ? 'UNIQUE' : ''} INDEX ${name} ON ${label(schema)}.${label(table)} (${cols
      .map(
        (c) =>
          `${c.nulls === 'last' ? `ISNULL(${label(c.name)}), ` : ''}${label(c.name)} ${c.sort ?? ''}`,
      )
      .join(', ')})${method ? ` USING ${method}` : ''}`;
    await execute(q);
  },
  async createSchema(schemaName: string): Promise<void> {
    await execute(`CREATE SCHEMA ${label(schemaName)}`);
  },
  async dropSchema(schemaName: string, cascade?: boolean): Promise<void> {
    await execute(
      `DROP SCHEMA ${label(schemaName)} ${cascade ? 'CASCADE' : ''}`,
    );
  },
  nullsLast: false,
  async schema(name: string) {
    const privilegesP = list(`SELECT * FROM mysql.db WHERE Db = ?`, [name]);
    const schemataP = first(
      `SELECT * FROM information_schema.schemata WHERE schema_name = ?`,
      [name],
    );
    const [privileges0, schemata0] = await Promise.all([
      privilegesP,
      schemataP,
    ]);
    const schemata: Record<string, SimpleValue> = {};
    for (const k in schemata0) {
      schemata[k.toLowerCase()] = schemata0[k];
    }
    const privileges = privileges0
      .map((p) => {
        const rolePrivileges: Record<string, boolean> = {};
        for (const k in p) {
          if (k.endsWith('_priv') && (p[k] === 'Y' || p[k] === 'N')) {
            const pName = `${k[0].toLowerCase()}${k
              .substring(1)
              .replace('_priv', '')
              .replace(/_(\w)/g, (_, v) => v.toUpperCase())}`;
            if (pName !== 'createTmpTable')
              rolePrivileges[pName] = p[k] === 'Y';
          }
        }
        return {
          roleName: p.User,
          host: p.Host,
          privileges: rolePrivileges,
        };
      })
      .filter((v) => Object.values(v.privileges).filter((p) => p).length > 0);
    return {
      info: {
        'information_schema.SCHEMATA': schemata,
      },
      comment: '',
      pgNamesspace: null,
      privileges,
    };
  },
  renameSchema: null,
  updateSchemaComment: null,

  autoIncrement: true,
  async createTable(newTable: {
    name: string;
    schema: string;
    tableSpace: string;
    comment: string;
    like?: string | undefined;
    columns: {
      name: string;
      type: TableColumnType | null;
      length: string;
      precision: string;
      notNull: boolean;
      primaryKey: boolean;
      autoIncrement: boolean;
      enum?: string[];
    }[];
  }): Promise<void> {
    const q = `
      CREATE TABLE ${label(newTable.schema)}.${label(newTable.name)} (
        ${newTable.columns
          .map(
            (c) =>
              `${label(c.name)} ${c.type?.name}${
                c.type?.name.toLowerCase() === 'enum'
                  ? `(${c.enum?.map((v) => str(v)).join(', ') ?? ''})`
                  : ''
              }${
                c.length
                  ? `(${c.length}${c.precision ? `,${c.precision}` : ''})`
                  : ''
              }${
                c.notNull ? ' NOT NULL' : ''
              }${c.autoIncrement ? ' AUTO_INCREMENT' : ''}${
                c.primaryKey ? ' PRIMARY KEY' : ''
              }`,
          )
          .join(', ')}
      )`;
    await execute(q);
  },

  updateViewSchema: false,
  async updateView(
    schema: string,
    table: string,
    update: {
      name?: string | undefined;
      schema?: string | undefined;
    },
  ): Promise<void> {
    await execute(
      `RENAME TABLE ${label(schema)}.${label(table)}
       TO ${update.schema ? `${label(update.schema)}.` : ''}${label(update.name || table)}`,
    );
  },
  async removeCol(schema: string, table: string, col: string): Promise<void> {
    await execute(
      `ALTER TABLE ${label(schema)}.${label(table)} DROP COLUMN ${label(col)}`,
    );
  },
  async update(
    schema: string,
    table: string,
    updates: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string | null };
    }[],
    inserts: { [fieldName: string]: string | null }[],
    removals: { [fieldName: string]: string | number | null }[],
  ): Promise<void> {
    const con = await openConnection();
    try {
      await con.query('START TRANSACTION;');
      for (const { where, values } of updates) {
        await con.query(
          `UPDATE ${label(schema)}.${label(table)} SET ${Object.keys(values)
            .map((k) => `${label(k)} = ?`)
            .join(', ')} WHERE ${Object.keys(where)
            .map((k) => `${label(k)} = ?`)
            .join(' AND ')}`,
          [...Object.values(values), ...Object.values(where)],
        );
      }
      if (removals.length > 0)
        for (const where of removals) {
          await con.query(
            `DELETE FROM ${label(schema)}.${label(table)} WHERE ${Object.keys(
              where,
            )
              // eslint-disable-next-line no-plusplus
              .map((k) => `${label(k)} = ?`)
              .join(' AND ')}`,
            [...Object.values(where)],
          );
        }
      for (const insert of inserts) {
        await con.query(
          `INSERT INTO ${label(schema)}.${label(table)} (${Object.keys(insert)
            .map((k) => label(k))
            .join(', ')}) VALUES (${Object.keys(insert)
            .map(() => `?`)
            .join(', ')})`,
          Object.values(insert),
        );
      }
      await con.query('COMMIT');
    } catch (err) {
      await con.query('ROLLBACK');
      throw err;
    } finally {
      con.release();
    }
  },

  closeAll(): Promise<void> {
    throw new Error('Not implemented!');
  },
  async operators() {
    return [
      'eq',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'like',
      'nlike',
      'regexplike',
      'nregexplike',
      'null',
      'notnull',
      'in',
      'nin',
      'between',
      'nbetween',
    ];
  },

  updateColumnViewName: false,
  updateColumnViewComment: false,
  updateViewComment: false,

  functions: {
    async function(schema: string, name: string) {
      const routine0 = await first(
        `SELECT *
        FROM information_schema.routines
        WHERE routine_schema = ? AND routine_name = ?`,
        [schema, name],
      );
      const isProc = routine0.ROUTINE_TYPE === 'PROCEDURE';
      delete routine0.ROUTINE_DEFINITION;
      const comment = routine0.ROUTINE_COMMENT;
      const def = await first(
        `SHOW CREATE ${isProc ? 'PROCEDURE' : 'FUNCTION'} ${label(schema)}.${label(name)}`,
      );
      const privs = await list(
        `SELECT User, Host, Proc_priv
        FROM mysql.procs_priv
        WHERE Db = ? AND Routine_name = ?`,
        [schema, name],
      );
      const routine: Record<string, SimpleValue> = {};
      for (const k in routine0) {
        routine[k.toLowerCase()] = routine0[k];
      }
      const privileges: {
        roleName: string;
        host: string;
        privileges: {
          [k: string]: boolean;
        };
      }[] = [];
      for (const p of privs) {
        const parts = p.Proc_priv.split(',');
        const privileges2: {
          [k: string]: boolean;
        } = {};
        for (const part of parts) {
          const type =
            part === 'Execute'
              ? 'execute'
              : part === 'Alter Routine'
                ? 'alterRoutine'
                : undefined;
          if (type !== undefined) privileges2[type] = true;
        }
        privileges.push({
          roleName: p.User,
          host: p.Host,
          privileges: privileges2,
        });
      }
      return {
        info: {
          'information_schema.ROUTINES': routine,
        },
        type: routine.routine_type === 'PROCEDURE' ? 'procedure' : 'function',
        comment: comment ?? '',
        definition: def?.[`Create ${isProc ? 'Procedure' : 'Function'}`] ?? '',
        privileges,
      };
    },

    rename: false,
    async updateFunction(
      schema: string,
      name: string,
      update: { comment?: string | null; name?: string; schema?: string },
    ): Promise<void> {
      const isProc0 = await first(
        `SELECT routine_type = 'PROCEDURE' p FROM information_schema.routines
        WHERE routine_schema = ? AND routine_name = ?`,
        [schema, name],
      );
      const isProc = (isProc0 as any)?.p;
      const entityName = isProc ? 'PROCEDURE' : 'FUNCTION';
      if (update.comment) {
        await execute(
          `ALTER ${entityName} ${label(schema)}.${label(name)}
            COMMENT ?`,
          [update.comment],
        );
      }
    },
    dropCascade: false,
    async dropFunction(schema: string, name: string): Promise<void> {
      const isProc0 = await first(
        `SELECT routine_type = 'PROCEDURE' p FROM information_schema.routines
        WHERE routine_schema = ? AND routine_name = ?`,
        [schema, name],
      );
      const isProc = (isProc0 as any)?.p;
      const entityName = isProc ? 'PROCEDURE' : 'FUNCTION';
      await execute(`DROP ${entityName} ${label(schema)}.${label(name)}`);
    },

    privilegesTypes() {
      return Promise.resolve(['execute', 'alterRoutine']);
    },

    async updateFunctionPrivileges(schema, func, user, privileges, host) {
      if (
        privileges.execute === undefined &&
        privileges.alterRoutine === undefined
      )
        return;
      const isProc0 = await first(
        `
          SELECT routine_type = 'PROCEDURE' p FROM information_schema.routines
          WHERE routine_schema = ? AND routine_name = ?
        `,
        [schema, func],
      );
      const isProc = (isProc0 as any)?.p;
      const type = isProc ? 'PROCEDURE' : 'FUNCTION';
      if (privileges.execute) {
        await execute(
          `GRANT EXECUTE ON ${type} ${label(schema)}.${label(
            func,
          )} TO ${label(user)}${host ? `@${label(host)}` : ''}`,
        );
      } else if (privileges.execute === false) {
        await execute(
          `REVOKE EXECUTE ON ${type} ${label(schema)}.${label(
            func,
          )} FROM ${label(user)}${host ? `@${label(host)}` : ''}`,
        );
      }
      if (privileges.alterRoutine) {
        await execute(
          `GRANT ALTER ROUTINE ON ${type} ${label(schema)}.${label(
            func,
          )} TO ${label(user)}${host ? `@${label(host)}` : ''}`,
        );
      } else if (privileges.alterRoutine === false) {
        await execute(
          `REVOKE ALTER ROUTINE ON ${type} ${label(schema)}.${label(
            func,
          )} FROM ${label(user)}${host ? `@${label(host)}` : ''}`,
        );
      }
    },
  },

  privileges: {
    rolesHost: true,
    async tablePrivilegesTypes() {
      return [
        'update',
        'insert',
        'select',
        'delete',
        'references',
        'trigger',
        'index',
        'drop',
        'alter',
        'showView',
      ];
    },
    async createRole({
      name,
      host,
      password,
    }: {
      name: string;
      host: string;
      password: string;
    }): Promise<void> {
      execute(
        `CREATE USER ${label(name)}${host ? `@${label(host)}` : ''}
          ${password ? `IDENTIFIED BY ?` : ''}`,
        password ? [password] : [],
      );
    },
    async updatePassword(name: string, password: string, host: string) {
      await execute(
        `ALTER USER ${label(name)}${host ? `@${label(host)}` : ''} IDENTIFIED BY ?`,
        [password],
      );
    },
    async dropPassword(name: string, host: string) {
      await execute(
        `ALTER USER ${label(name)}${host ? `@${label(host)}` : ''} IDENTIFIED BY ''`,
      );
    },
    async schemaPrivilegesTypes() {
      return [
        'alter',
        'alterRoutine',
        'create',
        'createRoutine',
        // 'createTemporaryTables',
        'createView',
        'delete',
        'drop',
        'execute',
        // grant?
        'index',
        'event',
        'insert',
        'lockTables',
        'references',
        'select',
        'showView',
        'trigger',
        'update',
      ];
    },
    async updateSchemaPrivileges(
      schema: string,
      grantee: string,
      privileges: {
        [k: string]: boolean | undefined;
      },
      host?: string,
    ) {
      const tx = await openConnection();
      try {
        tx.query('START TRANSACTION;');
        for (const k in privileges) {
          const priv = k.replace(/([A-Z])/g, (m) => ` ${m}`).toUpperCase();
          if (privileges[k]) {
            await tx.query(
              `GRANT ${priv} ON ${label(schema)}.* TO ${label(grantee)}${host ? `@${label(host)}` : ''}`,
            );
          } else if (privileges[k] !== undefined) {
            await tx.query(
              `REVOKE ${priv} ON ${label(schema)}.* FROM ${label(grantee)}${host ? `@${label(host)}` : ''}`,
            );
          }
        }
      } catch (e) {
        tx.query('ROLLBACK;');
        throw e;
      }
    },

    async role(name: string, host: string) {
      const dbsP = list(`SELECT * FROM mysql.db WHERE User = ?`, [name, host]);
      const functionsP = list(
        `SELECT * FROM mysql.procs_priv WHERE User = ? AND Host = ?`,
        [name, host],
      );
      const tablesP = list(
        `SELECT * FROM mysql.tables_priv WHERE User = ? AND Host = ?`,
        [name, host],
      );
      const [dbs0, dbPs, functions0, fsPs, tables0, tbsPs, { db }, user] =
        await Promise.all([
          dbsP,
          mysqlDb.privileges!.schemaPrivilegesTypes!(),
          functionsP,
          mysqlDb.functions!.privilegesTypes!(),
          tablesP,
          mysqlDb.privileges!.tablePrivilegesTypes!(),
          first('SELECT DATABASE() "db"', []),
          first(
            `SELECT
              *,
              authentication_string != '' and
                authentication_string IS not NULL is_user
              FROM mysql.user WHERE User = ? AND Host = ?`,
            [name, host],
          ),
        ]);
      dbs0.sort((a, b) => {
        if (a.Db === db) return -1;
        if (b.Db === db) return 1;
        return a.Db.localeCompare(b.Db);
      });
      delete user.Host;
      delete user.User;
      for (const k in user) {
        if (k.endsWith('_priv') || user[k] instanceof Buffer) delete user[k];
      }
      delete user.authentication_string;
      const isUser = user.is_user;
      delete user.is_user;
      return {
        isUser,
        info: {
          'mysq.user': user,
        },
        privileges: {
          tables: tables0.map((t) => ({
            schema: t.Db,
            table: t.Table_name,
            privileges: privsToPrivileges(t.Table_priv, tbsPs),
          })),
          functions: functions0.map((f) => ({
            schema: f.Db,
            name: f.Routine_name,
            privileges: privsToPrivileges(f.Proc_priv, fsPs),
          })),
          schemas: dbs0.map((d) => ({
            name: d.Db,
            privileges: privsToPrivileges(d, dbPs),
          })),
        },
      };
    },

    async dropRole(name, host) {
      await execute(`DROP ROLE ${label(name)}${host ? `@${label(host)}` : ''}`);
    },

    async renameRole(name, newName, host) {
      await execute(
        `RENAME USER ${label(name)}${host ? `@${label(host)}` : ''}
        TO ${label(newName)}${host ? `@${label(host)}` : ''}`,
      );
    },

    async listRoles() {
      const roles = await list(`
        SELECT
          User,
          Host,
          authentication_string != '' and
            authentication_string IS not NULL is_user
        FROM mysql.user
        ORDER BY User, Host
      `);
      return roles.map((r) => ({
        name: r.User,
        isUser: r.is_user,
        host: r.Host,
      }));
    },

    async updateTablePrivileges(
      schema: string,
      table: string,
      grantee: string,
      privileges: {
        [k: string]: boolean;
      },
      host?: string,
    ): Promise<void> {
      const grants = Object.keys(privileges)
        .filter((k) => privileges[k as keyof typeof privileges])
        .map((k) =>
          k.replace(/([A-Z])/g, (m) => ` ${m.toLowerCase()}`).toUpperCase(),
        )
        .join(', ');
      const revokes = Object.keys(privileges)
        .filter((k) => privileges[k as keyof typeof privileges] === false)
        .map((k) =>
          k.replace(/([A-Z])/g, (m) => ` ${m.toLowerCase()}`).toUpperCase(),
        )
        .join(', ');
      const con = await openConnection();
      try {
        if (revokes) {
          await con.query(
            `REVOKE ${revokes} ON ${label(schema)}.${label(table)} FROM ${label(grantee)}${host ? `@${label(host)}` : ''}`,
          );
        }
        if (grants) {
          await con.query(
            `GRANT ${grants} ON ${label(schema)}.${label(table)} TO ${label(grantee)}${host ? `@${label(host)}` : ''}`,
          );
        }
        con.query('COMMIT;');
      } catch (e) {
        con.query('ROLLBACK;');
        throw e;
      }
    },
  },
};
