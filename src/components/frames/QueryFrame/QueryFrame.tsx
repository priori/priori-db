import { Dialog } from 'components/util/Dialog/Dialog';
import { useRef, useState } from 'react';
import { currentState } from 'state/state';
import { Editor } from '../../Editor';
import { DataGrid } from '../../util/DataGrid/DataGrid';
import { FavoriteControl } from './FavoriteControl';
import { Notices } from './Notices';
import { OpenFavoriteDialog } from './OpenFavoriteDialog';
import { OpenRecentQueryDialog } from './OpenRecentQueryDialog';
import { EditorQuerySelectorGroup, QuerySelector } from './QuerySelector';
import { useQueryFrame } from './useQueryFrame';

function focus(input: HTMLInputElement | HTMLButtonElement | null) {
  if (input) {
    setTimeout(() => {
      input.focus();
    }, 1);
  }
}

function AddToFavoritesDialogButton({
  onEnter,
}: {
  onEnter: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const divRef = useRef<HTMLDivElement>(null);
  if (open) {
    return (
      <div style={{ marginTop: 15, display: 'flex' }} ref={divRef}>
        <input
          type="text"
          style={{ height: 33, marginBottom: 0 }}
          ref={focus}
          onChange={(e) => setValue(e.target.value)}
          value={value}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              onEnter(e.target.value);
            }
          }}
          onBlur={() => {
            if (divRef.current)
              setTimeout(() => {
                if (!divRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 1);
          }}
        />{' '}
        <button
          onBlur={() => {
            if (divRef.current)
              setTimeout(() => {
                if (!divRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 1);
          }}
          style={{
            padding: 0,
            height: 33,
            marginTop: 0,
            marginRight: 0,
            marginBottom: 0,
            width: 70,
          }}
          type="button"
          disabled={!value}
          onClick={() => {
            if (value) {
              onEnter(value);
              setOpen(false);
            }
          }}
        >
          Ok
        </button>
      </div>
    );
  }
  return (
    <button
      className="query-tab--save-stdout"
      type="button"
      onClick={() => {
        setOpen(true);
      }}
    >
      Add SQL query to favorites
    </button>
  );
}

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
    onOpenNewConnectionClick,
    onRollbackClick,
    onOpenNotice,
    onRemoveNotice,
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
    running0,
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
    onOpenFavoriteClick,
    onOpenRecentQueryClick,
    onQueryOpen,
    onOpenFavorite,
    onFavoriteDialogBlur,
    onOpenRecentDialogBlur,
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
              inset: 0,
              background: 'white',
              animation: 'show 0.3s forwards',
            }}
          >
            {hasPid || (res && res.fields && res.fields.length) ? (
              <span
                className="query-frame--mensagem2"
                style={popup ? { opacity: 0.3 } : undefined}
              >
                {hasPid ? (
                  <div style={{ marginBottom: 3 }}>
                    <span className="pid2">
                      {pid} <i className="fa fa-link" />
                    </span>
                  </div>
                ) : null}
                {res && res.fields && res.fields.length ? (
                  res.fetchMoreRows ? (
                    <>
                      {res.rows.length} row
                      {res.rows.length > 1 ? 's' : ''} fetched
                      {time === null ? undefined : (
                        <>, {time} ms execution time</>
                      )}
                      .
                    </>
                  ) : (
                    <>
                      Query returned {res.rows.length} row
                      {res.rows.length > 1 ? 's' : ''}
                      {time === null ? undefined : (
                        <>, {time} ms execution time</>
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
                ref={focus}
              >
                Save SQL query to a file (.sql)
              </button>
              <AddToFavoritesDialogButton onEnter={onFavoriteSave} />
              {currentState()?.currentConnectionConfiguration?.type ===
              'postgres' ? (
                <button
                  style={{ marginTop: 15 }}
                  className="query-tab--save-stdout"
                  type="button"
                  onClick={onStdOutFileClick}
                >
                  Export query response to a file (PostgreSQL STDOUT)
                </button>
              ) : null}
            </Dialog>
          ) : null}
          {openDialogOpen ? (
            <Dialog relativeTo="previousSibling" onBlur={onDialogBlur}>
              <button
                ref={focus}
                type="button"
                className="query-tab--save-sql"
                onClick={onOpenSqlQueryFileClick}
              >
                Open SQL query from a file (.sql)
              </button>
              <button
                type="button"
                className="query-tab--save-sql"
                onClick={onOpenFavoriteClick}
              >
                Open Favorite
              </button>
              <button
                type="button"
                className="query-tab--save-sql"
                onClick={onOpenRecentQueryClick}
              >
                Open Recent Query
              </button>
              {currentState()?.currentConnectionConfiguration?.type ===
              'postgres' ? (
                <button
                  type="button"
                  className="query-tab--save-stdout"
                  onClick={onStdInFileClick}
                >
                  Import data from a file (PostgreSQL STDIN)
                </button>
              ) : null}
            </Dialog>
          ) : null}{' '}
          {selectedGroup ? (
            <EditorQuerySelectorGroup
              style={pid ? { right: 73 } : undefined}
              key={`${selectedGroup.queryGroup.id}-${selectedGroup.page}`}
              group={selectedGroup.queryGroup}
              page={selectedGroup.page}
              onSelect={onQuerySelectorSelect}
            />
          ) : null}
          {connectionError ? (
            <span className="client-error">
              {connectionError.message} <i className="fa fa-unlink" />
            </span>
          ) : null}
          {res && res.fields && res.fields.length ? (
            <span className="mensagem">
              {res.fetchMoreRows ? (
                <>
                  {res.rows.length} row
                  {res.rows.length > 1 ? 's' : ''} fetched
                </>
              ) : (
                <>
                  Query returned {res.rows.length} row
                  {res.rows.length > 1 ? 's' : ''}
                </>
              )}
              {time === null ? undefined : <>, {time} ms execution time</>}.
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
          {running0 ? (
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
              {pid} <i className="fa fa-link" />
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
      {queryDialogOpen ? (
        <OpenRecentQueryDialog
          onBlur={onOpenRecentDialogBlur}
          onOpen={onQueryOpen}
        />
      ) : null}
      {favoriteDialogOpen ? (
        <OpenFavoriteDialog
          onBlur={onFavoriteDialogBlur}
          onOpen={onOpenFavorite}
        />
      ) : null}
      <div
        className="query-frame--resize-helper"
        style={{ top: topHeight }}
        onMouseDown={onResizeHelperMouseDown}
      />
      <div className="query-frame--bottom-area">
        {error ? (
          <div className="error">
            {error.code ? `#${error.code}` : ''} {error.message}{' '}
            {error.code === '25P02' ? (
              <button type="button" onClick={onRollbackClick}>
                Rollback transaction
              </button>
            ) : (connectionError || error) && !pid ? (
              <button type="button" onClick={onOpenNewConnectionClick}>
                Open new connection
              </button>
            ) : null}
            {typeof error.line === 'number' &&
              typeof error.position === 'number' && (
                <div>
                  Line: {error.line} Character: {error.position}
                </div>
              )}
          </div>
        ) : res && res.fields && res.fields.length ? (
          notices.length ? (
            <div>
              <Notices
                notices={notices}
                onOpenNotice={onOpenNotice}
                onRemoveNotice={onRemoveNotice}
              />
              <DataGrid
                style={{
                  position: 'absolute',
                  inset: 0,
                }}
                fetchMoreRows={fetchMoreRows}
                result={res}
              />
            </div>
          ) : (
            <DataGrid
              style={{
                position: 'absolute',
                inset: 0,
              }}
              fetchMoreRows={fetchMoreRows}
              result={res}
            />
          )
        ) : res || notices?.length ? (
          <div className="not-grid-result" style={{ top: 0 }}>
            <Notices
              notices={notices}
              onOpenNotice={onOpenNotice}
              onRemoveNotice={onRemoveNotice}
            />
            {res && 'rowCount' in res && res.rowCount ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully: {res.rowCount} row
                {res.rowCount <= 1 ? '' : 's'} affected
                {time === null ? undefined : <>, {time} ms execution time</>}.
                {res.stdOutResult ? (
                  <div style={{ marginTop: '1em' }}>
                    Query result exported to file{' '}
                    <strong style={{ userSelect: 'text' }}>
                      {res.stdOutResult}
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : res ? (
              <div
                style={{
                  fontSize: '20px',
                  padding: '10px 0 0 15px',
                  lineHeight: '1.5em',
                }}
              >
                Query returned successfully with no result in {time} msec.
              </div>
            ) : undefined}
          </div>
        ) : isFresh ? (
          <QuerySelector style={{ top: 1 }} onSelect={onQuerySelectorSelect} />
        ) : null}
      </div>
    </>
  );
}
