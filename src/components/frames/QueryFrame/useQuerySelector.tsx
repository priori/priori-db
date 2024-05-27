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
import { QueryEntryIDB, QueryGroupEntryIDB } from 'util/browserDb/entities';
import { QuerySelectorGroupProps } from './QuerySelector';

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

export function useQuerySelectorGroup(props: QuerySelectorGroupProps) {
  const { group } = props;
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
      page: 0,
    }),
    [group],
  );
  const s = useService(
    () =>
      page === 0
        ? Promise.resolve({ ...initial, page: 0 })
        : getQuery(group.id, group.size - page).then((q) => ({
            title: q.tabTitle,
            sql: q.sql,
            createdAt: new Date(q.createdAt),
            success: q.success,
            editorState: q.editorState,
            page,
          })),
    [group, page],
  );
  const current = s.lastValidData || initial;
  return {
    page,
    prev,
    next,
    current,
  };
}

export type EditorQuerySelectorGroupProps = {
  group: QueryGroupEntryIDB;
  onSelect: (state: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
    queryGroup: QueryGroupEntryIDB;
    page: number;
  }) => void;
  page: number;
};

let cache: QueryEntryIDB | null = null;
async function cachedGetQuery(id: number, p: number) {
  if (cache && cache.queryGroupId === id && cache.version === p) {
    return cache;
  }
  return getQuery(id, p).then((q) => {
    cache = q;
    return q;
  });
}
export function useEditorQuerySelectorGroup(
  props: EditorQuerySelectorGroupProps,
) {
  const { group } = props;
  async function getPage(page: number) {
    if (page === 0)
      return {
        ...group.editorState,
        queryGroup: props.group,
        page: 0,
      };
    const p = await cachedGetQuery(group.id, group.size - page);
    return {
      ...p.editorState,
      queryGroup: props.group,
      page,
    };
  }
  const prev = useEvent(() => {
    if (props.page < group.size - 1) {
      getPage(props.page + 1).then(props.onSelect);
    }
  });
  const next = useEvent(() => {
    if (props.page > 0) {
      getPage(props.page - 1).then(props.onSelect);
    }
  });
  const initial = useMemo(
    () => ({
      title: group.tabTitle,
      sql: group.sql,
      createdAt: new Date(group.queryCreatedAt),
      success: group.success,
      editorState: group.editorState,
      page: 0,
    }),
    [group],
  );
  const s = useService(
    () =>
      props.page === 0
        ? Promise.resolve({ ...initial, page: 0 })
        : cachedGetQuery(group.id, group.size - props.page).then((q) => ({
            title: q.tabTitle,
            sql: q.sql,
            createdAt: new Date(q.createdAt),
            success: q.success,
            editorState: q.editorState,
            page: props.page,
          })),
    [group, props.page],
  );
  const current =
    s.lastValidData ??
    (cache &&
    cache.version === group.size - props.page &&
    props.group.id === cache.queryGroupId
      ? {
          title: cache.tabTitle,
          sql: cache.sql,
          createdAt: new Date(cache.createdAt),
          success: cache.success,
          editorState: cache.editorState,
          page: props.page,
        }
      : null);
  return {
    page: props.page,
    prev,
    next,
    current,
  };
}

export function useQuerySelector(
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
  ) => void,
) {
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

  const [selected, setSelected] = useState<string | null>(null);

  const onGroupSelect = (s: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
    queryGroup: QueryGroupEntryIDB;
    page: number;
  }) => {
    onSelect(s);
    setSelected(`group${s.queryGroup.id}`);
  };

  const onFavoriteClick = (q: {
    id: number;
    sql: string;
    title: string;
    created_at: number;
    editor_content: string;
    editor_cursor_start_line: number;
    editor_cursor_end_line: number;
    editor_cursor_start_char: number;
    editor_cursor_end_char: number;
  }) => {
    setSelected(`favorite${q.id}`);
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
  };

  return {
    queries,
    onScroll,
    configValue,
    onConfigsSelectChange,
    favorites: service.lastValidData?.favorites,
    configs,
    onGroupSelect,
    selected,
    onFavoriteClick,
  };
}
