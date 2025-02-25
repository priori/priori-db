import React from 'react';
import { QueryGroupEntryIDB } from 'util/browserDb/entities';
import { equals } from 'util/equals';
import { Dialog } from 'components/util/Dialog/Dialog';
import { RenameDialog } from 'components/util/Dialog/RenameDialog';
import {
  EditorQuerySelectorGroupProps,
  fDate,
  onPaginationClick,
  useEditorQuerySelectorGroup,
  useQuerySelector,
  useQuerySelectorGroup,
} from './useQuerySelector';

export type QuerySelectorGroupProps = {
  group: QueryGroupEntryIDB;
  selected: boolean;
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
    queryGroup: QueryGroupEntryIDB;
    page: number;
  }) => void;
};

function autoFocus(e: HTMLDivElement | null) {
  if (e) {
    e.focus();
  }
}

function QuerySelectorGroup0(props: QuerySelectorGroupProps) {
  const { page, prev, next, current } = useQuerySelectorGroup(props);
  const { group } = props;

  return (
    <div
      className={`query-selector--query${props.selected ? ' selected' : ''}`}
      onClick={() => {
        if ('fastSelection' in props) return;
        props.onSelect({
          ...current.editorState,
          page: current.page,
          queryGroup: group,
        });
      }}
    >
      <h1>
        {current.success === false ? <i className="fa fa-close" /> : null}
        {current.title ? <div>{current.title}</div> : null}
        {fDate(current.createdAt)}
      </h1>
      <div className="query-selector--sql">{current.sql}</div>
      <div
        className="query-selector--pagination"
        onClick={onPaginationClick}
        style={group.size === 1 ? { opacity: 0.33 } : undefined}
      >
        <i
          className={`fa fa-chevron-left ${
            page === group.size - 1 ? 'disabled' : ''
          }`}
          onClick={prev}
          style={group.size === 1 ? { visibility: 'hidden' } : {}}
        />{' '}
        {group.size - page}/{group.size}{' '}
        <i
          onClick={next}
          className={`fa fa-chevron-right ${page === 0 ? 'disabled' : ''}`}
          style={group.size === 1 ? { visibility: 'hidden' } : undefined}
        />{' '}
      </div>
    </div>
  );
}

export const QuerySelectorGroup = React.memo(
  QuerySelectorGroup0,
  (a, b) =>
    a.group.id === b.group.id &&
    a.onSelect === b.onSelect &&
    a.selected === b.selected,
);

export function EditorQuerySelectorGroup(props: EditorQuerySelectorGroupProps) {
  const { page, prev, next, current } = useEditorQuerySelectorGroup(props);
  const { group } = props;

  return (
    <div className="query-selector--query" style={props.style}>
      {current ? (
        <>
          <h1>
            {current.success === false ? <i className="fa fa-close" /> : null}
            {current.title ? <div>{current.title}</div> : null}
            {fDate(current.createdAt)}
          </h1>
          <div className="query-selector--sql">{current.sql}</div>
        </>
      ) : null}
      <div
        className="query-selector--pagination"
        onClick={onPaginationClick}
        style={{
          ...(group.size >= 100
            ? { fontSize: 25 }
            : group.size < 10
              ? { fontSize: 30, letterSpacing: 3 }
              : {
                  fontSize: 30,
                }),
        }}
      >
        <span style={group.size === 1 ? { opacity: 0.33 } : {}}>
          <i
            className={`fa fa-chevron-left ${
              page === group.size - 1 ? 'disabled' : ''
            }`}
            onClick={prev}
            style={group.size === 1 ? { visibility: 'hidden' } : {}}
          />{' '}
          {group.size - page}/{group.size}{' '}
          <i
            onClick={next}
            className={`fa fa-chevron-right ${page === 0 ? 'disabled' : ''}`}
            style={group.size === 1 ? { visibility: 'hidden' } : undefined}
          />{' '}
        </span>
      </div>
    </div>
  );
}

function QuerySelector0({
  onSelect,
  style,
}: {
  onSelect: (
    state:
      | {
          content: string;
          cursorStart: { line: number; ch: number };
          cursorEnd: { line: number; ch: number };
          queryGroup: QueryGroupEntryIDB;
          page: number;
        }
      | {
          content: string;
          cursorStart: { line: number; ch: number };
          cursorEnd: { line: number; ch: number };
        },
  ) => void;
  style?: React.CSSProperties;
}) {
  const {
    favorites,
    configs,
    queries,
    onScroll,
    configValue,
    onConfigsSelectChange,
    selected,
    onGroupSelect,
    onFavoriteClick,
    onFavoriteMouseDown,
    contextMenu,
    onDeleteClick,
    onEditClick,
    editQuery,
    deleteQuery,
    onBlurDialog,
    onBlurContextMenu,
    onRename,
    onDelete,
  } = useQuerySelector(onSelect);

  return (
    <>
      <select
        className="query-selector__select"
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
      <div className="query-selector" style={style} onScroll={onScroll}>
        <div className="query-selector--header">
          <input
            type="text"
            readOnly
            disabled
            style={{
              pointerEvents: 'none',
              background: 'white',
              border: '1px solid #ddd',
            }}
          />
          <span className="query-selector__select__space" />
        </div>
        {favorites?.length || queries?.length ? (
          <div className="query-selector--sticky-helper">
            <div />
          </div>
        ) : null}
        {favorites?.length ? (
          <h1>
            <i className="fa fa-star" />
            Favorites
          </h1>
        ) : null}
        <div className="query-selector--favorites">
          {favorites?.map((q) => (
            <React.Fragment key={q.id}>
              <div
                className={`query-selector--query ${selected && selected === `favorite${q.id}` ? ' selected' : ''}`}
                onMouseDown={(e) => {
                  onFavoriteMouseDown(e, q);
                }}
                onClick={() => {
                  onFavoriteClick(q);
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
                  Are you sure you want to delete favorite?
                  <div style={{ textAlign: 'center' }}>
                    <button className="button" onClick={onDelete}>
                      Yes
                    </button>{' '}
                    <button className="button" onClick={onBlurDialog}>
                      No
                    </button>
                  </div>
                </Dialog>
              ) : null}
            </React.Fragment>
          ))}
        </div>
        {queries?.length ? (
          <h1 style={favorites?.length ? undefined : { marginTop: -2 }}>
            Last Executed Queries
          </h1>
        ) : null}
        <div className="query-selector--queries">
          {queries?.map((g) => (
            <QuerySelectorGroup
              key={g.id}
              group={g}
              onSelect={onGroupSelect}
              selected={!!selected && selected === `group${g.id}`}
            />
          ))}
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
    </>
  );
}

export const QuerySelector = React.memo(
  QuerySelector0,
  (a, b) => equals(a.style, b.style) && a.onSelect === b.onSelect,
);
