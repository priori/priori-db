import { useEffect, useMemo } from 'react';
import { closeError } from 'state/actions';

const wmKeys = new WeakMap<Record<string, unknown> | Error, number>();
let count = 1;
function key(e: Record<string, unknown> | null | Error) {
  if (!e) return -1;
  if (!wmKeys.has(e)) wmKeys.set(e, count);
  count += 1;
  return wmKeys.get(e);
}

export function Errors({ errors }: { errors: Error[] }) {
  const timeouts = useMemo(
    () => new WeakMap<Error, ReturnType<typeof setTimeout>>(),
    [],
  );
  useEffect(() => {
    for (const e of errors) {
      if (!timeouts.has(e)) {
        const timeout = setTimeout(() => {
          closeError(e);
        }, 5000);
        timeouts.set(e, timeout);
      }
    }
  }, [errors, timeouts]);
  if (!errors || errors.length === 0) return null;
  return (
    <div className="errors">
      {errors.map((e) => (
        <div
          key={key(e)}
          className="error"
          tabIndex={0}
          onFocus={() => {
            const timeout = timeouts.get(e);
            if (timeout) clearTimeout(timeout);
          }}
        >
          <i className="fa fa-exclamation-circle" />
          {e.message}
          <i className="fa fa-close" onClick={() => closeError(e)} />
        </div>
      ))}
    </div>
  );
}
