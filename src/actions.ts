import assert from 'assert';
import { useEffect } from 'react';
import { throwError } from 'util/throwError';
import { ConnectionConfiguration, savePasswords } from './db/pgpass';
import {
  connect as dbConnect,
  listFromConfiguration,
  query,
} from './db/Connection';
import state, { currentState } from './state';
import { DB } from './db/DB';
import { FrameProps } from './types';

export const {
  openFunctions,
  openDomains,
  openSequences,
  newConf,
  askToCloseWindow,
  cancelAskToCloseWindow,
  editingAll,
  editConnectionSelected,
  updateTabText,
  closeConnectionError,
  pikSchemaInfo,
  keepSchemaInfo,
  pikTableInfo,
  keepTableInfo,
  removeError,
  cancelCreateSchema,
  nextTab,
  prevTab,
  activateTab,
  editConnection,
  cancelConnection,
  cancelSelectedConnection,
  newSchema,
  updateHeaderTabsDisplayOrder,
  newQuery,
  keepTabOpen,
  closeTab,
  keepOpenTable,
  pikTable,
  pikFunction,
  keepFunction,
  pikDomain,
  keepDomain,
  pikSequence,
  keepSequence,
} = state;

export async function open(c: ConnectionConfiguration) {
  state.setConnection(c);
  try {
    const res = await listFromConfiguration(
      c,
      `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
    );
    state.setBases(res);
  } catch (err) {
    state.setConnectionError(err);
  }
}

export async function newConnection(
  conf: ConnectionConfiguration,
  index?: number
): Promise<void> {
  removeError();
  try {
    const res = await listFromConfiguration(
      conf,
      `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
    );
    state.addConnectionConfiguration(conf, index);
    savePasswords(currentState().passwords);
    state.setConnection(conf);
    state.setBases(res);
  } catch (err) {
    state.setConnectionError(err);
    throw err;
  }
}

export function createSchema(name: string) {
  query(`CREATE SCHEMA "${name}"`).then(
    () => {
      state.createSchema(name);
    },
    (err) => {
      throwError(err);
    }
  );
}

export function dropSchemaCascade(name: string) {
  query(`DROP SCHEMA "${name}" CASCADE`).then(
    () => {
      state.dropSchemaCascade(name);
    },
    (err) => {
      throwError(err);
    }
  );
}

export function dropSchema(name: string) {
  query(`DROP SCHEMA "${name}"`).then(
    () => {
      state.dropSchema(name);
    },
    (err) => {
      throwError(err);
    }
  );
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

export function askToCloseCurrent() {
  if (!currentState().tabs.length) {
    window.close();
  } else {
    const props = currentState().tabs.find((c) => c.active)?.props;
    assert(props);
    askToCloseTab(props);
  }
}

export async function connect(s: string) {
  const { password } = currentState();
  assert(password);
  try {
    await dbConnect(password, s);
    try {
      const schemas = await DB.listAll();
      state.connected(s, schemas);
    } catch (err) {
      state.setConnectionError(err);
    }
  } catch (err) {
    state.setConnectionError(err);
    throw err;
  }
}

export async function reloadNav() {
  const newSchemas = await DB.listAll();
  state.updateSchemas(newSchemas);
}

export function closeThisAndReloadNav(uid: number) {
  reloadNav();
  state.closeTab(uid);
}

export function closeTabNow(uid: number) {
  state.closeTab(uid);
}

export function openSchema(name: string) {
  const s = currentState();
  if (!s.schemas) throw new Error('Schemas não configurados.');
  const schema = s.schemas.find((c) => c.name === name);
  if (!schema) throw new Error(`Schema não encontrado. (${name})`);
  state.toggleSchema(name);
}

export function saveConnection(con: ConnectionConfiguration, index?: number) {
  state.addConnectionConfiguration(con, index);
  savePasswords(currentState().passwords);
  state.connectionSaved();
}

export function removeConnection(index: number) {
  state.removeConnection(index);
  savePasswords(currentState().passwords);
  state.connectionSaved();
}

export function newTable(schema: string) {
  DB.types().then((types) => {
    state.newTable(schema, types);
  });
}

export function fullView(name: string) {
  const current = currentState();
  assert(!!current.schemas);
  const currentSchema = current.schemas.find((s) => s.name === name);
  assert(!!currentSchema);
  if (currentSchema.fullView) {
    state.closeFullView(name);
    return;
  }
  state.openFullView(name);
}
