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
        | 'mview'
        | 'view'
        | 'domain'
        | 'sequence'
        | 'role';
      key: string;
      schema: string;
      name: string;
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
      schema?: string;
      name: string;
    };

export function useNavTree(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean }[],
  rolesOpen: boolean,
  tabs: Tabs,
  onBlur: (v: 'down' | 'up' | 'prev' | 'next') => void,
  disabled?: boolean,
) {
  const [focused, setFocused] = React.useState<Focus | null>(null);

  const onDivBlur = useEvent(() => {
    if (disabled) return;
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
  });

  const blur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
    onBlur(e);
  });

  const lastFocused = useRef<Focus | null>(focused);
  if (focused !== null) lastFocused.current = focused;

  const tree = useTree(schemas, roles, rolesOpen, tabs, focused);

  const { onMouseDown, onClick, onDblClick } = useMouseInterations(
    setFocused,
    schemas,
    disabled,
  );

  const { onKeyUp, onKeyDown, rows } = useKeyboardInterations(
    tree,
    focused,
    blur,
    setFocused,
    schemas,
    disabled,
  );

  const onFocus = useEvent(() => {
    if (disabled) return;
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
    onDivBlur,
    tree,
    onMouseDown,
    onKeyDown,
    onDblClick,
    onClick,
    onKeyUp,
    onFocus,
  };
}
