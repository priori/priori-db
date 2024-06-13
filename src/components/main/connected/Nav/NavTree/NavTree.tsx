import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import React from 'react';
import {
  keepSchemaInfo,
  keepTableInfo,
  newTable,
  previewSchemaInfo,
  previewTableInfo,
} from 'state/actions';
import { NavSchema } from 'types';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { Tabs } from '../navUtils';
import { useNavTree } from './useNavTree';
import { NavTreeItem } from './useTree';

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
  role: <i className="fa fa-users tree--role-icon tree--icon" />,
  user: <i className="fa fa-user tree--user-icon tree--icon" />,
  mview: <i className="fa fa-table tree--mview-icon tree--icon" />,
  view: <i className="fa fa-table tree--view-icon tree--icon" />,
  domain: <i className="fa fa-list-ul tree--domain-icon tree--icon" />,
  sequence: <i className="fa fa-list-ol tree--sequence-icon tree--icon" />,
} as const;

function NavTreeItem0({
  item,
  depth,
  onDblClick,
  onClick,
  onMouseDown,
}: {
  item: NavTreeItem;
  onDblClick: (i: NavTreeItem) => void;
  onClick: (i: NavTreeItem) => void;
  onMouseDown: (i: NavTreeItem) => void;
  depth?: number;
}) {
  const localOnDblClick = useEvent(() => onDblClick(item));
  const localOnClick = useEvent(() => onClick(item));
  const localOnMouseDown = useEvent(() => onMouseDown(item));
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
  const onPlusClick = useEvent((e: React.MouseEvent) => {
    if (item.type === 'schema-folder') {
      newTable(item.title);
    }
    e.stopPropagation();
  });
  const isClosing = useMoreTime(!!item.isOpen, 500);
  return (
    <>
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
        <div className="nav-tree--item--title">{item.title}</div>
        {item.children &&
        item.type !== 'schema-folder' &&
        item.type !== 'roles-folder' ? (
          <span className="nav-tree--item--count">{item.children.length}</span>
        ) : null}
        {item.includeActions ? (
          <i className="fa fa-plus" onClick={onPlusClick} />
        ) : null}
        {item.infoAction ? (
          <span
            className="adjustment-icon"
            onClick={onInfoClick}
            onDoubleClick={onInfoDblClick}
          />
        ) : null}
      </div>
      {item.children ? (
        <div
          style={{
            overflow: 'hidden',
            transition: 'height .2s',
            height: item.isOpen ? (item.rowsOpen - 1) * 20 : 0,
          }}
        >
          {item.isOpen || isClosing
            ? item.children?.map((c) => (
                <NavTreeItem
                  item={c}
                  key={c.key}
                  depth={(depth ?? 0) + 1}
                  onDblClick={onDblClick}
                  onClick={onClick}
                  onMouseDown={onMouseDown}
                />
              ))
            : null}
        </div>
      ) : null}
    </>
  );
}

const NavTreeItem = React.memo(NavTreeItem0, (prev, next) =>
  equals(prev.item, next.item),
);

export function NavTree({
  schemas,
  tabs,
  roles,
  onBlur,
  disabled,
  rolesOpen,
}: {
  tabs: Tabs;
  schemas: NavSchema[];
  roles: { name: string; isUser: boolean }[] | undefined;
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void;
  disabled?: boolean;
  rolesOpen: boolean;
}) {
  const {
    onKeyUp,
    tree,
    onMouseDown,
    onKeyDown,
    onClick,
    onDblClick,
    onDivBlur,
    onFocus,
  } = useNavTree(schemas, roles, rolesOpen, tabs, onBlur, disabled);
  return (
    <div
      className="nav-tree"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onDivBlur}
      onFocus={onFocus}
    >
      {tree.map((s) => (
        <NavTreeItem
          key={s.key}
          item={s}
          onMouseDown={onMouseDown}
          onDblClick={onDblClick}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
