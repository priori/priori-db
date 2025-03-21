export function DataGridNotice(props: { rows: number; cols: number }) {
  return (
    <div className="grid__notice">
      Copied{' '}
      <i
        className="fa fa-check"
        style={{
          color: '#fe0',
          marginRight: 10,
        }}
      />
      <span
        style={{
          float: 'right',
          fontSize: 13,
          textAlign: 'right',
          letterSpacing: 0,
        }}
      >
        {props.rows === 1 && props.cols === 1 ? (
          <>1 value</>
        ) : (
          <>
            {props.rows} row{props.rows > 1 ? 's' : ''}
            <br />
            {props.cols} column{props.cols > 1 ? 's' : ''}
            <br />
            {props.rows * props.cols} values
          </>
        )}
      </span>
    </div>
  );
}
