import * as React from 'react';
import { ComponentClass } from 'react';
import { NewSchemaForm } from 'components/util/NewSchemaForm';
import { useAppState } from '../../state';
import { QueryFrame } from '../frames/QueryFrame';
import { TableFrame } from '../frames/TableFrame';
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

export function App() {
  const state = useAppState();
  if (state.connected) {
    return (
      <div>
        <div className="header">{state.title}</div>
        <Tabs tabs={state.tabs} />
        {state.schemas ? (
          <Nav schemas={state.schemas} tabs={state.tabs} />
        ) : undefined}
        <div className="app-content">
          {state.tabs.map((t) =>
            React.createElement(
              (framesTypes as never)[t.type] as ComponentClass<
                Record<string, unknown>
              >,
              { ...t, key: t.uid } as React.Attributes & never
            )
          )}
        </div>
        {state.newSchema ? (
          <NewSchemaForm
            onCreateSchema={createSchema}
            onClose={cancelCreateSchema}
          />
        ) : null}
      </div>
    );
  }
  return <Home {...state} />;
}
