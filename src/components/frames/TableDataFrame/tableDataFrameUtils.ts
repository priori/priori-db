import { useTab } from 'components/main/connected/ConnectedApp';
import { Filter, QueryResultData, Sort, db } from 'db/db';
import { useEffect, useRef, useState } from 'react';
import { keepTabOpen } from 'state/actions';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { TableFrameProps } from '../../../types';

export function useTableDataFrame(props: TableFrameProps) {
  const [sort, setSort] = useState<Sort | undefined>(undefined);
  const [filter, setFilter] = useState<Filter | undefined>(undefined);
  const [lastIncrementalRows, setLastIncrementalRows] = useState<
    QueryResultData | undefined
  >(undefined);

  const defaultSortService = useService(
    () => db().defaultSort(props.schema, props.table) as Promise<Sort>,
    [props.schema, props.table],
  );

  const defaultSort = defaultSortService.lastValidData;

  const sortReady = defaultSortService.status === 'success';

  const selectedSort = sort || defaultSortService.lastValidData;

  const [limit, setLimit] = useState<1000 | 10000 | 'unlimited'>(1000);

  const onChangeLimit = useEvent((l: 1000 | 10000 | 'unlimited') => {
    setLimit(l);
  });

  const isMounted = useIsMounted();

  const dataService = useService(async () => {
    setLastIncrementalRows(undefined);
    if (!sortReady)
      return new Promise<{
        result: QueryResultData;
        currentSort: Sort;
        currentFilter?: Filter;
      }>(() => {});
    const result = await db().select({
      schema: props.schema,
      table: props.table,
      sort: selectedSort,
      filter,
      limit,
    });
    if (!isMounted() && result.release) {
      result.release();
    }
    return {
      result,
      currentSort: selectedSort as Sort,
      currentFilter: filter,
    };
  }, [props.schema, props.table, selectedSort, sortReady, filter, limit]);

  const lastIncrementalRowsRef = useRef(lastIncrementalRows);
  lastIncrementalRowsRef.current = lastIncrementalRows;
  useEffect(() => {
    return () => {
      const last = lastIncrementalRowsRef.current;
      if (last?.release) {
        last.release();
      }
      if (dataService.lastValidData?.result?.release) {
        if (dataService.lastValidData.result.release !== last?.release)
          dataService.lastValidData.result.release();
      }
    };
  }, [dataService.lastValidData?.result]);

  const pks = useService(
    () => db().pks(props.schema, props.table),
    [props.schema, props.table],
  );

  const onScroll = useEvent(() => {
    keepTabOpen(props.uid);
  });

  const onUpdate = useEvent(
    async ({
      updates,
      inserts,
      removals,
    }: {
      updates: {
        where: { [fieldName: string]: string | number | null };
        values: { [fieldName: string]: string | null };
      }[];
      inserts: { [fieldName: string]: string | null }[];
      removals: { [fieldName: string]: string | number | null }[];
    }) => {
      if ((!pks.lastValidData || !pks.lastValidData.length) && updates.length) {
        throw new Error('Primay Keys not found for table!!');
      }
      await db().update(props.schema, props.table, updates, inserts, removals);
      dataService.reload();
      return true;
    },
  );

  const onChangeFilter = useEvent((f: Filter) => {
    keepTabOpen(props.uid);
    setFilter(f);
  });

  const onTouch = useEvent(() => {
    keepTabOpen(props.uid);
  });

  const onChangeSort = useEvent((s: Sort) => {
    setSort(s);
    keepTabOpen(props.uid);
  });

  useTab({
    f5() {
      dataService.reload();
    },
  });

  const fetchMoreRows0 = useEvent(async () => {
    if (lastIncrementalRows) {
      lastIncrementalRows.fetchMoreRows?.().then((res) => {
        setLastIncrementalRows(res);
      });
    } else
      dataService.lastValidData?.result?.fetchMoreRows?.().then((res) => {
        setLastIncrementalRows(res);
      });
  });

  const fetchMoreRows = lastIncrementalRows
    ? lastIncrementalRows.fetchMoreRows
      ? fetchMoreRows0
      : undefined
    : dataService.lastValidData?.result?.fetchMoreRows
      ? fetchMoreRows0
      : undefined;

  const dataResult = lastIncrementalRows ?? dataService.lastValidData?.result;

  return {
    onScroll,
    onUpdate,
    onTouch,
    pks: pks.lastValidData ?? undefined,
    dataResult,
    error: dataService.error,
    currentFilter: dataService.lastValidData?.currentFilter,
    status: dataService.status,
    defaultSort: defaultSort as Sort | undefined,
    currentSort: dataService.lastValidData?.currentSort as Sort | undefined,
    dataStatus: dataService.status,
    onChangeSort,
    onChangeFilter,
    limit,
    onChangeLimit,
    fetchMoreRows,
  };
}
