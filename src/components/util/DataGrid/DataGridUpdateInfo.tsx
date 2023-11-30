import { useEvent } from 'util/useEvent';

export function DataGridUpdateInfoDialog({
  pendingRowsUpdate,
  pendingInserts,
  totalChanges,
  onDiscardClick,
  onApplyClick,
  fail,
  applyingUpdate,
  onDiscardFailClick,
}: {
  pendingRowsUpdate: number;
  pendingInserts: number;
  totalChanges: number;
  onDiscardClick: () => void;
  onApplyClick: () => void;
  fail?: Error;
  applyingUpdate?: boolean;
  onDiscardFailClick: () => void;
}) {
  const onChangeDialogMouseDown = useEvent((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target instanceof HTMLElement) e.target.focus();
  });
  return (
    <div
      className="change-dialog"
      onMouseDown={onChangeDialogMouseDown}
      tabIndex={0}
    >
      {applyingUpdate ? (
        <div className="data-grid-update-info--updating">
          <i className="fa fa-circle-o-notch fa-spin" />
        </div>
      ) : null}
      <div
        style={
          applyingUpdate
            ? {
                opacity: 0.3,
              }
            : undefined
        }
      >
        {pendingInserts > 0 && pendingRowsUpdate > 0
          ? ` ${pendingInserts} insert${
              pendingInserts > 1 ? 's' : ''
            } and ${pendingRowsUpdate} update${
              pendingRowsUpdate > 1 ? 's' : ''
            } pending `
          : pendingInserts > 0
          ? `${pendingInserts} pending row${
              pendingInserts > 1 ? 's' : ''
            } insert${pendingInserts > 1 ? 's' : ''}`
          : `${pendingRowsUpdate} pending row${
              pendingRowsUpdate > 1 ? 's' : ''
            } update`}{' '}
        ({totalChanges} value
        {totalChanges > 1 ? 's' : ''})
        {fail ? (
          <div className="data-grid-update-info--error">
            <i className="fa fa-exclamation-triangle" /> {fail.message}
            <i className="fa fa-times" onClick={onDiscardFailClick} />
          </div>
        ) : null}
      </div>
      <div className="data-grid-update-info--buttons">
        <button
          type="button"
          onClick={onDiscardClick}
          disabled={applyingUpdate}
          style={{
            fontWeight: 'normal',
            color: '#444',
          }}
        >
          Discard <i className="fa fa-undo" />
        </button>
        <button
          type="button"
          disabled={applyingUpdate}
          style={{ fontWeight: 'bold' }}
          onClick={onApplyClick}
        >
          Apply <i className="fa fa-check" />
        </button>
      </div>
    </div>
  );
}
