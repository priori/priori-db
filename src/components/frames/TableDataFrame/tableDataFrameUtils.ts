import { keepTabOpen } from 'state/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { DB, label } from 'db/DB';
import { useState } from 'react';
import { QueryArrayResult } from 'pg';
import { DataGridSort } from 'components/util/DataGrid/DataGrid';
import {
  Filter,
  buildWhere,
} from 'components/util/DataGrid/DataGridFilterDialog';
import { SimpleValue, query } from '../../../db/Connection';
import { TableFrameProps } from '../../../types';

export function useTableDataFrame(props: TableFrameProps) {
  const [sort, setSort] = useState<DataGridSort | undefined>(undefined);
  const [filter, setFilter] = useState<Filter | undefined>(undefined);

  const defaultSortService = useService(
    () => DB.defaultSort(props.schema, props.table) as Promise<DataGridSort>,
    [props.schema, props.table],
  );

  const defaultSort = defaultSortService.lastValidData;

  const sortReady = defaultSortService.status === 'success';

  const selectedSort = sort || defaultSortService.lastValidData;

  const dataService = useService(async () => {
    if (!sortReady)
      return new Promise<{
        result: QueryArrayResult<SimpleValue[]>;
        currentSort: DataGridSort;
        currentFilter?: Filter;
      }>(() => {});
    const { where, params } = filter
      ? buildWhere(filter)
      : { where: '', params: [] };
    const sql = `SELECT * FROM ${label(props.schema)}.${label(props.table)} ${
      where ? `WHERE ${where} ` : ''
    }${
      selectedSort && selectedSort.length
        ? `ORDER BY ${selectedSort
            .map(
              (x) =>
                `${label(x.field)}${x.direction === 'desc' ? ' DESC' : ''}`,
            )
            .join(', ')} `
        : ''
    }LIMIT 1000`;
    const result = await query(sql, params, true);
    return {
      result,
      currentSort: selectedSort as DataGridSort,
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
    async (
      update: {
        where: { [fieldName: string]: string | number | null };
        values: { [fieldName: string]: string | null };
      }[],
    ) => {
      await DB.update(props.schema, props.table, update);
      dataService.reload();
      return true;
    },
  );

  const onChangeFilter = useEvent((f: Filter) => {
    setFilter(f);
  });

  useTab({
    f5() {
      dataService.reload();
    },
  });

  return {
    onScroll,
    onUpdate,
    pks: pks.lastValidData ?? undefined,
    dataResult: dataService.lastValidData?.result,
    error: dataService.error,
    currentFilter: dataService.lastValidData?.currentFilter,
    status: dataService.status,
    defaultSort: defaultSort as DataGridSort | undefined,
    currentSort: dataService.lastValidData?.currentSort as
      | DataGridSort
      | undefined,
    dataStatus: dataService.status,
    onChangeSort: setSort,
    onChangeFilter,
  };
}
