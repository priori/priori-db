import { JSX } from 'react';
import { DataGrid } from '../../util/DataGrid/DataGrid';
import { TableFrameProps } from '../../../types';
import { useTableDataFrame } from './tableDataFrameUtils';

export function TableDataFrame(props: TableFrameProps): JSX.Element {
  const {
    onUpdate,
    onScroll,
    pks,
    dataResult,
    error,
    status,
    defaultSort,
    currentSort,
    currentFilter,
    onChangeSort,
    dataStatus,
    onChangeFilter,
    onTouch,
    limit,
    onChangeLimit,
    fetchMoreRows,
  } = useTableDataFrame(props);

  return (
    (dataResult && (
      <DataGrid
        className={dataStatus}
        pks={pks}
        onScroll={onScroll}
        style={{
          position: 'absolute',
          inset: 0,
        }}
        fetchMoreRows={fetchMoreRows}
        onUpdate={onUpdate}
        currentFilter={currentFilter}
        defaultSort={defaultSort}
        currentSort={currentSort}
        onChangeFilter={onChangeFilter}
        onChangeSort={onChangeSort}
        result={dataResult}
        emptyTable="Empty Table"
        onTouch={onTouch}
        limit={limit}
        onChangeLimit={onChangeLimit}
      />
    )) ||
    (error?.message && (
      <div className="table-frame--error">
        <div>
          <i className="fa fa-exclamation-triangle" />
          {error.message}
        </div>
      </div>
    )) ||
    (status === 'starting' && (
      <div className="table-frame--loading">
        <div>
          <i
            className="fa fa-circle-o-notch fa-spin"
            style={{ fontSize: 62 }}
          />
        </div>
      </div>
    )) || <div />
  );
}
