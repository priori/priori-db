/* eslint-disable promise/catch-or-return */
import { Connection } from '../../db/Connection';
import { Grid } from '../Grid';
import { TableFrameProps } from '../../types';
import { Frame } from './Frame';

function buildWhere() {
  return '';
}

function buildSortSql() {
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TableFrame extends Frame<TableFrameProps, { res: any }> {
  // editor: any = null;

  constructor(props: TableFrameProps) {
    super(props);
    this.state = { res: undefined };

    const query = `SELECT * FROM "${this.props.schema}"."${
      this.props.table
    }" ${buildWhere()}${buildSortSql()}LIMIT 1000`;
    Connection.query(query, []).then(
      (res) => {
        // res.fields.forEach( f => {
        //     const sortCol = this.sort.find( c => c.col == f.name )
        //     if ( sortCol )
        //         f.sort = sortCol.direction || void 0;
        // })
        // (res as any).sort = [{colIndex|uniqueName:'?',direction:'ASC'|'DESC'}]
        this.setState({ res });
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        alert(err);
      }
    );
  }

  render() {
    return (
      <div
        className={`frame table-tab${this.props.active ? ' active' : ''}`}
        ref={(el) => {
          this.el = el;
        }}
      >
        {this.state.res && (
          <Grid
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
            }}
            result={this.state.res}
          />
        )}
      </div>
    );
  }
}
