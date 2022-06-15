import { ConnectionConfiguration } from './db/pgpass';

export type FrameType =
  | 'newtable'
  | 'table'
  | 'query'
  | 'tableinfo'
  | 'schemainfo';

export interface AbstractTabProps<T extends FrameType> {
  readonly type: T;
  readonly uid: number;
}

export type QueryFrameProps = AbstractTabProps<'query'>;

export interface TableFrameProps extends AbstractTabProps<'table'> {
  readonly table: string;
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
  : never;

export type FrameProps = FrameProps0<FrameType>;

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

export interface NavSchema {
  name: string;
  open: boolean;
  fullView: boolean;
  sequencesOpen: boolean;
  domainsOpen: boolean;
  functionsOpen: boolean;
  tables: { name: string; type: string }[];
  sequences: { name: string; type: string }[];
  functions: { name: string; type: string }[];
  domains: { name: string; type: string }[];
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
  tabsSort: number[];
  title: string;
}
