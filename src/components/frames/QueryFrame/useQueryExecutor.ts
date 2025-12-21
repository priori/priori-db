import { db, Notice, QueryResult } from 'db/db';
import { useEffect, useRef, useState } from 'react';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

export type QueryError = {
  code: string;
  line: number;
  position: number;
  message: string;
};

export interface QueryExecutorNoticeMessage extends Notice {
  open?: boolean | undefined;
}

interface useQueryExecutorState {
  running: boolean;
  openTransaction: boolean;
  notices: QueryExecutorNoticeMessage[];
  resetNotices: boolean;
  result: QueryResult | null;
  time: null | number;
  pid: number | null;
  connectionError: Error | null;
  error: QueryError | null;
  isFresh: boolean;
}

export function useQueryExecutor({
  onSuccess,
  onError,
}: {
  onSuccess: (res: {
    time: number;
    length: number | undefined;
    stdOutMode: boolean | undefined;
    stdInMode: boolean | undefined;
  }) => void;
  onError: (err: QueryError, time: number) => void;
}) {
  const [state, setState] = useState<useQueryExecutorState>({
    running: false,
    notices: [],
    resetNotices: false,
    pid: null,
    connectionError: null,
    result: null,
    time: null,
    error: null,
    isFresh: true,
    openTransaction: false,
  });

  const onNotice = useEvent((notice: QueryExecutorNoticeMessage) => {
    setState((state2) => ({
      ...state2,
      resetNotices: false,
      notices: state2.resetNotices ? [notice] : [...state2.notices, notice],
    }));
  });

  const pidRef = useRef<number | null>(null);
  const onPid = useEvent((pid: number | null) => {
    pidRef.current = pid;
    setState((state2) => ({ ...state2, pid }));
  });

  const onConnectionError = useEvent((e: Error) => {
    setState((state2) => ({ ...state2, connectionError: e }));
  });

  const [queryExecutor, setClient] = useState(() =>
    db().newQueryExecutor(onNotice, onPid, onConnectionError),
  );
  const clientQuery = useEvent(queryExecutor.query.bind(queryExecutor));
  const destroy = useEvent(queryExecutor.destroy.bind(queryExecutor));
  const stopRunningQuery = useEvent(
    queryExecutor.stopRunningQuery.bind(queryExecutor),
  );

  const reset = useEvent(() => {
    setClient(() => db().newQueryExecutor(onNotice, onPid, onConnectionError));
  });

  const isMounted = useIsMounted();

  const query = useEvent(
    async (
      q: string,
      ops?: {
        stdInFile?: string | null;
        stdOutFile?: string | null;
      },
    ) => {
      const start = new Date().getTime();
      setState((state2) => ({
        ...state2,
        running: true,
        resetNotices: true,
      }));
      try {
        const res = await clientQuery(q, ops);
        const time = new Date().getTime() - start;
        const resLength = res?.rows?.length;
        const openTransaction = !pidRef.current
          ? false
          : await db().inOpenTransaction(pidRef.current);
        if (isMounted()) {
          setState((state2) => ({
            ...state2,
            running: false,
            pid: pidRef.current || null,
            openTransaction,
            result: res,
            notices:
              res?.fields?.length || state2.resetNotices ? [] : state2.notices,
            resetNotices: false,
            time,
            error: null,
          }));
        }
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1));
        onSuccess({
          time,
          length: resLength,
          stdOutMode: res?.stdOutMode,
          stdInMode: res?.stdInMode,
        });
      } catch (err: unknown) {
        const time = new Date().getTime() - start;
        if (isMounted())
          setState((state2) => ({
            ...state2,
            pid: state2.pid,
            running: false,
            openTransaction: false,
            notices: state2.resetNotices ? [] : state2.notices,
            resetNotices: false,
            error: err as QueryError,
            isFresh: false,
            connectionError: state2.connectionError,
            time: null,
            result: null,
          }));
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1));
        onError(err as QueryError, time);
      }
    },
  );

  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    return () => {
      timeout.current = setTimeout(destroy, 10);
    };
  }, [queryExecutor, destroy]);

  const removeNotice = useEvent((n: QueryExecutorNoticeMessage) => {
    setState((state2) => ({
      ...state2,
      notices: state2.notices.filter((n2) => n2 !== n),
    }));
  });

  const openNewConnection = useEvent(() => {
    setState({
      running: false,
      notices: [] as QueryExecutorNoticeMessage[],
      resetNotices: false,
      pid: null,
      connectionError: null,
      result: null,
      openTransaction: false,
      time: null,
      error: null,
      isFresh: false,
    });
    reset();
  });

  const fetching = useRef(false);
  const fetchMoreRows0 = useEvent(async () => {
    if (
      !state.result ||
      !('fetchMoreRows' in state.result && state.result.fetchMoreRows) ||
      fetching.current
    )
      return;
    fetching.current = true;
    const res2 = await state.result.fetchMoreRows();
    fetching.current = false;
    setState((state2) => ({
      ...state2,
      result: res2,
      time: null,
    }));
  });
  const fetchMoreRows = state.result?.fetchMoreRows
    ? fetchMoreRows0
    : undefined;

  const openNotice = useEvent((n: QueryExecutorNoticeMessage) => {
    setState((state2) => ({
      ...state2,
      notices: state2.notices.map((n2) =>
        n2 === n ? { ...n2, message: n2.message, open: !n2.open } : n2,
      ),
    }));
  });

  return {
    ...state,
    stopRunningQuery,
    openNotice,
    openNewConnection,
    removeNotice,
    fetchMoreRows,
    query,
    pid: state.pid,
    reset,
    destroy,
  };
}
