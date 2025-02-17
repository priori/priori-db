import { assert } from 'util/assert';
import { useEffect } from 'react';
import { grantError } from 'util/errors';
import { updateConnection } from 'util/browserDb/actions';
import { db, connect as dbConnect } from 'db/db';
import state, { currentState } from './state';
import { ConnectionConfiguration, FrameProps } from '../types';

export const {
  updateTab,
  openFunctions,
  openDomains,
  openSequences,
  openRoles,
  updateTabText,
  previewSchemaInfo,
  keepSchemaInfo,
  previewTableInfo,
  keepTableInfo,
  removeError,
  nextTab,
  prevTab,
  activateTab,
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
  keepOpenRole,
  previewRole,
  renameSchema,
  newTable,
  openSettings,
} = state;

export async function reloadNav() {
  const newSchemas = await db().listAll();
  const roles = await db().privileges?.listRoles();
  state.updateSchemasAndRoles(newSchemas, roles);
}

export function createSchema(name: string) {
  db()
    .createSchema(name)
    .then(
      () => {
        reloadNav();
      },
      (err) => {
        showError(err);
      },
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

export async function connect(conf: ConnectionConfiguration, database: string) {
  try {
    await dbConnect(conf, database);
    await updateConnection(
      conf.host,
      conf.port,
      conf.user,
      conf.database,
      conf.type,
    );
    try {
      const schemas = await db().listAll();
      const roles = await db().privileges?.listRoles();
      state.connected(conf, database, schemas, roles);
    } catch (err) {
      throw grantError(err);
    }
  } catch (err0) {
    throw grantError(err0);
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
