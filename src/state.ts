import assert from 'assert';
import React from 'react';
import {
  ConnectionConfiguration,
  passwords as currentPasswords,
  savePasswords,
} from './db/pgpass';
import { AppState, FrameProps, NavSchema } from './types';
import { DB } from './db/DB';
import { Connection } from './db/Connection';

export function throwError(err: any) {
  if (err.message) alert(err.message);
  else if (typeof err === 'string') alert(err);
  else alert(JSON.stringify(err));
}

let listener: ((_: AppState) => void) | undefined;

// ((window as any).current) ||
let current: AppState = {
  passwords: currentPasswords,
  connected: false,
  editConnections: false,
  tabs: [],
  tabsSort: [],
  title: '',
  newConnection: !currentPasswords || !currentPasswords.length || false,
  newSchema: false,
};
(window as any).uidCount = (window as any).uidCount || 1;
if ((window as any).current) current = (window as any).current as AppState;

function fire() {
  (window as any).current = current;
  if (!listener) throw new Error('Listener não encontrado.');
  listener(current);
}

export function useAppState() {
  const [state, setState] = React.useState(current);
  React.useEffect(() => {
    let mounted = true;
    listener = (newState) => {
      if (mounted) setState(newState);
      // else state = state;
    };
    return () => {
      mounted = false;
      listener = undefined;
    };
  }, []);
  return state;
}

export function currentState() {
  return current;
}

export function setBases(bases: string[]) {
  current = {
    ...current,
    // editConnection: undefined,
    editConnections: false,
    newConnection: false,
    bases,
  };
  fire();
}
export function editingAll() {
  current = {
    ...current,
    editConnections: !current.editConnections,
    connectionError: undefined,
  };
  fire();
}

export function fullView(name: string) {
  assert(!!current.schemas);
  const currentSchema = current.schemas.find((s) => s.name === name);
  assert(!!currentSchema);
  if (currentSchema.fullView) {
    current = {
      ...current,
      schemas: current.schemas.map((s) =>
        s.name === name
          ? {
              ...s,
              open: true,
              fullView: false,
              domains: undefined,
              functions: undefined,
              collations: undefined,
              sequences: undefined,
            }
          : s
      ),
    };
    fire();
    return;
  }

  DB.listEntitiesFromSchema(name).then(
    (res) => {
      const { tables, domains, functions, collations, sequences } = res;
      assert(!!current.schemas);
      current = {
        ...current,
        schemas: current.schemas.map((s) =>
          s.name === name
            ? {
                ...s,
                open: true,
                fullView: true,
                tables,
                domains,
                functions,
                collations,
                sequences,
              }
            : s
        ),
      };
      fire();
    },
    // eslint-disable-next-line no-console
    (err) => console.error(err)
  );
}

export function newConf() {
  current = {
    ...current,
    newConnection: true,
    connectionError: undefined,
  };
  fire();
}
export function setConnectionError(err: unknown) {
  current = {
    ...current,
    connectionError: err,
  };
  fire();
}
function newFrame(frame: FrameProps) {
  const tabs = current.tabs.map((c) => ({ ...c, active: false }));
  const i = current.tabs.findIndex((c) => c.active);
  current = {
    ...current,
    tabs: [
      ...tabs.filter((_, i2) => i2 <= i || i === -1),
      frame,
      ...tabs.filter((_, i2) => i2 > i),
    ],
    tabsSort: [...current.tabsSort, frame.uid],
  };
  fire();
}
export function schemaInfo2(name: string) {
  const uid = (window as any).uidCount;
  (window as any).uidCount += 1;
  newFrame({
    title: `${name} info`,
    type: 'schemainfo',
    active: true,
    uid,
    schema: name,
  });
}
export function openTable2(schema: string, t: { name: string; type: string }) {
  const uid = (window as any).uidCount;
  (window as any).uidCount += 1;
  newFrame({
    title: `${schema}.${t.name}`,
    type: 'table',
    schema,
    table: t.name,
    active: true,
    uid,
  });
}
export function removeError2() {
  current = {
    ...current,
    connectionError: undefined,
  };
  fire();
}
export function tableInfo2(schema: string, table: string) {
  const uid = (window as any).uidCount;
  (window as any).uidCount += 1;
  newFrame({
    title: `${schema}.${table} info`,
    type: 'tableinfo',
    active: true,
    uid,
    schema,
    table,
  });
}
export function newTable2(schema: string) {
  const uid = (window as any).uidCount;
  (window as any).uidCount += 1;
  DB.types().then((types) => {
    newFrame({
      title: 'Nova Tabela',
      type: 'newtable',
      active: true,
      uid,
      schema,
      types,
    });
  });
}
export function updateTabText(editing: FrameProps | null, value: string) {
  current = {
    ...current,
    tabs: current.tabs.map((t) => (t === editing ? { ...t, title: value } : t)),
  };
  fire();
}

