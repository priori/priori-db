import { useMemo, useRef } from 'react';
import { equals } from 'util/equals';
import { Tab } from '../../../../types';

function useCache<T>(v: T) {
  const ref = useRef(v);
  if (equals(ref.current, v)) {
    return ref.current;
  }
  ref.current = v;
  return ref.current;
}

export function useTabs(tabs0: Tab[]) {
  const tabs = useCache(tabs0.filter((t) => t.props.type !== 'query'));
  return useMemo(() => {
    const openTables: Map<string, Set<string>> = new Map();
    const openTabDomains: Map<string, Set<string>> = new Map();
    const openTabFunctions: Map<string, Set<string>> = new Map();
    const openTabSequences: Map<string, Set<string>> = new Map();
    const openRoles: Set<string> = new Set();
    const openSchemas: Set<string> = new Set();
    for (const tab of tabs) {
      if (tab.props.type === 'table' || tab.props.type === 'tableinfo') {
        if (!openTables.has(tab.props.schema))
          openTables.set(tab.props.schema, new Set());
        openTables.get(tab.props.schema)!.add(tab.props.table);
      } else if (tab.props.type === 'domain') {
        if (!openTabDomains.has(tab.props.schema))
          openTabDomains.set(tab.props.schema, new Set());
        openTabDomains.get(tab.props.schema)!.add(tab.props.name);
      } else if (tab.props.type === 'function') {
        if (!openTabFunctions.has(tab.props.schema))
          openTabFunctions.set(tab.props.schema, new Set());
        openTabFunctions.get(tab.props.schema)!.add(tab.props.name);
      } else if (tab.props.type === 'sequence') {
        if (!openTabSequences.has(tab.props.schema))
          openTabSequences.set(tab.props.schema, new Set());
        openTabSequences.get(tab.props.schema)!.add(tab.props.name);
      } else if (tab.props.type === 'role') {
        openRoles.add(tab.props.name);
      } else if (tab.props.type === 'schemainfo') {
        openSchemas.add(tab.props.schema);
      }
    }

    return {
      active: tabs.find((c) => c.active) || null,
      open: {
        schemaInfo(n: string) {
          return openSchemas.has(n);
        },
        table(s: string, t: string) {
          return openTables.has(s) && openTables.get(s)!.has(t);
        },
        role(n: string) {
          return openRoles.has(n);
        },
        function(s: string, n: string) {
          return openTabFunctions.has(s) && openTabFunctions.get(s)!.has(n);
        },
        sequence(s: string, n: string) {
          return openTabSequences.has(s) && openTabSequences.get(s)!.has(n);
        },
        domain(s: string, n: string) {
          return openTabSequences.has(s) && openTabSequences.get(s)!.has(n);
        },
      },
    };
  }, [tabs]);
}
export type Tabs = ReturnType<typeof useTabs>;
