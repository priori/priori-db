import { useEffect, useState } from 'react';
import {
  connect,
  open,
  newConnection,
  cancelConnection,
  saveConnection,
  editConnection,
  removeConnection,
  cancelSelectedConnection,
  closeConnectionError,
  newConf,
  editingAll,
  editConnectionSelected,
} from '../../../state/actions';
import { AppState } from '../../../types';
import { ConnectionConfiguration } from '../../../db/pgpass';
import { NewConnection } from './Configuration';

export function Home(props: AppState) {
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (props.connectionError && connecting) {
      setConnecting(false);
    }
  }, [props.connectionError, connecting]);
  if (props.newConnection || props.passwords.length === 0) {
    return (
      <div>
        <div className="connection-error">
          {props.connectionError && props.connectionError.message}
        </div>
        <NewConnection
          connection={undefined}
          onSave={saveConnection}
          onRemove={undefined}
          onCancel={
            props.passwords.length === 0 ? undefined : () => cancelConnection()
          }
          onSubmit={newConnection}
        />
      </div>
    );
  }
  if (props.editConnection) {
    const { index } = props.editConnection;
    return (
      <div>
        <div className="connection-error">
          {props.connectionError && props.connectionError.message}
        </div>
        <NewConnection
          connection={props.editConnection.connection}
          onSave={(e: ConnectionConfiguration) => {
            saveConnection(e, index);
          }}
          onCancel={
            props.passwords.length === 0 ? undefined : () => cancelConnection()
          }
          onSubmit={(e: ConnectionConfiguration) => newConnection(e, index)}
          onRemove={() => removeConnection(index)}
        />
      </div>
    );
  }
  return (
    <div>
      {props.connectionError ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            background: 'rgba(256,256,256,.5)',
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: '20px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,.4)',
              maxWidth: '500px',
              color: '#d33',
              margin: '20px auto',
            }}
          >
            {typeof props.connectionError === 'string'
              ? props.connectionError
              : props.connectionError.message ||
                JSON.stringify(props.connectionError)}{' '}
            <button
              style={{ marginTop: '5px' }}
              onClick={() => closeConnectionError()}
              type="button"
            >
              Close
            </button>{' '}
            <button
              style={{ marginTop: '5px' }}
              onClick={() => editConnectionSelected()}
              type="button"
            >
              Edit
            </button>
          </div>
        </div>
      ) : null}
      {props.passwords && props.passwords.length ? (
        <div className="connections">
          {props.passwords.map((p, i) => (
            <div
              className={`connection${
                props.editConnections ? ' connection--editing' : ''
              }`}
              onClick={() => {
                if (props.editConnections) editConnection(p, i);
                else open(p);
              }}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
                  if (props.editConnections) editConnection(p, i);
                  else open(p);
                }
              }}
              role="button"
              tabIndex={0}
              key={i}
            >
              {props.editConnections ? <i className="fa fa-pencil" /> : null}
              <span className="connection--user">{p.user}</span>@
              <span className="connection--host">{p.host}</span>
              <span
                className={`connection--port${
                  p.port === 5432 ? ' connection--port--default' : ''
                }`}
              >
                :{p.port}
              </span>
              <span
                className={`connection--database${
                  p.database === '*' ? ' connection--database--any' : ''
                }`}
              >
                /{p.database}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {props.bases ? (
        <div
          className="bases-wrapper"
          onClick={connecting ? undefined : () => cancelSelectedConnection()}
        >
          <button
            onClick={connecting ? undefined : () => editConnectionSelected()}
            className="connections--edit-button2"
            type="button"
          >
            <i className="fa fa-pencil" />
          </button>
          <div className="bases">
            <div className="bases-inner-wrapper">
              {props.bases.map((b) => (
                <div
                  className="base"
                  key={b}
                  tabIndex={0}
                  role="button"
                  style={connecting ? { color: 'rgba(0,0,0,.3)' } : undefined}
                  onKeyDown={
                    connecting
                      ? undefined
                      : (e) => {
                          if (
                            e.key === ' ' ||
                            e.key === 'Enter' ||
                            e.key === 'Space'
                          ) {
                            e.stopPropagation();
                            connect(b);
                          }
                        }
                  }
                  onClick={
                    connecting
                      ? undefined
                      : (e) => {
                          setConnecting(true);
                          e.stopPropagation();
                          connect(b);
                        }
                  }
                >
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : undefined}
      <button
        onClick={() => editingAll()}
        type="button"
        className="connections--edit-button"
      >
        <i className="fa fa-pencil" />
      </button>
      <button
        onClick={() => newConf()}
        type="button"
        className="connections--add-button"
      >
        <i className="fa fa-plus" />
      </button>
    </div>
  );
}
