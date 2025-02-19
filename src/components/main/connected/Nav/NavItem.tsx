import {
  keepDomain,
  keepFunction,
  extraTableTab,
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
import { assert } from 'util/assert';
import { Entity } from './Nav';
import { icons } from './NavTree/NavTreeSingleItem';

const iconsMap = {
  SEQUENCE: icons.sequence,
  DOMAIN: icons.domain,
  ENUM: icons.domain,
  'BASE TABLE': icons.table,
  VIEW: icons.view,
  'MATERIALIZED VIEW': icons.mview,
  SCHEMA: (
    <i className="fa fa-database nav-row__icon--database nav-row__icon" />
  ),
  FUNCTION: icons.function,
  PROCEDURE: icons.procedure,
} as const;

function grantScrollVisibility(el: HTMLDivElement | null) {
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
}

export function NavItem({
  entity,
  children,
  isActive,
  isOpen,
  focus,
  onMouseDown,
  index,
}: {
  entity: Entity;
  children: React.ReactNode;
  isActive: boolean;
  isOpen: boolean;
  focus: boolean;
  onMouseDown: (i: number) => void;
  index: number;
}) {
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
    else if (e.type === 'FUNCTION' || e.type === 'PROCEDURE')
      previewFunction(e.schema, e.name);
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
      extraTableTab(e.schema, e.name);
    else if (e.type === 'DOMAIN') keepDomain(e.schema, e.name);
    else if (e.type === 'FUNCTION' || e.type === 'PROCEDURE')
      keepFunction(e.schema, e.name);
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

  const onDivMouseDown = useEvent(() => {
    onMouseDown(index);
  });

  return (
    <div
      className={`nav-row nav-row--leaf nav-row--search-result${isActive ? ' active' : ''}${
        isOpen ? ' open' : ''
      }${entity.type === 'VIEW' ? ' view' : ''}${focus ? ' focused' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onDivMouseDown}
      ref={focus ? grantScrollVisibility : undefined}
      style={{ paddingLeft: 20 }}
    >
      <div className="nav-row__main-mouse-area">
        {entity.type && iconsMap[entity.type] ? iconsMap[entity.type] : null}
        <div className="nav-row__title">{children}</div>
      </div>
      {entity.type === 'BASE TABLE' ||
      entity.type === 'MATERIALIZED VIEW' ||
      entity.type === 'VIEW' ? (
        <div
          className="adjustment-icon--small"
          onClick={onInfoClick}
          onDoubleClick={onInfoDoubleClick}
        />
      ) : null}
    </div>
  );
}
