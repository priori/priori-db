import { ConnectionConfiguration } from './db/pgpass';

export type FrameType =
  | 'newtable'
  | 'table'
  | 'query'
  | 'tableinfo'
  | 'schemainfo'
  | 'function'
  | 'sequence'
  | 'domain'
  | 'role';

export interface Type {
  name: string;
  elemoid: number;
  length: number;
  type: string;
  oid: number;
  nspname: string;
  isdup: boolean;
  is_collatable: boolean;
  allowLength: boolean;
  allowPrecision: boolean;
}

export interface AbstractTabProps<T extends FrameType> {
  readonly type: T;
  readonly uid: number;
}

export interface RoleFrameProps extends AbstractTabProps<'role'> {
  readonly name: string;
}

export type QueryFrameProps = AbstractTabProps<'query'>;

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
  readonly types: Type[];
}

export interface TableInfoFrameProps extends AbstractTabProps<'tableinfo'> {
  readonly table: string;
  readonly schema: string;
}

export interface SchemaInfoFrameProps extends AbstractTabProps<'schemainfo'> {
  readonly schema: string;
}

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
                  : never;

export type FrameProps = FrameProps0<FrameType>;

export type EntityType =
  | 'MATERIALIZED VIEW'
  | 'VIEW'
  | 'BASE TABLE'
  | 'FUNCTION'
  | 'SEQUENCE'
  | 'DOMAIN'
  | 'ENUM';

export interface NavSchema {
  current: boolean;
  internal: boolean;
  name: string;
  open: boolean;
  fullView: boolean;
  sequencesOpen: boolean;
  domainsOpen: boolean;
  functionsOpen: boolean;
  tables: {
    name: string;
    type: EntityType & ('MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE');
  }[];
  sequences: { name: string; type: EntityType & 'SEQUENCE' }[];
  functions: { name: string; type: EntityType & 'FUNCTION' }[];
  domains: { name: string; type: EntityType & 'DOMAIN' }[];
}

export interface Tab0<T extends FrameType> {
  readonly title: string;
  readonly active: boolean;
  readonly keep: boolean;
  readonly props: FrameProps0<T>;
}
export type Tab = Tab0<FrameType>;

export interface AppState {
  connectionError?: Error;
  uidCounter: number;
  newConnection: boolean;
  editConnections: boolean;
  newSchema: boolean;
  editConnection?: {
    index: number;
    connection: ConnectionConfiguration;
  };
  askToCloseWindow: boolean;
  bases?: string[];
  passwords: ConnectionConfiguration[];
  connected: boolean;
  password?: ConnectionConfiguration;
  schemas?: NavSchema[];
  tabs: Tab[];
  tabsOpenOrder: number[];
  title: string;
  errors: Error[];
  roles?: {
    name: string;
    isUser: boolean;
  }[];
}

export type TablePrivileges = {
  update?: boolean | undefined;
  insert?: boolean | undefined;
  select?: boolean | undefined;
  delete?: boolean | undefined;
  truncate?: boolean | undefined;
  references?: boolean | undefined;
  trigger?: boolean | undefined;
};

export type SequencePrivileges = {
  update?: boolean | undefined;
  usage?: boolean | undefined;
  select?: boolean | undefined;
};

export type SchemaPrivileges = {
  usage?: boolean | undefined;
  create?: boolean | undefined;
};
