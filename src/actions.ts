import { ConnectionConfiguration, savePasswords } from "./db/pgpass";
import { Connection } from "./db/Connection";
import {
  connected,
  currentState,
  newQuery2,
  openSchemaSuccess,
  openTable2,
  setBases,
  setConnection,
  toggleSchema,
  closeTab2,
  activateTab2,
  schemaInfo2,
  tableInfo2,
  newTable2,
  newSchema2,
  addConnectionConfiguration,
  setConnectionError,
  saveConnection2,
  cancelConnection2,
  editConnection2,
  removeConnection2,
  cancelSelectedConnetion2,
  closeConnectionError2,
  createSchema2,
  cancelCreateSchema2,
  dropSchema2,
  dropSchemaCascade2,
  reloadNav,
  changeTabsSort2, removeError2
} from "./state";
import { DB } from "./db/DB";
import { FrameProps } from "./types";

export function open(c: ConnectionConfiguration) {
  setConnection(c);
  Connection.listFromConfiguration(
    c,
    `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
  ).then(
    res => {
      setBases(res.map(r => r.name) as string[]);
    },
    err => setConnectionError(err)
  );
}
export function closeConnectionError() {
  closeConnectionError2();
}

export function schemaInfo(name: string) {
  schemaInfo2(name);
}

export function tableInfo(schema: string, table: string) {
  tableInfo2(schema, table);
}

function removeError() {
  removeError2();
}

export function newConnection(conf: ConnectionConfiguration, index?: number) {
  removeError();
  Connection.listFromConfiguration(
    conf,
    `SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false;`
  ).then(
    res => {
      addConnectionConfiguration(conf, index);
      savePasswords(currentState().passwords, err => {
        if (err) {
          console.error(err);
        } else {
          setConnection(conf);
          setBases(res.map(r => r.name) as string[]);
        }
      });
    },
    (err: any) => setConnectionError(err)
  );
}

export function newTable(schema: string) {
  newTable2(schema);
}

export function newSchema() {
  newSchema2();
}

export function createSchema(name: string) {
  createSchema2(name);
}

export function dropSchemaCascade(name: string) {
  dropSchemaCascade2(name);
}

export function dropSchema(name: string) {
  dropSchema2(name);
}

export function cancelCreateSchema() {
  cancelCreateSchema2();
}

export function closeCurrent() {
  if (!currentState().tabs.length) {
    window.close();
  } else closeTab2(currentState().tabs.find(c => c.active) as FrameProps);
}

export function nextTab() {
  const state = currentState();
  if (state.tabs.length == 0) return;
  const activeIndex = state.tabs.findIndex(c => c.active);
  if (activeIndex == state.tabs.length - 1) activateTab2(state.tabs[0]);
  else activateTab2(state.tabs[activeIndex + 1]);
}

export function prevTab() {
  const state = currentState();
  if (state.tabs.length == 0) return;
  const activeIndex = state.tabs.findIndex(c => c.active);
  if (activeIndex == 0) activateTab2(state.tabs[state.tabs.length - 1]);
  else activateTab2(state.tabs[activeIndex - 1]);
}

export function activateTab(c: FrameProps) {
  activateTab2(c);
}

export function closeTab(c: FrameProps) {
  closeTab2(c);
}

export function openTable(schema: string, t: { name: string; type: string }) {
  openTable2(schema, t);
}

export function connect(s: string) {
  Connection.connect(
    currentState().password as ConnectionConfiguration,
    s
  ).then(
    () => {
      DB.listSchemas().then(
        schemas => {
          connected(s, schemas);
        },
        err => setConnectionError(err)
      );
    },
    err => {
      console.error(err);
      setConnectionError(err);
    }
  );
}
export function closeThisAndReloadNav(props: FrameProps) {
  reloadNav();
  closeTab2(props);
}

export function changeTabsSort(sort: number[]) {
  changeTabsSort2(sort);
}

export function openSchema(name: string) {
  const state = currentState();
  if (!state.schemas) throw "Schemas não configurados.";
  const schema = state.schemas.find(c => c.name == name);
  if (!schema) throw "Schema não encontrado. (" + name + ")";
  if (!schema.tables)
    DB.listTablesFromSchema(name).then(
      (tables: { name: string; type: string }[]) => {
        openSchemaSuccess(name, tables);
      },
      err => console.error(err)
    );
  else toggleSchema(name);
}

export function newQuery() {
  newQuery2();
}

export function saveConnection(con: ConnectionConfiguration, index?: number) {
  saveConnection2(con, index);
}

export function removeConnection(index: number) {
  removeConnection2(index);
}

export function editConnection(con: ConnectionConfiguration, index: number) {
  editConnection2(con, index);
}

export function cancelConnection() {
  cancelConnection2();
}

export function cancelSelectedConnection() {
  cancelSelectedConnetion2();
}
