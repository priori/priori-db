import { assert } from 'util/assert';
import { Dialog } from 'components/util/Dialog/Dialog';
import { ConnectionConfiguration, listDatabases } from 'db/Connection';
import { useState } from 'react';
import { grantError } from 'util/errors';
import { useEvent } from 'util/useEvent';

export interface NewConectionState {
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  host?: string;
  requireSsl?: boolean;
}
interface NewConnectionProps {
  connection: undefined | ConnectionConfiguration;
  onRemove: undefined | (() => void);
  onCancel: undefined | (() => void);
  onSaveAndConnect: (c: ConnectionConfiguration) => void;
  onJustSave: (c: ConnectionConfiguration) => void;
}
export function ConnectionConfigurationForm(props: NewConnectionProps) {
  const { connection } = props;
  const [state, setState] = useState({
    port: connection ? `${connection.port}` : '',
    host: connection ? connection.host : '',
    database: connection ? connection.database : '',
    user: connection ? connection.user : '',
    password: connection ? connection.password : '',
    requireSsl: connection ? connection.requireSsl : false,
  } as NewConectionState);
  const [removeConfirmation, setRemoveConfirmation] = useState(false);
  const [testResult, setTestResult] = useState(
    null as null | Error | true | 'pending',
  );
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
    props.onJustSave({
      ...(connection?.id ? { id: connection.id } : {}),
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password: password || '',
      requireSsl: state.requireSsl,
    } as ConnectionConfiguration);
  }

  function saveAndConnect() {
    const { database, host, port, user, password } = state;
    props.onSaveAndConnect({
      ...(connection?.id ? { id: connection.id } : {}),
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password: password || '',
      requireSsl: state.requireSsl,
    } as ConnectionConfiguration);
  }

  function onTestClick() {
    const { database, host, port, user, password } = state;
    setTestResult('pending');
    listDatabases({
      database: database || 'postgres',
      host: host || 'localhost',
      port: (port && parseInt(port, 10)) || 5432,
      user: user || 'postgres',
      password: password || '',
      requireSsl: state.requireSsl,
    })
      .then(() => {
        setTestResult(true);
      })
      .catch((e) => setTestResult(grantError(e)));
  }

  return (
    <div className="new-connection" style={{ fontSize: 15 }}>
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
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: 1, paddingTop: 3 }}>
          <i
            className={
              state.requireSsl ? 'fa fa-check-square-o' : 'fa fa-square-o'
            }
            onClick={() => {
              setState((state2) => ({
                ...state2,
                requireSsl: !state2.requireSsl,
              }));
            }}
            style={{
              width: 28,
              float: 'left',
              fontSize: 25,
            }}
          />
          <span
            style={{ lineHeight: 1.1, fontSize: 16 }}
            onClick={() => {
              setState((state2) => ({
                ...state2,
                requireSsl: !state2.requireSsl,
              }));
            }}
          >
            Require
            <br />
            SSL
          </span>{' '}
        </div>
        <div>
          Port: <br />
          <input
            placeholder="5432"
            style={{ width: 50, marginBottom: 0 }}
            defaultValue={connection ? connection.port : ''}
            onChange={(e) =>
              setState((state2) => ({
                ...state2,
                port: (e.target as HTMLInputElement).value,
              }))
            }
          />
        </div>
      </div>
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
      <span>
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
      <div style={{ display: 'flex', paddingBottom: 5 }}>
        <div style={{ marginRight: 10 }}>
          <button type="button" onClick={onTestClick}>
            Test...
          </button>{' '}
        </div>
        {testResult === true ? (
          <strong className="connection-test-success">
            OK <i className="fa fa-check" />
          </strong>
        ) : testResult instanceof Error ? (
          <span className="connection-test-error">
            <i
              className="fa fa-exclamation-triangle"
              style={{ marginRight: 5 }}
            />
            {testResult.message}
          </span>
        ) : testResult ? (
          <span className="connection-test-pending">
            <i className="fa fa-circle-o-notch fa-spin" />
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: '4px', marginBottom: '4px' }}>
        <button onClick={() => saveAndConnect()} type="button">
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
          <div style={{ lineHeight: '1.3em' }}>
            Do you really want to remove this
            <br />
            connection configuration?
          </div>
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
