import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import React from 'react';
import { equals } from 'util/equals';
import { NavTreeSingleItem } from './NavTreeSingleItem';
import { NavTreeItem } from './useTree';

function NavTreeNode0({
  depth,
  item,
  longMouseOver,
  onClick,
  onDblClick,
  onLongMouseOver,
  onMouseDown,
  onNavContextMenuClose,
}: {
  depth?: number;
  item: NavTreeItem;
  longMouseOver: boolean;
  onClick: (i: NavTreeItem) => void;
  onDblClick: (i: NavTreeItem) => void;
  onLongMouseOver: () => void;
  onMouseDown: (i: NavTreeItem, e: React.MouseEvent) => void;
  onNavContextMenuClose: () => void;
}) {
  const isClosing = useMoreTime(!!item.isOpen, 500);
  return (
    <>
      <NavTreeSingleItem
        item={item}
        depth={depth}
        onDblClick={onDblClick}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onLongMouseOver={onLongMouseOver}
        longMouseOver={longMouseOver}
        onNavContextMenuClose={onNavContextMenuClose}
      />
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
                // eslint-disable-next-line no-use-before-define
                <NavTreeNode
                  item={c}
                  key={c.key}
                  depth={(depth ?? 0) + 1}
                  onDblClick={onDblClick}
                  onClick={onClick}
                  onMouseDown={onMouseDown}
                  onLongMouseOver={onLongMouseOver}
                  longMouseOver={longMouseOver}
                  onNavContextMenuClose={onNavContextMenuClose}
                />
              ))
            : null}
        </div>
      ) : null}
    </>
  );
}

export const NavTreeNode = React.memo(
  NavTreeNode0,
  (prev, next) =>
    equals(prev.item, next.item) && prev.longMouseOver === next.longMouseOver,
);
