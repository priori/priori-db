import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import { assert } from 'util/assert';
import { useEvent } from 'util/useEvent';
import { FieldDef, QueryArrayResult } from 'pg';
import { closeTabNow, showError, updateTab } from 'state/actions';
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
import { ipcRenderer } from 'electron';
import { grantError } from 'util/errors';
import { createReadStream, createWriteStream, readFile, writeFile } from 'fs';
import { pipeline } from 'node:stream/promises';
import { verticalResize } from 'util/resize';
import { useEventListener } from 'util/useEventListener';
import { SimpleValue } from 'db/Connection';
import { useTab } from '../../main/connected/ConnectedApp';
import { Editor } from '../../Editor';
import { useExclusiveConnection } from '../../../db/ExclusiveConnection';

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
        rowCount: number | null;
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
export function useQueryFrame({ uid }: { uid: number }) {
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
      updateTab(
        uid,
        'running',
        query.trim().replace(/\s+/g, ' ').substring(0, 100),
      );

      setState((state2) => ({
        ...state2,
        running: true,
        resetNotices: true,
      }));
      const tabTitle = currentState().tabs.find(
        (t) => t.props.uid === uid,
      )?.title;
      const id = !saveQuery
        ? undefined
        : await insertQuery(
            query,
            uid,
            saveQuery,
            tabTitle === 'New Query' ? null : tabTitle || null,
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

        updateTab(uid, 'success');

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
        updateTab(uid, 'error');
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

  const onQuerySelectorSelect = useEvent(
    (editorState: {
      content: string;
      cursorStart: { line: number; ch: number };
      cursorEnd: { line: number; ch: number };
    }) => {
      editorRef.current?.setEditorState({ ...editorState });
    },
  );

  const onDialogBlur = useEvent(() => setSaveDialogOpen(false));

  return {
    fetchMoreRows,
    popup: popup as { right: number; height: number } | false,
    onPopupMouseEnter,
    onCancelKeyDown,
    onPopupMouseLeave,
    onCodeMouseEnter,
    upMouseEnter,
    upButtonClick,
    onResizeHelperMouseDown,
    topHeight,
    running,
    hasPid,
    execute,
    editorRef,
    state,
    removeNotice,
    onOpenNewConnectionClick,
    onRollbackClick,
    fullViewNotice,
    onFavoriteSave,
    onEditorChange,
    onStdOutFileClick,
    onStdInFileClick,
    onSaveSqlQueryToFileClick,
    onOpenSqlQueryFileClick,
    closeConfirm,
    closeConfirm2,
    yesClick,
    noClick,
    saveDialogOpen,
    openDialogOpen,
    cancel,
    animating,
    saved,
    stdInFile,
    stdOutFile,
    onQuerySelectorSelect,
    onDialogBlur,
  };
}
