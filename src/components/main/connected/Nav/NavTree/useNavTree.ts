import React, { useRef } from 'react';
import { NavSchema } from 'types';
import { useEvent } from 'util/useEvent';
import { Tabs } from '../navUtils';
import { useTree } from './useTree';
import { useMouseInterations } from './useMouseInterations';
import { useKeyboardInterations } from './useKeyboardInterations';

export type Focus =
  | {
      type:
        | 'table'
        | 'function'
        | 'procedure'
        | 'mview'
        | 'view'
        | 'domain'
        | 'sequence'
        | 'role';
      key: string;
      schema: string;
      name: string;
      contextMenu?: undefined | { x: number; y: number } | true | 1 | 2;
    }
  | {
      type:
        | 'user'
        | 'schema-folder'
        | 'roles-folder'
        | 'functions-folder'
        | 'domains-folder'
        | 'sequences-folder';
      key: string;
      schema?: undefined | string;
      name: string;
      contextMenu?: undefined | { x: number; y: number } | true | 1 | 2;
      newRole?: boolean;
    };

export function useNavTree(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean }[] | undefined,
  rolesOpen: boolean,
  tabs: Tabs,
  onBlur: (v: 'down' | 'up' | 'prev' | 'next') => void,
  disabled?: boolean,
) {
  const [focused, setFocused] = React.useState<Focus | null>(null);

  const blur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
    onBlur(e);
  });

  const lastFocused = useRef<Focus | null>(focused);
  if (focused !== null) lastFocused.current = focused;

  const tree = useTree(schemas, roles, rolesOpen, tabs, focused);

  const {
    longMouseOver,
    onClick,
    onDblClick,
    onLongMouseOver,
    onMouseDown,
    onMouseLeave,
  } = useMouseInterations(setFocused, schemas, focused, disabled);

  const onNavContextMenuClose = useEvent(() => {
    onMouseLeave();
    setFocused((f) =>
      f
        ? {
            ...f,
            contextMenu: undefined,
          }
        : null,
    );
  });

  const onDivBlur = useEvent(() => {
    // onMouseLeave();
    if (disabled) return;
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
  });

  const { onKeyUp, onKeyDown, rows } = useKeyboardInterations(
    tree,
    focused,
    blur,
    setFocused,
    schemas,
    onMouseLeave,
    disabled,
  );

  const onFocus = useEvent((e: React.FocusEvent) => {
    if (disabled) return;
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('.dialog, .nav-context-menu')
    ) {
      return;
    }
    if (focused === null) {
      const f = rows[0];
      setFocused(
        f
          ? ({
              type: f.type,
              key: f.key,
              schema: f.schema,
              name: f.title,
            } as Focus)
          : null,
      );
    }
  });

  return {
    longMouseOver: !focused?.contextMenu ? longMouseOver : false,
    onClick,
    onDblClick,
    onDivBlur,
    onFocus,
    onKeyDown,
    onKeyUp,
    onLongMouseOver,
    onMouseDown,
    onMouseLeave,
    onNavContextMenuClose,
    tree,
  };
}
