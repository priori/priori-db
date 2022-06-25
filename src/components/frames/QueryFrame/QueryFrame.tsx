import React, { MutableRefObject, useRef, useState } from 'react';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import assert from 'assert';
import { useEvent } from 'util/useEvent';
import { QueryArrayResult } from 'pg';
import { closeTabNow } from 'state/actions';
import { DB } from 'db/DB';
import {
  saveQuery as insertQuery,
  updateFailedQuery,
  updateQuery,
} from 'util/browserDb';
import { currentState } from 'state/state';
import { useIsMounted } from 'util/hooks';
import { QuerySelector } from './QuerySelector';
import { useTab } from '../../main/connected/ConnectedApp';
import { Editor } from '../../Editor';
import { Grid } from '../../Grid';
import { useExclusiveConnection } from '../../../db/ExclusiveConnection';
import { Notices } from './Notices';

interface QFNoticeMessage extends NoticeMessage {
  fullView?: boolean | undefined;
}

interface QueryFrameState {
  running: boolean;
  openTransaction: boolean;
  notices: QFNoticeMessage[];
  resetNotices: boolean;
  res: QueryArrayResult | null;
  time: null | number;
  clientPid: number | null;
  clientError: Error | null;
  error: {
    code: string;
    line: number;
    position: number;
    message: string;
  } | null;
  freshTab: boolean;
}

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
    (clientError) => setState((state2) => ({ ...state2, clientError }))
  );

  const isMounted = useIsMounted();

  const executeQuery = useEvent(
    async (query: string, id: number | undefined = undefined) => {
      const start = new Date().getTime();
      try {
        const res = await db.query(query, [], true);
        const time = new Date().getTime() - start;
        const resLength = res?.rows?.length as number | undefined;
        if (id)
          updateQuery(
            id,
            time,
            typeof resLength === 'number' ? resLength : null
          );
        const openTransaction = !db.pid
          ? false
          : await DB.inOpenTransaction(db.pid);
        if (isMounted())
          setState((state2) => ({
            ...state2,
            running: false,
            clientPid: db.pid || null,
            openTransaction,
            res,
            notices:
              (res && res.fields && res.fields.length) || state2.resetNotices
                ? []
                : state2.notices,
            resetNotices: false,
            time,
            error: null,
          }));
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
            freshTab: false,
            clientError: state2.clientError,
            time: null,
            res: null,
          }));
      }
    }
  );

  const execute = useEvent(async () => {
    if (state.running) return;
    const editor = editorRef.current;
    assert(editor);
    const query = editor.getQuery();
    setState((state2) => ({ ...state2, running: true, resetNotices: true }));
    const title = currentState().tabs.find((t) => t.props.uid === uid)?.title;
    const id = await insertQuery(
      query,
      uid,
      editor.getEditorState(),
      title === 'New Query' ? null : title || null
    );
    await executeQuery(query, id);
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

  useTab({
    f5() {
      execute();
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
        n2 === n ? { ...n2, message: n2.message, fullView: !n2.fullView } : n2
      ),
    }));
  });

  return (
    <>
      {closeConfirm || closeConfirm2 ? (
        <div
          className="dialog"
          tabIndex={0}
          ref={(el) => {
            if (el) el.focus();
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
              (e.currentTarget as HTMLDivElement).blur();
            }
          }}
          onBlur={(e) => {
            const dialogEl = e.currentTarget;
            setTimeout(() => {
              if (dialogEl.contains(document.activeElement)) return;
              noClick();
            }, 1);
          }}
        >
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
        </div>
      ) : null}

      <Editor ref={editorRef} style={{ height: '300px' }} />

      {state.clientError ? (
        <span className="client-error">
          {state.clientError.message} <i className="fa fa-unlink" />
        </span>
      ) : null}

      {state.res && state.res.fields && state.res.fields.length ? (
        <span className="mensagem">
          Query returned {state.res.rows.length} row
          {state.res.rows.length > 1 ? 's' : ''}, {state.time} ms execution
          time.
        </span>
      ) : undefined}
      {/* <span className="mensagem error"></span> */}
      {state.running ? (
        <button type="button" disabled className="query-tab--execute">
          Execute <i className="fa fa-check" />
        </button>
      ) : (
        <button type="button" onClick={execute} className="query-tab--execute">
          Execute <i className="fa fa-check" />
        </button>
      )}

      {state.running ? (
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

      {state.clientPid ? (
        <div className={`pid${state.running ? ' pid--running' : ''}`}>
          {state.clientPid} <i className="fa fa-link" />
        </div>
      ) : null}

      {state.error ? (
        <div className="error">
          {state.error.code ? `#${state.error.code}` : ''} {state.error.message}{' '}
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
            <Grid
              style={{
                position: 'absolute',
                top: '300px',
                left: 0,
                bottom: 0,
                right: 0,
              }}
              result={state.res}
            />
          </div>
        ) : (
          <Grid
            style={{
              position: 'absolute',
              top: '300px',
              left: 0,
              bottom: 0,
              right: 0,
            }}
            result={state.res}
          />
        )
      ) : state.res || state.notices?.length ? (
        <div className="not-grid-result">
          <Notices
            notices={state.notices}
            onFullViewNotice={fullViewNotice}
            onRemoveNotice={removeNotice}
          />
          {state.res && state.res.rowCount ? (
            <div
              style={{
                fontSize: '20px',
                padding: '10px 0 0 15px',
                lineHeight: '1.5em',
              }}
            >
              Query returned successfully: {state.res.rowCount} row affected,{' '}
              {state.time} ms execution time.
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
          onSelect={(editorState) =>
            editorRef.current?.setEditorState({ ...editorState })
          }
        />
      ) : null}
    </>
  );
}
