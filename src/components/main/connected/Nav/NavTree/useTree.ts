import { db } from 'db/db';
import React from 'react';
import { NavSchema } from 'types';
import { Tabs } from '../navUtils';
import { Focus } from './useNavTree';

export type NavTreeItemType =
  | 'table'
  | 'function'
  | 'role'
  | 'user'
  | 'mview'
  | 'view'
  | 'domain'
  | 'sequence'
  | 'schema-folder'
  | 'roles-folder'
  | 'functions-folder'
  | 'domains-folder'
  | 'sequences-folder';

export type NavTreeItem =
  | {
      title: string;
      type:
        | 'table'
        | 'function'
        | 'mview'
        | 'view'
        | 'domain'
        | 'sequence'
        | 'procedure';
      internal?: boolean;
      infoAction?: boolean;
      includeActions?: never;
      children?: undefined;
      key: string;
      important?: boolean;
      hasFocus?: boolean;
      isActive?: boolean;
      isOpen?: boolean;
      schema: string;
      rowsOpen: number;
      contextMenu?: { x: number; y: number } | true | 1 | 2;
    }
  | {
      title: string;
      type: 'role' | 'user';
      internal?: boolean;
      infoAction?: boolean;
      includeActions?: never;
      children?: undefined;
      key: string;
      important?: boolean;
      hasFocus?: boolean;
      isActive?: boolean;
      isOpen?: boolean;
      schema?: string;
      rowsOpen: number;
      host?: string;
      contextMenu?: { x: number; y: number } | true;
    }
  | {
      title: string;
      children: NavTreeItem[];
      internal?: boolean;
      infoAction?: boolean;
      includeActions?: boolean;
      key: string;
      important?: boolean;
      hasFocus?: boolean;
      isActive?: false;
      isOpen?: boolean;
      schema?: string;
      rowsOpen: number;
      type:
        | 'roles-folder'
        | 'functions-folder'
        | 'domains-folder'
        | 'sequences-folder'
        | 'schema-folder';
      contextMenu?: { x: number; y: number } | true | 1 | 2;
      newRole?: boolean;
    };

function buildTree(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean; host?: string }[] | undefined,
  rolesOpen: boolean,
) {
  const root: NavTreeItem[] = [];
  for (const s of schemas) {
    const children: NavTreeItem[] = [];
    for (const t of s.tables) {
      children.push({
        title: t.name,
        type:
          t.type === 'MATERIALIZED VIEW'
            ? 'mview'
            : t.type === 'VIEW'
              ? 'view'
              : 'table',
        infoAction: true,
        key: JSON.stringify(t.name),
        rowsOpen: 1,
        schema: s.name,
      });
    }
    if (s.functions) {
      const children2: NavTreeItem[] = [];
      for (const f of s.functions) {
        children2.push({
          title: f.name,
          type: f.type === 'FUNCTION' ? 'function' : 'procedure',
          key: JSON.stringify(f.name),
          rowsOpen: 1,
          schema: s.name,
        });
      }
      children.push({
        title: 'Functions & Procedures',
        children: children2,
        key: 'functions',
        type: 'functions-folder',
        schema: s.name,
        isOpen: s.functionsOpen,
        rowsOpen: s.functionsOpen ? children2.length + 1 : 1,
      });
    }
    if (s.sequences) {
      const children2: NavTreeItem[] = [];
      for (const seq of s.sequences) {
        children2.push({
          title: seq.name,
          type: 'sequence',
          key: JSON.stringify(seq.name),
          rowsOpen: 1,
          schema: s.name,
        });
      }
      children.push({
        title: 'Sequences',
        children: children2,
        key: 'sequences',
        type: 'sequences-folder',
        schema: s.name,
        isOpen: s.sequencesOpen,
        rowsOpen: s.sequencesOpen ? children2.length + 1 : 1,
      });
    }
    if (s.domains) {
      const children2: NavTreeItem[] = [];
      for (const d of s.domains) {
        children2.push({
          title: d.name,
          type: 'domain',
          key: JSON.stringify(d.name),
          rowsOpen: 1,
          schema: s.name,
        });
      }
      children.push({
        title: 'Domains & Types',
        children: children2,
        key: 'domains',
        type: 'domains-folder',
        schema: s.name,
        isOpen: s.domainsOpen,
        rowsOpen: s.domainsOpen ? children2.length + 1 : 1,
      });
    }
    root.push({
      title: s.name,
      children,
      internal: s.internal,
      includeActions: true,
      infoAction: true,
      important: s.current,
      key: JSON.stringify(s.name),
      type: 'schema-folder',
      isOpen: s.open,
      rowsOpen: s.open
        ? children.map((v) => v.rowsOpen).reduce((a, b) => a + b, 0) + 1
        : 1,
    });
  }
  if (roles && db().privileges?.role) {
    const children: NavTreeItem[] = [];
    for (const r of roles) {
      const role: NavTreeItem = {
        title: r.name,
        type: r.isUser ? 'user' : 'role',
        key: r.host ? `${r.name}\n${r.host}` : r.name,
        internal: r.name.startsWith('pg_'),
        rowsOpen: 1,
        host: r.host,
      };
      children.push(role);
    }
    const rootRoles: NavTreeItem = {
      title: 'Users & Roles',
      children,
      includeActions: db().privileges?.createRole ? true : undefined,
      internal: true,
      key: 'roles',
      type: 'roles-folder',
      isOpen: rolesOpen,
      rowsOpen: rolesOpen ? children.length + 1 : 1,
    };
    root.push(rootRoles);
  }
  return root;
}

