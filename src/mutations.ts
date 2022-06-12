import assert from 'assert';
import { ConnectionConfiguration } from 'db/pgpass';
import { AppState, FrameProps, NavSchema, Tab, Type } from 'types';

export function setBases(current: AppState, bases: string[]) {
  return {
    ...current,
    // editConnection: undefined,
    editConnections: false,
    newConnection: false,
    bases,
  };
}

export function editingAll(current: AppState) {
  return {
    ...current,
    editConnections: !current.editConnections,
    connectionError: undefined,
  };
}

export function newConf(current: AppState) {
  return {
    ...current,
    newConnection: true,
    connectionError: undefined,
  };
}

export function setConnectionError(current: AppState, err: Error) {
  return {
    ...current,
    connectionError: err,
  };
}

export function activateTab(current: AppState, c: Tab) {
  const tabs = current.tabs.map((tab) =>
    c.props.uid === tab.props.uid
      ? { ...tab, active: true }
      : { ...tab, active: false }
  );
  return {
    ...current,
    tabs,
    tabsSort: [
      ...current.tabsSort.filter((uid) => uid !== c.props.uid),
      c.props.uid,
    ],
  };
}

export function keepTabOpen(current: AppState, tab: Tab | number) {
  const uid = typeof tab === 'number' ? tab : tab.props.uid;
  if (current.tabs.find((tab2) => tab2.props.uid === uid)?.keep) return current;
  const tabs = current.tabs.map((tab2) =>
    uid === tab2.props.uid
      ? { ...tab2, active: true, keep: true }
      : { ...tab2, active: false }
  );
  return {
    ...current,
    tabs,
    tabsSort: [...current.tabsSort.filter((uid2) => uid2 !== uid), uid],
  };
}

function newFrame(current: AppState, fn: (uid: number) => Tab) {
  const tabs0 = current.tabs.map((c) => ({ ...c, active: false }));
  const i = current.tabs.findIndex((c) => c.active);
  const uid = current.uidCounter + 1;
  const frame = fn(uid);
  const tabs = [
    ...tabs0.filter((f, i2) => (i2 <= i || i === -1) && (frame.keep || f.keep)),
    frame,
    ...tabs0.filter((f, i2) => i2 > i && (frame.keep || f.keep)),
  ];
  return {
    ...current,
    uidCounter: current.uidCounter + 1,
    tabs,
    tabsSort: [...current.tabsSort, uid].filter(
      (uid2) => !!tabs.find((t2) => t2.props.uid === uid2)
    ),
  };
}

export function pikSchemaInfo(current: AppState, name: string) {
  const openTab = current.tabs.find(
    (tab) => tab.props.type === 'schemainfo' && tab.props.schema === name
  );
  if (openTab) {
    return activateTab(current, openTab);
  }
  return newFrame(current, (uid) => ({
    title: `${name} info`,
    active: true,
    keep: false,
    props: {
      uid,
      type: 'schemainfo',
      schema: name,
    },
  }));
}

export function keepSchemaInfo(current: AppState, name: string) {
  const openTab = current.tabs.find(
    (tab) => tab.props.type === 'schemainfo' && tab.props.schema === name
  );
  if (openTab) {
    return keepTabOpen(current, openTab.props.uid);
  }
  return newFrame(current, (uid) => ({
    title: `${name} info`,
    active: true,
    keep: true,
    props: {
      uid,
      type: 'schemainfo',
      schema: name,
    },
  }));
}

export function pikTable(
  current: AppState,
  schema: string,
  t: { name: string; type: string }
) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'table' &&
      tab.props.schema === schema &&
      tab.props.table === t.name
  );
  if (openTab) {
    return activateTab(current, openTab);
  }
  return newFrame(current, (uid) => ({
    title: `${schema}.${t.name}`,
    active: true,
    keep: false,
    props: {
      uid,
      table: t.name,
      type: 'table',
      schema,
    },
  }));
}

