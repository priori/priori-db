import React from 'react';
import {
  newTable,
  previewSchemaInfo,
  previewTable,
  previewTableInfo,
} from 'state/actions';
import { useEvent } from 'util/useEvent';
import { NavTreeItem } from './useTree';

function stopPropagation(e: React.MouseEvent) {
  e.stopPropagation();
}

export function NavContextMenu({
  item,
  onClose,
  onNewRoleClick,
  position,
  animate,
}: {
  item: NavTreeItem;
  onClose: () => void;
  onNewRoleClick?: () => void;
  position?: { x: number; y: number };
  animate: boolean;
}) {
  const onTableDataViewClick = useEvent(() => {
    if (item.schema && item.title)
      previewTable(item.schema, { name: item.title, type: item.type });
    onClose();
  });

  const onTableSettingsClick = useEvent(() => {
    if (item.schema) previewTableInfo(item.schema, item.title);
    onClose();
  });

  const onSchemaSettingsClick = useEvent(() => {
    if (item.title) previewSchemaInfo(item.title);
    onClose();
  });

  const onNewTableClick = useEvent(() => {
    if (item.title) newTable(item.title);
    onClose();
  });

  const navHasScroll =
    (document.querySelector('.nav-tree--wrapper')?.scrollHeight || 0) >
    (document.querySelector('.nav-tree--wrapper')?.clientHeight || 0);

  return (
    <div
      className="nav-context-menu"
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      style={
        position
          ? {
              animation: animate ? 'show 0.3s' : undefined,
              left: position.x,
              position: 'fixed',
              marginTop: 0,
              marginLeft: 0,
              ...(position.y + 50 > window.innerHeight
                ? { bottom: window.innerHeight - position.y }
                : {
                    top: position.y,
                  }),
            }
          : {
              animation: animate ? 'show 0.3s' : undefined,
              right: navHasScroll ? '-138px' : '-148px',
              marginTop: 'calc(var(--scroll-y) * -1)',
            }
      }
    >
      {item.type === 'table' ||
      item.type === 'view' ||
      item.type === 'mview' ? (
        <>
          <div
            className={`nav-context-menu--item${item.contextMenu === 1 ? ' selected' : ''}`}
            onClick={onTableSettingsClick}
          >
            <span className="adjustment-icon" />
            <span>Table Settings</span>
          </div>
          <div
            className={`nav-context-menu--item${item.contextMenu === 2 ? ' selected' : ''}`}
            onClick={onTableDataViewClick}
          >
            <i className="fa fa-database" />
            <span>Table Data View</span>
          </div>
        </>
      ) : item.type === 'schema-folder' ? (
        <>
          {item.includeActions ? (
            <div
              className={`nav-context-menu--item${item.contextMenu === 1 ? ' selected' : ''}`}
              onClick={onNewTableClick}
            >
              <i className="fa fa-plus" />
              <span>New Table</span>
            </div>
          ) : null}
          {item.infoAction ? (
            <div
              className={`nav-context-menu--item${item.contextMenu === 2 ? ' selected' : ''}`}
              onClick={onSchemaSettingsClick}
            >
              <span className="adjustment-icon" />
              <span>Schema Settings</span>
            </div>
          ) : null}
        </>
      ) : item.type === 'roles-folder' ? (
        item.includeActions && onNewRoleClick ? (
          <div
            onClick={onNewRoleClick}
            className={`nav-context-menu--item${item.contextMenu === 1 ? ' selected' : ''}`}
          >
            <i className="fa fa-plus" />
            <span>New Role</span>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
