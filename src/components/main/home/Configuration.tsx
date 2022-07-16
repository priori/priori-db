import assert from 'assert';
import { Dialog } from 'components/util/Dialog';
import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { ConnectionConfiguration } from '../../../db/pgpass';

export interface NewConectionState {
  passwordNeeded?: boolean;
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  host?: string;
}
interface NewConnectionProps {
  connection: undefined | ConnectionConfiguration;
  onRemove: undefined | (() => void);
  onCancel: undefined | (() => void);
  onSubmit: (c: ConnectionConfiguration) => void;
  onSave: (c: ConnectionConfiguration) => void;
}
export function NewConnection(props: NewConnectionProps) {
  const { connection } = props;

  const [state, setState] = useState({
    passwordNeeded: false,
    port: connection ? `${connection.port}` : '',
    host: connection ? connection.host : '',
    database: connection ? connection.database : '',
    user: connection ? connection.user : '',
    password: connection ? connection.password : '',
  } as NewConectionState);

  const [removeConfirmation, setRemoveConfirmation] = useState(false);
  function remove() {
    setRemoveConfirmation(true);
  }
  function yesClick() {
    assert(!!props.onRemove);
    props.onRemove();
  }
  const noClick = useEvent(() => {
    setRemoveConfirmation(false);
  });

  function cancel() {
    assert(props.onCancel);
    props.onCancel();
  }

  function save() {
    const { database, host, port, user, password } = state;
    if (!password) {
      setState((state2) => ({ ...state2, passwordNeeded: true }));
      return;
    }
    setState((state2) => ({ ...state2, passwordNeeded: false }));
    props.onSave({
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password,
    } as ConnectionConfiguration);
  }

  function submit() {
    const { database, host, port, user, password } = state;
    if (!password) {
      setState((state2) => ({ ...state2, passwordNeeded: true }));
      return;
    }
    setState((state2) => ({ ...state2, passwordNeeded: false }));
    props.onSubmit({
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password,
    } as ConnectionConfiguration);
  }

  return (
    <div className="new-connection">
      Host:{' '}
      <input
        placeholder="localhost"
        defaultValue={connection ? connection.host : ''}
        onChange={(e) =>
          setState((state2) => ({
            ...state2,
            host: (e.target as HTMLInputElement).value,
          }))
        }
      />
      <br />
      Port:{' '}
      <input
        placeholder="5432"
        defaultValue={connection ? connection.port : ''}
        onChange={(e) =>
          setState((state2) => ({
            ...state2,
            port: (e.target as HTMLInputElement).value,
          }))
        }
      />
      <br />
      Database:{' '}
      <input
        placeholder="postgres"
        defaultValue={connection ? connection.database : ''}
        onChange={(e) =>
          setState((state2) => ({
            ...state2,
            database: (e.target as HTMLInputElement).value,
          }))
        }
      />
      <br />
      User:{' '}
      <input
        placeholder="postgres"
        defaultValue={connection ? connection.user : ''}
        onChange={(e) =>
          setState((state2) => ({
            ...state2,
            user: (e.target as HTMLInputElement).value,
          }))
        }
      />
      <br />
      <span className={state.passwordNeeded ? 'error' : undefined}>
        Password:{' '}
        <input
          defaultValue={connection ? connection.password : ''}
          onChange={(e) =>
            setState((state2) => ({
              ...state2,
              password: (e.target as HTMLInputElement).value,
            }))
          }
          type="password"
        />
      </span>
      <br />
      <div style={{ marginTop: '4px', marginBottom: '4px' }}>
        <button onClick={() => submit()} type="button">
          <i className="fa fa-chain" /> Save &amp; Connect
        </button>{' '}
        {props.onCancel ? (
          <button onClick={() => cancel()} className="cancel" type="button">
            <i className="fa fa-rotate-left" /> Cancel
          </button>
        ) : null}
      </div>
      <button onClick={() => save()} type="button">
        <i className="fa fa-save" /> Just Save
      </button>{' '}
      {removeConfirmation ? (
        <Dialog onBlur={noClick} relativeTo="nextSibling">
          Do you really want to remove this connection configuration?
          <div>
            <button type="button" onClick={yesClick}>
              Yes
            </button>{' '}
            <button type="button" onClick={noClick}>
              No
            </button>
          </div>
        </Dialog>
      ) : null}
      {props.onRemove ? (
        <button
          style={{ color: '#e00' }}
          onClick={() => remove()}
          type="button"
        >
          <i className="fa fa-remove" /> Remove
        </button>
      ) : null}{' '}
    </div>
  );
}