export function keepTable(
  current: AppState,
  schema: string,
  t: { name: string; type: string }
) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'table' &&
      tab.props.schema === schema &&
      tab.props.table === t.name
  );
  if (openTab) {
    return keepTabOpen(current, openTab.props.uid);
  }
  return newFrame(current, (uid) => ({
    title: `${schema}.${t.name}`,
    active: true,
    keep: true,
    props: {
      uid,
      table: t.name,
      type: 'table',
      schema,
    },
  }));
}

export function removeError(current: AppState) {
  return {
    ...current,
    connectionError: undefined,
  };
}

export function pikTableInfo(current: AppState, schema: string, table: string) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'tableinfo' &&
      tab.props.schema === schema &&
      tab.props.table === table
  );
  if (openTab) {
    return activateTab(current, openTab);
  }
  return newFrame(current, (uid) => ({
    title: `${schema}.${table} info`,
    active: true,
    keep: false,
    props: {
      uid,
      type: 'tableinfo',
      schema,
      table,
    },
  }));
}

export function keepTableInfo(
  current: AppState,
  schema: string,
  table: string
) {
  const openTab = current.tabs.find(
    (tab) =>
      tab.props.type === 'tableinfo' &&
      tab.props.schema === schema &&
      tab.props.table === table
  );
  if (openTab) {
    return keepTabOpen(current, openTab.props.uid);
  }
  return newFrame(current, (uid) => ({
    title: `${schema}.${table} info`,
    active: true,
    keep: true,
    props: {
      uid,
      type: 'tableinfo',
      schema,
      table,
    },
  }));
}

export function updateTabText(
  current: AppState,
  editing: Tab | null,
  value: string
) {
  return {
    ...current,
    tabs: current.tabs.map((t) => (t === editing ? { ...t, title: value } : t)),
  };
}

export function newSchema(current: AppState) {
  return {
    ...current,
    newSchema: true,
  };
}

