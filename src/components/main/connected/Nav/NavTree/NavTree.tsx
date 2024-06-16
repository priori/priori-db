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
        <NavTreeNode
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
