import { keepTabOpen } from 'state/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { query } from '../../db/Connection';
import { DataGrid } from '../util/DataGrid/DataGrid';
import { TableFrameProps } from '../../types';

function buildWhere() {
  return '';
}

function buildSortSql() {
  return '';
}

export function TableFrame(props: TableFrameProps) {
  const sql = `SELECT * FROM "${props.schema}"."${
    props.table
  }" ${buildWhere()}${buildSortSql()}LIMIT 1000`;

  const service = useService(() => query(sql, [], true), [sql]);

  const onscroll = useEvent(() => {
    keepTabOpen(props.uid);
  });

  useTab({
    f5() {
      service.reload();
    },
  });

  return (
    <>
      {service.lastValidData && (
        <DataGrid
          onScroll={onscroll}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          }}
          result={service.lastValidData}
          emptyTable="Empty Table"
        />
      )}
    </>
  );
}
