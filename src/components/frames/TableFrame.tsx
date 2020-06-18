import * as React from "react";
import { Connection } from "../../db/Connection";
import { Grid } from "../Grid";
import { TableFrameProps } from "../../types";
import { Frame } from "./Frame";

export class TableFrame extends Frame<TableFrameProps, any> {
  editor: any = null;

  constructor(props: TableFrameProps) {
    super(props);
    this.state = {};

    const query =
      'SELECT * FROM "' +
      this.props.schema +
      '"."' +
      this.props.table +
      '" ' +
      this.buildWhere() +
      this.buildSortSql() +
      "LIMIT 1000";
    Connection.query(query, []).then(
      res => {
        // res.fields.forEach( f => {
        //     const sortCol = this.sort.find( c => c.col == f.name )
        //     if ( sortCol )
        //         f.sort = sortCol.direction || void 0;
        // })
        // (res as any).sort = [{colIndex|uniqueName:'?',direction:'ASC'|'DESC'}]
        this.setState({ res });
      },
      err => {
        console.error(err);
        alert(err);
      }
    );
  }

  render() {
    return (
      <div
        className={"frame table-tab" + (this.props.active ? " active" : "")}
        ref={el => (this.el = el)}
      >
        {this.state.res && (
          <Grid
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0
            }}
            result={this.state.res}
          />
        )}
      </div>
    );
  }

  private buildWhere() {
    return "";
  }

  private buildSortSql() {
    return "";
  }
}