export function useTree(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean }[] | undefined,
  rolesOpen: boolean,
  tabs: Tabs,
  focused: Focus | null,
) {
  const tree0: NavTreeItem[] = React.useMemo(
    () => buildTree(schemas, roles, rolesOpen),
    [schemas, roles, rolesOpen],
  );

  const tree = React.useMemo(() => {
    // schemas and roles folder
    return tree0.map((v) => {
      const schemaHasFocus =
        focused && focused.type === v.type && focused.key === v.key;
      return {
        ...v,
        hasFocus: schemaHasFocus,
        contextMenu: schemaHasFocus ? focused.contextMenu : undefined,
        // tables and roles
        children: v.children?.map((v2) => {
          if (v2.children) {
            const folderHasFocus =
              focused &&
              focused.type === v2.type &&
              focused.key === v2.key &&
              focused.schema === v2.schema;
            return {
              ...v2,
              hasFocus: folderHasFocus,
              contextMenu: folderHasFocus ? focused.contextMenu : undefined,
              // functions, domains, sequences
              children: v2.children.map((v3) => {
                const hasFocus2 =
                  focused &&
                  focused.type === v3.type &&
                  focused.key === v3.key &&
                  focused.schema === v3.schema;
                const isOpen2 =
                  ((v3.type === 'function' || v3.type === 'procedure') &&
                    tabs.open.function(v3.schema, v3.title)) ||
                  (v3.type === 'domain' &&
                    tabs.open.domain(v3.schema, v3.title)) ||
                  (v3.type === 'sequence' &&
                    tabs.open.sequence(v3.schema, v3.title));
                const isActive2 =
                  (tabs.active?.props.type === v3.type ||
                    (tabs.active?.props.type === 'function' &&
                      v3.type === 'procedure')) &&
                  (tabs.active.props as { name: string }).name === v3.title;
                if (isOpen2 || isActive2 || hasFocus2) {
                  return {
                    ...v3,
                    isOpen: isOpen2,
                    isActive: isActive2,
                    hasFocus: hasFocus2,
                    contextMenu: hasFocus2 ? focused.contextMenu : undefined,
                  };
                }
                return v3;
              }),
            };
          }
          const isOpen =
            ((v2.type === 'table' ||
              v2.type === 'view' ||
              v2.type === 'mview') &&
              tabs.open.table(v2.schema, v2.title)) ||
            ((v2.type === 'role' || v2.type === 'user') &&
              tabs.open.role(v2.title, v2.host));
          const isActive =
            ((v2.type === 'table' ||
              v2.type === 'view' ||
              v2.type === 'mview') &&
              (tabs.active?.props.type === 'table' ||
                tabs.active?.props.type === 'tableinfo') &&
              tabs.active.props.table === v2.title) ||
            ((v2.type === 'role' || v2.type === 'user') &&
              tabs.active?.props.type === 'role' &&
              tabs.active?.props.host === v2.host &&
              tabs.active.props.name === v2.title);
          const hasFocus =
            focused &&
            focused.type === v2.type &&
            focused.key === v2.key &&
            focused.schema === v2.schema;

          return isOpen || isActive || hasFocus
            ? {
                ...v2,
                isOpen,
                isActive,
                hasFocus,
                contextMenu: hasFocus ? focused.contextMenu : undefined,
              }
            : v2;
        }),
        newRole:
          v.type === 'roles-folder' &&
          v.includeActions &&
          focused?.type === 'roles-folder' &&
          focused?.newRole,
      };
    });
  }, [tree0, tabs, focused]) as NavTreeItem[];

  return tree;
}
