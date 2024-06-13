import React, { useRef } from 'react';
import {
  keepDomain,
  keepFunction,
  keepOpenRole,
  keepOpenTable,
  keepSequence,
  openDomains,
  openFunctions,
  openRoles,
  openSchema,
  openSequences,
  previewDomain,
  previewFunction,
  previewRole,
  previewSequence,
  previewTable,
} from 'state/actions';
import { NavSchema } from 'types';
import { assert } from 'util/assert';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { Focus } from './useNavTree';
import { NavTreeItem } from './useTree';

export function useKeyboardInterations(
  tree: NavTreeItem[],
  focused: Focus | null,
  blur: (e: 'next' | 'prev' | 'up' | 'down') => void,
  setFocused: (v: Focus | null) => void,
  schemas: NavSchema[],
  disabled?: boolean,
) {
  const rows = React.useMemo(() => {
    const rows2: NavTreeItem[] = [];
    for (const v of tree) {
      rows2.push(v);
      if (v.isOpen) {
        for (const v2 of v.children ?? []) {
          rows2.push(v2);
          if (v2.isOpen) {
            for (const v3 of v2.children ?? []) {
              rows2.push(v3);
            }
          }
        }
      }
    }
    return rows2;
  }, [tree]);
  const onKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Tab' && e.ctrlKey) return;
    const strongHit = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
    const direction =
      e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)
        ? +1
        : e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)
          ? -1
          : undefined;
    if (
      e.key === 'ArrowDown' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === ' ' ||
      e.key === 'Space' ||
      e.key === 'Escape'
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'Escape') {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) {
        ae.blur();
      }
      return;
    }
    if (focused === null) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp')
        blur(e.key === 'ArrowDown' ? 'down' : 'up');
      else blur(e.shiftKey ? 'prev' : 'next');
      return;
    }
    const enter = e.key === 'Enter' || e.key === ' ' || e.key === 'Space';
    // setFocus([tree[1].key]);
    if (!focused) return;
    const index = rows.findIndex(
      (v) =>
        v.key === focused.key &&
        v.type === focused.type &&
        v.schema === focused.schema,
    );
    if (index === -1) return;
    const item = rows[index];
    if (direction === 1 || direction === -1) {
      const next = rows[index + direction];
      if (next) {
        setFocused({
          type: next.type,
          key: next.key,
          schema: next.schema,
          name: next.title,
        } as Focus);
      } else if (direction === -1) {
        blur('up');
      }
      return;
      // open or close folders
    }
    if (
      item.children &&
      ((!item.isOpen && e.key === 'ArrowRight') ||
        (item.isOpen && e.key === 'ArrowLeft') ||
        enter)
    ) {
      if (item.type === 'schema-folder') {
        openSchema(item.title);
      } else if (item.type === 'functions-folder') {
        const s = schemas.find((v) => v.name === item.schema);
        assert(s);
        if (s.functions && s.functions.length > 0) openFunctions(s);
      } else if (item.type === 'domains-folder') {
        const s = schemas.find((v) => v.name === item.schema);
        assert(s);
        if (s.domains && s.domains.length > 0) openDomains(s);
      } else if (item.type === 'sequences-folder') {
        const s = schemas.find((v) => v.name === item.schema);
        assert(s);
        if (s.sequences && s.sequences.length > 0) openSequences(s);
      } else if (item.type === 'roles-folder') {
        openRoles();
      }
    } else if (
      e.key === 'ArrowLeft' &&
      (!item.isOpen || !item.children) &&
      item.type !== 'schema-folder' &&
      item.type !== 'roles-folder'
    ) {
      const goToSchemaFolder = !!(item.children && item.schema);
      for (let i = index - 1; i >= 0; i -= 1) {
        if (
          (rows[i].children && !goToSchemaFolder) ||
          rows[i].type === 'schema-folder'
        ) {
          setFocused({
            type: rows[i].type,
            key: rows[i].key,
            schema: rows[i].schema,
            name: rows[i].title,
          } as Focus);
          return;
        }
      }
    } else if (enter) {
      if (
        item.type === 'table' ||
        item.type === 'view' ||
        item.type === 'mview'
      ) {
        const t = schemas
          .find((v) => v.name === item.schema)
          ?.tables.find((v) => v.name === item.title);
        assert(t);
        if (strongHit)
          keepOpenTable(item.schema, { name: item.title, type: t.type });
        else previewTable(item.schema, { name: item.title, type: t.type });
      } else if (item.type === 'function' || item.type === 'procedure') {
        if (strongHit) keepFunction(item.schema, focused.name);
        else previewFunction(item.schema, focused.name);
      } else if (item.type === 'domain') {
        if (strongHit) keepDomain(item.schema, focused.name);
        else previewDomain(item.schema, focused.name);
      } else if (item.type === 'sequence') {
        if (strongHit) keepSequence(item.schema, focused.name);
        else previewSequence(item.schema, focused.name);
      } else if (item.type === 'role' || item.type === 'user') {
        if (strongHit) keepOpenRole(focused.name);
        else previewRole(focused.name);
      }
    }
  });

  const lastKeyUp = useRef({
    key: null as string | null,
    time: 0,
    focused: null as Focus | null,
  });

  const onKeyUp = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Tab' && e.ctrlKey) return;
    const doubleHit =
      (lastKeyUp.current.key === e.key &&
        Date.now() - lastKeyUp.current.time < 300 &&
        equals(focused, lastKeyUp.current.focused)) ||
      false;
    lastKeyUp.current.key = e.key;
    lastKeyUp.current.time = Date.now();
    lastKeyUp.current.focused = focused;
    if (
      doubleHit &&
      focused &&
      (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') &&
      (focused.type === 'table' ||
        focused.type === 'view' ||
        focused.type === 'mview' ||
        focused.type === 'function' ||
        focused.type === 'procedure' ||
        focused.type === 'domain' ||
        focused.type === 'sequence' ||
        focused.type === 'role' ||
        focused.type === 'user')
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (focused.type === 'role' || focused.type === 'user') {
        keepOpenRole(focused.name);
      } else if (
        focused.type === 'table' ||
        focused.type === 'view' ||
        focused.type === 'mview'
      ) {
        keepOpenTable(
          focused.schema,
          schemas
            .find((s) => s.name === focused.schema)!
            .tables.find((t) => t.name === focused.name)!,
        );
      } else if (focused.type === 'function' || focused.type === 'procedure') {
        keepFunction(focused.schema, focused.name);
      } else if (focused.type === 'domain') {
        keepDomain(focused.schema, focused.name);
      } else if (focused.type === 'sequence') {
        keepSequence(focused.schema, focused.name);
      }
    }
  });

  return {
    onKeyUp,
    onKeyDown,
    rows,
  };
}
