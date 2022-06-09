import { ConnectionConfiguration } from './db/pgpass';

export interface AbstractTabProps {
  readonly type: string;
  readonly uid: number;
}
export interface QueryFrameProps extends AbstractTabProps {
  readonly type: 'query';
}
export interface TableFrameProps extends AbstractTabProps {
  readonly type: 'table';
  readonly table: string;
  readonly schema: string;
}
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
export interface NewTableFrameProps extends AbstractTabProps {
  readonly type: 'newtable';
  readonly schema: string;
  readonly types: Type[];
}
export interface TableInfoFrameProps extends AbstractTabProps {
  readonly type: 'tableinfo';
  readonly table: string;
  readonly schema: string;
}
export interface SchemaInfoFrameProps extends AbstractTabProps {
  readonly type: 'schemainfo';
  readonly schema: string;
}
export type FrameProps =
  | TableFrameProps
  | QueryFrameProps
  | NewTableFrameProps
  | TableInfoFrameProps
  | SchemaInfoFrameProps;

export interface NavSchema {
  name: string;
  open: boolean;
  fullView: boolean;
  sequencesOpen: boolean;
  functionsOpen: boolean;
  tables?: { name: string; type: string }[];
  sequences?: { name: string; type: string }[];
  functions?: { name: string; type: string }[];
}

export interface Tab {
  readonly title: string;
  readonly active: boolean;
  readonly keep: boolean;
  readonly props: FrameProps;
}

export interface AppState {
  connectionError?: Error;
  newConnection: boolean;
  editConnections: boolean;
  newSchema: boolean;
  editConnection?: {
    index: number;
    connection: ConnectionConfiguration;
  };
  bases?: string[];
  passwords: ConnectionConfiguration[];
  connected: boolean;
  password?: ConnectionConfiguration;
  schemas?: NavSchema[];
  tabs: Tab[];
  tabsSort: number[];
  title: string;
}
