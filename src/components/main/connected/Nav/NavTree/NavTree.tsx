import { NavSchema } from 'types';
import { Tabs } from '../navUtils';
import { useNavTree } from './useNavTree';
import { NavTreeNode } from './NavTreeNode';

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
  disabled?: undefined | boolean;
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
    onLongMouseOver,
    longMouseOver,
    onMouseLeave,
    onNavContextMenuClose,
  } = useNavTree(schemas, roles, rolesOpen, tabs, onBlur, disabled);
  return (
    <div
      className="nav-tree--wrapper"
      tabIndex={0}
      style={{ '--scroll-y': '0px' }}
      onScroll={(e) => {
        onNavContextMenuClose();
        if (e.target instanceof HTMLElement)
          e.target.style.setProperty('--scroll-y', `${e.target.scrollTop}px`);
      }}
    >
      <div
        className="nav-tree"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onDivBlur}
        onFocus={onFocus}
        onMouseLeave={onMouseLeave}
      >
        {tree.map((s) => (
          <NavTreeNode
            key={s.key}
            item={s}
            onMouseDown={onMouseDown}
            onDblClick={onDblClick}
            onClick={onClick}
            onLongMouseOver={onLongMouseOver}
            longMouseOver={longMouseOver}
            onNavContextMenuClose={onNavContextMenuClose}
          />
        ))}
      </div>
    </div>
  );
}
