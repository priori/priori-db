import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { assert } from 'util/assert';
import { useEvent } from 'util/useEvent';
import { closeTabNow, showError, updateTab } from 'state/actions';
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
import { readFile, writeFile } from 'fs';
import { verticalResize } from 'util/resize';
import { useEventListener } from 'util/useEventListener';
import { useTab } from '../../main/connected/ConnectedApp';
import { Editor } from '../../Editor';
import {
  QueryExecutorNoticeMessage,
  useQueryExecutor,
} from './useQueryExecutor';

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
  const isMounted = useIsMounted();
  const [stdInFile, setStdInFile] = useState<string | null>(null);
  const [stdOutFile, setStdOutFile] = useState<string | null>(null);
  const queryIdRef = useRef<number | null>(null);
  const queryExecutor = useQueryExecutor({
    onSuccess(res) {
      const id = queryIdRef.current;
      if (id)
        updateQuery(
          id,
          res.time,
          typeof res.length === 'number' ? res.length : null,
        );
      updateTab(uid, 'success');
      if (isMounted()) {
        if (res?.stdOutMode) setStdOutFile(null);
        if (res?.stdInMode) setStdInFile(null);
      }
    },
    onError(_, time) {
      const id = queryIdRef.current;
      updateTab(uid, 'error');
      if (id) updateFailedQuery(id, time);
    },
  });

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
        query.trim().replace(/\s+/g, ' ').substring(0, 100) || undefined,
      );
      const tabTitle = currentState().tabs.find(
        (t) => t.props.uid === uid,
      )?.title;
      queryIdRef.current = !saveQuery
        ? null
        : await insertQuery(
            query,
            uid,
            saveQuery,
            tabTitle === 'New Query' ? null : tabTitle || null,
          );
      queryExecutor.query(query, {
        stdInFile,
        stdOutFile,
      });
    },
  );

  const execute = useEvent(async () => {
    if (queryExecutor.running) return;
    const editor = editorRef.current;
    assert(editor);
    const query = editor.getQuery();
    await executeQuery(query, editor.getEditorState());
  });

  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closeConfirm2, setCloseConfirm2] = useState(false);

  const yesClick = useEvent(async () => {
    await queryExecutor.stopRunningQuery();
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
      if (queryExecutor.running) {
        setCloseConfirm(true);
        return false;
      }
      if (queryExecutor.openTransaction) {
        setCloseConfirm2(true);
        return false;
      }
      return true;
    },
  });

  const cancel = useEvent(() => {
    queryExecutor.stopRunningQuery();
  });

  const onCancelKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') cancel();
  });

  const onRemoveNotice = useEvent((n: QueryExecutorNoticeMessage) => {
    queryExecutor.removeNotice(n);
  });

  const onOpenNewConnectionClick = useEvent(() => {
    queryExecutor.openNewConnection();
  });

  const onRollbackClick = useEvent(() => {
    executeQuery('ROLLBACK');
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

  const running = useDelayTrue(queryExecutor.running, 200);
  const hasPid = useDelayTrue(!!queryExecutor.pid, 200);

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

  const { fetchMoreRows } = queryExecutor;

  const onQuerySelectorSelect = useEvent(
    (editorState: {
      content: string;
      cursorStart: { line: number; ch: number };
      cursorEnd: { line: number; ch: number };
    }) => {
      editorRef.current?.setEditorState({ ...editorState });
    },
  );

  const onDialogBlur = useEvent(() => {
    if (saveDialogOpen) setSaveDialogOpen(false);
    else if (openDialogOpen) setOpenDialogOpen(false);
  });

  const {
    time,
    isFresh,
    result: res,
    connectionError,
    pid,
    error,
    notices,
  } = queryExecutor;

  const onOpenNotice = useEvent((n: QueryExecutorNoticeMessage) => {
    queryExecutor.openNotice(n);
  });

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
    onRemoveNotice,
    onOpenNewConnectionClick,
    onRollbackClick,
    onOpenNotice,
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
    running0: queryExecutor.running,
    time,
    isFresh,
    res,
    connectionError,
    pid,
    error,
    notices,
  };
}
