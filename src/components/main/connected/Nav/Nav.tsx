import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import { NewSchemaForm } from 'components/util/NewSchemaForm';
import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { createSchema, reloadNav } from '../../../../state/actions';
import { NavSchema, Tab } from '../../../../types';
import { NavSearch } from './NavSearch';
import { NavTree } from './NavTree/NavTree';
import { useTabs } from './navUtils';
import { SettingsButton } from '../SettingsButton';

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
    | 'PROCEDURE'
    | 'DOMAIN'
    | 'ENUM'
    | 'SEQUENCE'
    | 'SCHEMA';
  schema?: string;
} & ({ schema: string } | { type: 'SCHEMA' });

const isIOS = process?.platform === 'darwin';

function NavNewSchema({ disabled }: { disabled?: boolean }) {
  const [newSchemaOpen, setNewSchemaOpen] = useState<boolean>(false);
  const onNewSchemaKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'ArrowUp') {
        const el = document.querySelector('.nav-tree');
        if (el instanceof HTMLElement) el.focus();
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space')
        setNewSchemaOpen(true);
    },
  );
  const cancelCreateSchema = useEvent(() => {
    setNewSchemaOpen(false);
  });

  const onCreateSchema = useEvent((name: string) => {
    createSchema(name);
    setNewSchemaOpen(false);
  });
  return (
    <>
      <span
        className="new-schema"
        onClick={() => setNewSchemaOpen(true)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        data-hint="Create new schema"
        onKeyDown={onNewSchemaKeyDown}
      >
        <i className="fa fa-plus" />
      </span>
      {newSchemaOpen ? (
        <NewSchemaForm
          onCreateSchema={onCreateSchema}
          onClose={cancelCreateSchema}
        />
      ) : null}
    </>
  );
}

declare module 'react' {
  interface CSSProperties {
    '--scroll-y'?: string;
  }
}

export function Nav(props: {
  schemas: NavSchema[];
  tabs: Tab[];
  roles?: undefined | { name: string; isUser: boolean }[];
  style?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
  rolesOpen: boolean;
}) {
  const tabs = useDeferredValue(props.tabs);

  const [refreshing0, setRefreshing] = useState(false);

  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      ((e.ctrlKey || (isIOS && e.metaKey)) &&
        (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
      e.key === 'F5'
    ) {
      e.preventDefault();
      e.stopPropagation();
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
      }, 1);
      reloadNav();
    }
  });

  const lastSchemas = useRef(props.schemas);

  if (props.schemas !== lastSchemas.current) {
    lastSchemas.current = props.schemas;
  }

  const refreshing = useMoreTime(refreshing0, 200);

  const onNavTreeBlur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (e === 'next' || e === 'down') {
      const el = document.querySelector('.new-schema');
      if (el instanceof HTMLElement) el.focus();
    } else if (e === 'up' || e === 'prev') {
      const el = document.querySelector('.nav-search__field input');
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
      <div
        className={`nav${refreshing ? ' refreshing' : ''}`}
        onKeyDown={onKeyDown}
        style={props.style}
      >
        {props.title ? (
          <div className="nav__title">
            {props.title}
            <SettingsButton />
          </div>
        ) : null}
        <NavSearch
          schemas={props.schemas}
          tabs={tabs2}
          onBlur={onNavSearchBlur}
          disabled={props.disabled}
        />
        <NavTree
          schemas={props.schemas}
          tabs={tabs2}
          roles={props.roles}
          onBlur={onNavTreeBlur}
          disabled={props.disabled}
          rolesOpen={props.rolesOpen}
        />
        <NavNewSchema />
      </div>
    ),
    [
      props.schemas,
      props.roles,
      tabs2,
      onKeyDown,
      onNavSearchBlur,
      onNavTreeBlur,
      props.style,
      props.disabled,
      props.title,
      props.rolesOpen,
      refreshing,
    ],
  );
}
