import assert from 'assert';
import React from 'react';
import { equals } from 'components/util/equals';
import {
  ConnectionConfiguration,
  passwords as currentPasswords,
  savePasswords,
} from './db/pgpass';
import { AppState, NavSchema, Tab } from './types';
import { DB } from './db/DB';
import { query } from './db/Connection';

export function throwError(err: unknown) {
  if (err instanceof Error && err.message) alert(err.message);
  else if (typeof err === 'string') alert(err);
  else alert(JSON.stringify(err));
}

let listener: ((_: AppState) => void) | undefined;

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
let uidCount = 1;
function generateUid() {
  const uid = uidCount;
  uidCount += 1;
  return uid;
}

function fire() {
  if (!listener) throw new Error('Listener não encontrado.');
  listener(current);
}

export function useAppState() {
  const [hookState, setState] = React.useState(current);
  React.useEffect(() => {
    let mounted = true;
    let prevState = current;
    listener = (newState) => {
      if (mounted) {
        if (!equals(prevState, newState)) setState(newState);
      }
      prevState = newState;
    };
    return () => {
      mounted = false;
      listener = undefined;
    };
  }, []);
  return hookState;
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

export function setConnectionError(err: Error) {
  current = {
    ...current,
    connectionError: err,
  };
  fire();
}
export function activateTab(c: Tab) {
  const tabs = current.tabs.map((tab) =>
    c.props.uid === tab.props.uid
      ? { ...tab, active: true }
      : { ...tab, active: false }
  );
  current = {
    ...current,
    tabs,
    tabsSort: [
      ...current.tabsSort.filter((uid) => uid !== c.props.uid),
      c.props.uid,
    ],
  };
  fire();
}
export function keepTabOpen(uid: number) {
  if (current.tabs.find((tab) => tab.props.uid === uid)?.keep) return;
  const tabs = current.tabs.map((tab) =>
    uid === tab.props.uid
      ? { ...tab, active: true, keep: true }
      : { ...tab, active: false }
  );
  current = {
    ...current,
    tabs,
    tabsSort: [...current.tabsSort.filter((uid2) => uid2 !== uid), uid],
  };
  fire();
}

function newFrame(frame: Tab) {
  const tabs = current.tabs.map((c) => ({ ...c, active: false }));
  const i = current.tabs.findIndex((c) => c.active);
  current = {
    ...current,
    tabs: [
      ...tabs.filter(
        (f, i2) => (i2 <= i || i === -1) && (frame.keep || f.keep)
      ),
      frame,
      ...tabs.filter((f, i2) => i2 > i && (frame.keep || f.keep)),
    ],
    tabsSort: [...current.tabsSort, frame.props.uid],
  };
  fire();
}

export function pikSchemaInfo(name: string) {
  const openTab = current.tabs.find(
    (tab) => tab.props.type === 'schemainfo' && tab.props.schema === name
  );
  if (openTab) {
    activateTab(openTab);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${name} info`,
    active: true,
    keep: false,
    props: {
      uid,
      type: 'schemainfo',
      schema: name,
    },
  });
}
export function keepSchemaInfo(name: string) {
  const openTab = current.tabs.find(
    (tab) => tab.props.type === 'schemainfo' && tab.props.schema === name
  );
  if (openTab) {
    keepTabOpen(openTab.props.uid);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${name} info`,
    active: true,
    keep: true,
    props: {
      uid,
      type: 'schemainfo',
      schema: name,
    },
  });
}

export function pikTable(schema: string, t: { name: string; type: string }) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'table' &&
      tab.props.schema === schema &&
      tab.props.table === t.name
  );
  if (openTab) {
    activateTab(openTab);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${schema}.${t.name}`,
    active: true,
    keep: false,
    props: {
      uid,
      table: t.name,
      type: 'table',
      schema,
    },
  });
}

export function keepTable(schema: string, t: { name: string; type: string }) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'table' &&
      tab.props.schema === schema &&
      tab.props.table === t.name
  );
  if (openTab) {
    keepTabOpen(openTab.props.uid);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${schema}.${t.name}`,
    active: true,
    keep: true,
    props: {
      uid,
      table: t.name,
      type: 'table',
      schema,
    },
  });
}

export function removeError() {
  current = {
    ...current,
    connectionError: undefined,
  };
  fire();
}

