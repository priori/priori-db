import { useDeferredValue } from 'react';
import { useEvent } from 'util/useEvent';
import { newSchema, reloadNav } from '../../../../state/actions';
import { NavSchema, Tab } from '../../../../types';
import { NavSearch } from './NavSearch';
import { NavTree } from './NavTree';

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
    | 'SEQUENCE'
    | 'SCHEMA';
  schema?: string;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type useDeferredValueFix<T> = (s: T, config: { timeoutMs: number }) => T;

export function Nav(props: { schemas: NavSchema[]; tabs: Tab[] }) {
  const tabs = (useDeferredValue as useDeferredValueFix<Tab[]>)(props.tabs, {
    timeoutMs: 150,
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      reloadNav();
    }
  });

  const onNewSchemaKeyDown = useEvent(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') newSchema();
    }
  );

  return (
    <div className="nav" tabIndex={0} onKeyDown={onKeyDown}>
      <NavSearch schemas={props.schemas} tabs={tabs} />
      <NavTree schemas={props.schemas} tabs={tabs} />
      <span
        className="new-schema"
        onClick={newSchema}
        tabIndex={0}
        role="button"
        onKeyDown={onNewSchemaKeyDown}
      >
        <i className="fa fa-plus" />
      </span>
    </div>
  );
}
