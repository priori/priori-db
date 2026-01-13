import React, { useEffect, useRef, useState } from 'react';
import { assert } from 'util/assert';
import { useEvent } from 'util/useEvent';
import { closeTabNow, showError, updateTab } from 'state/actions';
import {
  saveQuery as insertQuery,
  saveFavoriteQuery,
  touchConnectionConfigurationUsage,
  updateFailedQuery,
  updateSuccessQuery,
} from 'util/browserDb/actions';
import { currentState } from 'state/state';
import { useIsMounted } from 'util/hooks';
import { ipcRenderer } from 'electron';
import { grantError } from 'util/errors';
import { readFile, writeFile } from 'fs';
import { verticalResize } from 'util/resize';
import { useEventListener } from 'util/useEventListener';
import { QueryGroupEntryIDB } from 'util/browserDb/entities';
import { useTab } from '../../main/connected/ConnectedApp';
import { EditorHandle } from '../../Editor';
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
  const [favoriteDialogOpen, setOpenFav] = useState(false);
  const [queryDialogOpen, setOpenQueryDialog] = useState(false);
  const [openingQuery, setOpeningQuery] = useState(false);
  const [selectedGroup, setGroup] = useState<{
    queryGroup: QueryGroupEntryIDB;
    page: number;
  } | null>(null);
  const editorRef = useRef<EditorHandle | null>(null);
  const isMounted = useIsMounted();
  const [stdInFile, setStdInFile] = useState<string | null>(null);
  const [stdOutFile, setStdOutFile] = useState<string | null>(null);
  const queryIdRef = useRef<number | null>(null);
  const queryExecutor = useQueryExecutor({
    onSuccess(res) {
      const id = queryIdRef.current;
      if (id)
        updateSuccessQuery(
          id,
          res.time,
          typeof res.length === 'number' ? res.length : null,
        );
      touchConnectionConfigurationUsage(
        currentState().currentConnectionConfiguration,
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
      touchConnectionConfigurationUsage(
        currentState().currentConnectionConfiguration,
      );
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
            currentState().currentConnectionConfiguration!,
          );
      queryExecutor.query(query, {
        stdInFile,
        stdOutFile,
      });
    },
  );

  const execute = useEvent(async () => {
    if (selectedGroup) setGroup(null);
    if (openingQuery) setOpeningQuery(false);
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
    await saveFavoriteQuery(
      sql,
      name,
      editorRef.current.getEditorState(),
      currentState().currentConnectionConfiguration!,
    );
    if (saveDialogOpen) setSaveDialogOpen(false);
    setSaved(true);
  });

  const onQueryOpen = useEvent(
    (editorState: {
      content: string;
      cursorStart: { line: number; ch: number };
      cursorEnd: { line: number; ch: number };
      page: number;
      queryGroup: QueryGroupEntryIDB;
    }) => {
      setOpeningQuery(true);
      editorRef.current?.setEditorState({ ...editorState }, 'push');
      setGroup({
        queryGroup: editorState.queryGroup,
        page: editorState.page,
      });
    },
  );

  const onQuerySelectorSelect = useEvent(
    (
      editorState:
        | {
            content: string;
            cursorStart: { line: number; ch: number };
            cursorEnd: { line: number; ch: number };
            page: number;
            queryGroup: QueryGroupEntryIDB;
          }
        | {
            content: string;
            cursorStart: { line: number; ch: number };
            cursorEnd: { line: number; ch: number };
          },
    ) => {
      if (openingQuery) {
        assert('queryGroup' in editorState);
        editorRef.current?.setEditorState({ ...editorState }, 'replace');
        setGroup({
          queryGroup: editorState.queryGroup,
          page: editorState.page,
        });
        return;
      }
      editorRef.current?.setEditorState({ ...editorState }, 'clear');
      if ('queryGroup' in editorState) {
        setGroup({
          queryGroup: editorState.queryGroup,
          page: editorState.page,
        });
      } else {
        setGroup(null);
      }
    },
  );

  const onEditorChange = useEvent((contentChanged: boolean) => {
    if (saved) {
      setSaved(false);
    }
    if (openingQuery && contentChanged && !selectedGroup) {
      setOpeningQuery(false);
    }
    if (selectedGroup && contentChanged) setGroup(null);
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
    editorRef.current?.blur();
    e.preventDefault();
    e.stopPropagation();
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
      topHeight + 1,
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const upMouseEnter = useEvent(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animating) return;
    const tabsHeaderEl = document.querySelector('.tabs-header');
    if (tabsHeaderEl instanceof HTMLElement) tabsHeaderEl.style.zIndex = '-1';
    setPopup({ right: 0, height: document.documentElement.offsetHeight - 120 });
  });

  const onCodeMouseEnter = useEvent(() => {
    const tabsHeaderEl = document.querySelector('.tabs-header');
    if (tabsHeaderEl instanceof HTMLElement) tabsHeaderEl.style.zIndex = '-1';
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
      const tabsHeaderEl = document.querySelector('.tabs-header');
      if (tabsHeaderEl instanceof HTMLElement) tabsHeaderEl.style.zIndex = '';
      setPopup(null);
    }, 10);
  });

  useEventListener(window, 'resize', () => {
    const tabsHeaderEl = document.querySelector('.tabs-header');
    if (tabsHeaderEl instanceof HTMLElement) tabsHeaderEl.style.zIndex = '';
    setPopup(null);
  });

  const { fetchMoreRows } = queryExecutor;

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

  const onOpenFavorite = useEvent(
    (f: {
      id: number;
      sql: string;
      title: string;
      created_at: number;
      editor_content: string;
      editor_cursor_start_line: number;
      editor_cursor_end_line: number;
      editor_cursor_start_char: number;
      editor_cursor_end_char: number;
    }) => {
      editorRef.current?.setEditorState(
        {
          content: f.editor_content,
          cursorStart: {
            line: f.editor_cursor_start_line,
            ch: f.editor_cursor_start_char,
          },
          cursorEnd: {
            line: f.editor_cursor_end_line,
            ch: f.editor_cursor_end_char,
          },
        },
        'push',
      );
      setOpenFav(false);
    },
  );
  const onOpenRecentQueryClick = useEvent(() => setOpenQueryDialog(true));
  const onFavoriteDialogBlur = useEvent(() => setOpenFav(false));
  const onOpenFavoriteClick = useEvent(() => setOpenFav(true));
  const onOpenRecentDialogBlur = useEvent(() => setOpenQueryDialog(false));

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
    selectedGroup,
    favoriteDialogOpen,
    queryDialogOpen,
    setOpenQueryDialog,
    onOpenFavorite,
    onQueryOpen,
    onOpenRecentQueryClick,
    onOpenFavoriteClick,
    onFavoriteDialogBlur,
    onOpenRecentDialogBlur,
  };
}
