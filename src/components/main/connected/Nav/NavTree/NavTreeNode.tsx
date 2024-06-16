import { useMoreTime } from 'components/util/DataGrid/dataGridCoreUtils';
import React from 'react';
import { equals } from 'util/equals';
import { NavTreeSingleItem } from './NavTreeSingleItem';
import { NavTreeItem } from './useTree';

function NavTreeNode0({
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
  const isClosing = useMoreTime(!!item.isOpen, 500);
  return (
    <>
      <NavTreeSingleItem
        item={item}
        depth={depth}
        onDblClick={onDblClick}
        onClick={onClick}
        onMouseDown={onMouseDown}
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
                />
              ))
            : null}
        </div>
      ) : null}
    </>
  );
}

export const NavTreeNode = React.memo(NavTreeNode0, (prev, next) =>
  equals(prev.item, next.item),
);
