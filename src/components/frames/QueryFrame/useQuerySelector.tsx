import React, { useEffect, useMemo, useState } from 'react';
import { currentState } from 'state/state';
import { showError } from 'state/actions';
import {
  favorites,
  lastQueries,
  listConnectionConfigurations,
} from 'util/browserDb/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';

export function fDate(d: Date) {
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

export function onPaginationClick(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export type ExecutedQuery = {
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

export function useQuerySelectorGroup(queries: ExecutedQuery[]) {
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
  return {
    page,
    prev,
    next,
  };
}

export function useQuerySelector() {
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

  const onConfigsSelectChange = useEvent(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setState(parseInt(e.target.value, 10));
    },
  );

  const service = useService(
    () =>
      Promise.all([lastQueries(config), favorites(config)]).then(
        // eslint-disable-next-line no-shadow
        ([queries, favorites]) => ({ queries, favorites }),
      ),
    [config],
  );
  useEffect(() => {
    if (service.error) {
      showError(service.error);
    }
  }, [service.error]);

  const queries0 = useMemo(() => {
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
                success: q.success ?? null,
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

  const queries = useMemo(() => {
    return queries0?.filter((_, i) => i < limit);
  }, [queries0, limit]);

  const onScroll = useEvent((e: React.UIEvent<HTMLDivElement>) => {
    if (!queries0?.length) return;
    if (e.target instanceof HTMLElement) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight > scrollHeight - 100) {
        if (limit < queries0.length) setLimit(limit + 100);
      }
    }
  });

  return {
    queries,
    onScroll,
    configValue,
    onConfigsSelectChange,
    favorites: service.lastValidData?.favorites,
    configs,
  };
}
