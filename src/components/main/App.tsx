import * as React from "react";
import { Component, ComponentClass } from "react";
import { sub } from "../../state";
import { QueryFrame } from "../../components/frames/QueryFrame";
import { TableFrame } from "../../components/frames/TableFrame";
import { AppState } from "../../types";
import { NewTableFrame } from "../../components/frames/NewTableFrame";
import { SchemaInfoFrame } from "../../components/frames/SchemaInfoFrame";
import { TableInfoFrame } from "../../components/frames/TableInfoFrame";
import { Nav } from "./Nav";
import { Tabs } from "./Tabs";
import { Home } from "./home/Home";
import { cancelCreateSchema, createSchema } from "../../actions";

const framesTypes = {
  query: QueryFrame,
  table: TableFrame,
  newtable: NewTableFrame,
  schemainfo: SchemaInfoFrame,
  tableinfo: TableInfoFrame
};

export class App extends Component<{}, AppState> {
  mounted = false;
  schemaName = "";
  constructor(props: {}) {
    super(props);
    sub(state => {
      if (this.mounted) this.setState(state);
      else this.state = state;
    });
  }
  componentWillMount() {
    this.mounted = true;
  }
  render() {
    if (this.state.connected) {
      return (
        <div>
          <div className="header">{this.state.title}</div>
          <Tabs tabs={this.state.tabs} />
          {this.state.schemas ? (
            <Nav schemas={this.state.schemas} tabs={this.state.tabs} />
          ) : (
            undefined
          )}
          <div className="app-content">
            {this.state.tabs.map(t =>
              React.createElement(
                (framesTypes as any)[t.type] as ComponentClass<{}>,
                { ...t, key: t.uid } as React.Attributes & any
              )
            )}
          </div>
          {this.state.newSchema ? (
            <div className="new-schema-form">
              <div>
                Name:{" "}
                <input
                  type="text"
                  onChange={e =>
                    (this.schemaName = (e.target as HTMLInputElement).value)
                  }
                />{" "}
                <button onClick={_ => createSchema(this.schemaName)}>Ok</button>{" "}
                <button onClick={() => cancelCreateSchema()}>Cancel</button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    return <Home {...this.state} />;
  }
}

const myClass: typeof App = App;
