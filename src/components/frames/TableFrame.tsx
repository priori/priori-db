import { keepTabOpen } from 'actions';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { query } from '../../db/Connection';
import { Grid } from '../Grid';
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

  return (
    <>
      {service.lastValidData && (
        <Grid
          onScroll={onscroll}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          }}
          result={service.lastValidData}
        />
      )}
    </>
  );
}
