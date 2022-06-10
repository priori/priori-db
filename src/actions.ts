import assert from 'assert';
import { useEffect } from 'react';
import { ConnectionConfiguration, savePasswords } from './db/pgpass';
import { connect as dbConnect, listFromConfiguration } from './db/Connection';
import * as state from './state';
import { DB } from './db/DB';
import { FrameProps, Tab } from './types';

export function open(c: ConnectionConfiguration) {
  state.setConnection(c);
  listFromConfiguration(
    c,
    `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
  ).then(
    (res) => {
      state.setBases(res.map((r) => (r as { name: string }).name) as string[]);
    },
    (err) => state.setConnectionError(err)
  );
}

export function closeConnectionError() {
  state.closeConnectionError();
}

export function keepTabOpen(t: Tab | number) {
  state.keepTabOpen(typeof t === 'number' ? t : t.props.uid);
}

export function pikSchemaInfo(name: string) {
  state.pikSchemaInfo(name);
}

export function keepSchemaInfo(name: string) {
  state.keepSchemaInfo(name);
}

export function pikTableInfo(schema: string, table: string) {
  state.pikTableInfo(schema, table);
}

export function keepTableInfo(schema: string, table: string) {
  state.keepTableInfo(schema, table);
}

function removeError() {
  state.removeError();
}

export function newConnection(conf: ConnectionConfiguration, index?: number) {
  removeError();
  listFromConfiguration(
    conf,
    `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
  ).then(
    (res) => {
      state.addConnectionConfiguration(conf, index);
      savePasswords(state.currentState().passwords, (err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        } else {
          state.setConnection(conf);
          state.setBases(
            res.map((r) => (r as { name: string }).name) as string[]
          );
        }
      });
    },
    (err: Error) => state.setConnectionError(err)
  );
}

export function newTable(schema: string) {
  state.newTable(schema);
}

export function newSchema() {
  state.newSchema();
}

export function createSchema(name: string) {
  state.createSchema(name);
}

export function dropSchemaCascade(name: string) {
  state.dropSchemaCascade(name);
}

export function dropSchema(name: string) {
  state.dropSchema(name);
}

export function cancelCreateSchema() {
  state.cancelCreateSchema();
}

export function nextTab() {
  state.nextTab();
}

export function prevTab() {
  state.prevTab();
}

export function activateTab(c: Tab) {
  state.activateTab(c);
}

let askToCloseHandler: ((uid: number) => boolean) | undefined;
export function useAskToClose(fn: (uid: number) => boolean) {
  useEffect(() => {
    if (askToCloseHandler) throw new Error('useAskToCloseListener!');
    askToCloseHandler = fn;
    return () => {
      askToCloseHandler = undefined;
    };
  }, [fn]);
}

export function askToCloseTab(c: FrameProps) {
  if (!askToCloseHandler || askToCloseHandler(c.uid)) state.closeTab(c.uid);
}

export function closeTab(c: FrameProps) {
  state.closeTab(c.uid);
}

export function askToCloseCurrent() {
  if (!state.currentState().tabs.length) {
    window.close();
  } else {
    const props = state.currentState().tabs.find((c) => c.active)?.props;
    assert(props);
    askToCloseTab(props);
  }
}

export function pikTable(schema: string, t: { name: string; type: string }) {
  state.pikTable(schema, t);
}

export function keepOpenTable(
  schema: string,
  t: { name: string; type: string }
) {
  state.keepTable(schema, t);
}

export function connect(s: string) {
  const { password } = state.currentState();
  assert(password);
  dbConnect(password, s).then(
    () => {
      DB.listSchemas().then(
        (schemas) => {
          state.connected(s, schemas);
        },
        (err) => state.setConnectionError(err)
      );
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      state.setConnectionError(err);
    }
  );
}

export function closeThisAndReloadNav(uid: number) {
  state.reloadNav();
  state.closeTab(uid);
}

export function changeTabsSort(sort: number[]) {
  state.changeTabsSort(sort);
}

export function openSchema(name: string) {
  const s = state.currentState();
  if (!s.schemas) throw new Error('Schemas não configurados.');
  const schema = s.schemas.find((c) => c.name === name);
  if (!schema) throw new Error(`Schema não encontrado. (${name})`);
  if (!schema.tables)
    DB.listTablesFromSchema(name).then(
      (tables) => {
        state.openSchemaSuccess(
          name,
          tables as { name: string; type: string }[]
        );
      },
      // eslint-disable-next-line no-console
      (err) => console.error(err)
    );
  else state.toggleSchema(name);
}

export function newQuery() {
  state.newQuery();
}

export function saveConnection(con: ConnectionConfiguration, index?: number) {
  state.saveConnection(con, index);
}

export function removeConnection(index: number) {
  state.removeConnection(index);
}

export function editConnection(con: ConnectionConfiguration, index: number) {
  state.editConnection(con, index);
}

export function cancelConnection() {
  state.cancelConnection();
}

export function cancelSelectedConnection() {
  state.cancelSelectedConnetion();
}