function filterTabs(current: AppState, fn: (c: Tab) => boolean) {
  const tabsSort = current.tabsSort.filter((uid) =>
    fn(current.tabs.find((tab) => tab.props.uid === uid) as Tab)
  );
  return {
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

export function dropSchema(current: AppState, name: string) {
  const state = {
    ...current,
    schemas: (current.schemas as NavSchema[]).filter((sc) => sc.name !== name),
  };
  return filterTabs(state, (c: Tab) => {
    return !(c.props.type === 'schemainfo' && c.props.schema === name);
  });
}

export function dropSchemaCascade(current: AppState, name: string) {
  const state2 = {
    ...current,
    schemas: (current.schemas as NavSchema[]).filter((sc) => sc.name !== name),
  };
  return filterTabs(state2, (c: Tab) => {
    return !(c.props.type === 'schemainfo' && c.props.schema === name);
  });
}

export function cancelCreateSchema(current: AppState) {
  return {
    ...current,
    newSchema: false,
  };
}

export function createSchema(current: AppState, name: string) {
  return {
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
}

export function changeTabsSort(current: AppState, sort: number[]) {
  const newTabs = [...current.tabs];
  newTabs.sort((a, b) => {
    return sort.indexOf(a.props.uid) - sort.indexOf(b.props.uid);
  });
  return {
    ...current,
    tabs: newTabs,
    tabsSort: sort,
  };
}

export function closeFullView(current: AppState, name: string) {
  return {
    ...current,
    schemas: current.schemas?.map((s) =>
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
}

export function newTable(current: AppState, schema: string, types: Type[]) {
  return newFrame(current, (uid) => ({
    title: 'Nova Tabela',
    active: true,
    keep: true,
    props: {
      uid,
      type: 'newtable',
      schema,
      types,
    },
  }));
}

export function keepOpenTable(
  current: AppState,
  schema: string,
  t: { name: string; type: string }
) {
  return keepTable(current, schema, t);
}

export function updateSchemas(current: AppState, schemas: NavSchema[]) {
  return {
    ...current,
    schemas,
  };
}

export function closeTab(current: AppState, f: number | FrameProps) {
  const uid = typeof f === 'number' ? f : f.uid;
  const tabsSort = current.tabsSort.filter((uid2) => uid2 !== uid);
  return {
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
}

export function closeConnectionError(current: AppState) {
  return {
    ...current,
    connectionError: undefined,
  };
}

export function setConnection(
  current: AppState,
  password: ConnectionConfiguration
) {
  return { ...current, password };
}

export function newQuery(current: AppState) {
  return newFrame(current, (uid) => ({
    title: 'Nova Consulta',
    keep: true,
    props: {
      uid,
      type: 'query',
    },
    active: true,
  }));
}

export function addConnectionConfiguration(
  current: AppState,
  conf: ConnectionConfiguration,
  index?: number
) {
  let passwords;
  if (typeof index === 'number') {
    passwords = current.passwords.map((c, i) => (i === index ? conf : c));
  } else {
    passwords = [...current.passwords, conf];
  }
  return {
    ...current,
    passwords,
  };
}

export function connected(
  current: AppState,
  database: string,
  schemas: string[]
) {
  const c = current.password as ConnectionConfiguration;
  return {
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
}

export function toggleSchema(current: AppState, name: string) {
  if (!current.schemas) throw new Error('Schemas não econtrado.');
  return {
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
}

export function openSchemaSuccess(
  current: AppState,
  name: string,
  tables: { name: string; type: string }[]
) {
  if (!current.schemas) throw new Error('Schemas não econtrado.');
  return {
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
}

export function connectionSaved(current: AppState) {
  return {
    ...current,
    newConnection: false,
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
}

export function cancelSelectedConnection(current: AppState) {
  return { ...current, password: undefined, bases: undefined };
}

export function cancelConnection(current: AppState) {
  return {
    ...current,
    newConnection: false,
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
}

export function editConnection(
  current: AppState,
  con: ConnectionConfiguration,
  index: number
) {
  return {
    ...current,
    connectionError: undefined,
    editConnection: {
      connection: con,
      index,
    },
  };
}

export function editConnectionSelected(current: AppState) {
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
    return editConnection(current, password, index);
  }
  return current;
}

export function removeConnection(current: AppState, index: number) {
  return {
    ...current,
    passwords: current.passwords.filter((_, i) => i !== index),
    editConnection: undefined,
    editConnections: false,
    connectionError: undefined,
  };
}

export function openSequences(current: AppState, schema: NavSchema) {
  assert(!!current.schemas);
  return {
    ...current,
    schemas: current.schemas.map((sc) =>
      sc === schema ? { ...sc, sequencesOpen: !sc.sequencesOpen } : sc
    ),
  };
}

export function openFunctions(current: AppState, schema: NavSchema) {
  assert(!!current.schemas);
  return {
    ...current,
    schemas: current.schemas.map((sc) =>
      sc === schema ? { ...sc, functionsOpen: !sc.functionsOpen } : sc
    ),
  };
}

export function nextTab(current: AppState) {
  const s = current;
  if (s.tabs.length === 0) return s;
  const activeIndex = s.tabs.findIndex((c) => c.active);
  if (activeIndex === s.tabs.length - 1) return activateTab(s, s.tabs[0]);
  return activateTab(s, s.tabs[activeIndex + 1]);
}

export function prevTab(current: AppState) {
  const s = current;
  if (s.tabs.length === 0) return s;
  const activeIndex = s.tabs.findIndex((c) => c.active);
  if (activeIndex === 0) return activateTab(s, s.tabs[s.tabs.length - 1]);
  return activateTab(s, s.tabs[activeIndex - 1]);
}

export function openFullView(
  current: AppState,
  name: string,
  tables: {
    type: string;
    name: string;
  }[],
  domains: never[],
  functions: {
    type: string;
    name: string;
  }[],
  collations: never[],
  sequences: {
    type: string;
    name: string;
  }[]
) {
  return {
    ...current,
    schemas: current.schemas?.map((s) =>
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
}
