export type FrameType =
  | 'newtable'
  | 'table'
  | 'query'
  | 'tableinfo'
  | 'schemainfo'
  | 'function'
  | 'sequence'
  | 'domain'
  | 'role'
  | 'settings';

export interface AbstractTabProps<T extends FrameType> {
  readonly type: T;
  readonly uid: number;
}

export interface RoleFrameProps extends AbstractTabProps<'role'> {
  readonly name: string;
  readonly host?: string;
}

export interface QueryFrameProps extends AbstractTabProps<'query'> {
  readonly title2?: string;
  readonly status?: 'running' | 'error' | 'success';
}

export interface TableFrameProps extends AbstractTabProps<'table'> {
  readonly table: string;
  readonly schema: string;
}

export interface SequenceFrameProps extends AbstractTabProps<'sequence'> {
  readonly name: string;
  readonly schema: string;
}

export interface DomainFrameProps extends AbstractTabProps<'domain'> {
  readonly name: string;
  readonly schema: string;
}

export interface FunctionFrameProps extends AbstractTabProps<'function'> {
  readonly name: string;
  readonly schema: string;
}

export interface NewTableFrameProps extends AbstractTabProps<'newtable'> {
  readonly schema: string;
}

export interface TableInfoFrameProps extends AbstractTabProps<'tableinfo'> {
  readonly table: string;
  readonly schema: string;
}

export interface SchemaInfoFrameProps extends AbstractTabProps<'schemainfo'> {
  readonly schema: string;
}

export interface SettingsFrameProps extends AbstractTabProps<'settings'> {}

export type FrameProps0<T extends FrameType> = T extends 'query'
  ? QueryFrameProps
  : T extends 'table'
    ? TableFrameProps
    : T extends 'newtable'
      ? NewTableFrameProps
      : T extends 'tableinfo'
        ? TableInfoFrameProps
        : T extends 'schemainfo'
          ? SchemaInfoFrameProps
          : T extends 'sequence'
            ? SequenceFrameProps
            : T extends 'function'
              ? FunctionFrameProps
              : T extends 'domain'
                ? DomainFrameProps
                : T extends 'role'
                  ? RoleFrameProps
                  : T extends 'settings'
                    ? SettingsFrameProps
                    : never;

export type FrameProps = FrameProps0<FrameType>;

export type EntityType =
  | 'MATERIALIZED VIEW'
  | 'VIEW'
  | 'BASE TABLE'
  | 'FUNCTION'
  | 'SEQUENCE'
  | 'DOMAIN'
  | 'ENUM'
  | 'PROCEDURE';

export interface NavSchema {
  current: boolean;
  internal: boolean;
  name: string;
  open: boolean;
  sequencesOpen: boolean;
  domainsOpen: boolean;
  functionsOpen: boolean;
  tables: {
    name: string;
    type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
  }[];
  sequences?: { name: string; type: EntityType & 'SEQUENCE' }[];
  functions?: { name: string; type: EntityType & ('FUNCTION' | 'PROCEDURE') }[];
  domains?: { name: string; type: EntityType & 'DOMAIN' }[];
}

export interface Tab0<T extends FrameType> {
  readonly title?: string;
  readonly active: boolean;
  readonly keep: boolean;
  readonly props: FrameProps0<T>;
  readonly title2?: string;
  readonly status?: 'running' | 'error' | 'success';
}
export type Tab = Tab0<FrameType>;

export type ConnectionType = 'postgres' | 'mysql';

export interface ConnectionConfiguration {
  id: number;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  type: ConnectionType;
  requireSsl?: boolean;
}

export interface AppState {
  uidCounter: number;
  askToCloseWindow: boolean;
  connected: boolean;
  tabs: Tab[];
  tabsOpenOrder: number[];
  rolesOpen: boolean;
  database?: string;
  errors: Error[];
  currentConnectionConfiguration?: ConnectionConfiguration;
  schemas?: NavSchema[];
  roles?: {
    name: string;
    host?: string;
    isUser: boolean;
  }[];
}

export interface TableColumnType {
  name: string;
  allowLength: boolean;
  allowPrecision: boolean;
}

export interface DomainFrameInfo {
  type: {
    [k: string]: string | number | null | boolean;
  };
  comment: string | null;
  privileges: {
    roleName: string;
    host?: string;
    internal?: boolean;
    privileges: {
      [key: string]: boolean | undefined;
    };
  }[];
  owner: string;
  hideInternalRoles: true;
}

export type SequenceInfo = {
  type: {
    [key: string]: string | number | boolean | null;
  };
  lastValue: number | string | null;
  comment: string | null;
  owner: string;
  privileges: {
    roleName: string;
    host?: string;
    internal?: boolean;
    privileges: {
      [key: string]: boolean | undefined;
    };
  }[];
};

export type SimpleValue =
  | number
  | string
  | boolean
  | null
  | { [key: string]: SimpleValue }
  | SimpleValue[];

export interface QueryResultDataField {
  name: string;
  type?: string;
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
  fetchMoreRows?: () => Promise<{
    rows: SimpleValue[][];
    fields: QueryResultDataField[];
  }>;
  release?: () => void;
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

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'nlike'
  | 'null'
  | 'notnull'
  | 'in'
  | 'nin'
  | 'between'
  | 'nbetween'
  // postgres
  | 'ilike'
  | 'nilike'
  | 'similar'
  | 'nsimilar'
  | 'posix'
  | 'nposix'
  | 'posixi'
  | 'nposixi'
  // mysql
  | 'regexplike'
  | 'nregexplike';

export const operatorsLabels: {
  [k in FilterOperator]: string;
} = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  like: 'LIKE',
  nlike: 'NOT LIKE',
  null: 'IS NULL',
  notnull: 'IS NOT NULL',
  in: 'IN',
  nin: 'NOT IN',
  between: 'BETWEEN',
  nbetween: 'NOT BETWEEN',
  // postgres
  ilike: 'ILIKE',
  nilike: 'NOT ILIKE',
  similar: 'SIMILAR TO',
  nsimilar: 'NOT SIMILAR TO',
  posix: 'REGEXP LIKE (POSIX)',
  nposix: 'NOT REGEXP LIKE (POSIX)',
  posixi: 'REGEXP ILIKE',
  nposixi: 'NOT REGEXP ILIKE',
  // mysql
  regexplike: 'REGEXP_LIKE',
  nregexplike: 'NOT REGEXP_LIKE',
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
            | 'regexplike'
            | 'nregexplike'
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
