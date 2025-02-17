export function CloseConfirmation({
  onConfirm,
  onDecline,
}: {
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="dialog--close-window--overlay">
      <div
        className="dialog--close-window"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Escape') {
            e.currentTarget.blur();
          }
        }}
        tabIndex={0}
        ref={(el) => {
          if (el) el.focus();
        }}
        onBlur={(e) => {
          const dialogEl = e.currentTarget;
          setTimeout(() => {
            if (dialogEl.contains(document.activeElement)) return;
            onDecline();
          }, 1);
        }}
      >
        <div>
          There is some running query or idle connection in transacion, are you
          sure you want to close?
        </div>
        <button onClick={onDecline} type="button">
          No
        </button>{' '}
        <button onClick={onConfirm} type="button">
          Yes
        </button>
      </div>
    </div>
  );
}
