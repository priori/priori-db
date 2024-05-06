import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { assert } from 'util/assert';
import { useEvent } from 'util/useEvent';
import { FieldDef, QueryArrayResult } from 'pg';
import { closeTabNow, showError } from 'state/actions';
import { DB } from 'db/DB';
import { CopyStreamQuery, CopyToStreamQuery, from, to } from 'pg-copy-streams';
import {
  saveQuery as insertQuery,
  saveFavoriteQuery,
  updateFailedQuery,
  updateQuery,
} from 'util/browserDb';
import { currentState } from 'state/state';
import { useIsMounted } from 'util/hooks';
import { Dialog } from 'components/util/Dialog/Dialog';
import { ipcRenderer } from 'electron';
import { grantError } from 'util/errors';
import { createReadStream, createWriteStream, readFile, writeFile } from 'fs';
import { pipeline } from 'node:stream/promises';
import { verticalResize } from 'util/resize';
import { useEventListener } from 'util/useEventListener';
import { SimpleValue } from 'db/Connection';
import { QuerySelector } from './QuerySelector';
import { useTab } from '../../main/connected/ConnectedApp';
import { Editor } from '../../Editor';
import { DataGrid } from '../../util/DataGrid/DataGrid';
import { useExclusiveConnection } from '../../../db/ExclusiveConnection';
import { Notices } from './Notices';
import { FavoriteControl } from './FavoriteControl';

