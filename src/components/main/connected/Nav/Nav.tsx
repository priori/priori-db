import { useDeferredValue, useMemo, useRef } from 'react';
import { useEvent } from 'util/useEvent';
import { newSchema, reloadNav } from '../../../../state/actions';
import { NavSchema, Tab } from '../../../../types';
import { NavSearch } from './NavSearch';
import { NavTree } from './NavTree';
import { useTabs } from './navUtils';

export type Entity = {
  fullText: string;
  fullTextLowerCase: string;
  name: string;
  nameLowerCase: string;
  type:
    | 'MATERIALIZED VIEW'
    | 'VIEW'
    | 'BASE TABLE'
    | 'FUNCTION'
    | 'DOMAIN'
    | 'ENUM'
    | 'SEQUENCE'
    | 'SCHEMA';
  schema?: string;
} & ({ schema: string } | { type: 'SCHEMA' });

// eslint-disable-next-line @typescript-eslint/naming-convention
export type useDeferredValueFix<T> = (s: T, config: { timeoutMs: number }) => T;

const isIOS = process?.platform === 'darwin';

export function Nav(props: {
  schemas: NavSchema[];
  tabs: Tab[];
  roles: { name: string; isUser: boolean }[];
}) {
  const tabs = (useDeferredValue as useDeferredValueFix<Tab[]>)(props.tabs, {
    timeoutMs: 150,
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      ((e.ctrlKey || (isIOS && e.metaKey)) &&
        (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
      e.key === 'F5'
    ) {
      e.preventDefault();
      e.stopPropagation();
      reloadNav();
    }
  });

  const plusRef = useRef<HTMLSpanElement>(null);

  const onNewSchemaKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowUp') {
        const el = document.querySelector('.nav-tree');
        if (el instanceof HTMLElement) el.focus();
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') newSchema();
    },
  );

  const onNavTreeBlur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (e === 'next' || e === 'down') {
      plusRef.current?.focus();
    } else if (e === 'up' || e === 'prev') {
      const el = document.querySelector('.nav--search input');
      if (el instanceof HTMLElement) el.focus();
    }
  });

  const onNavSearchBlur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (e === 'next' || e === 'down') {
      const el = document.querySelector('.nav-tree');
      if (el instanceof HTMLElement) el.focus();
    } else if (e === 'up' || e === 'prev') {
      const h = document.querySelector('.header');
      if (h instanceof HTMLElement) {
        h.setAttribute('tabIndex', '0');
        h.focus();
        h.blur();
        h.removeAttribute('tabIndex');
      }
    }
  });

  const tabs2 = useTabs(tabs);

  return useMemo(
    () => (
      <div className="nav" onKeyDown={onKeyDown}>
        <NavSearch
          schemas={props.schemas}
          tabs={tabs2}
          onBlur={onNavSearchBlur}
        />
        <NavTree
          schemas={props.schemas}
          tabs={tabs2}
          roles={props.roles}
          onBlur={onNavTreeBlur}
        />
        <span
          className="new-schema"
          onClick={newSchema}
          ref={plusRef}
          tabIndex={0}
          role="button"
          onKeyDown={onNewSchemaKeyDown}
        >
          <i className="fa fa-plus" />
        </span>
      </div>
    ),
    [
      props.schemas,
      props.roles,
      tabs2,
      onKeyDown,
      onNavSearchBlur,
      onNavTreeBlur,
      onNewSchemaKeyDown,
    ],
  );
}
