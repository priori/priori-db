import React, { useEffect } from 'react';
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
import { NavHint } from './NavHint';
import { NavContextMenu } from './NavContextMenu';

function grantScrollVisibility(el: HTMLDivElement | null) {
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
}

export const icons = {
  table: (
    <span className="nav-row__icon--table nav-row__icon">
      <div className="table-icon">
        <div />
        <div />
      </div>
    </span>
  ),
  function: (
    <span className="nav-row__icon--function nav-row__icon">
      <span>F</span>
      <span>()</span>
    </span>
  ),
  procedure: (
    <span className="nav-row__icon--procedure nav-row__icon">
      <span>#</span>
      <span>()</span>
    </span>
  ),
  role: <i className="fa fa-users nav-row__icon--role nav-row__icon" />,
  user: <i className="fa fa-user nav-row__icon--user nav-row__icon" />,
  mview: (
    <span className="nav-row__icon--mview nav-row__icon">
      <div className="table-icon">
        <div />
        <div />
      </div>
    </span>
  ),
  view: (
    <span className="nav-row__icon--view nav-row__icon">
      <div className="table-icon">
        <div />
        <div />
      </div>
    </span>
  ),
  domain: <i className="fa fa-list-ul nav-row__icon--domain nav-row__icon" />,
  sequence: (
    <i className="fa fa-list-ol nav-row__icon--sequence nav-row__icon" />
  ),
} as const;

const AdjustmentIcon = React.memo(
  function AdjustmentIcon({
    item,
    onClick,
    onDoubleClick,
  }: {
    item: NavTreeNode;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
  }) {
    const timeoutRef = React.useRef<number | null>(null);
    const [mouseOver, setMouseOver] = React.useState(false);
    return (
      <>
        <span
          className="adjustment-icon--small"
          onClick={(e) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setMouseOver(false);
            onClick(e);
          }}
          onDoubleClick={(e) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setMouseOver(false);
            onDoubleClick(e);
          }}
          onMouseEnter={() => {
            timeoutRef.current = window.setTimeout(() => {
              setMouseOver(true);
            }, 500);
          }}
          onMouseLeave={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setMouseOver(false);
          }}
        />
        {mouseOver &&
        (item.type === 'schema-folder' ||
          item.type === 'table' ||
          item.type === 'view' ||
          item.type === 'mview') ? (
          <NavHint
            hint={
              item.type === 'schema-folder'
                ? 'Schema Settings'
                : item.type === 'table'
                  ? 'Table Settings'
                  : item.type === 'view' || item.type === 'mview'
                    ? 'View Settings'
                    : ''
            }
          />
        ) : null}
      </>
    );
  },
  (a, b) => equals(a, b),
);

const IncludeIcon = React.memo(
  function IncludeIcon({
    item,
    onClick,
  }: {
    item: NavTreeNode;
    onClick: (e: React.MouseEvent) => void;
  }) {
    const timeoutRef = React.useRef<number | null>(null);
    const [mouseOver, setMouseOver] = React.useState(false);
    return (
      <>
        <i
          onMouseEnter={() => {
            timeoutRef.current = window.setTimeout(() => {
              setMouseOver(true);
            }, 500);
          }}
          onMouseLeave={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setMouseOver(false);
          }}
          className="fa fa-plus"
          onClick={(e) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setMouseOver(false);
            onClick(e);
          }}
        />
        {(item.type === 'schema-folder' || item.type === 'roles-folder') &&
        mouseOver ? (
          <NavHint
            hint={
              item.type === 'schema-folder'
                ? 'New Table'
                : item.type === 'roles-folder'
                  ? 'New Role'
                  : ''
            }
          />
        ) : null}
      </>
    );
  },
  (a, b) => equals(a, b),
);

