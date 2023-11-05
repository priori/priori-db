import { keepTabOpen } from 'state/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { DB, label } from 'db/DB';
import { useState } from 'react';
import { QueryArrayResult } from 'pg';
import { SimpleValue, query } from '../../../db/Connection';
import { TableFrameProps } from '../../../types';

export function useTableDataFrame(props: TableFrameProps) {
  const [sort, setSort] = useState<
    | {
        field: string;
        direction: string;
      }[]
    | undefined
  >(undefined);

  const defaultSortService = useService(
    () => DB.defaultSort(props.schema, props.table),
    [props.schema, props.table],
  );

  const defaultSort = defaultSortService.lastValidData;

  const sortReady = defaultSortService.status === 'success';

  const selectedSort = sort || defaultSortService.lastValidData;

  const dataService = useService(async () => {
    if (!sortReady)
      return new Promise<{
        result: QueryArrayResult<SimpleValue[]>;
        currentSort: {
          field: string;
          direction: string;
        }[];
      }>(() => {});
    const sql = `SELECT * FROM ${label(props.schema)}.${label(props.table)} ${
      selectedSort && selectedSort.length
        ? `ORDER BY ${selectedSort
            .map(
              (x) =>
                `${label(x.field)}${x.direction === 'desc' ? ' DESC' : ''}`,
            )
            .join(', ')} `
        : ''
    }LIMIT 1000`;
    const result = await query(sql, [], true);
    return {
      result,
      currentSort: selectedSort,
    };
  }, [props.schema, props.table, selectedSort, sortReady]);

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
        values: { [fieldName: string]: string };
      }[],
    ) => {
      await DB.update(props.schema, props.table, update);
      dataService.reload();
      return true;
    },
  );

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
    status: dataService.status,
    defaultSort,
    currentSort: dataService.lastValidData?.currentSort,
    dataStatus: dataService.status,
    onChangeSort: setSort,
  };
}
