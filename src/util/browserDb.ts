/* eslint-disable @typescript-eslint/no-explicit-any */

let db: any = null;
if (!db) db = (window as any).openDatabase('PrioriDB', '1.0', 'Priori DB', 0);
const query = (
  sqlQuery: string,
  params: (string | null | number | boolean)[],
) => {
  return new Promise<{ [key: string]: number | null | string | boolean }[]>(
    (resolve, reject) => {
      db.transaction((tx: any) => {
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
};

const insertId = (
  sqlQuery: string,
  params: (string | null | number | boolean)[],
) => {
  return new Promise<number>((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        sqlQuery,
        params,
        (_: unknown, results: any) => {
          resolve(results.insertId as number);
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
  });
};

const executionPromise = (async () => {
  await query(
    `
    CREATE TABLE IF NOT EXISTS query (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id number,
      sql string,
      created_at number,
      tab_uid number,
      editor_content string,
      editor_cursor_start_line number,
      editor_cursor_end_line number,
      editor_cursor_start_char number,
      editor_cursor_end_char number,
      tab_title string,
      execution_time number,
      result_length number,
      success boolean
    );
    `,
    [],
  );
  await query(
    `
    CREATE INDEX IF NOT EXISTS query_execution_tab_id_created_at ON query (
      execution_id DESC, tab_uid DESC, created_at DESC
    );
    `,
    [],
  );
  await query(
    `
    CREATE INDEX IF NOT EXISTS query_execution_tab_id_id ON query (
      execution_id DESC, tab_uid DESC, id DESC
    );
    `,
    [],
  );
  await query(
    `
    CREATE TABLE IF NOT EXISTS execution (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at number,
      database string,
      port number,
      host string,
      user string
    );
  `,
    [],
  );
  try {
    await query(
      'ALTER TABLE execution ADD COLUMN database TEXT default null',
      [],
    );
  } catch (e) {
    // nop
  }
  try {
    await query('ALTER TABLE execution ADD COLUMN host TEXT default null', []);
  } catch (e) {
    // nop
  }
  try {
    await query('ALTER TABLE execution ADD COLUMN user TEXT default null', []);
  } catch (e) {
    // nop
  }
  try {
    await query(
      'ALTER TABLE execution ADD COLUMN port number default null',
      [],
    );
  } catch (e) {
    // nop
  }

  return insertId(`INSERT INTO execution (created_at) VALUES (?)`, [
    new Date().getTime(),
  ]);
})();

export const browserDb = {
  query,
};

export async function updateConnection(
  host: string,
  port: number,
  user: string,
  database: string,
) {
  return query(
    `UPDATE execution
    SET
      host = ?,
      port = ?,
      user = ?,
      database = ?
    WHERE id = ?
  `,
    [host, port, user, database, await executionPromise],
  );
}

export const saveQuery = async (
  sql: string,
  uid: number,
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
) => {
  const execId = await executionPromise;
  return insertId(
    `INSERT INTO query (
      execution_id, sql, created_at, tab_uid,
      editor_content,
      editor_cursor_start_line,
      editor_cursor_end_line,
      editor_cursor_start_char,
      editor_cursor_end_char,
      tab_title
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      execId,
      sql,
      new Date().getTime(),
      uid,
      content,
      cursorStart.line,
      cursorEnd.line,
      cursorStart.ch,
      cursorEnd.ch,
      tabTitle,
    ],
  );
};

export async function updateQuery(
  id: number,
  time: number,
  resultLength: number | null,
) {
  return query(
    `
      UPDATE query
      SET
        execution_time = ?,
        result_length = ?,
        success = true
      WHERE id = ?
    `,
    [time, resultLength, id],
  );
}

export async function updateFailedQuery(id: number, time: number) {
  return query(
    `
      UPDATE query
      SET
        execution_time = ?,
        success = false
      WHERE id = ?
    `,
    [time, id],
  );
}

(global as any).browserDb = browserDb;
