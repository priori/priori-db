import { MutableRefObject, useRef, useState } from 'react';
import { NoticeMessage } from 'pg-protocol/dist/messages';
import assert from 'assert';
import { useEvent } from 'util/useEvent';
import { QueryArrayResult } from 'pg';
import { useTab } from '../main/App';
import { Editor } from '../Editor';
import { Grid } from '../Grid';
import { useExclusiveConnection } from '../../db/ExclusiveConnection';

interface QFNoticeMessage extends NoticeMessage {
  fullView?: boolean | undefined;
}
interface QueryFrameState {
  running: boolean;
  notices: QFNoticeMessage[];
  resetNotices: boolean;
  res: QueryArrayResult | null;
  time: null | number;
  error: {
    code: string;
    line: number;
    position: number;
    message: string;
  } | null;
}

function Notices({
  notices,
  onRemoveNotice,
  onFullViewNotice,
}: {
  notices: QFNoticeMessage[];
  onRemoveNotice: (n: NoticeMessage) => void;
  onFullViewNotice: (n: NoticeMessage) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="notices">
      {notices.map((n, i) => (
        <div className={`notice${n.fullView ? ' full-view' : ''}`} key={i}>
          <span className="notice-type">{n.name}</span>
          <span className="notice-message">{n.message}</span>
          {n.fullView ? (
            <div className="notice-details">
              <span>Line: {n.line}</span> <span>File: {n.file}</span>{' '}
              <span>Code: {n.code}</span> <span>Severity: {n.severity}</span>{' '}
              <span>Routine: {n.routine}</span>
            </div>
          ) : null}
          <i
            className="fa fa-close"
            tabIndex={0}
            role="button"
            aria-label="Close notice"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                onRemoveNotice(n);
            }}
            onClick={() => onRemoveNotice(n)}
          />
          <i
            className="fa fa-eye"
            tabIndex={0}
            role="button"
            aria-label="View notice"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                onFullViewNotice(n);
            }}
            onClick={() => onFullViewNotice(n)}
          />
        </div>
      ))}
    </div>
  );
}

export function QueryFrame() {
  const editorRef: MutableRefObject<Editor | null> = useRef(null);

  const [state, setState] = useState({
    running: false,
    notices: [] as NoticeMessage[],
    resetNotices: false,
    res: null,
    time: null,
    error: null,
  } as QueryFrameState);

  const db = useExclusiveConnection((notice: NoticeMessage) => {
    setState({
      ...state,
      resetNotices: false,
      notices: state.resetNotices ? [notice] : [...state.notices, notice],
    });
  });

  const execute = useEvent(async () => {
    if (state.running) return;
    const editor = editorRef.current;
    assert(editor);
    const query = editor.getQuery();
    const start = new Date().getTime();
    setState({ ...state, running: true, resetNotices: true });
    try {
      const res = await db.query(query, [], true);
      setState({
        ...state,
        running: false,
        res,
        notices:
          (res && res.fields && res.fields.length) || state.resetNotices
            ? []
            : state.notices,
        resetNotices: false,
        time: new Date().getTime() - start,
        error: null,
      });
    } catch (err: unknown) {
      setState({
        running: false,
        notices: state.resetNotices ? [] : state.notices,
        resetNotices: false,
        error: err as {
          code: string;
          line: number;
          position: number;
          message: string;
        },
        time: null,
        res: null,
      });
    }
  });

  useTab({
    f5() {
      execute();
    },
    onActivate() {
      const editor = editorRef.current;
      assert(editor);
      editor.show();
    },
    onDeactivate() {
      const editor = editorRef.current;
      assert(editor);
      editor.hide();
    },
    onClose() {
      if (state.running) {
        if (window.confirm('A query is running. Do you wish to cancel it?'))
          return true;
        return false;
      }
      return true;
    },
  });

  function cancel() {
    db.stopRunningQuery();
  }

  function removeNotice(n: NoticeMessage) {
    setState({
      ...state,
      notices: state.notices.filter((n2) => n2 !== n),
    });
  }

  function fullViewNotice(n: NoticeMessage) {
    setState({
      ...state,
      notices: state.notices.map((n2) =>
        n2 === n ? { ...n2, message: n2.message, fullView: !n2.fullView } : n2
      ),
    });
  }

  return (
    <>
      <Editor ref={editorRef} style={{ height: '300px' }} />
      {state.res && state.res.fields && state.res.fields.length ? (
        <span className="mensagem">
          Query returned {state.res.rows.length} row
          {state.res.rows.length > 1 ? 's' : ''}, {state.time} ms execution
          time.
        </span>
      ) : undefined}
      {/* <span className="mensagem error"></span> */}
      {state.running ? (
        <button type="button" style={{ opacity: 0.5 }} disabled>
          Execute
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            execute();
          }}
        >
          Execute
        </button>
      )}

      {state.running ? (
        <i className="fa fa-circle-o-notch fa-spin fa-3x fa-fw" />
      ) : null}
      {state.running ? (
        <div className="running">
          <span
            onClick={() => {
              cancel();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter')
                cancel();
            }}
          >
            Cancel execution
          </span>
        </div>
      ) : null}
      {state.error ? (
        <div
          style={{
            fontSize: '20px',
            padding: '10px 0 0 15px',
            color: '#d11',
            lineHeight: '1.5em',
          }}
        >
          #{state.error.code} {state.error.message}
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
              onFullViewNotice={(n) => fullViewNotice(n)}
              onRemoveNotice={(n) => removeNotice(n)}
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
      ) : (
        <div className="not-grid-result">
          <Notices
            notices={state.notices}
            onFullViewNotice={(n) => fullViewNotice(n)}
            onRemoveNotice={(n) => removeNotice(n)}
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
      )}
    </>
  );
}
