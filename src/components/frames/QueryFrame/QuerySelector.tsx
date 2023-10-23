import { useState } from 'react';
import { currentState } from 'state/state';
import { browserDb } from 'util/browserDb';
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
  insertInGroup: (g: G, item: T) => G
) {
  return (acc: G[], item: T) => {
    const group = acc.find((g) => groupMatch(g, item));
    if (group) {
      return acc.map((g) => (g === group ? insertInGroup(g, item) : g));
    }
    return [...acc, newGroup(item)];
  };
}

type ExecutedQueryGroup = {
  tabId: number;
  executionId: number;
  queries: ExecutedQuery[];
};

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

export function QuerySelector({
  onSelect,
}: {
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  }) => void;
}) {
  const appState = currentState();
  const [configIndex, set] = useState(
    () =>
    appState.passwords.findIndex(
      (p) =>
      appState.password &&
        p.user === appState.password.user &&
        p.host === appState.password.host &&
        p.port === appState.password.port &&
        p.database === appState.password.database
    )
  );
  const config = appState.passwords[configIndex] ?? null ;
  const service = useService(
    () =>
      browserDb.query(
        `SELECT query.*
        FROM query
        ${config ? `WHERE
        execution_id IN ( SELECT id FROM execution WHERE
          execution.user = $1 AND
          execution.host = $2 AND
          execution.port = $3 AND
          execution.database = $4) ` : ''}
        ORDER BY created_at DESC`,
        config ? [config.user, config.host, config.port, config.database] :
        []
      ) as Promise<ExecutedQueryEntry[]>,
    [config]
  );
  const queries = !service.lastValidData
    ? null
    : service.lastValidData
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
              success: q.success === 1 ? true : q.success === 0 ? false : null,
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
            } as ExecutedQuery)
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
            (g, item) => ({ ...g, queries: [...g.queries, item] })
          ),
          [] as ExecutedQueryGroup[]
        );
  if (queries) {
    queries.forEach((g) => {
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
  return (
    <div className="query-selector">
      <div className="query-selector--header">
        <input type="text" readOnly disabled style={{ background: 'white' }} />
        <select
        value={configIndex}
        onChange={e=>set(parseInt(e.target.value))}
        >
          <option value="-1"></option>
          {appState.passwords.map((p, i) => (
            <option value={i} key={i}>{`${p.user}@${p.host}${
              p.port !== 5432 ? `:${p.port}` : ''
            }/${p.database}`}</option>
          ))}
        </select>
      </div>
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
