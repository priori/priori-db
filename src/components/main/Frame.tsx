import { AbstractTabProps, FrameProps0, FrameType } from 'types';
import { equals } from 'util/equals';
import React from 'react';
import assert from 'assert';
import { SequenceFrame } from 'components/frames/SequenceFrame';
import { DomainFrame } from 'components/frames/DomainFrame';
import { FunctionFrame } from 'components/frames/FunctionFrame';
import { QueryFrame } from '../frames/QueryFrame/QueryFrame';
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
  sequence: SequenceFrame,
  domain: DomainFrame,
  function: FunctionFrame,
};

export const Frame = React.memo(
  (props: AbstractTabProps<FrameType>) => {
    const sType = props.type;
    const type = framesTypes[sType];
    assert(type);
    return React.createElement(type, props);
  },
  (a, b) => equals(a, b)
);
