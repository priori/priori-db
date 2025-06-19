import { TableInfo } from 'db/db';
import { SimpleValue } from 'types';
import { first, list } from './mysql';
import { label } from './mysqlDb';

export interface MysqlCol {
  Field: string;
  Type: string;
  Null: string;
  Default: string;
  Key: string;
  Comment: string | null;
}

export function fixCol(c: MysqlCol) {
  return {
    column_name: c.Field,
    data_type: c.Type.replace(/\(.*\)/, '').toUpperCase(),
    column_default: c.Default,
    not_null: c.Null === 'NO',
    comment: c.Comment || null,
    length: c.Type.match(/.*\((\d+)([,.]\d+)?\)/)
      ? parseInt(c.Type.replace(/.*\((\d+)([,.]\d+)?\)/, '$1'), 10)
      : null,
    scale: c.Type.match(/.*\((\d+)([,.]\d+)\)/)
      ? parseInt(c.Type.replace(/.*\((\d+)([,.](\d+))\)/, '$3'), 10)
      : null,
    is_primary: c.Key === 'PRI',
    enum: c.Type.match(/^enum\((.*)\)$/)
      ? c.Type.replace(/^enum\((.*)\)$/, '$1')
          .split(',')
          .map((x) => x.slice(1, -1))
      : null,
  };
}

export async function tableInfo(
  schema: string,
  table: string,
): Promise<TableInfo> {
  const colsP = list(`SHOW FULL COLUMNS FROM ${label(schema)}.${label(table)}`);
  const tableP = first(
    `SELECT table_type
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [schema, table],
  ) as Promise<{ TABLE_TYPE: string }>;
  const indexesRetP = list(
    `SHOW INDEXES FROM ${label(schema)}.${label(table)}`,
  ) as Promise<
    {
      Cardinality: number;
      Collation: 'A';
      Column_name: string;
      Comment: '';
      Expression: null;
      Index_comment: '';
      Index_type: string;
      Key_name: string;
      Non_unique: 1;
      Null: '';
      Packed: null;
      Seq_in_index: number;
      Sub_part: null;
      Table: string;
      Visible: 'YES' | 'NO';
    }[]
  >;
  const priviliges0P = list(
    `SELECT * FROM mysql.tables_priv
    WHERE Db = ? AND Table_name = ?`,
    [schema, table],
  ).catch((e) => {
    if (e?.code === 'ER_TABLEACCESS_DENIED_ERROR') return undefined;
    throw e;
  });
  const inforSchemaTableP = first(
    `SELECT *
    FROM information_schema.TABLES
    WHERE table_schema = ? AND table_name = ?`,
    [schema, table],
  );
  const viewP = first(
    `SELECT * FROM information_schema.VIEWS
    WHERE table_schema = ? AND table_name = ?`,
    [schema, table],
  );
  const innodbStatsP = first(
    `SELECT *
    FROM mysql.innodb_table_stats
    WHERE database_name = ? AND table_name = ?`,
    [schema, table],
  ).catch((e) => {
    if (e?.code === 'ER_TABLEACCESS_DENIED_ERROR') return undefined;
    throw e;
  });

  const [
    cols,
    table0,
    indexesRet,
    priviliges0,
    inforSchemaTable0,
    view0,
    innodbStats,
  ] = await Promise.all([
    colsP,
    tableP,
    indexesRetP,
    priviliges0P,
    inforSchemaTableP,
    viewP,
    innodbStatsP,
  ]);

  const inforSchemaTable: Record<string, SimpleValue> = {};
  for (const k in inforSchemaTable0) {
    inforSchemaTable[k.toLowerCase()] = inforSchemaTable0[k];
  }
  let view: Record<string, SimpleValue> | undefined;
  if (view0) {
    view = {};
    for (const k in view0) {
      view[k.toLowerCase()] = view0[k];
    }
  }

  const privileges = priviliges0?.map((p) => {
    const ps = {
      update: undefined,
      insert: undefined,
      select: undefined,
      delete: undefined,
      references: undefined,
      trigger: undefined,
      index: undefined,
      drop: undefined,
      alter: undefined,
      showView: undefined,
    };
    for (const p2 of p.Table_priv.split(',')) {
      (ps as any)[p2 === 'Show view' ? 'showView' : p2.toLowerCase()] = true;
    }
    return {
      roleName: p.User,
      host: p.Host,
      privileges: ps,
    };
  });

  indexesRet.sort((a, b) => a.Seq_in_index - b.Seq_in_index);
  const indexes: {
    name: string;
    definition: string;
    comment: string | null;
    type: string;
    pk: boolean;
    cols: string[];
  }[] = [];
  for (const i of indexesRet) {
    const index = indexes.find((x) => x.name === i.Key_name);
    if (index) {
      index.cols.push(i.Column_name);
    } else {
      indexes.push({
        name: i.Key_name,
        definition: '', // i.Index_type,
        comment: i.Index_comment || null,
        type: i.Index_type,
        pk: i.Key_name === 'PRIMARY',
        cols: [i.Column_name],
      });
    }
  }
  const definition = view?.view_definition;
  delete view?.view_definition;
  const comment =
    (!view && (inforSchemaTable.table_comment as string | null)) || null;
  delete inforSchemaTable.table_comment;
  const tableInfoRet: TableInfo = {
    definition: definition as string | undefined,
    info: {
      ...(view ? { 'information_schema.VIEWS': view } : undefined),
      'information_schema.TABLES': inforSchemaTable,
      ...(innodbStats ? { 'mysql.innodb_table_stats': innodbStats } : {}),
    },
    subType:
      table0.TABLE_TYPE === 'SYSTEM VIEW' || table0.TABLE_TYPE === 'VIEW'
        ? 'view'
        : table0.TABLE_TYPE === 'MAT_VIEW'
          ? 'mview'
          : 'table',
    comment,
    cols: cols.map((c) => fixCol(c as MysqlCol)),
    indexes,
    constraints: [],
    privileges,
  };
  return tableInfoRet;
}
