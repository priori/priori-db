import { Dialog } from 'components/util/Dialog/Dialog';
import { db } from 'db/db';
import { useState } from 'react';
import { reloadNav } from 'state/actions';
import { grantError } from 'util/errors';

function focus(el: HTMLInputElement | null) {
  if (el) setTimeout(() => el.focus(), 1);
}
export function NewRoleDialog({ onBlur }: { onBlur: () => void }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  return (
    <Dialog
      onBlur={onBlur}
      className="new-role-dialog"
      relativeTo="previousSibling"
    >
      {error ? (
        <div className="new-role-dialog--error">
          <span style={{ userSelect: 'text' }}>{error.message}</span>{' '}
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="new-role-dialog--field">
        <div className="new-role-dialog--label">Name:</div>
        <div className="new-role-dialog--input">
          <input
            type="text"
            ref={focus}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      {db().privileges?.rolesHost ? (
        <div className="new-role-dialog--field">
          <div className="new-role-dialog--label">Host:</div>
          <div className="new-role-dialog--input">
            <input
              type="text"
              placeholder="%"
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      <div className="new-role-dialog--field">
        <div className="new-role-dialog--label">Password:</div>
        <div className="new-role-dialog--input">
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="new-role-dialog--actions">
        <button type="button" onClick={onBlur}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!name}
          onClick={() => {
            setError(null);
            db()
              .privileges?.createRole({ name, host, password })
              .then(
                () => {
                  reloadNav();
                  onBlur();
                },
                (e: unknown) => setError(grantError(e)),
              );
          }}
        >
          Create
        </button>
      </div>
    </Dialog>
  );
}
