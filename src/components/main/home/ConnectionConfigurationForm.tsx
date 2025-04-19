import { assert } from 'util/assert';
import { Dialog } from 'components/util/Dialog/Dialog';
import React, { useState } from 'react';
import { grantError } from 'util/errors';
import { useEvent } from 'util/useEvent';
import { ConnectionConfiguration, ConnectionType } from 'types';
import { listDatabases } from 'db/db';
import { equals } from 'util/equals';

export interface NewConectionState {
  dbSelectionMode: 'always' | 'options';
  port?: string;
  database?: string;
  user?: string;
  password?: string;
  host?: string;
  requireSsl?: boolean;
  type?: ConnectionType | null;
}

interface NewConnectionProps {
  connection: undefined | ConnectionConfiguration;
  onRemove?: () => void;
  onCancel: undefined | (() => void);
  onSaveAndConnect?: (c: ConnectionConfiguration) => void;
  onJustSave: (c: ConnectionConfiguration) => void;
}

export function ConnectionConfigurationForm(props: NewConnectionProps) {
  const alreadyConnected = !props.onSaveAndConnect;
  const { connection } = props;
  const [state, setState] = useState({
    port: connection ? `${connection.port}` : '',
    host: connection ? connection.host : '',
    database: connection ? connection.database : '',
    user: connection ? connection.user : '',
    password: connection ? connection.password : '',
    requireSsl: connection ? !!connection.requireSsl : false,
    type: connection ? connection.type : null,
    dbSelectionMode: !connection
      ? 'always'
      : connection
        ? (connection.dbSelectionMode ?? 'options')
        : 'always',
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
    const { database, host, user, password, type } = state;
    const port = state.port
      ? parseInt(state.port, 10)
      : type === 'postgres'
        ? 5432
        : type === 'mysql'
          ? 3306
          : null;
    if (!type || Number.isNaN(port)) return;
    assert(port);
    props.onJustSave({
      ...(connection?.id ? { id: connection.id } : {}),
      database: database || 'postgres',
      host: host || 'localhost',
      port,
      user: user || 'postgres',
      password: password || '',
      type,
      requireSsl: !!state.requireSsl || undefined,
      dbSelectionMode: state.dbSelectionMode,
    } as ConnectionConfiguration);
  }

  function saveAndConnect() {
    const { database, host, user, password, type, requireSsl } = state;
    const port = state.port
      ? parseInt(state.port, 10)
      : type === 'postgres'
        ? 5432
        : type === 'mysql'
          ? 3306
          : null;
    if (!type || Number.isNaN(port)) return;
    assert(port);
    props.onSaveAndConnect!({
      ...(connection?.id ? { id: connection.id } : {}),
      database: database || 'postgres',
      host: host || 'localhost',
      port,
      user: user || 'postgres',
      password: password || '',
      type,
      requireSsl: !!requireSsl || undefined,
      dbSelectionMode: state.dbSelectionMode,
    } as ConnectionConfiguration);
  }

  function onTestClick(ev: React.MouseEvent<HTMLButtonElement>) {
    if (ev.target instanceof HTMLButtonElement) {
      ev.target.blur();
      const parent = ev.target.closest('[tabindex]');
      if (parent instanceof HTMLElement) {
        parent.focus();
      }
    }
    const { database, host, user, password, type, requireSsl } = state;
    const port = state.port
      ? parseInt(state.port, 10)
      : type === 'postgres'
        ? 5432
        : type === 'mysql'
          ? 3306
          : null;
    if (!type || Number.isNaN(port)) return;
    assert(port);
    setTestResult('pending');
    listDatabases({
      database: database || (type === 'postgres' ? 'postgres' : ''),
      host: host || 'localhost',
      port,
      user:
        user ||
        (type === 'postgres' ? 'postgres' : type === 'mysql' ? 'root' : ''),
      password: password || '',
      requireSsl: !!requireSsl || undefined,
      type,
    })
      .then(() => {
        setTestResult(true);
      })
      .catch((e) => setTestResult(grantError(e)));
  }

  const hasChanges = React.useMemo(() => {
    const initial = {
      port: connection ? `${connection.port}` : '',
      host: connection ? connection.host : '',
      database: connection ? connection.database : '',
      user: connection ? connection.user : '',
      password: connection ? connection.password : '',
      requireSsl: connection ? !!connection.requireSsl : false,
      type: connection ? connection.type : null,
      dbSelectionMode: connection
        ? (connection.dbSelectionMode ?? 'options')
        : 'always',
    };
    return !equals(initial, state);
  }, [connection, state]);

  return (
    <div className="new-connection">
      <div>
        <div className="new-connection__field new-connection__field-select">
          <div
            className={`new-connection__field-option${state.type === 'postgres' ? ' new-connection__field-option--selected' : ''}`}
            onClick={() =>
              setState((state2) => ({ ...state2, type: 'postgres' }))
            }
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setState((state2) => ({ ...state2, type: 'postgres' }));
              }
            }}
          >
            Postgres
          </div>
          <div
            className={`new-connection__field-option${state.type === 'mysql' ? ' new-connection__field-option--selected' : ''}`}
            onClick={() => setState((state2) => ({ ...state2, type: 'mysql' }))}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setState((state2) => ({ ...state2, type: 'mysql' }));
              }
            }}
          >
            MySQL
          </div>
        </div>
        <div className="new-connection__field">
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
        </div>
        <div
          className="new-connection__field"
          style={{ display: 'flex', width: '100%' }}
        >
          <div
            className="new-connection__require-ssl"
            onClick={() => {
              setState((state2) => ({
                ...state2,
                requireSsl: !state2.requireSsl,
              }));
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setState((state2) => ({
                  ...state2,
                  requireSsl: !state2.requireSsl,
                }));
              }
            }}
          >
            <i
              className={
                state.requireSsl ? 'fa fa-check-square-o' : 'fa fa-square-o'
              }
              style={{
                width: 28,
                float: 'left',
                fontSize: 25,
              }}
            />
            <span style={{ lineHeight: 1.1, fontSize: 16 }}>
              Require
              <br />
              SSL
            </span>{' '}
          </div>
          <div>
            Port: <br />
            <input
              placeholder={
                state?.type === 'postgres'
                  ? '5432'
                  : state?.type === 'mysql'
                    ? '3306'
                    : ''
              }
              style={{ width: 70, marginBottom: 0 }}
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
        <div className="new-connection__field">
          <span
            style={{
              float: 'right',
              fontSize: 13,
              WebkitFontSmoothing: 'antialiased',
              position: 'relative',
            }}
            key={state.dbSelectionMode}
          >
            <i
              className="fa fa-check-square-o"
              style={{
                width: 13,
              }}
            />
            {state.dbSelectionMode === 'always' ? 'Always' : 'Show options'}
            <i className="fa fa-caret-down" style={{ marginLeft: 5 }} />
            <div
              className="context-menu"
              tabIndex={0}
              style={{
                top: state.dbSelectionMode === 'always' ? -12 : -42,
                left: -10,
              }}
            >
              <div
                style={
                  state.dbSelectionMode === 'always'
                    ? { pointerEvents: 'none' }
                    : undefined
                }
                onClick={(e) => {
                  if (e.target instanceof HTMLElement) {
                    const dialogEl = e.target.parentElement?.closest('.dialog');
                    if (dialogEl instanceof HTMLElement) {
                      dialogEl.focus();
                    }
                  }
                  setState((state2) => ({
                    ...state2,
                    dbSelectionMode: 'always',
                  }));
                }}
              >
                <i
                  className={`fa fa${state.dbSelectionMode === 'always' ? '-check' : ''}-square-o`}
                  style={{ width: 13 }}
                />
                Always auto choose this database
              </div>
              <div
                style={
                  state.dbSelectionMode === 'options'
                    ? { pointerEvents: 'none' }
                    : undefined
                }
                onClick={(e) => {
                  if (e.target instanceof HTMLElement) {
                    const dialogEl = e.target.parentElement?.closest('.dialog');
                    if (dialogEl instanceof HTMLElement) {
                      dialogEl.focus();
                    }
                  }
                  setState((state2) => ({
                    ...state2,
                    dbSelectionMode: 'options',
                  }));
                }}
              >
                <i
                  className={`fa fa${state.dbSelectionMode === 'options' ? '-check' : ''}-square-o`}
                  style={{ width: 13 }}
                />
                Show options during connection
              </div>
            </div>
          </span>
          Database:{' '}
          <input
            placeholder={state?.type === 'postgres' ? 'postgres' : ''}
            defaultValue={connection ? connection.database : ''}
            onChange={(e) =>
              setState((state2) => ({
                ...state2,
                database: (e.target as HTMLInputElement).value,
              }))
            }
          />
        </div>
        <div className="new-connection__field">
          User:{' '}
          <input
            placeholder={
              state?.type === 'postgres'
                ? 'postgres'
                : state?.type === 'mysql'
                  ? 'root'
                  : ''
            }
            defaultValue={connection ? connection.user : ''}
            onChange={(e) =>
              setState((state2) => ({
                ...state2,
                user: (e.target as HTMLInputElement).value,
              }))
            }
          />
        </div>
        <div className="new-connection__field">
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
        </div>
      </div>
      <div>
        <br />
        <div
          style={{ display: 'flex', paddingBottom: 5, position: 'relative' }}
        >
          <div style={{ marginRight: 10 }}>
            <button
              className="button"
              onClick={onTestClick}
              disabled={!state.type}
            >
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
        <div style={{ marginBottom: '4px' }}>
          {alreadyConnected ? null : (
            <button
              className="button"
              onClick={() => saveAndConnect()}
              disabled={!state.type}
            >
              <i className="fa fa-chain" /> Save &amp; Connect
            </button>
          )}{' '}
          {props.onCancel ? (
            <button
              className="button"
              style={{
                width: 95,
                textAlign: 'left',
              }}
              onClick={() => cancel()}
              data-hint={
                hasChanges && connection ? 'Discard changes' : undefined
              }
            >
              <i className="fa fa-rotate-left" /> Cancel
              {hasChanges && connection ? (
                <strong
                  style={{
                    fontSize: 21,
                    lineHeight: 0.1,
                    position: 'relative',
                    top: 3,
                    marginLeft: 2,
                  }}
                >
                  *
                </strong>
              ) : null}
            </button>
          ) : null}
        </div>
        <button
          className="button"
          onClick={() => save()}
          disabled={!state.type}
        >
          <i className="fa fa-save" /> {alreadyConnected ? '' : 'Just '}Save
        </button>{' '}
        {removeConfirmation ? (
          <Dialog onBlur={noClick} relativeTo="nextSibling">
            <div style={{ lineHeight: '1.3em' }}>
              Do you really want to remove this
              <br />
              connection configuration?
            </div>
            <div>
              <button className="button" onClick={yesClick}>
                Yes
              </button>{' '}
              <button className="button" onClick={noClick}>
                No
              </button>
            </div>
          </Dialog>
        ) : null}
        {props.onRemove ? (
          <button
            className="button"
            style={{ color: '#e00' }}
            onClick={() => remove()}
          >
            <i className="fa fa-remove" /> Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
