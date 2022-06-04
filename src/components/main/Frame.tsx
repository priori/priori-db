import { FrameProps } from 'types';
import { equals } from 'components/util/equals';
import React from 'react';
// eslint-disable-next-line import/no-cycle
import assert from 'assert';
// eslint-disable-next-line import/no-cycle
import { QueryFrame } from '../frames/QueryFrame';
import { TableFrame } from '../frames/TableFrame';
import { NewTableFrame } from '../frames/NewTableFrame';
import { SchemaInfoFrame } from '../frames/SchemaInfoFrame';
import { TableInfoFrame } from '../frames/TableInfoFrame';

const framesTypes = {
  query: QueryFrame,
  table: TableFrame,
  newtable: NewTableFrame,
  schemainfo: SchemaInfoFrame,
  tableinfo: TableInfoFrame,
};

export const Frame = React.memo(
  ({ props }: { props: FrameProps }) => {
    // eslint-disable-next-line react/prop-types
    const sType = props.type;
    const type = framesTypes[sType];
    assert(type);
    return <>{React.createElement(type, props)}</>;
  },
  (a, b) => equals(a.props, b.props)
);