export function pikTableInfo(schema: string, table: string) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'tableinfo' &&
      tab.props.schema === schema &&
      tab.props.table === table
  );
  if (openTab) {
    activateTab(openTab);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${schema}.${table} info`,
    active: true,
    keep: false,
    props: {
      uid,
      type: 'tableinfo',
      schema,
      table,
    },
  });
}
export function keepTableInfo(schema: string, table: string) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'tableinfo' &&
      tab.props.schema === schema &&
      tab.props.table === table
  );
  if (openTab) {
    keepTabOpen(openTab.props.uid);
    return;
  }
  const uid = generateUid();
  newFrame({
    title: `${schema}.${table} info`,
    active: true,
    keep: true,
    props: {
      uid,
      type: 'tableinfo',
      schema,
      table,
    },
  });
}

export function newTable(schema: string) {
  const uid = generateUid();
  DB.types().then((types) => {
    newFrame({
      title: 'Nova Tabela',
      active: true,
      keep: true,
      props: {
        uid,
        type: 'newtable',
        schema,
        types,
      },
    });
  });
}

export function updateTabText(editing: Tab | null, value: string) {
  current = {
    ...current,
    tabs: current.tabs.map((t) => (t === editing ? { ...t, title: value } : t)),
  };
  fire();
}

export function newSchema() {
  current = {
    ...current,
    newSchema: true,
  };
  fire();
}
function filterTabs(fn: (c: Tab) => boolean) {
  const tabsSort = current.tabsSort.filter((uid) =>
    fn(current.tabs.find((tab) => tab.props.uid === uid) as Tab)
  );
  current = {
    ...current,
    tabs: current.tabs
      .filter(fn)
      .map((tab) =>
        tabsSort.length && tabsSort[tabsSort.length - 1] === tab.props.uid
          ? { ...tab, active: true }
          : tab
      ),
    tabsSort,
  };
}

export function dropSchema(name: string) {
  query(`DROP SCHEMA "${name}"`).then(
    () => {
      current = {
        ...current,
        schemas: (current.schemas as NavSchema[]).filter(
          (sc) => sc.name !== name
        ),
      };
      filterTabs((c: Tab) => {
        return !(c.props.type === 'schemainfo' && c.props.schema === name);
      });
      fire();
    },
    (err) => {
      throwError(err);
    }
  );
}

export function dropSchemaCascade(name: string) {
  query(`DROP SCHEMA "${name}" CASCADE`).then(
    () => {
      current = {
        ...current,
        schemas: (current.schemas as NavSchema[]).filter(
          (sc) => sc.name !== name
        ),
      };
      filterTabs((c: Tab) => {
        return !(c.props.type === 'schemainfo' && c.props.schema === name);
      });
      fire();
    },
    (err) => {
      throwError(err);
    }
  );
}

export function cancelCreateSchema() {
  current = {
    ...current,
    newSchema: false,
  };
  fire();
}
export function createSchema(name: string) {
  query(`CREATE SCHEMA "${name}"`).then(
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

export function changeTabsSort(sort: number[]) {
  const newTabs = [...current.tabs];
  newTabs.sort((a, b) => {
    return sort.indexOf(a.props.uid) - sort.indexOf(b.props.uid);
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
export function closeTab(uid: number) {
  const tabsSort = current.tabsSort.filter((uid2) => uid2 !== uid);
  current = {
    ...current,
    tabs: current.tabs
      .filter((tab) => uid !== tab.props.uid)
      .map((tab) =>
        tabsSort.length && tabsSort[tabsSort.length - 1] === tab.props.uid
          ? { ...tab, active: true }
          : tab
      ),
    tabsSort,
  };
  fire();
}

export function closeConnectionError() {
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

export function newQuery() {
  const uid = generateUid();
  newFrame({
    title: 'Nova Consulta',
    keep: true,
    props: {
      uid,
      type: 'query',
    },
    active: true,
  });
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

export function saveConnection(con: ConnectionConfiguration, index?: number) {
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

export function cancelSelectedConnetion() {
  current = { ...current, password: undefined, bases: undefined };
  fire();
}

export function cancelConnection() {
  current = {
    ...current,
    newConnection: false,
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
  fire();
}

export function editConnection(con: ConnectionConfiguration, index: number) {
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
    editConnection(password, index);
  }
}

export function removeConnection(index: number) {
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
export function nextTab() {
  const s = current;
  if (s.tabs.length === 0) return;
  const activeIndex = s.tabs.findIndex((c) => c.active);
  if (activeIndex === s.tabs.length - 1) activateTab(s.tabs[0]);
  else activateTab(s.tabs[activeIndex + 1]);
}
export function prevTab() {
  const s = current;
  if (s.tabs.length === 0) return;
  const activeIndex = s.tabs.findIndex((c) => c.active);
  if (activeIndex === 0) activateTab(s.tabs[s.tabs.length - 1]);
  else activateTab(s.tabs[activeIndex - 1]);
}
