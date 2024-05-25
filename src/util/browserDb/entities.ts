import { ConnectionConfiguration } from 'db/Connection';
import { migrate, oldWebSqlData } from './migration';
import { openIndexedDb, Store, transaction0 } from './util';

export interface QueryEntryIDB {
  id: number;
  queryGroupId?: number;
  sql: string;
  createdAt: number;
  version: number;
  success?: boolean;
  executionTime?: number;
  resultLength?: number;
  editorState: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  };
  tabTitle?: string;
}

export interface QueryGroupEntryIDB {
  id: number;
  executionId: number;
  tabId: number;
  createdAt: number;
  queryCreatedAt: number;
  connectionGroupId: number;
  size: number;
  lastQueryId: number;
  sql: string;
  success?: boolean;
  executionTime?: number;
  resultLength?: number;
  editorState: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  };
  tabTitle?: string;
}

export interface FavoriteQueryEntryIDB {
  id: number;
  connectionGroupId: number;
  sql: string;
  createdAt: number;
  title: string;
  executionId: number;
  editorState: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  };
}

export interface AppExecutionEntryIDB {
  id: number;
  createdAt: number;
  database?: string;
  port?: number;
  host?: string;
  user?: string;
  connectionGroupId?: number;
}

export interface ConnectionGroupEntryIDB {
  id: number;
  database: string;
  port: number;
  host: string;
  user: string;
}

export const names = [
  'query',
  'favoriteQuery',
  'queryGroup',
  'appExecution',
  'connectionConfiguration',
  'connectionGroup',
] as const;

export type Stores = {
  query: Store<QueryEntryIDB>;
  favoriteQuery: Store<FavoriteQueryEntryIDB>;
  queryGroup: Store<QueryGroupEntryIDB>;
  appExecution: Store<AppExecutionEntryIDB>;
  connectionConfiguration: Store<ConnectionConfiguration>;
  connectionGroup: Store<ConnectionGroupEntryIDB>;
};

export const openIndexedDbP = oldWebSqlData()
  .then(() =>
    openIndexedDb([
      ['favoriteQuery', ['connectionGroupId']],
      ['appExecution', ['connectionConfigurationId', 'connectionGroupId']],
      ['connectionConfiguration'],
      ['connectionGroup'],
      [
        'queryGroup',
        [
          'queryCreatedAt',
          ['connectionGroupId', 'queryCreatedAt'],
          ['executionId', 'tabId'],
        ],
      ],
      ['query', ['queryGroupId', ['queryGroupId', 'version']]],
    ]),
  )
  .then(async (db) => {
    await transaction0<unknown, (typeof names)[number][0]>(
      db,
      names as unknown as (typeof names)[number][],
      migrate as (stores: {
        [k in (typeof names)[number][0]]: Store<unknown>;
      }) => Promise<unknown>,
    );
    return db;
  });

export function transaction<R>(fn: (stores: Stores) => Promise<R>) {
  return openIndexedDbP.then((idb) =>
    transaction0<R, (typeof names)[number]>(
      idb,
      names as unknown as (typeof names)[number][],
      fn as (stores: {
        [k in (typeof names)[number]]: Store<unknown>;
      }) => Promise<R>,
    ),
  );
}
