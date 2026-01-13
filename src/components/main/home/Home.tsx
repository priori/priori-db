import { listDatabases } from 'db/db';
import { useEffect, useMemo, useState } from 'react';
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
import { useEvent } from 'util/useEvent';
import { AppState, ConnectionConfiguration } from '../../../types';
import { Errors } from '../Errors';
import { ConnectionConfigurationForm } from './ConnectionConfigurationForm';
import { HomeConnectionErrorDialog } from './HomeConnectionErrorDialog';

function formatLastUsedAt(timestamp: number, index: number): string {
  const ago = Date.now() - timestamp;
  if (ago < 60 * 1000) {
    const seconds = Math.floor(ago / 1000);
    return `${seconds}${index > 5 ? 's' : ` sec${seconds !== 1 ? 's' : ''}${!index ? ' ago' : ''}`}`;
  }
  if (ago < 60 * 60 * 1000) {
    const minutes = Math.floor(ago / (60 * 1000));
    return `${minutes}${index > 5 ? 'm' : ` min${minutes !== 1 ? 's' : ''}${!index ? ' ago' : ''}`}`;
  }
  if (ago < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(ago / (60 * 60 * 1000));
    return `${hours}${index > 5 ? 'h' : ` hour${hours !== 1 ? 's' : ''}${!index ? ' ago' : ''}`}`;
  }
  const days = Math.floor(ago / (24 * 60 * 60 * 1000));
  return `${days}${index > 5 ? 'd' : ` day${days !== 1 ? 's' : ''}${!index ? ' ago' : ''}`}`;
}

function nextTickTimeout(timestamp: number): number {
  const ago = Date.now() - timestamp;
  if (ago < 60 * 1000) {
    return 1000 + 10;
  }
  if (ago < 60 * 60 * 1000) {
    return 60 * 1000 + 10;
  }
  if (ago < 24 * 60 * 60 * 1000) {
    return 60 * 60 * 1000 + 10;
  }
  return 24 * 60 * 60 * 1000 + 10;
}

function LastUsedAt({
  timestamp,
  index,
}: {
  timestamp: number;
  index: number;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function fn() {
      setTick((t) => t + 1);
      timeout = setTimeout(fn, nextTickTimeout(timestamp));
    }
    timeout = setTimeout(fn, nextTickTimeout(timestamp));
    return () => clearTimeout(timeout);
  }, [setTick, timestamp]);
  return (
    <span
      className={`connection--last-used${index > 5 ? ' connection--last-used--short' : ''}`}
      title={new Date(timestamp).toLocaleString()}
    >
      {formatLastUsedAt(timestamp, index)}
    </span>
  );
}

