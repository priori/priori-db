import React from 'react';
import { QueryGroupEntryIDB } from 'util/browserDb/entities';
import { equals } from 'util/equals';
import {
  fDate,
  onPaginationClick,
  useQuerySelector,
  useQuerySelectorGroup,
} from './useQuerySelector';

function Group({
  group,
  onSelect,
}: {
  group: QueryGroupEntryIDB;
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  }) => void;
}) {
  const { page, prev, next, current } = useQuerySelectorGroup(group);

  return (
    <div
      className="query-selector--query"
      onClick={() => onSelect(current.editorState)}
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

function QuerySelector0({
  onSelect,
  style,
}: {
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  }) => void;
  style?: React.CSSProperties;
}) {
  const {
    favorites,
    configs,
    queries,
    onScroll,
    configValue,
    onConfigsSelectChange,
  } = useQuerySelector();

  return (
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
        <select
          value={configValue}
          onChange={onConfigsSelectChange}
          style={{ width: 300 }}
        >
          <option value="-1" />
          {configs.map((p, i) => (
            <option value={i} key={i}>{`${p.user}@${p.host}${
              p.port !== 5432 ? `:${p.port}` : ''
            }/${p.database}`}</option>
          ))}
        </select>
      </div>
      {favorites?.length ? (
        <h1>
          <i className="fa fa-star" />
          Favorites
        </h1>
      ) : null}
      <div className="query-selector--favorites">
        {favorites?.map((q) => (
          <div
            className="query-selector--query"
            key={q.id}
            onClick={() => {
              onSelect({
                content: q.editor_content,
                cursorStart: {
                  line: q.editor_cursor_start_line,
                  ch: q.editor_cursor_start_char,
                },
                cursorEnd: {
                  line: q.editor_cursor_end_line,
                  ch: q.editor_cursor_end_char,
                },
              });
            }}
          >
            <h1>
              {q.title ? <div>{q.title}</div> : null}
              <span>{fDate(new Date(q.created_at))}</span>
            </h1>
            <div className="query-selector--sql">{q.sql}</div>
          </div>
        ))}
      </div>
      {favorites?.length ? <h1>Last Executed Queries</h1> : null}
      <div className="query-selector--queries">
        {queries?.map((g) => (
          <Group key={g.id} group={g} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export const QuerySelector = React.memo(
  QuerySelector0,
  (a, b) => equals(a.style, b.style) && a.onSelect === b.onSelect,
);
