import { keepTabOpen } from 'state/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { DB } from 'db/DB';
import { useState } from 'react';
import { Filter, Sort } from 'db/util';
import { QueryResultData } from 'db/Connection';
import { TableFrameProps } from '../../../types';

export function useTableDataFrame(props: TableFrameProps) {
  const [sort, setSort] = useState<Sort | undefined>(undefined);
  const [filter, setFilter] = useState<Filter | undefined>(undefined);

  const defaultSortService = useService(
    () => DB.defaultSort(props.schema, props.table) as Promise<Sort>,
    [props.schema, props.table],
  );

  const defaultSort = defaultSortService.lastValidData;

  const sortReady = defaultSortService.status === 'success';

  const selectedSort = sort || defaultSortService.lastValidData;

  const dataService = useService(async () => {
    if (!sortReady)
      return new Promise<{
        result: QueryResultData;
        currentSort: Sort;
        currentFilter?: Filter;
      }>(() => {});

    const result = await DB.select({
      schema: props.schema,
      table: props.table,
      sort: selectedSort,
      filter,
    });

    return {
      result,
      currentSort: selectedSort as Sort,
      currentFilter: filter,
    };
  }, [props.schema, props.table, selectedSort, sortReady, filter]);

  const pks = useService(
    () => DB.pks(props.schema, props.table),
    [props.schema, props.table],
  );

  const onScroll = useEvent(() => {
    keepTabOpen(props.uid);
  });

  const onUpdate = useEvent(
    async ({
      updates,
      inserts,
    }: {
      updates: {
        where: { [fieldName: string]: string | number | null };
        values: { [fieldName: string]: string | null };
      }[];
      inserts: { [fieldName: string]: string | null }[];
    }) => {
      if ((!pks.lastValidData || !pks.lastValidData.length) && updates.length) {
        throw new Error('Primay Keys not found for table!!');
      }
      await DB.update(props.schema, props.table, updates, inserts);
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

  return {
    onScroll,
    onUpdate,
    onTouch,
    pks: pks.lastValidData ?? undefined,
    dataResult: dataService.lastValidData?.result,
    error: dataService.error,
    currentFilter: dataService.lastValidData?.currentFilter,
    status: dataService.status,
    defaultSort: defaultSort as Sort | undefined,
    currentSort: dataService.lastValidData?.currentSort as Sort | undefined,
    dataStatus: dataService.status,
    onChangeSort,
    onChangeFilter,
  };
}