export function newSchema2() {
  current = {
    ...current,
    newSchema: true,
  };
  fire();
}
function filterTabs(fn: (c: FrameProps) => boolean) {
  const tabsSort = current.tabsSort.filter((uid) =>
    fn(current.tabs.find((tab) => tab.uid === uid) as FrameProps)
  );
  current = {
    ...current,
    tabs: current.tabs
      .filter(fn)
      .map((tab) =>
        tabsSort.length && tabsSort[tabsSort.length - 1] === tab.uid
          ? { ...tab, active: true }
          : tab
      ),
    tabsSort,
  };
}
export function dropSchema2(name: string) {
  Connection.query(`DROP SCHEMA "${name}"`).then(
    () => {
      current = {
        ...current,
        schemas: (current.schemas as NavSchema[]).filter(
          (sc) => sc.name !== name
        ),
      };
      filterTabs((c: FrameProps) => {
        return !(c.type === 'schemainfo' && c.schema === name);
      });
      fire();
    },
    (err) => {
      throwError(err);
    }
  );
}
export function dropSchemaCascade2(name: string) {
  Connection.query(`DROP SCHEMA "${name}" CASCADE`).then(
    () => {
      current = {
        ...current,
        schemas: (current.schemas as NavSchema[]).filter(
          (sc) => sc.name !== name
        ),
      };
      filterTabs((c: FrameProps) => {
        return !(c.type === 'schemainfo' && c.schema === name);
      });
      fire();
    },
    (err) => {
      throwError(err);
    }
  );
}

export function cancelCreateSchema2() {
  current = {
    ...current,
    newSchema: false,
  };
  fire();
}
export function createSchema2(name: string) {
  Connection.query(`CREATE SCHEMA "${name}"`).then(
    () => {
      current = {
        ...current,
        schemas: [
          ...(current.schemas as NavSchema[]),
          {
            name,
            open: false,
            fullView: false,
            sequencesOpen: false,
            functionsOpen: false,
          },
        ],
        newSchema: false,
      };
      fire();
    },
    (err) => {
      throwError(err);
    }
  );
  // fire()
}

