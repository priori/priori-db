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

export function cancelAskToCloseWindow(current: AppState) {
  return {
    ...current,
    askToCloseWindow: false,
  } as AppState;
}

export function askToCloseWindow(current: AppState) {
  return {
    ...current,
    askToCloseWindow: true,
  } as AppState;
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
    tabsOpenOrder: [
      ...current.tabsOpenOrder.filter((uid) => uid !== c.props.uid),
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
    tabsOpenOrder: [
      ...current.tabsOpenOrder.filter((uid2) => uid2 !== uid),
      uid,
    ],
  };
}

function newFrame(
  current: AppState,
  fn: (uid: number) => Tab,
  inTheEnd = false
) {
  const tabs0 = current.tabs.map((c) => ({ ...c, active: false }));
  const i = current.tabs.findIndex((c) => c.active);
  const uid = current.uidCounter + 1;
  const frame = fn(uid);
  const tabs = inTheEnd
    ? [...tabs0, frame]
    : [
        ...tabs0.filter(
          (f, i2) => (i2 <= i || i === -1) && (frame.keep || f.keep)
        ),
        frame,
        ...tabs0.filter((f, i2) => i2 > i && (frame.keep || f.keep)),
      ];
  return {
    ...current,
    uidCounter: current.uidCounter + 1,
    tabs,
    tabsOpenOrder: [
      ...(frame.keep
        ? current.tabsOpenOrder
        : current.tabsOpenOrder.filter(
            (uid2) => tabs.find((t2) => t2.props.uid === uid2)?.keep
          )),
      uid,
    ],
  };
}