function NavTreeSingleItem0({
  item,
  depth,
  onDblClick,
  onClick,
  onMouseDown,
  onLongMouseOver,
  longMouseOver,
  onNavContextMenuClose,
}: {
  item: NavTreeNode;
  onDblClick: (i: NavTreeNode) => void;
  onClick: (i: NavTreeNode) => void;
  onMouseDown: (i: NavTreeNode, e: React.MouseEvent) => void;
  depth?: number;
  onLongMouseOver: () => void;
  longMouseOver: boolean;
  onNavContextMenuClose: () => void;
}) {
  const timeoutRef = React.useRef<number | null>(null);
  const [mouseOver, setMouseOver] = React.useState(false);
  const firstLongMouseOver = React.useRef(false);
  const localLongMouseOver = useEvent(() => {
    if (!longMouseOver) {
      onLongMouseOver();
      firstLongMouseOver.current = true;
      window.setTimeout(() => {
        firstLongMouseOver.current = false;
      }, 500);
    }
  });
  const localOnMouseEnter = useEvent(() => {
    setMouseOver(true);
    timeoutRef.current = window.setTimeout(() => {
      localLongMouseOver();
    }, 2000);
  });
  const localOnMouseLeave = useEvent(() => {
    firstLongMouseOver.current = false;
    setMouseOver(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });
  const localOnMouseLeave2 = useEvent(() => {
    if (longMouseOver) return;
    setMouseOver(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });
  const localOnDblClick = useEvent((e: React.MouseEvent) => {
    localOnMouseLeave();
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('.new-role-dialog, .dialog')
    )
      return;
    onDblClick(item);
  });
  const localOnClick = useEvent((e: React.MouseEvent) => {
    localOnMouseLeave();
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
    onMouseDown(item, e);
  });
  const onInfoClick = useEvent((e: React.MouseEvent) => {
    localOnMouseLeave();
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
    localOnMouseLeave();
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
    localOnMouseLeave();
    if (item.type === 'schema-folder') {
      newTable(item.title);
    } else if (item.type === 'roles-folder') {
      setNewRoleDialogOpen(true);
    }
    e.stopPropagation();
  });
  const newRole = item.type === 'roles-folder' && item.newRole;
  useEffect(() => {
    if (newRole) {
      setNewRoleDialogOpen(true);
    }
  }, [newRole]);
  const onNewRoleDialogBlur = useEvent(() => {
    setNewRoleDialogOpen(false);
  });
  const onNavContextMenuClose2 = useEvent(() => {
    setMouseOver(false);
    onNavContextMenuClose();
  });
  const onNewRoleClick0 = useEvent(() => {
    setNewRoleDialogOpen(true);
  });
  const onNewRoleClick =
    item.type === 'roles-folder' && item.includeActions
      ? onNewRoleClick0
      : undefined;
  return (
    <div
      className={`nav-row${
        item.children ? ' nav-row--folder' : ' nav-row--leaf'
      }${item.internal ? ' nav-row--internal' : ''}${
        item.children?.length === 0 ? ' nav-row--empty' : ''
      }${!item.children && item.isOpen ? ' open' : ''}${
        item.isActive ? ' active' : ''
      }${item.hasFocus ? ' focus' : ''}${item.important ? ' nav-row--important' : ''}`}
      style={{
        paddingLeft: (depth ?? 0) * 10 + 10,
      }}
      ref={item.hasFocus ? grantScrollVisibility : undefined}
      onDoubleClick={localOnDblClick}
      onClick={localOnClick}
      onMouseDown={localOnMouseDown}
      onMouseLeave={localOnMouseLeave}
    >
      <div
        className="nav-row__main-mouse-area"
        onMouseEnter={localOnMouseEnter}
        onMouseLeave={localOnMouseLeave2}
      >
        {item.children ? (
          <span className={`nav-row__arrow${item.isOpen ? ' open' : ''}`} />
        ) : null}
        {item.type && item.type in icons
          ? icons[item.type as keyof typeof icons]
          : null}
        <div className="nav-row__title">
          {item.title}
          {(item.type === 'role' || item.type === 'user') && item.host ? (
            <span className="nav-row__host-sufix">
              @<span className="nav-row__host-name">{item.host}</span>
            </span>
          ) : (
            ''
          )}
        </div>
        {item.children &&
        item.type !== 'schema-folder' &&
        item.type !== 'roles-folder' ? (
          <span className="nav-row__count">{item.children.length}</span>
        ) : null}
      </div>
      {newRoleDialogOpen ? (
        <NewRoleDialog onBlur={onNewRoleDialogBlur} />
      ) : null}
      {item.includeActions &&
      !(
        longMouseOver &&
        mouseOver &&
        (!item.contextMenu || typeof item.contextMenu !== 'object')
      ) ? (
        <IncludeIcon onClick={onPlusClick} item={item} />
      ) : null}
      {item.infoAction ? (
        <AdjustmentIcon
          onClick={onInfoClick}
          item={item}
          onDoubleClick={onInfoDblClick}
        />
      ) : null}
      {item.contextMenu && (item.infoAction || item.includeActions) ? (
        <NavContextMenu
          item={item}
          onClose={onNavContextMenuClose2}
          onNewRoleClick={onNewRoleClick}
          position={
            item.contextMenu && typeof item.contextMenu !== 'object'
              ? undefined
              : item.contextMenu
          }
          animate
        />
      ) : longMouseOver && mouseOver ? (
        item.infoAction || item.includeActions ? (
          <NavContextMenu
            item={item}
            onClose={onNavContextMenuClose2}
            onNewRoleClick={onNewRoleClick}
            animate={firstLongMouseOver.current}
          />
        ) : (
          <NavHint item={item} />
        )
      ) : null}
    </div>
  );
}

export const NavTreeSingleItem = React.memo(
  NavTreeSingleItem0,
  (prev, next) =>
    equals(prev.item, next.item) && prev.longMouseOver === next.longMouseOver,
);
