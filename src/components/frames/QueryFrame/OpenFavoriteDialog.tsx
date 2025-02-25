import { Dialog } from 'components/util/Dialog/Dialog';
import { useEffect, useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import {
  deleteFavoriteQuery,
  favorites,
  listConnectionConfigurations,
  updateFavoriteQueryTitle,
} from 'util/browserDb/actions';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { useService } from 'util/useService';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import { fDate } from './useQuerySelector';

function autoFocus(e: HTMLDivElement | null) {
  if (e) {
    e.focus();
  }
}

export function OpenFavoriteDialog({
  onBlur,
  onOpen,
}: {
  onBlur: () => void;
  onOpen: (f: {
    id: number;
    sql: string;
    title: string;
    created_at: number;
    editor_content: string;
    editor_cursor_start_line: number;
    editor_cursor_end_line: number;
    editor_cursor_start_char: number;
    editor_cursor_end_char: number;
  }) => void;
}) {
  useEventListener(window, 'resize', onBlur);
  const appState = currentState();
  const configsService = useService(() => listConnectionConfigurations(), []);
  const [state, setState] = useState<null | number>(null);
  const onConfigsSelectChange = useEvent(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setState(parseInt(e.target.value, 10));
    },
  );

  const config =
    state === -1
      ? null
      : state !== null
        ? configsService.lastValidData![state]
        : appState.currentConnectionConfiguration;

  const service = useService(() => favorites(config), [config]);

  useEffect(() => {
    if (service.error) {
      showError(service.error);
    }
  }, [service.error]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    query: {
      id: number;
      sql: string;
      title: string;
      created_at: number;
      editor_content: string;
      editor_cursor_start_line: number;
      editor_cursor_end_line: number;
      editor_cursor_start_char: number;
      editor_cursor_end_char: number;
    };
  } | null>(null);

  const [deleteQuery, setDelete] = useState<{
    id: number;
    sql: string;
    title: string;
    created_at: number;
    editor_content: string;
    editor_cursor_start_line: number;
    editor_cursor_end_line: number;
    editor_cursor_start_char: number;
    editor_cursor_end_char: number;
  } | null>(null);

  const [editQuery, setEdit] = useState<{
    id: number;
    sql: string;
    title: string;
    created_at: number;
    editor_content: string;
    editor_cursor_start_line: number;
    editor_cursor_end_line: number;
    editor_cursor_start_char: number;
    editor_cursor_end_char: number;
  } | null>(null);

  const onFavoriteMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    q: {
      id: number;
      sql: string;
      title: string;
      created_at: number;
      editor_content: string;
      editor_cursor_start_line: number;
      editor_cursor_end_line: number;
      editor_cursor_start_char: number;
      editor_cursor_end_char: number;
    },
  ) => {
    if (event.button !== 2) {
      if (contextMenu !== null) setContextMenu(null);
      return;
    }
    const dialogEl =
      event.target instanceof HTMLElement
        ? event.target.closest('.dialog')
        : undefined;
    if (!dialogEl) return;
    const { left, top } = dialogEl.getBoundingClientRect();
    setContextMenu({
      x: event.clientX - left,
      y: event.clientY - top,
      query: q,
    });
    event.preventDefault();
    event.stopPropagation();
  };

  const onDeleteClick = useEvent(() => {
    if (contextMenu?.query) setDelete(contextMenu.query);
    setContextMenu(null);
  });

  const onEditClick = useEvent(() => {
    if (contextMenu?.query) setEdit(contextMenu.query);
    setContextMenu(null);
  });

  const onBlurDialog = useEvent(() => {
    setDelete(null);
    setEdit(null);
  });

  const onBlurContextMenu = useEvent(() => {
    setContextMenu(null);
  });

  const onRename = useEvent(async (title: string) => {
    if (editQuery) {
      if (title) {
        await updateFavoriteQueryTitle(editQuery.id, title);
        setEdit(null);
        service.reload();
      }
    }
  });

  const onDelete = useEvent(async () => {
    if (deleteQuery) {
      await deleteFavoriteQuery(deleteQuery.id);
      setDelete(null);
      service.reload();
    }
  });

  const fs = service.lastValidData;
  if (!fs || !configsService.lastValidData) return null;
  const configs = configsService.lastValidData;
  const configValue = configs.findIndex(
    (c) =>
      config &&
      c.database === config.database &&
      c.host === config.host &&
      c.port === config.port &&
      c.user === config.user,
  );
  const selected = null;

  return (
    <Dialog relativeTo="previousSibling" onBlur={onBlur}>
      <div
        style={{
          width:
            ((document.querySelector('.app-content') as HTMLDivElement)
              .offsetWidth ?? 0) - 80,
          height: 'calc(100vh - 120px)',
          fontFamily: 'system-ui',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 'normal',
        }}
      >
        <h1
          style={{
            fontSize: 25,
            margin: 0,
            lineHeight: '39px',
          }}
        >
          <i className="fa fa-star" style={{ fontSize: 'inherit' }} /> Favorites
          <select
            style={{
              margin: 0,
              float: 'right',
              maxWidth: 300,
            }}
            value={configValue}
            onChange={onConfigsSelectChange}
          >
            <option value="-1" />
            {configs.map((p, i) => (
              <option value={i} key={i}>{`${p.user}@${p.host}${
                p.port !== 5432 ? `:${p.port}` : ''
              }/${p.database}`}</option>
            ))}
          </select>
        </h1>
        <div
          style={{ flex: 1, overflow: 'auto', marginTop: 20, marginBottom: 20 }}
        >
          {fs.length ? (
            <div className="query-selector--favorites">
              {fs.map((q) => (
                <>
                  <div
                    className={`query-selector--query ${selected && selected === `favorite${q.id}` ? ' selected' : ''}`}
                    key={q.id}
                    onClick={() => {
                      onOpen(q);
                    }}
                    onMouseDown={(e) => {
                      onFavoriteMouseDown(e, q);
                    }}
                  >
                    <h1>
                      {q.title ? <div>{q.title}</div> : null}
                      <span>{fDate(new Date(q.created_at))}</span>
                    </h1>
                    <div className="query-selector--sql">{q.sql}</div>
                  </div>

                  {editQuery?.id === q.id ? (
                    <RenameDialog
                      value={q.title}
                      onUpdate={onRename}
                      onCancel={onBlurDialog}
                      relativeTo="previousSibling"
                    />
                  ) : deleteQuery?.id === q.id ? (
                    <Dialog onBlur={onBlurDialog} relativeTo="previousSibling">
                      <div style={{ width: 331 }}>
                        Are you sure you want to delete favorite?
                        <div style={{ textAlign: 'center' }}>
                          <button className="button" onClick={onDelete}>
                            Yes
                          </button>{' '}
                          <button className="button" onClick={onBlurDialog}>
                            No
                          </button>
                        </div>
                      </div>
                    </Dialog>
                  ) : null}
                </>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <button
            className="button"
            onClick={onBlur}
            style={{ fontWeight: 'normal' }}
          >
            Cancel
          </button>
        </div>
      </div>
      {contextMenu ? (
        <div
          className="context-menu"
          tabIndex={0}
          onBlur={onBlurContextMenu}
          ref={autoFocus}
          style={{
            width: 100,
            ...(contextMenu.y + 70 > window.innerHeight
              ? { bottom: window.innerHeight - contextMenu.y }
              : { top: contextMenu.y }),
            ...(contextMenu.x + 100 > window.innerWidth
              ? { right: window.innerWidth - contextMenu.x }
              : { left: contextMenu.x }),
          }}
        >
          <div onClick={onDeleteClick}>
            <i className="fa fa-close" style={{ width: 14 }} /> Delete
          </div>
          <div onClick={onEditClick}>
            <i className="fa fa-pencil" style={{ width: 14 }} /> Edit
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
