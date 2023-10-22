import { keepTabOpen } from 'state/actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { useTab } from 'components/main/connected/ConnectedApp';
import { query } from '../../db/Connection';
import { DataGrid } from '../util/DataGrid/DataGrid';
import { TableFrameProps } from '../../types';
import { DB } from 'db/DB';

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

  const pks = useService(
    () => DB.pks(props.schema, props.table),
    [props.schema, props.table]
  );

  const onscroll = useEvent(() => {
    keepTabOpen(props.uid);
  });

  const onUpdate = useEvent(
    async (
      update: {
        where: { [fieldName: string]: string | number | null };
        values: { [fieldName: string]: string };
      }[]
    ) => {
      await DB.update(props.schema, props.table, update);
      service.reload();
      return true;
    }
  );

  useTab({
    f5() {
      service.reload();
    },
  });

  return (
    <>
      {service.lastValidData && (
        <DataGrid
          pks={pks.lastValidData || undefined}
          onScroll={onscroll}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          }}
          onUpdate={onUpdate}
          result={service.lastValidData}
          emptyTable="Empty Table"
        />
      )}
    </>
  );
}
