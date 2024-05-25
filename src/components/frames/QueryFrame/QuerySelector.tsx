import React from 'react';
import { equals } from 'util/equals';
import {
  ExecutedQuery,
  fDate,
  onPaginationClick,
  useQuerySelector,
  useQuerySelectorGroup,
} from './useQuerySelector';

function Group({
  queries,
  onSelect,
}: {
  queries: ExecutedQuery[];
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  }) => void;
}) {
  const { page, prev, next } = useQuerySelectorGroup(queries);

  return (
    <div
      className="query-selector--query"
      key={queries[page].id}
      onClick={() => onSelect(queries[page].editorState)}
    >
      <h1>
        {queries[page].success === false ? <i className="fa fa-close" /> : null}
        {queries[page].title ? <div>{queries[page].title}</div> : null}
        {fDate(queries[page].createdAt)}
      </h1>
      <div className="query-selector--sql">{queries[page].sql}</div>
      <div
        className="query-selector--pagination"
        onClick={onPaginationClick}
        style={queries.length === 1 ? { opacity: 0.33 } : undefined}
      >
        <i
          className={`fa fa-chevron-left ${
            page === queries.length - 1 ? 'disabled' : ''
          }`}
          onClick={prev}
          style={queries.length === 1 ? { visibility: 'hidden' } : {}}
        />{' '}
        {queries.length - page}/{queries.length}{' '}
        <i
          onClick={next}
          className={`fa fa-chevron-right ${page === 0 ? 'disabled' : ''}`}
          style={queries.length === 1 ? { visibility: 'hidden' } : undefined}
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
          <Group
            key={g.queries[0].id}
            queries={g.queries}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export const QuerySelector = React.memo(
  QuerySelector0,
  (a, b) => equals(a.style, b.style) && a.onSelect === b.onSelect,
);