export function previewSchemaInfo(current: AppState, name: string) {
  const openTab = current.tabs.find(
    (t) => t.props.type === 'schemainfo' && t.props.schema === name
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

function openOrActivateTab(
  current: AppState,
  type: 'function' | 'domain' | 'sequence',
  schema: string,
  name: string,
  keep: boolean
) {
  const openTab = current.tabs.find(
    (t) =>
      t.props.type === type &&
      t.props.schema === schema &&
      t.props.name === name
  );
  if (openTab) {
    if (keep && !openTab.keep) {
      return keepTabOpen(current, openTab);
    }
    return activateTab(current, openTab);
  }
  return newFrame(current, (uid) => ({
    title: `${schema}.${name}`,
    active: true,
    keep,
    props: {
      uid,
      type,
      schema,
      name,
    },
  }));
}

export function previewFunction(
  current: AppState,
  schema: string,
  name: string
) {
  return openOrActivateTab(current, 'function', schema, name, false);
}
export function keepFunction(current: AppState, schema: string, name: string) {
  return openOrActivateTab(current, 'function', schema, name, true);
}
export function previewDomain(current: AppState, schema: string, name: string) {
  return openOrActivateTab(current, 'domain', schema, name, false);
}
export function keepDomain(current: AppState, schema: string, name: string) {
  return openOrActivateTab(current, 'domain', schema, name, true);
}
export function previewSequence(
  current: AppState,
  schema: string,
  name: string
) {
  return openOrActivateTab(current, 'sequence', schema, name, false);
}
export function keepSequence(current: AppState, schema: string, name: string) {
  return openOrActivateTab(current, 'sequence', schema, name, true);
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

function findLast<T>(a: T[], f: (i: T) => boolean) {
  for (let i = a.length - 1; i >= 0; i -= 1) {
    if (f(a[i])) return a[i];
  }
  return null;
}

export function previewTable(
  current: AppState,
  schema: string,
  t: { name: string; type: string }
) {
  const openTab = findLast(
    current.tabsOpenOrder.map(
      (uid) => current.tabs.find((t2) => t2.props.uid === uid) as Tab
    ),
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

export function extraTableTab(current: AppState, schema: string, name: string) {
  return newFrame(current, (uid) => ({
    title: `${schema}.${name}`,
    active: true,
    keep: true,
    props: {
      uid,
      table: name,
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
  const openTab = findLast(
    current.tabsOpenOrder.map(
      (uid) => current.tabs.find((t2) => t2.props.uid === uid) as Tab
    ),
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

export function previewTableInfo(
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

export function updateTabText(current: AppState, uid: number, value: string) {
  return {
    ...current,
    tabs: current.tabs.map((t) =>
      t.props.uid === uid ? { ...t, title: value } : t
    ),
  };
}

export function newSchema(current: AppState) {
  return {
    ...current,
    newSchema: true,
  };
}

export function cancelCreateSchema(current: AppState) {
  return {
    ...current,
    newSchema: false,
  };
}

export function updateHeaderTabsDisplayOrder(
  current: AppState,
  sort: number[]
) {
  const newTabs = [...current.tabs];
  newTabs.sort((a, b) => {
    return sort.indexOf(a.props.uid) - sort.indexOf(b.props.uid);
  });
  return {
    ...current,
    tabs: newTabs,
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

export function updateSchemas(
  current: AppState,
  schemas: {
    internal: boolean;
    current: boolean;
    tables: {
      type: 'MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE';
      name: string;
    }[];
    functions: {
      type: 'FUNCTION';
      name: string;
    }[];
    sequences: {
      type: 'SEQUENCE';
      name: string;
    }[];
    domains: {
      type: 'DOMAIN';
      name: string;
    }[];
    name: string;
  }[]
) {
  const cSchemas = current.schemas;
  return {
    ...current,
    schemas: schemas.map((s) => {
      const cSchema = cSchemas?.find((s2) => s2.name === s.name);
      if (cSchema)
        return {
          ...cSchema,
          ...s,
        };
      return {
        ...s,
        open: false,
        fullView: false,
        sequencesOpen: false,
        domainsOpen: false,
        functionsOpen: false,
      };
    }),
  } as AppState;
}

export function closeTab(current: AppState, f: number | FrameProps) {
  const uid = typeof f === 'number' ? f : f.uid;
  const tabsOpenOrder = current.tabsOpenOrder.filter((uid2) => uid2 !== uid);
  return {
    ...current,
    tabs: current.tabs
      .filter((tab) => uid !== tab.props.uid)
      .map((tab) =>
        tabsOpenOrder.length &&
        tabsOpenOrder[tabsOpenOrder.length - 1] === tab.props.uid
          ? { ...tab, active: true }
          : tab
      ),
    tabsOpenOrder,
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

export function newQueryTabInTheEnd(current: AppState) {
  return newFrame(
    current,
    (uid) => ({
      title: 'New Query',
      keep: true,
      props: {
        uid,
        type: 'query',
      },
      active: true,
    }),
    true
  );
}

export function newQueryTab(current: AppState) {
  return newFrame(current, (uid) => ({
    title: 'New Query',
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
  const passwords =
    typeof index === 'number'
      ? current.passwords.map((c, i) => (i === index ? conf : c))
      : [...current.passwords, conf];
  return {
    ...current,
    passwords,
  };
}

export function connected(
  current: AppState,
  database: string,
  schemas: {
    name: string;
    tables: {
      name: string;
      type: 'MATERIALIZED VIEW' | 'VIEW' | 'BASE TABLE';
    }[];
    sequences: { name: string; type: 'SEQUENCE' }[];
    functions: { name: string; type: 'FUNCTION' }[];
    domains: { name: string; type: 'DOMAIN' }[];
  }[]
) {
  const c = current.password as ConnectionConfiguration;
  return {
    ...current,
    connected: true,
    schemas: schemas.map((s) => ({
      ...s,
      open: false,
      fullView: false,
      sequencesOpen: false,
      functionsOpen: false,
    })),
    title: `${c.user}@${c.host}${
      c.port !== 5432 ? `:${c.port}` : ''
    }/${database}`,
  } as AppState;
}

export function toggleSchema(current: AppState, name: string) {
  assert(current.schemas);
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

export function openDomains(current: AppState, schema: NavSchema) {
  assert(!!current.schemas);
  return {
    ...current,
    schemas: current.schemas.map((sc) =>
      sc === schema ? { ...sc, domainsOpen: !sc.domainsOpen } : sc
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

export function openFullView(current: AppState, name: string) {
  return {
    ...current,
    schemas: current.schemas?.map((s) =>
      s.name === name
        ? {
            ...s,
            open: true,
            fullView: true,
          }
        : s
    ),
  };
}

export function changeSchema(current: AppState, uid: number, schema: string) {
  const tab = current.tabs.find((t) => t.props.uid === uid);
  if (!tab) return current;
  return {
    ...current,
    tabs: current.tabs.map((t) =>
      (t.props.type === 'table' || t.props.type === 'tableinfo') &&
      (tab.props.type === 'table' || tab.props.type === 'tableinfo') &&
      t.props.schema === tab.props.schema &&
      t.props.table === tab.props.table
        ? {
            ...t,
            title: `${schema}.${t.props.table}${
              t.props.type === 'tableinfo' ? ' info' : ''
            }`,
            props: { ...t.props, schema },
          }
        : tab.props.uid === uid &&
          (t.props.type === 'sequence' ||
            t.props.type === 'domain' ||
            t.props.type === 'function')
        ? {
            ...t,
            title: `${schema}.${t.props.name}`,
            props: { ...t.props, schema },
          }
        : t
    ),
  };
}

export function renameEntity(curret: AppState, uid: number, name: string) {
  const tab = curret.tabs.find((t) => t.props.uid === uid);
  if (!tab) return curret;
  return {
    ...curret,
    tabs: curret.tabs.map((t) =>
      (t.props.type === 'table' || t.props.type === 'tableinfo') &&
      (tab.props.type === 'table' || tab.props.type === 'tableinfo') &&
      t.props.schema === tab.props.schema &&
      t.props.table === tab.props.table
        ? {
            ...t,
            title: `${t.props.schema}.${name}${
              t.props.type === 'tableinfo' ? ' info' : ''
            }`,
            props: { ...t.props, table: name },
          }
        : tab.props.uid === uid && t.props.type === 'function'
        ? {
            ...t,
            title: `${t.props.schema}.${name}${t.props.name.substring(
              t.props.name.lastIndexOf('('),
              t.props.name.length
            )}`,
            props: {
              ...t.props,
              name: `${name}${t.props.name.substring(
                t.props.name.lastIndexOf('('),
                t.props.name.length
              )}`,
            },
          }
        : tab.props.uid === uid &&
          (t.props.type === 'sequence' || t.props.type === 'domain')
        ? {
            ...t,
            title: `${t.props.schema}.${name}`,
            props: { ...t.props, name },
          }
        : t
    ),
  };
}

export function showError(current: AppState, error: Error) {
  return {
    ...current,
    errors: [...current.errors, error],
  };
}

export function closeError(current: AppState, error: Error) {
  return {
    ...current,
    errors: current.errors.filter((e) => e !== error),
  };
}
