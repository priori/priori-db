import { Dialog } from 'components/util/Dialog/Dialog';
import { QuerySelector } from './QuerySelector';
import { Editor } from '../../Editor';
import { DataGrid } from '../../util/DataGrid/DataGrid';
import { Notices } from './Notices';
import { FavoriteControl } from './FavoriteControl';
import { useQueryFrame } from './useQueryFrame';

export function QueryFrame({ uid }: { uid: number }) {
  const {
    fetchMoreRows,
    popup,
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
    stdInFile,
    stdOutFile,
    saved,
    onQuerySelectorSelect,
    onDialogBlur,
  } = useQueryFrame({ uid });

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
            <Dialog relativeTo="previousSibling" onBlur={onDialogBlur}>
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
            <Dialog relativeTo="previousSibling" onBlur={onDialogBlur}>
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
                Query returned successfully: {state.res.rowCount} row
                {state.res.rowCount <= 1 ? '' : 's'} affected
                {state.time === null ? undefined : (
                  <>, {state.time} ms execution time</>
                )}
                .
                {state.res.stdOutResult ? (
                  <div style={{ marginTop: '1em' }}>
                    Query result exported to file{' '}
                    <strong style={{ userSelect: 'text' }}>
                      {state.res.stdOutResult}
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
          <QuerySelector style={{ top: 1 }} onSelect={onQuerySelectorSelect} />
        ) : null}
      </div>
    </>
  );
}
