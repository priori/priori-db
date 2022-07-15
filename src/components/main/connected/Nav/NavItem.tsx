import { Tab } from 'types';
import {
  keepDomain,
  keepFunction,
  keepOpenTable,
  keepSchemaInfo,
  keepSequence,
  keepTableInfo,
  previewDomain,
  previewFunction,
  previewSchemaInfo,
  previewSequence,
  previewTable,
  previewTableInfo,
} from 'state/actions';
import { useEvent } from 'util/useEvent';
import assert from 'assert';
import { Entity } from './Nav';

const icons = {
  SEQUENCE: 'fa fa-list-ol',
  DOMAIN: 'fa fa-list-ul',
  'BASE TABLE': 'fa fa-table',
  VIEW: 'fa fa-table',
  SCHEMA: 'fa fa-database',
  FUNCTION: 'function-icon',
};

export const NavItem = ({
  entity,
  children,
  tabs,
}: {
  entity: Entity;
  children: React.ReactNode;
  tabs: Tab[];
}) => {
  const active = tabs.find((c) => c.active) || null;
  const isActive =
    active &&
    ((entity.type === 'SCHEMA' &&
      active.props.type === 'schemainfo' &&
      entity.name === active.props.schema) ||
      ((active.props.type === 'table' || active.props.type === 'tableinfo') &&
        active.props.schema === entity.schema &&
        active.props.table === entity.name) ||
      (active.props.type === 'function' &&
        active.props.schema === entity.schema &&
        active.props.name === entity.name) ||
      (active.props.type === 'domain' &&
        active.props.schema === entity.schema &&
        active.props.name === entity.name) ||
      (active.props.type === 'sequence' &&
        active.props.schema === entity.schema &&
        active.props.name === entity.name));
  const isOpen = tabs.find(
    (c) =>
      (entity.type === 'SCHEMA' &&
        c.props.type === 'schemainfo' &&
        entity.name === c.props.schema) ||
      ((c.props.type === 'table' || c.props.type === 'tableinfo') &&
        c.props.schema === entity.schema &&
        c.props.table === entity.name) ||
      (c.props.type === 'function' &&
        c.props.schema === entity.schema &&
        c.props.name === entity.name) ||
      (c.props.type === 'domain' &&
        c.props.schema === entity.schema &&
        c.props.name === entity.name) ||
      (c.props.type === 'sequence' &&
        c.props.schema === entity.schema &&
        c.props.name === entity.name)
  );
  const onClick = useEvent(() => {
    const e = entity;
    if (e.type === 'SCHEMA') previewSchemaInfo(e.name);
    else if (
      e.type === 'BASE TABLE' ||
      e.type === 'MATERIALIZED VIEW' ||
      e.type === 'VIEW'
    )
      previewTable(e.schema, { type: e.type, name: e.name });
    else if (e.type === 'DOMAIN') previewDomain(e.schema, e.name);
    else if (e.type === 'FUNCTION') previewFunction(e.schema, e.name);
    else if (e.type === 'SEQUENCE') previewSequence(e.schema, e.name);
  });
  const onDoubleClick = useEvent(() => {
    const e = entity;
    if (e.type === 'SCHEMA') keepSchemaInfo(e.name);
    else if (
      e.type === 'BASE TABLE' ||
      e.type === 'MATERIALIZED VIEW' ||
      e.type === 'VIEW'
    )
      keepOpenTable(e.schema, { type: e.type, name: e.name });
    else if (e.type === 'DOMAIN') keepDomain(e.schema, e.name);
    else if (e.type === 'FUNCTION') keepFunction(e.schema, e.name);
    else if (e.type === 'SEQUENCE') keepSequence(e.schema, e.name);
  });
  const onInfoDoubleClick = useEvent((ev: React.MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    const e = entity;
    assert(e.schema);
    keepTableInfo(e.schema, e.name);
  });
  const onInfoClick = useEvent((ev: React.MouseEvent<HTMLElement>) => {
    ev.preventDefault();
    ev.stopPropagation();
    const e = entity;
    assert(e.schema);
    previewTableInfo(e.schema, e.name);
  });
  return (
    <div
      className={`nav-search--entity${isActive ? ' active' : ''}${
        isOpen ? ' open' : ''
      }${entity.type === 'VIEW' ? ' view' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {entity.type && icons[entity.type] ? (
        <i className={icons[entity.type]} />
      ) : null}
      <span>{children}</span>
      {entity.type === 'BASE TABLE' ||
      entity.type === 'MATERIALIZED VIEW' ||
      entity.type === 'VIEW' ? (
        <i
          className="fa fa-info-circle"
          title={`${entity.type} INFO`}
          onClick={onInfoClick}
          onDoubleClick={onInfoDoubleClick}
        />
      ) : null}
    </div>
  );
};
