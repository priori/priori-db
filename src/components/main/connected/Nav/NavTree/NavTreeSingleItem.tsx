import React from 'react';
import {
  keepSchemaInfo,
  keepTableInfo,
  newTable,
  previewSchemaInfo,
  previewTableInfo,
} from 'state/actions';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { NavTreeItem as NavTreeNode } from './useTree';
import { NewRoleDialog } from './NewRoleDialog';

function grantScrollVisibility(el: HTMLDivElement | null) {
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
}

const icons = {
  table: <i className="fa fa-table tree--table-icon tree--icon" />,
  function: (
    <span className="tree--function-icon tree--icon">
      <span>F</span>
      <span>()</span>
    </span>
  ),
  // procedure: <i className="fa fa-cogs tree--procedure-icon tree--icon" />,
  procedure: (
    <span className="tree--procedure-icon tree--icon">
      <span>#</span>
      <span>()</span>
    </span>
  ),
  role: <i className="fa fa-users tree--role-icon tree--icon" />,
  user: <i className="fa fa-user tree--user-icon tree--icon" />,
  mview: <i className="fa fa-table tree--mview-icon tree--icon" />,
  view: <i className="fa fa-table tree--view-icon tree--icon" />,
  domain: <i className="fa fa-list-ul tree--domain-icon tree--icon" />,
  sequence: <i className="fa fa-list-ol tree--sequence-icon tree--icon" />,
} as const;

function NavTreeSingleItem0({
  item,
  depth,
  onDblClick,
  onClick,
  onMouseDown,
}: {
  item: NavTreeNode;
  onDblClick: (i: NavTreeNode) => void;
  onClick: (i: NavTreeNode) => void;
  onMouseDown: (i: NavTreeNode) => void;
  depth?: number;
}) {
  const localOnDblClick = useEvent((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('.new-role-dialog, .dialog')
    )
      return;
    onDblClick(item);
  });
  const localOnClick = useEvent((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('.new-role-dialog, .dialog')
    )
      return;
    onClick(item);
  });
  const localOnMouseDown = useEvent((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('.new-role-dialog, .dialog')
    )
      return;
    onMouseDown(item);
  });
  const onInfoClick = useEvent((e: React.MouseEvent) => {
    if (item.type === 'schema-folder') {
      previewSchemaInfo(item.title);
    } else if (
      item.type === 'table' ||
      item.type === 'view' ||
      item.type === 'mview'
    ) {
      previewTableInfo(item.schema, item.title);
    }
    e.stopPropagation();
  });
  const onInfoDblClick = useEvent((e: React.MouseEvent) => {
    if (item.type === 'schema-folder') {
      keepSchemaInfo(item.title);
    } else if (
      item.type === 'table' ||
      item.type === 'view' ||
      item.type === 'mview'
    ) {
      keepTableInfo(item.schema, item.title);
    }
    e.stopPropagation();
  });
  const [newRoleDialogOpen, setNewRoleDialogOpen] = React.useState(false);
  const onPlusClick = useEvent((e: React.MouseEvent) => {
    if (item.type === 'schema-folder') {
      newTable(item.title);
    } else if (item.type === 'roles-folder') {
      setNewRoleDialogOpen(true);
    }
    e.stopPropagation();
  });
  return (
    <div
      onDoubleClick={localOnDblClick}
      onClick={localOnClick}
      onMouseDown={localOnMouseDown}
      className={`nav-tree--item${
        item.children ? ' nav-tree--item--folder' : ''
      }${item.internal ? ' nav-tree--item--internal' : ''}${
        item.children?.length === 0 ? ' nav-tree--item--empty' : ''
      }${!item.children && item.isOpen ? ' open' : ''}${
        item.isActive ? ' active' : ''
      }${item.hasFocus ? ' focus' : ''}`}
      style={{
        fontWeight: item.important ? '900' : undefined,
        letterSpacing: item.important ? '-0.25px' : undefined,
        paddingLeft: (depth ?? 0) * 10 + 10,
      }}
      ref={item.hasFocus ? grantScrollVisibility : undefined}
    >
      {item.children ? (
        <span className={`nav-tree--arrow${item.isOpen ? ' open' : ''}`} />
      ) : null}
      {item.type && item.type in icons
        ? icons[item.type as keyof typeof icons]
        : null}
      <div className="nav-tree--item--title">
        {item.title}
        {(item.type === 'role' || item.type === 'user') && item.host ? (
          <span
            style={{
              opacity: 0.5,
              fontSize: 11,
              lineHeight: '11px',
              position: 'relative',
              top: -0.1,
            }}
          >
            @
            <span style={{ position: 'relative', top: '-0.3px' }}>
              {item.host}
            </span>
          </span>
        ) : (
          ''
        )}
      </div>
      {item.children &&
      item.type !== 'schema-folder' &&
      item.type !== 'roles-folder' ? (
        <span className="nav-tree--item--count">{item.children.length}</span>
      ) : null}
      {item.includeActions ? (
        <i className="fa fa-plus" onClick={onPlusClick} />
      ) : null}
      {newRoleDialogOpen ? (
        <NewRoleDialog onBlur={() => setNewRoleDialogOpen(false)} />
      ) : null}
      {item.infoAction ? (
        <span
          className="adjustment-icon"
          onClick={onInfoClick}
          onDoubleClick={onInfoDblClick}
        />
      ) : null}
    </div>
  );
}

export const NavTreeSingleItem = React.memo(NavTreeSingleItem0, (prev, next) =>
  equals(prev.item, next.item),
);
