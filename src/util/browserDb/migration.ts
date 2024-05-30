/* eslint-disable no-console */
import { ConnectionConfiguration } from 'types';
import { Stores } from './entities';

let oldDb: any = null;
if (!oldDb)
  oldDb = (window as any).openDatabase('PrioriDB', '1.0', 'Priori DB', 0);
function q(sqlQuery: string, params: (string | null | number | boolean)[]) {
  return new Promise<{ [key: string]: number | null | string | boolean }[]>(
    (resolve, reject) => {
      oldDb.transaction((tx: any) => {
        tx.executeSql(
          sqlQuery,
          params,
          (_: unknown, results: any) => {
            resolve([...results.rows] as {
              [key: string]: number | null | string | boolean;
            }[]);
          },
          (_: unknown, err: any) =>
            reject(
              new Error(
                `${err.message} ${err.code}\n${sqlQuery}\n${JSON.stringify(
                  params,
                )}`,
              ),
            ),
        );
      });
    },
  );
}

function empty(
  v:
    | { database: string; host: string; port: string; user: string }
    | null
    | undefined,
) {
  return !v || !v.database || !v.host || !v.port || !v.port || !v.user;
}

interface QueryOldWebSqlEntry {
  id: number;
  execution_id: number;
  sql: string | number | undefined | null;
  created_at: number;
  tab_uid: number;
  editor_content: string | number | undefined | null;
  editor_cursor_start_line: number;
  editor_cursor_end_line: number;
  editor_cursor_start_char: number;
  editor_cursor_end_char: number;
  tab_title: string | number | undefined | null;
  execution_time: number | undefined | null;
  result_length: number | undefined | null;
  success: boolean | undefined | number | null;
}
interface FavoriteOldWebSqlEntry {
  id: number;
  created_at: number;
  execution_id: number | undefined;
  sql: string | number | undefined | null;
  editor_content: string | number | undefined | null;
  editor_cursor_start_line: number;
  editor_cursor_end_line: number;
  editor_cursor_start_char: number;
  editor_cursor_end_char: number;
  title: string | number | undefined | null;
}

interface ExecutionOldWebSqlEntry {
  id: number;
  created_at: number;
  execution_id: number | undefined;
  host: string | undefined;
  port: string | number | undefined;
  database: string | undefined;
  user: string | undefined;
}

function isInvalidQuery(
  es: { id: number; host: string; port: number | string; user: string }[],
) {
  return (q2: any) => {
    const q3: {
      id: number;
      created_at: string | number | undefined;
      execution_id: number | undefined;
    } = q2;
    return !!(
      !q3.id ||
      !q3.created_at ||
      empty(
        es.find((e) => e.id === q3.execution_id) as
          | { database: string; host: string; port: string; user: string }
          | null
          | undefined,
      )
    );
  };
}

