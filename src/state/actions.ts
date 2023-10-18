import { assert } from 'util/assert';
import { useEffect } from 'react';
import { grantError } from 'util/errors';
import { sortBy } from 'util/sort';
import { ConnectionConfiguration, savePasswords } from '../db/pgpass';
import { connect as dbConnect, listDatabases } from '../db/Connection';
import state, { currentState } from './state';
import { DB } from '../db/DB';
import { FrameProps } from '../types';

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
  previewSchemaInfo,
  keepSchemaInfo,
  previewTableInfo,
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
  newQueryTab,
  newQueryTabInTheEnd,
  keepTabOpen,
  closeTab,
  keepOpenTable,
  previewTable,
  previewFunction,
  keepFunction,
  previewDomain,
  keepDomain,
  previewSequence,
  keepSequence,
  extraTableTab,
  renameEntity,
  changeSchema,
  showError,
  closeError,
} = state;

export async function open(c: ConnectionConfiguration) {
  state.setConnection(c);
  try {
    const res = await listDatabases(c);
    state.setBases(sortBy(res, (a) => (a === c.database ? null : a)));
  } catch (err) {
    state.setConnectionError(grantError(err));
  }
}

export async function newConnection(
  conf: ConnectionConfiguration,
  index?: number
): Promise<void> {
  removeError();
  try {
    const res = await listDatabases(conf);
    state.addConnectionConfiguration(conf, index);
    savePasswords(currentState().passwords);
    state.setConnection(conf);
    state.setBases(sortBy(res, (a) => (a === conf.database ? null : a)));
  } catch (err0) {
    const err = grantError(err0);
    state.setConnectionError(err);
    throw err;
  }
}

export async function reloadNav() {
  const newSchemas = await DB.listAll();
  state.updateSchemas(newSchemas);
}

export function createSchema(name: string) {
  DB.createSchema(name).then(
    () => {
      reloadNav();
    },
    (err) => {
      showError(err);
    }
  );
}

let askToCloseHandler: ((uid: number) => boolean) | undefined;
export function useAskToClose(fn: (uid: number) => boolean) {
  useEffect(() => {
    assert(!askToCloseHandler);
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
      state.setConnectionError(grantError(err));
    }
  } catch (err0) {
    const err = grantError(err0);
    state.setConnectionError(err);
    throw err;
  }
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
  assert(s.schemas);
  const schema = s.schemas.find((c) => c.name === name);
  assert(schema);
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
