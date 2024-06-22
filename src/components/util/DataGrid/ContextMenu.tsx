export function ContextMenu({
  x,
  y,
  onSelectOption,
  rowIndex,
  options,
}: {
  x: number;
  y: number;
  onSelectOption?: (option: string, rowIndex2: number) => void;
  rowIndex: number;
  options: { [option: string]: { title: string; icon: string } };
}) {
  return (
    <div
      className="context-menu"
      style={{
        ...(y + 100 < window.innerHeight
          ? { top: y }
          : { bottom: window.innerHeight - y }),
        ...(x + 200 < window.innerWidth
          ? { left: x }
          : { right: window.innerWidth - x }),
      }}
    >
      {Object.entries(options).map(([option, label]) => (
        <div key={option} onClick={() => onSelectOption?.(option, rowIndex)}>
          {label.title} <i className={`fa fa-${label.icon}`} />
        </div>
      ))}
    </div>
  );
}