function temToStdOut(query: string) {
  return (
    !!query.match(/^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/^([^']|'([^']|'')*')*to\s+stdout/gim)
  );
}
function temFromStdIn(query: string) {
  return (
    !!query.match(/^([^']|'([^']|'')*')*COPY\s+/gim) &&
    !!query.match(/^([^']|'([^']|'')*')*from\s+stdin/gim)
  );
}

interface QFNoticeMessage extends NoticeMessage {
  fullView?: boolean | undefined;
}

interface QueryFrameState {
  running: boolean;
  openTransaction: boolean;
  notices: QFNoticeMessage[];
  resetNotices: boolean;
  res:
    | {
        rows: SimpleValue[][];
        fields: FieldDef[];
        rowCount: number;
        fetchMoreRows?: () => Promise<{
          rows: SimpleValue[][];
          fields: FieldDef[];
          rowCount: number;
        }>;
      }
    | (CopyToStreamQuery & { fields: undefined })
    | (CopyStreamQuery & { fields: undefined })
    | null;
  time: null | number;
  clientPid: number | null;
  clientError: Error | null;
  stdoutResult: null | string;
  error: {
    code: string;
    line: number;
    position: number;
    message: string;
  } | null;
  freshTab: boolean;
}

function useDelayTrue(value: boolean, delay: number) {
  const [state, setState] = useState(value);
  useEffect(() => {
    if (value) {
      const timeout = setTimeout(() => {
        setState(true);
      }, delay);
      return () => {
        clearTimeout(timeout);
      };
    }
    setState(false);
    return undefined;
  }, [value, delay]);
  return state;
}

function useFreshTrue(value: boolean, delay: number) {
  const done = useDelayTrue(value, delay);
  return value && !done;
}

let resizeIndicatorEl: HTMLDivElement | null = null;

export function QueryFrame({ uid }: { uid: number }) {
  const editorRef: MutableRefObject<Editor | null> = useRef(null);

  const [state, setState] = useState({
    running: false,
    notices: [] as NoticeMessage[],
    resetNotices: false,
    clientPid: null,
    clientError: null,
    res: null,
    time: null,
    error: null,
    freshTab: true,
  } as QueryFrameState);

  const [db, restart] = useExclusiveConnection(
    (notice) => {
      setState((state2) => ({
        ...state2,
        resetNotices: false,
        notices: state2.resetNotices ? [notice] : [...state2.notices, notice],
      }));
    },
    (pid) => {
      setState((state2) => ({ ...state2, clientPid: pid }));
    },
    (clientError) => setState((state2) => ({ ...state2, clientError })),
  );

  const isMounted = useIsMounted();

  const [stdInFile, setStdInFile] = useState<string | null>(null);
  const [stdOutFile, setStdOutFile] = useState<string | null>(null);

  const executeQuery = useEvent(
    async (
      query: string,
      saveQuery: null | {
        content: string;
        cursorStart: { line: number; ch: number };
        cursorEnd: { line: number; ch: number };
      } = null,
    ) => {
      setState((state2) => ({ ...state2, running: true, resetNotices: true }));
      const title = currentState().tabs.find((t) => t.props.uid === uid)?.title;
      const id = !saveQuery
        ? undefined
        : await insertQuery(
            query,
            uid,
            saveQuery,
            title === 'New Query' ? null : title || null,
          );
      const start = new Date().getTime();
      try {
        const stdoutMode = stdOutFile && temToStdOut(query);
        const stdInMode = stdInFile && temFromStdIn(query);
        if (stdoutMode && stdInMode)
          throw new Error('Cannot use STDIN and STDOUT at the same time');

        const res = stdoutMode
          ? ((await db.query(to(query))) as unknown as
              | QueryArrayResult
              | (CopyStreamQuery & { fields: undefined })
              | (CopyToStreamQuery & { fields: undefined }))
          : stdInMode
            ? ((await db.query(from(query))) as unknown as
                | QueryArrayResult
                | (CopyStreamQuery & { fields: undefined })
                | (CopyToStreamQuery & { fields: undefined }))
            : await db.query(query, []);

        if (stdoutMode)
          await pipeline(
            res as CopyToStreamQuery,
            createWriteStream(stdOutFile),
          );
        if (stdInMode) {
          const stream = res as CopyStreamQuery;
          const fileStream = createReadStream(stdInFile);
          fileStream.pipe(stream);
          await new Promise((resolve, reject) => {
            fileStream.on('error', reject);
            stream.on('error', reject);
            stream.on('finish', resolve);
          });
        }

        const time = new Date().getTime() - start;
        const resLength = !('rows' in res)
          ? undefined
          : ((res as unknown as QueryArrayResult)?.rows?.length as
              | number
              | undefined);
        if (id)
          updateQuery(
            id,
            time,
            typeof resLength === 'number' ? resLength : null,
          );
        const openTransaction = !db.pid
          ? false
          : await DB.inOpenTransaction(db.pid);
        if (isMounted()) {
          if (stdoutMode) setStdOutFile(null);
          if (stdInMode) setStdInFile(null);
          setState((state2) => ({
            ...state2,
            running: false,
            clientPid: db.pid || null,
            openTransaction,
            res,
            stdoutResult: stdoutMode ? stdOutFile : null,
            notices:
              (res as { fields?: { length?: number } })?.fields?.length ||
              state2.resetNotices
                ? []
                : state2.notices,
            resetNotices: false,
            time,
            error: null,
          }));
        }
      } catch (err: unknown) {
        const time = new Date().getTime() - start;
        if (id) updateFailedQuery(id, time);
        if (isMounted())
          setState((state2) => ({
            clientPid: state2.clientPid,
            running: false,
            openTransaction: false,
            notices: state2.resetNotices ? [] : state2.notices,
            resetNotices: false,
            error: err as {
              code: string;
              line: number;
              position: number;
              message: string;
            },
            stdoutResult: null,
            freshTab: false,
            clientError: state2.clientError,
            time: null,
            res: null,
          }));
      }
    },
  );

  const execute = useEvent(async () => {
    if (state.running) return;
    const editor = editorRef.current;
    assert(editor);
    const query = editor.getQuery();
    await executeQuery(query, editor.getEditorState());
  });

  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closeConfirm2, setCloseConfirm2] = useState(false);

  const yesClick = useEvent(async () => {
    await db.stopRunningQuery();
    closeTabNow(uid);
  });

  const noClick = useEvent(() => {
    setCloseConfirm(false);
    setCloseConfirm2(false);
  });

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  useTab({
    f5() {
      execute();
    },
    open() {
      setOpenDialogOpen(true);
    },
    save() {
      setSaveDialogOpen(true);
    },
    onClose() {
      if (state.running) {
        setCloseConfirm(true);
        return false;
      }
      if (state.openTransaction) {
        setCloseConfirm2(true);
        return false;
      }
      return true;
    },
  });

  const cancel = useEvent(() => {
    db.stopRunningQuery();
  });

  const onCancelKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') cancel();
  });

  const removeNotice = useEvent((n: NoticeMessage) => {
    setState((state2) => ({
      ...state2,
      notices: state2.notices.filter((n2) => n2 !== n),
    }));
  });

  const onOpenNewConnectionClick = useEvent(() => {
    setState({
      running: false,
      notices: [] as NoticeMessage[],
      resetNotices: false,
      clientPid: null,
      clientError: null,
      res: null,
      time: null,
      error: null,
      freshTab: false,
    } as QueryFrameState);
    restart();
  });

  const onRollbackClick = useEvent(() => {
    executeQuery('ROLLBACK');
  });

  const fullViewNotice = useEvent((n: NoticeMessage) => {
    setState((state2) => ({
      ...state2,
      notices: state2.notices.map((n2) =>
        n2 === n ? { ...n2, message: n2.message, fullView: !n2.fullView } : n2,
      ),
    }));
  });

  const [saved, setSaved] = useState(false);

  const onFavoriteSave = useEvent(async (name: string) => {
    if (!editorRef.current || !name) return;
    const sql = editorRef.current.getQuery();
    if (!sql) return;
    await saveFavoriteQuery(sql, name, editorRef.current.getEditorState());
    setSaved(true);
  });

  const onEditorChange = useEvent(() => {
    if (saved) setSaved(false);
  });

  const onStdOutFileClick = useEvent(async () => {
    const f = await ipcRenderer.invoke('dialog:saveAny');
    if (f) {
      setStdOutFile(f);
      setSaveDialogOpen(false);
    }
  });

  const onStdInFileClick = useEvent(async () => {
    const f = await ipcRenderer.invoke('dialog:openAny');
    if (f) {
      setStdInFile(f);
      setOpenDialogOpen(false);
    }
  });

  const onSaveSqlQueryToFileClick = useEvent(async () => {
    const f = await ipcRenderer.invoke('dialog:saveSql');
    if (f)
      writeFile(f, editorRef.current?.getQuery() || '', (err: unknown) => {
        if (err) showError(grantError(err));
        setSaveDialogOpen(false);
      });
  });

  const onOpenSqlQueryFileClick = useEvent(async () => {
    const f = await ipcRenderer.invoke('dialog:openSql');
    if (f)
      readFile(f, (err, data) => {
        if (err) showError(grantError(err));
        else {
          editorRef.current?.setQueryValue(data.toString());
        }
        setOpenDialogOpen(false);
      });
  });

  const running = useDelayTrue(state.running, 200);
  const hasPid = useDelayTrue(!!state.clientPid, 200);

  const [topHeightState, setTopHeightState] = useState(300);
  const topHeight = topHeightState;
  const onResizeHelperMouseDown = useEvent(async (e: React.MouseEvent) => {
    assert(e.target instanceof HTMLElement);
    if (document.activeElement instanceof HTMLElement) {
      const el = document.activeElement;
      el.blur();
    }
    if (
      editorRef.current &&
      editorRef.current.editor &&
      editorRef.current.editor.getInputField()
    ) {
      editorRef.current.editor.getInputField().blur();
      e.preventDefault();
      e.stopPropagation();
    }
    const el = e.target.closest('.frame.query-tab');
    assert(el instanceof HTMLElement);
    const maxHeight = el.offsetHeight - 60;
    const minHeight1 = 155;
    const minHeight2 = 40;
    const inc2 = await verticalResize(
      e,
      (inc) => {
        if (!resizeIndicatorEl) {
          resizeIndicatorEl = document.querySelector('.resize--indicator');
        }
        assert(resizeIndicatorEl);
        resizeIndicatorEl.style.opacity =
          topHeight + inc < minHeight1 && topHeight + inc > minHeight2
            ? '0.03'
            : '';
        setTopHeightState(
          topHeight + inc < minHeight1
            ? minHeight2
            : topHeight + inc > maxHeight
              ? maxHeight
              : topHeight + inc,
        );
        if (topHeight + inc < minHeight2) return minHeight2 - topHeight;
        if (topHeight + inc > maxHeight) return maxHeight - topHeight;
        return true;
      },
      el,
      topHeight,
    );
    resizeIndicatorEl = null;

    if (inc2 === undefined) {
      setTopHeightState(topHeight);
    } else {
      setTopHeightState(
        topHeight + inc2 < minHeight1
          ? minHeight2
          : topHeight + inc2 > maxHeight
            ? maxHeight
            : topHeight + inc2,
      );
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 1);
  });

  const upButtonClick = useEvent(() => {
    setTopHeightState((s) => (s === 40 ? 300 : 40));
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 1);
  });

  const animating = useFreshTrue(topHeight === 40, 300);
  const [popupState, setPopup] = useState<null | {
    right: number;
    height: number;
  }>(null);
  const popup = topHeight === 40 && !animating ? popupState : false;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const upMouseEnter = useEvent(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animating) return;
    setPopup({ right: 0, height: document.documentElement.offsetHeight - 120 });
  });
  const onCodeMouseEnter = useEvent(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animating) return;
    setPopup({
      right: 80,
      height: document.documentElement.offsetHeight - 120,
    });
  });
  const onPopupMouseEnter = useEvent(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  });
  const onPopupMouseLeave = useEvent(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animating) return;
    timeoutRef.current = setTimeout(() => {
      setPopup(null);
    }, 10);
  });

  useEventListener(window, 'resize', () => {
    setPopup(null);
  });

  const fetching = useRef(false);
  const fetchMoreRows0 = useEvent(async () => {
    if (
      !state.res ||
      !('fetchMoreRows' in state.res && state.res.fetchMoreRows) ||
      fetching.current
    )
      return;
    fetching.current = true;
    const res2 = await state.res.fetchMoreRows();
    fetching.current = false;
    setState((state2) => ({
      ...state2,
      res: res2,
      time: null,
    }));
  });
  const fetchMoreRows =
    state.res && 'fetchMoreRows' in state.res && state.res.fetchMoreRows
      ? fetchMoreRows0
      : undefined;

  return (
    <>
      <div
        className={`query-frame--top-area${
          topHeight === 40 && animating
            ? ' query-frame--animating-top-height'
            : ''
        }${topHeight === 40 ? ' query-frame--closed' : ' query-frame--open'}`}
        style={{
          height: topHeight,
        }}
      >
        {topHeight === 40 ? (
          <div
            style={{
              zIndex: 7,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              animation: 'show 0.3s forwards',
            }}
          >
            {hasPid ||
            (state.res && state.res.fields && state.res.fields.length) ? (
              <span
                className="query-frame--mensagem2"
                style={popup ? { opacity: 0.3 } : undefined}
              >
                {hasPid ? (
                  <div style={{ marginBottom: 3 }}>
                    <span className="pid2">
                      {state.clientPid} <i className="fa fa-link" />
                    </span>
                  </div>
                ) : null}
                {state.res && state.res.fields && state.res.fields.length ? (
                  state.res.fetchMoreRows ? (
                    <>
                      {state.res.rows.length} row
                      {state.res.rows.length > 1 ? 's' : ''} fetched
                      {state.time === null ? undefined : (
                        <>, {state.time} ms execution time</>
                      )}
                      .
                    </>
                  ) : (
                    <>
                      Query returned {state.res.rows.length} row
                      {state.res.rows.length > 1 ? 's' : ''}
                      {state.time === null ? undefined : (
                        <>, {state.time} ms execution time</>
                      )}
                    </>
                  )
                ) : (
                  <br />
                )}
              </span>
            ) : undefined}

            <button
              className="query-frame--apply2"
              onClick={execute}
              type="button"
              style={
                running || popup
                  ? {
                      cursor: 'default',
                      opacity: 0.33,
                    }
                  : undefined
              }
            >
              {running ? (
                <i
                  style={{ width: 21 }}
                  className="fa fa-circle-o-notch fa-spin fa-fw"
                />
              ) : (
                <i className="fa fa-play" />
              )}
            </button>
          </div>
        ) : null}

        <div
          onMouseEnter={popup ? onPopupMouseEnter : undefined}
          onMouseLeave={popup ? onPopupMouseLeave : undefined}
          className={
            popup ? 'query-frame--popup' : 'query-frame--code-editor-area'
          }
          style={
            popup
              ? {
                  left: 120 - popup.right,
                  right: popup.right,
                  height: popup.height,
                }
              : {
                  overflow: topHeight === 40 ? 'hidden' : undefined,
                }
          }
        >
          <FavoriteControl
            onSave={onFavoriteSave}
            className={[
              ...(running ? ['favorite--running'] : []),
              ...(hasPid ? ['favorite--has-pid'] : []),
            ].join(' ')}
            saved={saved}
          />
          {closeConfirm || closeConfirm2 ? (
            <Dialog relativeTo="nextSibling" onBlur={noClick}>
              {closeConfirm2
                ? 'Idle connection in transacion.'
                : 'A query is running.'}{' '}
              Do you wish to cancel it?
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
          <Editor
            ref={editorRef}
            onChange={onEditorChange}
            height={popup ? popup.height : topHeight}
          />
          {saveDialogOpen ? (
            <Dialog
              relativeTo="previousSibling"
              onBlur={() => setSaveDialogOpen(false)}
            >
              <button
                onClick={onSaveSqlQueryToFileClick}
                className="query-tab--save-sql"
                type="button"
              >
                Save SQL query to a file (.sql)
              </button>
              <button
                className="query-tab--save-stdout"
                type="button"
                onClick={onStdOutFileClick}
              >
                Export query response to a file (PostgreSQL STDOUT)
              </button>
            </Dialog>
          ) : null}

          {openDialogOpen ? (
            <Dialog
              relativeTo="previousSibling"
              onBlur={() => setOpenDialogOpen(false)}
            >
              <button
                type="button"
                className="query-tab--save-sql"
                onClick={onOpenSqlQueryFileClick}
              >
                Open SQL query from a file (.sql)
              </button>
              <button
                type="button"
                className="query-tab--save-stdout"
                onClick={onStdInFileClick}
              >
                Import data from a file (PostgreSQL STDIN)
              </button>
            </Dialog>
          ) : null}

          {state.clientError ? (
            <span className="client-error">
              {state.clientError.message} <i className="fa fa-unlink" />
            </span>
          ) : null}

          {state.res && state.res.fields && state.res.fields.length ? (
            <span className="mensagem">
              {state.res.fetchMoreRows ? (
                <>
                  {state.res.rows.length} row
                  {state.res.rows.length > 1 ? 's' : ''} fetched
                </>
              ) : (
                <>
                  Query returned {state.res.rows.length} row
                  {state.res.rows.length > 1 ? 's' : ''}
                </>
              )}
              {state.time === null ? undefined : (
                <>, {state.time} ms execution time</>
              )}
              .
            </span>
          ) : undefined}

          {/* <span className="mensagem error"></span> */}

          {stdOutFile ? (
            <button
              type="button"
              className="query-tab--stdout"
              style={{ marginTop: -86 }}
              title={stdOutFile}
            >
              STDOUT <i className="fa fa-file-o" />
            </button>
          ) : null}

          {stdInFile ? (
            <button
              type="button"
              style={{ marginTop: -120 }}
              className="query-tab--stdout"
              title={stdInFile}
            >
              STDIN <i className="fa fa-file-o" />
            </button>
          ) : null}

          {state.running ? (
            <button type="button" disabled className="query-tab--execute">
              Execute <i className="fa fa-play" />
            </button>
          ) : (
            <button
              type="button"
              onClick={execute}
              className="query-tab--execute"
              disabled={topHeight === 40 && !popup}
            >
              Execute <i className="fa fa-play" />
            </button>
          )}

          {running ? (
            <div className="running">
              <i className="fa fa-circle-o-notch fa-spin fa-3x fa-fw" />
              <span
                onClick={cancel}
                role="button"
                tabIndex={0}
                onKeyDown={onCancelKeyDown}
              >
                Cancel execution
              </span>
            </div>
          ) : null}

          {hasPid ? (
            <div className={`pid${running ? ' pid--running' : ''}`}>
              {state.clientPid} <i className="fa fa-link" />
            </div>
          ) : null}
        </div>

        {topHeight === 40 ? (
          <button
            className="query-frame--code"
            type="button"
            onMouseEnter={onCodeMouseEnter}
            onMouseLeave={onPopupMouseLeave}
            style={
              popup && popup.right === 80
                ? {
                    zIndex: 11,
                    color: 'black',
                    boxShadow: 'none',
                    background: 'white !important',
                    borderLeft: '1px solid #eee',
                    width: 41,
                  }
                : undefined
            }
          >
            &lt;/&gt;
          </button>
        ) : undefined}

        <button
          type="button"
          className="query-tab--up"
          onMouseEnter={topHeight === 40 ? upMouseEnter : undefined}
          onMouseLeave={topHeight === 40 ? onPopupMouseLeave : undefined}
          style={
            topHeight === 40
              ? {
                  zIndex: 8,
                  borderLeft: '1px solid #eee',
                  borderTop: '1px solid #eee',
                  ...(popup && popup.right === 0
                    ? {
                        zIndex: 11,
                        color: 'black',
                        boxShadow: 'none',
                      }
                    : {}),
                }
              : undefined
          }
          onClick={upButtonClick}
        >
          <i className="fa fa-chevron-up" />
          <i className="fa fa-chevron-down" />
        </button>
      </div>
      <div
        className="query-frame--resize-helper"
        style={{ top: topHeight }}
        onMouseDown={onResizeHelperMouseDown}
      />
      <div className="query-frame--bottom-area">
        {state.error ? (
          <div className="error">
            {state.error.code ? `#${state.error.code}` : ''}{' '}
            {state.error.message}{' '}
            {state.error.code === '25P02' ? (
              <button type="button" onClick={onRollbackClick}>
                Rollback transaction
              </button>
            ) : (state.clientError || state.error) && !state.clientPid ? (
              <button type="button" onClick={onOpenNewConnectionClick}>
                Open new connection
              </button>
            ) : null}
            {typeof state.error.line === 'number' &&
              typeof state.error.position === 'number' && (
                <div>
                  Line: {state.error.line} Character: {state.error.position}
                </div>
              )}
          </div>
        ) : state.res && state.res.fields && state.res.fields.length ? (
          state.notices.length ? (
            <div>
              <Notices
                notices={state.notices}
                onFullViewNotice={fullViewNotice}
                onRemoveNotice={removeNotice}
              />
              <DataGrid
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                }}
                fetchMoreRows={fetchMoreRows}
                result={state.res}
              />
            </div>
          ) : (
            <DataGrid
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
              }}
              fetchMoreRows={fetchMoreRows}
              result={state.res}
            />
          )
        ) : state.res || state.notices?.length ? (
          <div className="not-grid-result" style={{ top: 0 }}>
            <Notices
              notices={state.notices}
              onFullViewNotice={fullViewNotice}
              onRemoveNotice={removeNotice}
            />
            {state.res && 'rowCount' in state.res && state.res.rowCount ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully: {state.res.rowCount} row affected
                {state.time === null ? undefined : (
                  <>, {state.time} ms execution time</>
                )}
                .
                {state.stdoutResult ? (
                  <div style={{ marginTop: '1em' }}>
                    Query result exported to file{' '}
                    <strong style={{ userSelect: 'text' }}>
                      {state.stdoutResult}
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : state.res ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully with no result in {state.time} msec.
              </div>
            ) : undefined}
          </div>
        ) : state.freshTab ? (
          <QuerySelector
            style={{ top: 1 }}
            onSelect={(editorState) => {
              editorRef.current?.setEditorState({ ...editorState });
            }}
          />
        ) : null}
      </div>
    </>
  );
}
