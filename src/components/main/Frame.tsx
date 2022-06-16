import { AbstractTabProps, FrameProps0, FrameType } from 'types';
import { equals } from 'components/util/equals';
import React from 'react';
import assert from 'assert';
import { QueryFrame } from '../frames/QueryFrame';
import { TableFrame } from '../frames/TableFrame';
import { NewTableFrame } from '../frames/NewTableFrame';
import { SchemaInfoFrame } from '../frames/SchemaInfoFrame';
import { TableInfoFrame } from '../frames/TableInfoFrame';

type FramesTypesMap<T> = T extends FrameType
  ? Record<T, (props: FrameProps0<T>) => JSX.Element>
  : never;

const framesTypes: FramesTypesMap<FrameType> = {
  query: QueryFrame,
  table: TableFrame,
  newtable: NewTableFrame,
  schemainfo: SchemaInfoFrame,
  tableinfo: TableInfoFrame,
};

type FrameContainerProps = {
  props: AbstractTabProps<FrameType> &
    AbstractTabProps<FrameType> & { type: FrameType };
};

export const Frame = React.memo(
  ({ props }: FrameContainerProps) => {
    const sType = props.type;
    const type = framesTypes[sType];
    assert(type);
    return React.createElement(type, props);
  },
  (a, b) => equals(a.props, b.props)
);