let oldWebSqlDataP:
  | Promise<{
      queries: undefined | QueryOldWebSqlEntry[];
      executions: undefined | ExecutionOldWebSqlEntry[];
      favorites: undefined | FavoriteOldWebSqlEntry[];
    }>
  | undefined = q(
  "SELECT tbl_name, sql from sqlite_master WHERE type = 'table'",
  [],
)
  .then((r) => r.map((e) => e.tbl_name as string))
  .catch(() => [] as string[])
  .then(async (tables) => {
    if (
      tables.includes('execution') &&
      tables.includes('favorite_query') &&
      tables.includes('query')
    ) {
      const es = (await q(
        'SELECT * FROM execution',
        [],
      )) as unknown as ExecutionOldWebSqlEntry[];
      const invalid = es.find(
        (v) =>
          !v.created_at ||
          ((!v.database || !v.host || !v.port || !v.port || !v.user) &&
            (v.database || v.host || v.port || v.port || v.user)) ||
          !v.id,
      );
      if (invalid) {
        throw new Error(
          `Invalid data in execution table ${JSON.stringify(invalid)}`,
        );
      }
      const fs = (await q(
        'SELECT * FROM favorite_query',
        [],
      )) as unknown as FavoriteOldWebSqlEntry[];
      const invalid2 = fs.find(
        (f) =>
          !f.id ||
          !f.created_at ||
          empty(
            es.find((e) => e.id === f.execution_id) as
              | { database: string; host: string; port: string; user: string }
              | null
              | undefined,
          ),
      );
      if (invalid2) {
        throw new Error(
          `Invalid data in favorite_query table ${JSON.stringify(invalid2)} ${JSON.stringify(
            es.find((e) => e.id === invalid2.execution_id),
          )}`,
        );
      }
      const qs = (await q(
        'SELECT * FROM query',
        [],
      )) as unknown as QueryOldWebSqlEntry[];
      const invalid3 = qs.find((q2) => !q2.id || !q2.created_at);
      if (invalid3) {
        throw new Error(
          `Invalid data in query table ${JSON.stringify(invalid3)}`,
        );
      }
      const invalids = qs.filter((q2) =>
        isInvalidQuery(
          es as {
            id: number;
            database: string;
            host: string;
            port: string;
            user: string;
          }[],
        )(q2),
      );
      const oldest = invalids
        .map((v) => v.created_at)
        .reduce((a, b) => (a < b ? b : a), Number.NEGATIVE_INFINITY);

      const invalidExecutions =
        oldest === Number.NEGATIVE_INFINITY
          ? []
          : es.filter((e) => e.created_at <= oldest);
      if (oldest !== Number.NEGATIVE_INFINITY) {
        const invalidQueries = qs.filter(
          (q2) =>
            q2.created_at <= oldest ||
            invalidExecutions.some((e) => e.id === q2.execution_id),
        );
        const invalidFavorites = fs.filter(
          (f) =>
            f.created_at <= oldest ||
            invalidExecutions.some((e) => e.id === f.execution_id),
        );
        if (
          invalidExecutions.length > 0 ||
          invalidQueries.length > 0 ||
          invalidFavorites.length > 0
        ) {
          console.warn(
            'Invalid data will be discarted!',
            invalidExecutions,
            invalidQueries,
            invalidFavorites,
          );
        }
      }
      const favorites = fs.filter(
        (f) =>
          oldest === Number.NEGATIVE_INFINITY ||
          (f.created_at >= oldest &&
            !invalidExecutions.some((e) => e.id === f.execution_id)),
      );
      const queries = qs.filter(
        (q2) =>
          oldest === Number.NEGATIVE_INFINITY ||
          (q2.created_at >= oldest &&
            !invalidExecutions.some((e) => e.id === q2.execution_id)),
      );
      const executions = es.filter(
        (e) =>
          oldest === Number.NEGATIVE_INFINITY ||
          e.created_at >= oldest ||
          !invalidExecutions.some((ie) => ie.id === e.id),
      );
      if (
        favorites.some((f) => !executions.some((e) => e.id === f.execution_id))
      ) {
        const invalidFavorites = favorites.filter(
          (f) => !executions.some((e) => e.id === f.execution_id),
        );
        throw new Error(
          `Favorite query without execution ${JSON.stringify(invalidFavorites)}`,
        );
      }
      if (
        queries.some((f) => !executions.some((e) => e.id === f.execution_id))
      ) {
        const invalidQueries = favorites.filter(
          (f) => !executions.some((e) => e.id === f.execution_id),
        );
        throw new Error(
          `Query without execution ${JSON.stringify(invalidQueries)}`,
        );
      }
      return { favorites, queries, executions };
    }
    return { favorites: undefined, queries: undefined, executions: undefined };
  });

export function oldWebSqlData() {
  return oldWebSqlDataP!;
}