export function Home(props: AppState) {
  const service = useService(() => listConnectionConfigurations(), []);

  const [state, setState] = useState({
    connecting: false,
    newConnection: false,
    editConnection: null as null | ConnectionConfiguration,
    openConnection: null as null | ConnectionConfiguration,
    selectedConnection: null as null | ConnectionConfiguration,
    editConnections: false,
    error: null as null | Error,
    untouched: true,
  });

  useShortcuts({
    closeTab() {
      window.close();
    },
  });

  const basesService = useService<string[] | null>(
    () =>
      state.openConnection && state.openConnection.dbSelectionMode !== 'always'
        ? listDatabases(state.openConnection)
        : Promise.resolve(null),
    [state.openConnection],
  );

  useEffect(() => {
    if (basesService?.error) {
      setState((s) => ({ ...s, error: basesService.error }));
    }
  }, [setState, state, basesService?.error]);

  const error = state?.error;

  const listingBases =
    basesService.status === 'reloading' || basesService.status === 'starting';

  const connectionConfigurations = service.lastValidData;
  const sortedConnectionConfigurations = connectionConfigurations
    ? [...connectionConfigurations].sort(
        (a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0),
      )
    : connectionConfigurations;
  const originConnectionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('originConnectionId');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);
  const preferredConnection = useMemo(() => {
    if (!sortedConnectionConfigurations?.length) return null;
    if (originConnectionId !== null) {
      const origin = sortedConnectionConfigurations.find(
        (connection) => connection.id === originConnectionId,
      );
      if (origin) return origin;
    }
    return sortedConnectionConfigurations[0];
  }, [originConnectionId, sortedConnectionConfigurations]);
  const preferredConnectionId = preferredConnection?.id;

  useEventListener(window, 'keydown', (e) => {
    if (e.key === 'Escape') {
      setState((s) => ({
        ...s,
        error: null,
        openConnection: null,
        untouched: false,
      }));
    } else if ((e.key === ' ' || e.key === 'Enter') && state.untouched) {
      const con = preferredConnection;
      if (con && !state.openConnection && !state.editConnection) {
        e.preventDefault();
        if (con.dbSelectionMode === 'always') {
          (async () => {
            try {
              setState((s) => ({
                ...s,
                connecting: true,
                openConnection: con,
              }));
              await connect(con, con.database);
            } catch (err) {
              setState((s) => ({
                ...s,
                connecting: false,
                openConnection: null,
                selectedConnection: con,
                error: grantError(err),
              }));
            }
          })();
        } else {
          setState((s) => ({ ...s, openConnection: con }));
        }
      }
    }
  });

  const onErrorClose = useEvent(() => {
    setState((s) => ({ ...s, error: null, openConnection: null }));
  });

  const onErrorEdit = useEvent(() => {
    setState((s) => ({
      ...s,
      error: null,
      openConnection: null,
      editConnection: s.openConnection ?? s.selectedConnection,
    }));
  });

  if (
    !state.editConnection &&
    (state.newConnection || connectionConfigurations?.length === 0)
  ) {
    return (
      <div>
        <Errors errors={props.errors} />
        {error ? (
          <HomeConnectionErrorDialog
            error={error}
            onClose={onErrorClose}
            onEdit={onErrorEdit}
          />
        ) : null}
        <ConnectionConfigurationForm
          connection={undefined}
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
            const id = await insertConnectionConfiguration(c);
            const connection = { ...c, id };
            if (c.dbSelectionMode === 'always') {
              setState((s) => ({
                ...s,
                newConnection: false,
                editConnection: {
                  ...connection,
                },
                editConnections: false,
                connecting: true,
              }));
              try {
                await connect(connection, connection.database);
              } catch (err) {
                setState((s) => ({
                  ...s,
                  connecting: false,
                  openConnection: null,
                  selectedConnection: connection,
                  error: grantError(err),
                }));
              }
            } else {
              await service.reload();
              setState((s) => ({
                ...s,
                editConnection: null,
                newConnection: false,
                openConnection: connection,
                editConnections: false,
              }));
            }
          }}
        />
      </div>
    );
  }
  if (state.editConnection) {
    return (
      <div style={{ animation: 'show 1s' }}>
        <Errors errors={props.errors} />
        {error ? (
          <HomeConnectionErrorDialog
            error={error}
            onClose={onErrorClose}
            onEdit={onErrorEdit}
          />
        ) : null}
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
            if (e.dbSelectionMode === 'always') {
              setState((s) => ({
                ...s,
                editConnections: false,
                editConnection: null,
                connecting: true,
              }));
              try {
                await connect(e, e.database);
              } catch (err) {
                setState((s) => ({
                  ...s,
                  connecting: false,
                  openConnection: null,
                  selectedConnection: e,
                  error: grantError(err),
                }));
              }
            } else {
              await service.reload();
              setState((s) => ({
                ...s,
                editConnection: null,
                newConnection: false,
                openConnection: e,
                editConnections: false,
              }));
            }
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
    <div style={{ animation: 'show 1s', paddingTop: 5 }}>
      <Errors errors={props.errors} />
      {error ? (
        <HomeConnectionErrorDialog
          error={error}
          onClose={onErrorClose}
          onEdit={onErrorEdit}
        />
      ) : null}
      {sortedConnectionConfigurations?.length ? (
        <div className="connections">
          {sortedConnectionConfigurations.map((p, i) => (
            <div
              className={`connection${
                state.editConnections ? ' connection--editing' : ''
              }${p.type === 'postgres' ? ' pg' : ' mysql'}${state.untouched && preferredConnectionId === p.id ? ' connection--active' : ''}`}
              onClick={
                listingBases
                  ? undefined
                  : async (e) => {
                      if (state.editConnections)
                        setState((s) => ({ ...s, editConnection: p }));
                      else if (p.dbSelectionMode === 'always') {
                        e.stopPropagation();
                        try {
                          setState((s) => ({
                            ...s,
                            connecting: true,
                            openConnection: p,
                            untouched: false,
                          }));
                          await connect(p, p.database);
                        } catch (err) {
                          setState((s) => ({
                            ...s,
                            connecting: false,
                            openConnection: null,
                            selectedConnection: p,
                            error: grantError(err),
                          }));
                        }
                      } else {
                        setState((s) => ({
                          ...s,
                          openConnection: p,
                          untouched: false,
                        }));
                      }
                      if (document.activeElement instanceof HTMLElement)
                        document.activeElement.blur();
                    }
              }
              onKeyDown={
                listingBases
                  ? undefined
                  : async (e) => {
                      if (
                        e.key === ' ' ||
                        e.key === 'Enter' ||
                        e.key === 'Space'
                      ) {
                        if (state.editConnections)
                          setState((s) => ({ ...s, editConnection: p }));
                        else if (p.dbSelectionMode === 'always') {
                          e.stopPropagation();
                          try {
                            setState((s) => ({
                              ...s,
                              connecting: true,
                              openConnection: p,
                              untouched: false,
                            }));
                            await connect(p, p.database);
                          } catch (err) {
                            setState((s) => ({
                              ...s,
                              connecting: false,
                              openConnection: null,
                              selectedConnection: p,
                              error: grantError(err),
                            }));
                          }
                        } else {
                          setState((s) => ({
                            ...s,
                            openConnection: p,
                            untouched: false,
                          }));
                        }
                        if (document.activeElement instanceof HTMLElement)
                          document.activeElement.blur();
                      } else if (e.key === 'Escape') {
                        if (document.activeElement instanceof HTMLElement)
                          document.activeElement.blur();
                      }
                    }
              }
              onFocus={() => {
                setState((s) => ({
                  ...s,
                  untouched: false,
                }));
              }}
              role="button"
              tabIndex={0}
              key={i}
            >
              {state.editConnections ? <i className="fa fa-pencil" /> : null}
              <span className="connection--user">{p.user}</span>
              <span className="connection--at">@</span>
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
              {p.lastUsedAt ? (
                <LastUsedAt timestamp={p.lastUsedAt} index={i} />
              ) : null}
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
              className="connections--edit-button2"
              onClick={
                state.connecting
                  ? undefined
                  : () => {
                      setState((s) => ({
                        ...s,
                        editConnection: state.openConnection,
                        openConnection: null,
                        untouched: false,
                      }));
                    }
              }
            >
              <i className="fa fa-pencil" />
            </button>
            <div className="bases-inner-wrapper">
              {basesService.lastValidData.map((b) => (
                <div
                  className={`base${
                    b === state.openConnection?.database ? ' base--default' : ''
                  }${state.connecting ? ' base--connecting' : ''}`}
                  key={b}
                  tabIndex={0}
                  role="button"
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
                                openConnection: null,
                                selectedConnection: s.openConnection,
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
                              openConnection: null,
                              selectedConnection: s.openConnection,
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
      ) : state.openConnection?.dbSelectionMode === 'always' ? (
        <div
          className="bases-wrapper"
          style={
            state.connecting
              ? {
                  filter: 'blur(0.5px) brightness(99%) grayscale(0.5)',
                }
              : undefined
          }
        />
      ) : undefined}
      <button
        onClick={
          listingBases
            ? undefined
            : () => {
                setState({
                  ...state,
                  editConnections: !state.editConnections,
                  untouched: false,
                });
              }
        }
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
                  untouched: false,
                });
              }
        }
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
