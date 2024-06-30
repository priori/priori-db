import React from 'react';
import {
  extraTableTab,
  keepDomain,
  keepFunction,
  keepOpenRole,
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
import { useEvent } from 'util/useEvent';
import { Focus } from './useNavTree';
import { NavTreeItem } from './useTree';

export function useMouseInterations(
  setFocused: (v: Focus) => void,
  schemas: NavSchema[],
  focused: Focus | null,
  disabled?: boolean,
) {
  const [longMouseOver, setLongMouseOver] = React.useState(false);

  const onLongMouseOver = useEvent(() => {
    if (focused?.contextMenu) return;
    setLongMouseOver(true);
  });

  const onMouseLeave = useEvent(() => {
    setLongMouseOver(false);
  });

  const onMouseDown = useEvent((e: NavTreeItem, ev: React.MouseEvent) => {
    if (ev.button === 2) {
      setLongMouseOver(false);
    }
    setFocused({
      type: e.type,
      key: e.key,
      schema: e.schema,
      name: e.title,
      contextMenu:
        ev.button === 2 &&
        (e.type === 'table' ||
          e.type === 'view' ||
          e.type === 'mview' ||
          e.type === 'schema-folder' ||
          e.type === 'roles-folder')
          ? {
              x: ev.clientX,
              y: ev.clientY,
            }
          : undefined,
    } as Focus);
  });

  const onClick = useEvent((e: NavTreeItem) => {
    if (disabled) return;
    if (e.children) {
      if (e.type === 'schema-folder') {
        openSchema(e.title);
      } else if (e.type === 'functions-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.functions && s.functions.length > 0) openFunctions(s);
      } else if (e.type === 'domains-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.domains && s.domains.length > 0) openDomains(s);
      } else if (e.type === 'sequences-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.sequences && s.sequences.length > 0) openSequences(s);
      } else if (e.type === 'roles-folder') {
        openRoles();
      }
    } else {
      if (longMouseOver) onMouseLeave();
      if (e.type === 'table' || e.type === 'view' || e.type === 'mview') {
        const t = schemas
          .find((v) => v.name === e.schema)
          ?.tables.find((v) => v.name === e.title);
        assert(t);
        previewTable(e.schema, { name: e.title, type: t.type });
      } else if (e.type === 'function' || e.type === 'procedure') {
        previewFunction(e.schema, e.title);
      } else if (e.type === 'domain') {
        previewDomain(e.schema, e.title);
      } else if (e.type === 'sequence') {
        previewSequence(e.schema, e.title);
      } else if (e.type === 'role' || e.type === 'user') {
        previewRole(e.title, e.host);
      }
    }
  });

  const onDblClick = useEvent((e: NavTreeItem) => {
    if (disabled) return;
    if (longMouseOver) onMouseLeave();
    if (e.type === 'table' || e.type === 'view' || e.type === 'mview') {
      const t = schemas
        .find((v) => v.name === e.schema)
        ?.tables.find((v) => v.name === e.title);
      assert(e.schema);
      assert(t);
      extraTableTab(e.schema, e.title);
    } else if (e.type === 'function' || e.type === 'procedure') {
      assert(e.schema);
      keepFunction(e.schema, e.title);
    } else if (e.type === 'domain') {
      assert(e.schema);
      keepDomain(e.schema, e.title);
    } else if (e.type === 'sequence') {
      assert(e.schema);
      keepSequence(e.schema, e.title);
    } else if (e.type === 'role' || e.type === 'user') {
      keepOpenRole(e.title, e.host);
    }
  });
  return {
    onMouseDown,
    onClick,
    onDblClick,
    onLongMouseOver,
    longMouseOver,
    onMouseLeave,
  };
}
