import * as React from 'react';
import { Component, ComponentClass } from 'react';
import { sub } from '../../state';
import { QueryFrame } from '../frames/QueryFrame';
import { TableFrame } from '../frames/TableFrame';
import { AppState } from '../../types';
import { NewTableFrame } from '../frames/NewTableFrame';
import { SchemaInfoFrame } from '../frames/SchemaInfoFrame';
import { TableInfoFrame } from '../frames/TableInfoFrame';
import { Nav } from './Nav';
import { Tabs } from './Tabs';
import { Home } from './home/Home';
import { cancelCreateSchema, createSchema } from '../../actions';

const framesTypes = {
  query: QueryFrame,
  table: TableFrame,
  newtable: NewTableFrame,
  schemainfo: SchemaInfoFrame,
  tableinfo: TableInfoFrame,
};

export class App extends Component<never, AppState> {
  mounted = false;

  schemaName = '';

  constructor(props: never) {
    super(props);
    sub((state) => {
      if (this.mounted) this.setState(state);
      else this.state = state;
    });
  }

  componentDidMount() {
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
          ) : undefined}
          <div className="app-content">
            {this.state.tabs.map((t) =>
              React.createElement(
                (framesTypes as never)[t.type] as ComponentClass<
                  Record<string, unknown>
                >,
                { ...t, key: t.uid } as React.Attributes & never
              )
            )}
          </div>
          {this.state.newSchema ? (
            <div className="new-schema-form">
              <div>
                Name:{' '}
                <input
                  type="text"
                  onChange={(e) => {
                    this.schemaName = (e.target as HTMLInputElement).value;
                  }}
                />{' '}
                <button
                  type="button"
                  onClick={() => createSchema(this.schemaName)}
                >
                  Ok
                </button>{' '}
                <button type="button" onClick={() => cancelCreateSchema()}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Home {...this.state} />;
  }
}
