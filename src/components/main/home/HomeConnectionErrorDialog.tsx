export function HomeConnectionErrorDialog({
  error,
  onClose,
  onEdit,
}: {
  error: Error;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="home-connection-error-dialog__wrapper"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="home-connection-error-dialog">
        <div style={{ userSelect: 'text', marginBottom: 18, marginTop: 13 }}>
          {error.message || 'Connection failed'}
        </div>{' '}
        <button
          className="button"
          style={{ marginTop: '5px', marginRight: 10 }}
          onClick={onClose}
        >
          Close <i className="fa fa-undo" />
        </button>{' '}
        <button
          className="button"
          style={{ marginTop: '5px' }}
          onClick={onEdit}
        >
          Edit <i className="fa fa-pencil" />
        </button>
      </div>
    </div>
  );
}
