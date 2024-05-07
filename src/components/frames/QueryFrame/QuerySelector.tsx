import { ConnectionConfiguration } from 'db/Connection';
import React, { useMemo, useState } from 'react';
import { currentState } from 'state/state';
import { browserDb, listConnectionConfigurations } from 'util/browserDb';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';

function fDate(d: Date) {
  if (d.toLocaleDateString() === new Date().toLocaleDateString()) {
    return `Today ${d.toLocaleTimeString()}`;
  }
  const yesterday = new Date(new Date().getTime() - 1000 * 60 * 60 * 24);
  if (d.toLocaleDateString() === yesterday.toLocaleDateString()) {
    return `Yesterday ${d.toLocaleTimeString()}`;
  }
  return d.toLocaleString();
}

function groupBy<T, G>(
  newGroup: (item: T) => G,
  groupMatch: (g: G, item: T) => boolean,
  insertInGroup: (g: G, item: T) => G,
) {
  return (acc: G[], item: T) => {
    const group = acc.find((g) => groupMatch(g, item));
    if (group) {
      return acc.map((g) => (g === group ? insertInGroup(g, item) : g));
    }
    return [...acc, newGroup(item)];
  };
}

type ExecutedQueryEntry = {
  execution_id: number;
  tab_uid: number;
  id: number;
  sql: string;
  created_at: number;
  editor_content: string;
  editor_cursor_start_line: number;
  editor_cursor_end_line: number;
  editor_cursor_start_char: number;
  editor_cursor_end_char: number;
  tab_title: string;
  execution_time: number;
  result_length: number;
  success: number | null | boolean;
};

type ExecutedQuery = {
  id: number;
  tabId: number;
  executionId: number;
  sql: string;
  title: string;
  createdAt: Date;
  executionTime: number;
  resultLength: number;
  success: boolean | null;
  editorState: {
    content: string;
    cursorStart: {
      line: number;
      ch: number;
    };
    cursorEnd: {
      line: number;
      ch: number;
    };
  };
};

type ExecutedQueryGroup = {
  tabId: number;
  executionId: number;
  queries: ExecutedQuery[];
};

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
  const [page, setPage] = useState(0);
  const prev = useEvent(() => {
    if (page < queries.length - 1) {
      setPage(page + 1);
    }
  });
  const next = useEvent(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  });
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
  const appState = currentState();
  if (!appState.currentConnectionConfiguration)
    throw new Error('No connection configuration');
  const configsService = useService(() => listConnectionConfigurations(), []);
  const [state, setState] = useState<null | number>(null);
  const config =
    state === -1
      ? null
      : state !== null
        ? configsService.lastValidData![state]
        : appState.currentConnectionConfiguration;
  const configs = configsService.lastValidData
    ? configsService.lastValidData
    : [appState.currentConnectionConfiguration];
  const configValue = configs.findIndex(
    (c) =>
      config &&
      c.database === config.database &&
      c.host === config.host &&
      c.port === config.port &&
      c.user === config.user,
  );

  function onChange(value: number) {
    setState(value);
  }

  const service = useService(
    () =>
      Promise.all([
        browserDb.query(
          `SELECT query.* FROM query
          WHERE trim(sql) != ''

        ${
          config
            ? ` AND
          execution_id IN ( SELECT id FROM execution WHERE
          execution.user = $1 AND
          execution.host = $2 AND
          execution.port = $3 AND
          execution.database = $4) `
            : ''
        }
        ORDER BY created_at DESC`,
          config
            ? [config.user, config.host, config.port, config.database]
            : [],
        ) as Promise<ExecutedQueryEntry[]>,

        browserDb.query(
          `SELECT
            favorite_query.id,
            favorite_query.sql,
            favorite_query.title,
            favorite_query.created_at,
            editor_content,
            editor_cursor_start_line,
            editor_cursor_end_line,
            editor_cursor_start_char,
            editor_cursor_end_char
        FROM favorite_query
        ${
          config
            ? `WHERE
        execution_id IN ( SELECT id FROM execution WHERE
          execution.user = $1 AND
          execution.host = $2 AND
          execution.port = $3 AND
          execution.database = $4) `
            : ''
        }
        ORDER BY title ASC`,
          config
            ? [config.user, config.host, config.port, config.database]
            : [],
        ) as Promise<
          {
            id: number;
            sql: string;
            title: string;
            created_at: number;
            editor_content: string;
            editor_cursor_start_line: number;
            editor_cursor_end_line: number;
            editor_cursor_start_char: number;
            editor_cursor_end_char: number;
          }[]
        >,
      ]).then(([queries, favorites]) => ({ queries, favorites })),

    [config],
  );

  const queries = useMemo(() => {
    const qs = !service.lastValidData
      ? null
      : service.lastValidData?.queries
          .map(
            (q) =>
              ({
                id: q.id,
                tabId: q.tab_uid,
                executionId: q.execution_id,
                sql: q.sql,
                title: q.tab_title,
                createdAt: new Date(q.created_at),
                executionTime: q.execution_time,
                resultLength: q.result_length,
                success:
                  q.success === 1 ? true : q.success === 0 ? false : null,
                editorState: {
                  content: q.editor_content,
                  cursorStart: {
                    line: q.editor_cursor_start_line,
                    ch: q.editor_cursor_start_char,
                  },
                  cursorEnd: {
                    line: q.editor_cursor_end_line,
                    ch: q.editor_cursor_end_char,
                  },
                },
              }) as ExecutedQuery,
          )
          .reduce(
            groupBy<ExecutedQuery, ExecutedQueryGroup>(
              (q) => ({
                executionId: q.executionId,
                tabId: q.tabId,
                queries: [q],
              }),
              (g, item) =>
                item.executionId === g.executionId && item.tabId === g.tabId,
              (g, item) => ({ ...g, queries: [...g.queries, item] }),
            ),
            [] as ExecutedQueryGroup[],
          );
    if (qs) {
      qs.forEach((g) => {
        g.queries.sort((a, b) => {
          if (a.createdAt > b.createdAt) {
            return -1;
          }
          if (a.createdAt < b.createdAt) {
            return 1;
          }
          return 0;
        });
      });
    }
    return qs;
  }, [service.lastValidData]);

  const [limit, setLimit] = useState(80);
  const onScroll = useEvent((e: React.UIEvent<HTMLDivElement>) => {
    if (!queries?.length) return;
    if (e.target instanceof HTMLElement) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight > scrollHeight - 100) {
        if (limit < queries.length) setLimit(limit + 100);
      }
    }
  });

  return (
    <div className="query-selector" style={style} onScroll={onScroll}>
      <div className="query-selector--header">
        <input
          type="text"
          readOnly
          disabled
          style={{ background: 'white', border: '1px solid #ddd' }}
        />
        <select
          value={configValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
        >
          <option value="-1" />
          {configs.map((p, i) => (
            <option value={i} key={i}>{`${p.user}@${p.host}${
              p.port !== 5432 ? `:${p.port}` : ''
            }/${p.database}`}</option>
          ))}
        </select>
      </div>
      {service.lastValidData?.favorites?.length ? (
        <h1>
          <i className="fa fa-star" />
          Favorites
        </h1>
      ) : null}
      <div className="query-selector--favorites">
        {service.lastValidData?.favorites.map((q) => (
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
      {service.lastValidData?.favorites?.length ? (
        <h1>Last Executed Queries</h1>
      ) : null}
      <div className="query-selector--queries">
        {queries
          ?.filter((_, i) => i < limit)
          .map((g) => (
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
