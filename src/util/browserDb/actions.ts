import { ConnectionConfiguration } from 'types';
import { assert } from '../assert';
import { ConnectionGroupEntryIDB, transaction } from './entities';

const executionP = transaction(async ({ appExecution }) =>
  appExecution.add({
    createdAt: new Date().getTime(),
  }),
);
export async function updateConnection(
  host: string,
  port: number,
  user: string,
  database: string,
) {
  transaction(async ({ appExecution }) =>
    appExecution.patch({
      id: await executionP,
      host,
      port,
      user,
      database,
    }),
  );
}

let connectionGroups: ConnectionGroupEntryIDB[] | null = null;
async function getConnectionGroupId(cs: ConnectionConfiguration) {
  if (connectionGroups === null)
    connectionGroups = await transaction(({ connectionGroup }) =>
      connectionGroup.getAll(),
    );
  if (!cs.database || !cs.host || !cs.user) {
    throw new Error('database, host, user are required');
  }
  if (!connectionGroups) throw new Error('connectionGroups is null');
  const g = connectionGroups.find(
    (g2) =>
      g2.database === cs.database &&
      g2.host === cs.host &&
      g2.user === cs.user &&
      g2.port === cs.port,
  );
  if (g) return g.id;
  const id = await transaction(({ connectionGroup }) =>
    connectionGroup.add({
      database: cs.database,
      host: cs.host,
      user: cs.user,
      port: cs.port,
    }),
  );
  connectionGroups.push({
    id,
    database: cs.database,
    host: cs.host,
    user: cs.user,
    port: cs.port,
  });
  return id;
}

export async function saveFavoriteQuery(
  sql: string,
  title: string,
  {
    content,
    cursorStart,
    cursorEnd,
  }: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  },
  configuration: ConnectionConfiguration,
) {
  const executionId = await executionP;
  const connectionGroupId = await getConnectionGroupId(configuration);
  return transaction(({ favoriteQuery }) =>
    favoriteQuery.add({
      sql,
      title,
      createdAt: new Date().getTime(),
      executionId,
      connectionGroupId,
      editorState: {
        content,
        cursorStart,
        cursorEnd,
      },
    }),
  );
}

export async function saveQuery(
  sql: string,
  tabId: number,
  {
    content,
    cursorStart,
    cursorEnd,
  }: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  },
  tabTitle: string | null,
  conf: ConnectionConfiguration,
) {
  const executionId = await executionP;
  const connectionGroupId = await getConnectionGroupId(conf);
  return transaction(async ({ query, queryGroup }) => {
    const createdAt = new Date().getTime();
    let queryGroupId = (
      await queryGroup.index('executionIdTabId')?.get([executionId, tabId])
    )?.id;
    if (!queryGroupId) {
      const lastQueryId = await query.add({
        sql,
        createdAt,
        version: 1,
        editorState: {
          content,
          cursorEnd,
          cursorStart,
        },
        tabTitle: tabTitle === null ? undefined : tabTitle,
      });
      queryGroupId = await queryGroup.add({
        executionId,
        lastQueryId,
        tabId,
        size: 1,
        connectionGroupId,
        createdAt,
        queryCreatedAt: createdAt,
        sql,
        editorState: {
          content,
          cursorEnd,
          cursorStart,
        },
        tabTitle: tabTitle === null ? undefined : tabTitle,
      });
      await query.patch({
        id: lastQueryId,
        queryGroupId,
      });
      return lastQueryId;
    }
    const group = await queryGroup.get(queryGroupId);
    assert(group, 'queryGroup not found');
    const lastQueryId = await query.add({
      queryGroupId,
      version: group.size + 1,
      sql,
      createdAt,
      editorState: {
        content,
        cursorEnd,
        cursorStart,
      },
      tabTitle: tabTitle === null ? undefined : tabTitle,
    });
    await queryGroup.patch({
      id: queryGroupId,
      size: group.size + 1,
      executionId,
      lastQueryId,
      connectionGroupId,
      queryCreatedAt: createdAt,
      sql,
      tabId,
      editorState: {
        content,
        cursorEnd,
        cursorStart,
      },
      tabTitle: tabTitle === null ? undefined : tabTitle,
    });
    return lastQueryId;
  });
}

export async function listConnectionConfigurations(): Promise<
  ConnectionConfiguration[]
> {
  return transaction(({ connectionConfiguration }) =>
    connectionConfiguration.getAll(),
  );
}

export async function insertConnectionConfiguration(
  c: ConnectionConfiguration,
) {
  if (c.id) throw new Error('id should not be set');
  await transaction(({ connectionConfiguration }) =>
    connectionConfiguration.add(c),
  );
}

export async function deleteConnectionConfiguration(id: number) {
  return transaction<void>(({ connectionConfiguration }) =>
    connectionConfiguration.remove(id),
  );
}

export async function updateConnectionConfiguration(
  c: ConnectionConfiguration,
) {
  if (!c.id) throw new Error('id is required');
  await transaction(({ connectionConfiguration }) =>
    connectionConfiguration.put(c),
  );
}

export async function updateFailedQuery(queryId: number, time: number) {
  return transaction<void>(async ({ query, queryGroup }) => {
    const q = await query.get(queryId);
    assert(q?.id, 'queryGroup not found');
    await query.patch({
      id: q.id,
      executionTime: time,
      success: false,
    });
    await queryGroup.patch({
      id: q.queryGroupId!,
      executionTime: time,
      success: false,
    });
  });
}

export async function updateSuccessQuery(
  queryId: number,
  time: number,
  resultLength: number | null,
) {
  return transaction<void>(async ({ query, queryGroup }) => {
    const q = await query.get(queryId);
    assert(q?.id, 'queryGroup not found');
    await query.patch({
      id: q.id,
      executionTime: time,
      resultLength: resultLength === null ? undefined : resultLength,
      success: true,
    });
    await queryGroup.patch({
      id: q.queryGroupId!,
      executionTime: time,
      resultLength: resultLength === null ? undefined : resultLength,
      success: true,
    });
  });
}

export async function lastQueries(
  config?: ConnectionConfiguration | null,
  limit?: number,
) {
  const connectionGroupId = config ? await getConnectionGroupId(config) : null;
  return transaction(({ queryGroup }) =>
    connectionGroupId === null
      ? queryGroup.index('queryCreatedAt').getAllDesc(limit)
      : queryGroup
          .index('connectionGroupIdQueryCreatedAt')!
          .getAllDesc(
            IDBKeyRange.bound([connectionGroupId], [connectionGroupId, []]),
            limit,
          ),
  );
}

export async function getQuery(groupId: number, v: number) {
  return transaction(({ query }) =>
    query.index('queryGroupIdVersion').get([groupId, v]),
  );
}

export async function favorites(config?: ConnectionConfiguration | null) {
  const connectionGroupId = config ? await getConnectionGroupId(config) : null;
  return (
    await transaction(({ favoriteQuery }) =>
      connectionGroupId === null
        ? favoriteQuery.getAll()
        : favoriteQuery.index('connectionGroupId')!.getAll(connectionGroupId),
    )
  ).map((q) => ({
    id: q.id,
    sql: q.sql,
    title: q.title,
    created_at: q.createdAt,
    editor_content: q.editorState.content,
    editor_cursor_start_line: q.editorState.cursorStart.line,
    editor_cursor_end_line: q.editorState.cursorEnd.line,
    editor_cursor_start_char: q.editorState.cursorStart.ch,
    editor_cursor_end_char: q.editorState.cursorEnd.ch,
  }));
}
