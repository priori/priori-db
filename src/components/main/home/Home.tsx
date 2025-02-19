import { listDatabases } from 'db/db';
import { useEffect, useState } from 'react';
import { connect } from 'state/actions';
import {
  deleteConnectionConfiguration,
  insertConnectionConfiguration,
  listConnectionConfigurations,
  updateConnectionConfiguration,
} from 'util/browserDb/actions';
import { grantError } from 'util/errors';
import { useShortcuts } from 'util/shortcuts';
import { useEventListener } from 'util/useEventListener';
import { useService } from 'util/useService';
import { AppState, ConnectionConfiguration } from '../../../types';
import { Errors } from '../Errors';
import { ConnectionConfigurationForm } from './ConnectionConfigurationForm';

export function Home(props: AppState) {
  const service = useService(() => listConnectionConfigurations(), []);

  const [state, setState] = useState({
    connecting: false,
    newConnection: false,
    editConnection: null as null | ConnectionConfiguration,
    openConnection: null as null | ConnectionConfiguration,
    editConnections: false,
    error: null as null | Error,
  });

  useShortcuts({
    closeTab() {
      window.close();
    },
  });

  const basesService = useService<string[] | null>(
    () =>
      state.openConnection
        ? listDatabases(state.openConnection)
        : Promise.resolve(null),
    [state.openConnection],
  );

  useEffect(() => {
    if (basesService?.error)
      setState((s) => ({ ...s, error: basesService.error }));
  }, [basesService?.error]);

  const error = state?.error;

  const listingBases =
    basesService.status === 'reloading' || basesService.status === 'starting';

  const connectionConfigurations = service.lastValidData;

  useEventListener(window, 'keydown', (e) => {
    if (e.key === 'Escape') {
      setState((s) => ({ ...s, error: null, openConnection: null }));
    }
  });

  if (state.newConnection || connectionConfigurations?.length === 0) {
    return (
      <div>
        <Errors errors={props.errors} />
        <ConnectionConfigurationForm
          connection={undefined}
          onRemove={undefined}
          onCancel={
            state.newConnection
              ? () => {
                  setState((s) => ({
                    ...s,
                    newConnection: false,
                    editConnections: false,
                  }));
                }
              : undefined
          }
          onJustSave={async (c) => {
            await insertConnectionConfiguration(c);
            setState((s) => ({
              ...s,
              newConnection: false,
              editConnections: false,
            }));
            service.reload();
          }}
          onSaveAndConnect={async (c) => {
            service.reload();
            await insertConnectionConfiguration(c);
            setState((s) => ({
              ...s,
              openConnection: c,
              newConnection: false,
              editConnections: false,
            }));
          }}
        />
      </div>
    );
  }
  if (state.editConnection) {
    return (
      <div style={{ animation: 'show 1s' }}>
        <Errors errors={props.errors} />
        <ConnectionConfigurationForm
          key={state.editConnection.id}
          connection={state.editConnection}
          onJustSave={async (e: ConnectionConfiguration) => {
            await updateConnectionConfiguration(e);
            service.reload();
            setState((s) => ({
              ...s,
              editConnection: null,
              newConnection: false,
              editConnections: false,
            }));
          }}
          onCancel={() => {
            setState((s) => ({
              ...s,
              editConnection: null,
              newConnection: false,
              editConnections: false,
            }));
          }}
          onSaveAndConnect={async (e: ConnectionConfiguration) => {
            await updateConnectionConfiguration(e);
            await service.reload();
            setState((s) => ({
              ...s,
              editConnection: null,
              newConnection: false,
              openConnection: e,
              editConnections: false,
            }));
          }}
          onRemove={async () => {
            await deleteConnectionConfiguration(state.editConnection!.id!);
            await service.reload();
            setState((s) => ({
              ...s,
              editConnection: null,
              newConnection: false,
              editConnections: false,
            }));
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ animation: 'show 1s' }}>
      <Errors errors={props.errors} />
      {error ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(235, 235, 235, 0.65)',
            backdropFilter: 'blur(0.75px)',
            zIndex: 1,
          }}
          onClick={() =>
            setState((s) => ({ ...s, error: null, openConnection: null }))
          }
        >
          <div
            style={{
              padding: '30px 20px',
              background: 'white',
              boxShadow: '0 4px 40px rgba(0, 0, 0, 0.35)',
              maxWidth: '500px',
              color: '#d33',
              margin: '20px auto',
              textAlign: 'center',
            }}
          >
            <span style={{ userSelect: 'text' }}>{error.message}</span>{' '}
            <button
              style={{ marginTop: '5px' }}
              onClick={() => {
                setState((s) => ({ ...s, error: null, openConnection: null }));
              }}
              type="button"
            >
              Close
            </button>{' '}
            <button
              style={{ marginTop: '5px' }}
              onClick={() => {
                setState((s) => ({
                  ...s,
                  error: null,
                  openConnection: null,
                  editConnection: s.openConnection,
                }));
              }}
              type="button"
            >
              Edit
            </button>
          </div>
        </div>
      ) : null}
      {connectionConfigurations?.length ? (
        <div className="connections">
          {connectionConfigurations.map((p, i) => (
            <div
              className={`connection${
                state.editConnections ? ' connection--editing' : ''
              }${p.type === 'postgres' ? ' pg' : ' mysql'}`}
              onClick={
                listingBases
                  ? undefined
                  : () => {
                      if (state.editConnections)
                        setState((s) => ({ ...s, editConnection: p }));
                      else {
                        setState((s) => ({ ...s, openConnection: p }));
                      }
                      if (document.activeElement instanceof HTMLElement)
                        document.activeElement.blur();
                    }
              }
              onKeyDown={
                listingBases
                  ? undefined
                  : (e) => {
                      if (
                        e.key === ' ' ||
                        e.key === 'Enter' ||
                        e.key === 'Space'
                      ) {
                        if (state.editConnections)
                          setState((s) => ({ ...s, editConnection: p }));
                        else {
                          setState((s) => ({ ...s, openConnection: p }));
                        }
                        if (document.activeElement instanceof HTMLElement)
                          document.activeElement.blur();
                      }
                    }
              }
              role="button"
              tabIndex={0}
              key={i}
            >
              {state.editConnections ? <i className="fa fa-pencil" /> : null}
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
      {basesService.lastValidData ? (
        <div
          className="bases-wrapper"
          style={
            state.connecting
              ? {
                  filter: 'blur(0.5px) brightness(99%) grayscale(0.5)',
                }
              : undefined
          }
          onClick={
            state.connecting
              ? undefined
              : () => {
                  setState((s) => ({
                    ...s,
                    openConnection: null,
                  }));
                }
          }
        >
          <div className="bases">
            <button
              onClick={
                state.connecting
                  ? undefined
                  : () => {
                      setState((s) => ({
                        ...s,
                        editConnection: state.openConnection,
                        openConnection: null,
                      }));
                    }
              }
              className="connections--edit-button2"
              type="button"
            >
              <i className="fa fa-pencil" />
            </button>
            <div className="bases-inner-wrapper">
              {basesService.lastValidData.map((b) => (
                <div
                  className={`base${
                    b === state.openConnection?.database ? ' base--default' : ''
                  }${state.connecting ? ' selected' : ''}`}
                  key={b}
                  tabIndex={0}
                  role="button"
                  style={
                    state.connecting ? { color: 'rgba(0,0,0,.3)' } : undefined
                  }
                  onKeyDown={
                    state.connecting
                      ? undefined
                      : async (e) => {
                          if (
                            e.key === ' ' ||
                            e.key === 'Enter' ||
                            e.key === 'Space'
                          ) {
                            e.stopPropagation();
                            try {
                              setState((s) => ({ ...s, connecting: true }));
                              await connect(state.openConnection!, b);
                            } catch (err) {
                              setState((s) => ({
                                ...s,
                                connecting: false,
                                error: grantError(err),
                              }));
                            }
                          }
                        }
                  }
                  onClick={
                    state.connecting
                      ? undefined
                      : async (e) => {
                          e.stopPropagation();
                          try {
                            setState((s) => ({ ...s, connecting: true }));
                            await connect(state.openConnection!, b);
                          } catch (err) {
                            setState((s) => ({
                              ...s,
                              connecting: false,
                              error: grantError(err),
                            }));
                          }
                        }
                  }
                >
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : listingBases ? (
        <div className="bases-wrapper">
          <div
            style={{
              position: 'fixed',
              color: '#777',
              left: '50%',
              top: 'calc(50% - 40px)',
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              animation: '0.6s 0.2s show forwards',
            }}
          >
            <i
              className="fa fa-circle-o-notch fa-spin"
              style={{ fontSize: 62 }}
            />
          </div>
        </div>
      ) : undefined}
      <button
        onClick={
          listingBases
            ? undefined
            : () => {
                setState({
                  ...state,
                  editConnections: !state.editConnections,
                });
              }
        }
        type="button"
        className="connections--edit-button"
      >
        <i className="fa fa-pencil" />
      </button>
      <button
        onClick={
          listingBases
            ? undefined
            : () => {
                setState({
                  ...state,
                  editConnections: false,
                  newConnection: true,
                });
              }
        }
        type="button"
        className="connections--add-button"
      >
        <i className="fa fa-plus" />
      </button>
      {state.connecting ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'fixed',
              color: '#777',
              left: '50%',
              top: 'calc(50% - 40px)',
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              animation: '0.6s 0.2s show forwards',
            }}
          >
            <i
              className="fa fa-circle-o-notch fa-spin"
              style={{ fontSize: 62 }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