export async function migrate(stores: Stores) {
  if (!oldWebSqlDataP) return;
  const { favorites, queries, executions } = await oldWebSqlDataP;
  oldWebSqlDataP = undefined;
  const count = await stores.connectionConfiguration.count();
  if (count === 0 && localStorage.getItem('connectionConfigurations')) {
    const cs = JSON.parse(
      localStorage.getItem('connectionConfigurations') || '[]',
    ) as ConnectionConfiguration[];
    for (const c of cs) {
      await stores.connectionConfiguration.add(c);
    }
  }
  const noFavorites = !(await stores.favoriteQuery.count());
  const noQueries = !(await stores.query.count());

  if (noFavorites && noQueries && favorites && queries && executions) {
    console.log(`Loading ${executions.length} executions`);
    console.log(`Loading ${favorites.length} favorite queries`);
    console.log(`Loading ${queries.length} queries`);
    for (const e of executions) {
      const host = e.host || '';
      const port = parseInt(e.port as string, 10) ?? 5432;
      const database = e.database || '';
      const user = e.user || '';
      const executionId = await stores.appExecution.add({
        createdAt: e.created_at,
        host,
        port,
        database,
        user,
      });
      const fs2 = favorites.filter((f) => f.execution_id === e.id);
      const qs2 = queries.filter((q2) => q2.execution_id === e.id);
      if (fs2.length || qs2.length) {
        const conGroups = await stores.connectionGroup.getAll();
        const connectionGroupId =
          conGroups.find(
            (c) =>
              c.database === database &&
              c.host === host &&
              c.port === port &&
              c.user === user,
          )?.id ??
          (await stores.connectionGroup.add({
            database,
            host,
            port,
            user,
          }));
        for (const f of fs2) {
          await stores.favoriteQuery.add({
            connectionGroupId,
            executionId,
            createdAt: f.created_at,
            sql: f.sql === null || f.sql === undefined ? '' : `${f.sql}`,
            title:
              f.title === null || f.title === undefined ? '' : `${f.title}`,
            editorState: {
              content:
                f.editor_content === null || f.editor_content === undefined
                  ? ''
                  : `${f.editor_content}`,
              cursorStart: {
                line: f.editor_cursor_start_line,
                ch: f.editor_cursor_start_char,
              },
              cursorEnd: {
                line: f.editor_cursor_end_line,
                ch: f.editor_cursor_end_char,
              },
            },
          });
        }
        for (const qGroup of qs2
          .map((q2) => q2.tab_uid)
          .filter((v, i, a) => a.indexOf(v) === i)) {
          const queries2 = qs2.filter((q2) => q2.tab_uid === qGroup);
          queries2.sort((a, b) => a.created_at - b.created_at);
          const last = queries2[queries2.length - 1];
          const queryGroupId = await stores.queryGroup.add({
            executionId,
            tabId: last.tab_uid,
            createdAt: last.created_at,
            connectionGroupId,
            size: queries2.length,
            lastQueryId: -1,
            queryCreatedAt: last.created_at,
            sql:
              last.sql === null || last.sql === undefined ? '' : `${last.sql}`,
            success:
              last.success === 1 || last.success === true
                ? true
                : last.success === 0 || last.success === false
                  ? false
                  : last.success === undefined || last.success === null
                    ? undefined
                    : !!last.success,
            executionTime:
              last.execution_time === null || last.execution_time === undefined
                ? undefined
                : last.execution_time,
            resultLength:
              last.result_length === null || last.result_length === undefined
                ? undefined
                : last.result_length,
            editorState: {
              content:
                last.editor_content === null ||
                last.editor_content === undefined
                  ? ''
                  : `${last.editor_content}`,
              cursorStart: {
                line: last.editor_cursor_start_line,
                ch: last.editor_cursor_start_char,
              },
              cursorEnd: {
                line: last.editor_cursor_end_line,
                ch: last.editor_cursor_end_char,
              },
            },
            tabTitle:
              last.tab_title === null || last.tab_title === undefined
                ? ''
                : `${last.tab_title}`,
          });
          let v = 1;
          let lastQueryId = -1;
          for (const q2 of queries2) {
            lastQueryId = await stores.query.add({
              queryGroupId,
              version: v,
              createdAt: q2.created_at,
              sql: q2.sql === null || q2.sql === undefined ? '' : `${q2.sql}`,
              editorState: {
                content:
                  q2.editor_content === null || q2.editor_content === undefined
                    ? ''
                    : `${q2.editor_content}`,
                cursorStart: {
                  line: q2.editor_cursor_start_line,
                  ch: q2.editor_cursor_start_char,
                },
                cursorEnd: {
                  line: q2.editor_cursor_end_line,
                  ch: q2.editor_cursor_end_char,
                },
              },
              success:
                q2.success === 1 || q2.success === true
                  ? true
                  : q2.success === 0 || q2.success === false
                    ? false
                    : q2.success === undefined || q2.success === null
                      ? undefined
                      : !!q2.success,
              executionTime:
                q2.execution_time === null || q2.execution_time === undefined
                  ? undefined
                  : q2.execution_time,
              resultLength:
                q2.result_length === null || q2.result_length === undefined
                  ? undefined
                  : q2.result_length,
            });
            v += 1;
          }
          await stores.queryGroup.patch({
            id: queryGroupId,
            lastQueryId,
          });
        }
      }
    }
    console.log('Migration complete');
  }
}
