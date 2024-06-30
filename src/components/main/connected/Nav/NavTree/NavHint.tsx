import { NavTreeItem } from './useTree';

export function NavHint({
  item,
  hint,
}: { item: NavTreeItem; hint?: never } | { hint: string; item?: never }) {
  if (hint)
    return (
      <div
        className="nav-hint"
        style={{
          marginTop: 'calc(var(--scroll-y) * -1 - 4px)',
        }}
      >
        {hint}
      </div>
    );
  if (!item) return null;
  if (
    !(
      item.type === 'schema-folder' ||
      item.type === 'sequence' ||
      item.type === 'domain' ||
      item.type === 'function' ||
      item.type === 'procedure' ||
      item.type === 'table' ||
      item.type === 'view' ||
      item.type === 'mview' ||
      item.type === 'role' ||
      item.type === 'user'
    )
  )
    return null;
  return (
    <div
      className="nav-hint"
      style={{
        marginTop: 'calc(var(--scroll-y) * -1)',
      }}
    >
      {item.type === 'schema-folder'
        ? 'Schema Settings'
        : item.type === 'sequence'
          ? 'Sequence Settings'
          : item.type === 'domain'
            ? 'Domain Settings'
            : item.type === 'function'
              ? 'Function Settings'
              : item.type === 'procedure'
                ? 'Procedure Settings'
                : item.type === 'table' ||
                    item.type === 'view' ||
                    item.type === 'mview'
                  ? 'Table Settings'
                  : item.type === 'role' || item.type === 'user'
                    ? 'Role Settings'
                    : ''}
    </div>
  );
}
