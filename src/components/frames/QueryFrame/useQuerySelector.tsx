import React, { useEffect, useMemo, useState } from 'react';
import { currentState } from 'state/state';
import { showError } from 'state/actions';
import {
  favorites,
  getQuery,
  lastQueries,
  listConnectionConfigurations,
} from 'util/browserDb/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { QueryGroupEntryIDB } from 'util/browserDb/entities';

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

export function useQuerySelectorGroup(group: QueryGroupEntryIDB) {
  const [page, setPage] = useState(0);
  const prev = useEvent(() => {
    if (page < group.size - 1) {
      setPage(page + 1);
    }
  });
  const next = useEvent(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  });
  const initial = useMemo(
    () => ({
      title: group.tabTitle,
      sql: group.sql,
      createdAt: new Date(group.queryCreatedAt),
      success: group.success,
      editorState: group.editorState,
    }),
    [group],
  );
  const s = useService(
    () =>
      page === 0
        ? Promise.resolve(initial)
        : getQuery(group.id, group.size - page).then((q) => ({
            title: q.tabTitle,
            sql: q.sql,
            createdAt: new Date(q.createdAt),
            success: q.success,
            editorState: q.editorState,
          })),
    [group, page],
  );
  return {
    page,
    prev,
    next,
    current: s.lastValidData || initial,
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

  const [limit, setLimit] = useState(80);

  const service = useService(
    () =>
      Promise.all([lastQueries(config, limit), favorites(config)]).then(
        // eslint-disable-next-line no-shadow
        ([queries, favorites]) => ({ queries, favorites }),
      ),
    [config, limit],
  );
  useEffect(() => {
    if (service.error) {
      showError(service.error);
    }
  }, [service.error]);

  const queries = service.lastValidData?.queries;

  const onScroll = useEvent((e: React.UIEvent<HTMLDivElement>) => {
    if (!queries?.length) return;
    if (e.target instanceof HTMLElement) {
      const { scrollTop, scrollHeight, clientHeight } = e.target;
      if (scrollTop + clientHeight > scrollHeight - 100) {
        if (limit === queries.length) setLimit(limit + 100);
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