export function changeTabsSort2(sort: number[]) {
  const newTabs = [...current.tabs];
  newTabs.sort((a, b) => {
    return sort.indexOf(a.uid) - sort.indexOf(b.uid);
  });
  current = {
    ...current,
    tabs: newTabs,
    tabsSort: sort,
  };
  fire();
}
export function reloadNav() {
  DB.listSchemas().then(
    (newSchemas) => {
      const schemas = newSchemas.map((sc: string) => {
        if (!current.schemas) throw new Error('Invalid schemas.');
        const currentSchema = current.schemas.find((s2) => s2.name === sc);
        if (currentSchema && currentSchema.open) {
          // eslint-disable-next-line promise/no-nesting
          DB.listTablesFromSchema(currentSchema.name).then(
            (res) => {
              const tables = res as { name: string; type: string }[];
              if (!current.schemas) throw new Error('Invalid schemas.');
              current = {
                ...current,
                schemas: current.schemas.map((s) =>
                  s.name === currentSchema.name
                    ? {
                        ...s,
                        open: true,
                        tables,
                      }
                    : s
                ),
              };
              fire();
            },
            // eslint-disable-next-line no-console
            (err) => console.error(err)
          );
          return currentSchema;
        }
        return {
          name: sc,
          open: false,
        };
      });
      if (schemas) {
        current = {
          ...current,
          schemas: schemas as NavSchema[],
        };
        fire();
      }
    },
    (err) => {
      throwError(err);
    }
  );
}
export function closeTab2(c: FrameProps) {
  const tabsSort = current.tabsSort.filter((uid) => uid !== c.uid);
  current = {
    ...current,
    tabs: current.tabs
      .filter((tab) => c.uid !== tab.uid)
      .map((tab) =>
        tabsSort.length && tabsSort[tabsSort.length - 1] === tab.uid
          ? { ...tab, active: true }
          : tab
      ),
    tabsSort,
  };
  fire();
}
export function activateTab2(c: FrameProps) {
  const tabs = current.tabs.map((tab) =>
    c.uid === tab.uid ? { ...tab, active: true } : { ...tab, active: false }
  );
  current = {
    ...current,
    tabs,
    tabsSort: [...current.tabsSort.filter((uid) => uid !== c.uid), c.uid],
  };
  fire();
}
export function closeConnectionError2() {
  current = {
    ...current,
    connectionError: undefined,
  };
  fire();
}
export function setConnection(password: ConnectionConfiguration) {
  current = { ...current, password };
  fire();
}
export function newQuery2() {
  const uid = (window as any).uidCount;
  (window as any).uidCount += 1;
  newFrame({ title: 'Nova Consulta', type: 'query', active: true, uid });
}
export function addConnectionConfiguration(
  conf: ConnectionConfiguration,
  index?: number
) {
  let passwords;
  if (typeof index === 'number') {
    passwords = current.passwords.map((c, i) => (i === index ? conf : c));
  } else {
    passwords = [...current.passwords, conf];
  }
  current = {
    ...current,
    passwords,
  };
  fire();
}
export function connected(database: string, schemas: string[]) {
  const c = current.password as ConnectionConfiguration;
  current = {
    ...current,
    connected: true,
    schemas: schemas.map((s) => ({
      name: s,
      open: false,
      fullView: false,
      sequencesOpen: false,
      functionsOpen: false,
    })),
    title: `${c.user}@${c.host}${
      c.port !== 5432 ? `:${c.port}` : ''
    }/${database}`,
  };
  fire();
}
export function toggleSchema(name: string) {
  if (!current.schemas) throw new Error('Schemas não econtrado.');
  current = {
    ...current,
    schemas: current.schemas.map((s) =>
      s.name === name
        ? {
            ...s,
            open: !s.open,
          }
        : s
    ),
  };
  fire();
}
export function openSchemaSuccess(
  name: string,
  tables: { name: string; type: string }[]
) {
  if (!current.schemas) throw new Error('Schemas não econtrado.');
  current = {
    ...current,
    schemas: current.schemas.map((s) =>
      s.name === name
        ? {
            ...s,
            open: true,
            tables,
          }
        : s
    ),
  };
  fire();
}
export function saveConnection2(con: ConnectionConfiguration, index?: number) {
  addConnectionConfiguration(con, index);
  savePasswords(currentState().passwords, () => {
    current = {
      ...current,
      newConnection: false,
      editConnection: undefined,
      editConnections: false,
      connectionError: undefined,
    };
    fire();
  });
}
export function cancelSelectedConnetion2() {
  current = { ...current, password: undefined, bases: undefined };
  fire();
}
export function cancelConnection2() {
  current = {
    ...current,
    newConnection: false,
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
  fire();
}
export function editConnection2(con: ConnectionConfiguration, index: number) {
  current = {
    ...current,
    connectionError: undefined,
    editConnection: {
      connection: con,
      index,
    },
  };
  fire();
}

export function editConnectionSelected() {
  const { password } = current;
  if (password) {
    const index = current.passwords.findIndex(
      (p) =>
        p.host === password.host &&
        p.port === password.port &&
        p.database === password.database &&
        p.user === password.user &&
        p.host === password.host &&
        p.password === password.password
    );
    editConnection2(password, index);
  }
}

export function removeConnection2(index: number) {
  current = {
    ...current,
    passwords: current.passwords.filter((_, i) => i !== index),
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
  savePasswords(currentState().passwords, () => {
    current = {
      ...current,
      newConnection: false,
      editConnection: undefined,
      editConnections: false,
      connectionError: undefined,
    };
    fire();
  });
}
export function openSequences(schema: NavSchema) {
  assert(!!current.schemas);
  current = {
    ...current,
    schemas: current.schemas.map((sc) =>
      sc === schema ? { ...sc, sequencesOpen: !sc.sequencesOpen } : sc
    ),
  };
  fire();
}
export function openFunctions(schema: NavSchema) {
  assert(!!current.schemas);
  current = {
    ...current,
    schemas: current.schemas.map((sc) =>
      sc === schema ? { ...sc, functionsOpen: !sc.functionsOpen } : sc
    ),
  };
  fire();
}
