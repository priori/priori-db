import { Result } from 'db/util';
import { useEffect, useState } from 'react';
import { Connection } from '../../db/Connection';
import { Grid } from '../Grid';
import { TableFrameProps } from '../../types';

function buildWhere() {
  return '';
}

function buildSortSql() {
  return '';
}

export function TableFrame(props: TableFrameProps) {
  const [state, setState] = useState({ res: undefined as undefined | Result });

  const query = `SELECT * FROM "${props.schema}"."${
    props.table
  }" ${buildWhere()}${buildSortSql()}LIMIT 1000`;

  useEffect(() => {
    let mounted = true;
    Connection.query(query, []).then(
      (res) => {
        // res.fields.forEach( f => {
        //     const sortCol = this.sort.find( c => c.col == f.name )
        //     if ( sortCol )
        //         f.sort = sortCol.direction || void 0;
        // })
        // (res as any).sort = [{colIndex|uniqueName:'?',direction:'ASC'|'DESC'}]
        if (mounted) setState({ res });
      },
      (err) => {
        if (mounted) {
          // eslint-disable-next-line no-console
          console.error(err);
          alert(err);
        }
      }
    );
    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <>
      {state.res && (
        <Grid
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          }}
          result={state.res}
        />
      )}
    </>
  );
}
