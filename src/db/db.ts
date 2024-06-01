import {
  ConnectionConfiguration,
  SequencePrivileges,
  TablePrivileges,
} from 'types';
import hotLoadSafe from 'util/hotLoadSafe';
import { DBInterface } from './DBInterface';
import {
  connect as pgConnect,
  listDatabases as pgListDabases,
} from './pg/Connection';
import { DB } from './pg/DB';

export interface DomainInfo {
  type: {
    [k: string]: string | number | null | boolean;
  };
  comment: string | null;
  privileges: string[];
  owner: string;
  hideInternalRoles: true;
}

export interface SequenceInfo {
  type: {
    [key: string]: string | number | boolean | null;
  };
  lastValue: number | string | null;
  comment: string | null;
  owner: string;
  privileges: { roleName: string; privileges: SequencePrivileges }[];
}

export interface ColTableInfo {
  column_name: string;
  data_type: string;
  column_default: string;
  not_null: boolean | string;
  comment: string | null;
  length: number;
  scale: number;
  is_primary: boolean;
}

export interface TableInfo {
  comment: string | null;
  cols?: ColTableInfo[];
  privileges?: {
    roleName: string;
    privileges: TablePrivileges;
  }[];
  indexes?: {
    name: string;
    definition: string;
    comment: string | null;
    type: string;
    pk: boolean;
    cols: string[];
  }[];
  table: {
    tableowner: string;
    tablespace: string;
    hasindexes: boolean;
    hasrules: boolean;
    hastriggers: boolean;
    rowsecurity: boolean;
    uid: number;
    view_definition: string | null;
  } | null;
  view: {
    viewowner: string;
    definition: string;
  } | null;
  mView: {
    viewowner: string;
    matviewowner: string;
    tablespace: string;
    hasindexes: boolean;
    ispopulated: boolean;
    definition: string;
  } | null;
  constraints:
    | {
        name: string;
        type: string;
        definition: string;
        comment: string | null;
      }[]
    | null;
  type: {
    [k: string]: string | number | null | boolean;
  };
}

export type SimpleValue =
  | number
  | string
  | boolean
  | null
  | { [key: string]: SimpleValue }
  | SimpleValue[];

export interface QueryResultDataField {
  name: string;
}

export interface QueryResult {
  rows: SimpleValue[][];
  fields: QueryResultDataField[];
  rowCount: number;
  stdOutResult?: string;
  stdOutMode?: boolean;
  stdInMode?: boolean;
  fetchMoreRows?: () => Promise<{
    rows: SimpleValue[][];
    fields: QueryResultDataField[];
    rowCount: number;
  }>;
}

export interface Notice {
  readonly message: string | undefined;
  readonly type: string | undefined;
  values: { [key: string]: string | undefined };
}

export interface QueryResultData {
  rows: SimpleValue[][];
  fields: QueryResultDataField[];
}

export interface QueryOptions {
  stdOutFile?: string | null;
  stdInFile?: string | null;
}

export interface QueryExecutor {
  query(q: string, ops?: QueryOptions): Promise<QueryResult>;
  stopRunningQuery(): Promise<void>;
  destroy(): void;
}

export const operatorsLabels = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  like: 'LIKE',
  nlike: 'NOT LIKE',
  ilike: 'ILIKE',
  nilike: 'NOT ILIKE',
  similar: 'SIMILAR TO',
  nsimilar: 'NOT SIMILAR TO',
  posix: 'REGEXP LIKE (POSIX)',
  nposix: 'NOT REGEXP LIKE (POSIX)',
  posixi: 'REGEXP ILIKE',
  nposixi: 'NOT REGEXP ILIKE',
  null: 'IS NULL',
  notnull: 'IS NOT NULL',
  in: 'IN',
  nin: 'NOT IN',
  between: 'BETWEEN',
  nbetween: 'NOT BETWEEN',
};

export type Filter =
  | (
      | {
          field: string;
          operator:
            | 'eq'
            | 'ne'
            | 'gt'
            | 'gte'
            | 'lt'
            | 'lte'
            | 'like'
            | 'nlike'
            | 'ilike'
            | 'nilike'
            | 'similar'
            | 'nsimilar'
            | 'posix'
            | 'nposix'
            | 'posixi'
            | 'nposixi'
            | 'null'
            | 'notnull'
            | '';
          value: string | null;
          sql?: boolean;
        }
      | {
          field: string;
          operator: 'in' | 'nin';
          values: (string | null)[];
          sql?: never;
        }
      | {
          field: string;
          operator: 'between' | 'nbetween';
          value: string | null;
          value2: string | null;
          sql?: boolean;
          sql2?: boolean;
        }
    )[][]
  | { type: 'query'; where: string };

export type Sort = {
  field: string;
  direction: 'asc' | 'desc';
}[];

export function db(): DBInterface {
  if (hotLoadSafe.connectionType === 'postgres') return DB;
  throw new Error('Unsupported database type');
}

export async function connect(c: ConnectionConfiguration, name: string) {
  if (c.type === 'postgres') {
    await pgConnect(c, name);
    hotLoadSafe.connectionType = 'postgres';
    return;
  }
  throw new Error('Unsupported database type');
}

export async function listDatabases(
  c: Omit<ConnectionConfiguration, 'id'> | ConnectionConfiguration,
) {
  if (c.type === 'postgres') return pgListDabases(c);
  throw new Error('Unsupported database type');
}
