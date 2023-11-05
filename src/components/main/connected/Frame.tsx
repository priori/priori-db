import { AbstractTabProps, FrameProps0, FrameType } from 'types';
import { equals } from 'util/equals';
import React, { FunctionComponent } from 'react';
import { assert } from 'util/assert';
import { SequenceFrame } from 'components/frames/SequenceFrame';
import { DomainFrame } from 'components/frames/DomainFrame';
import { FunctionFrame } from 'components/frames/FunctionFrame';
import { RoleFrame } from 'components/frames/RoleFrame';
import { QueryFrame } from '../../frames/QueryFrame/QueryFrame';
import { TableDataFrame } from '../../frames/TableDataFrame/TableDataFrame';
import { NewTableFrame } from '../../frames/NewTableFrame';
import { SchemaInfoFrame } from '../../frames/SchemaInfoFrame';
import { TableInfoFrame } from '../../frames/TableInfoFrame/TableInfoFrame';

type FramesTypesMap<T extends FrameType> = {
  [k in T]: (props: FrameProps0<k>) => JSX.Element;
};

const framesTypes: FramesTypesMap<FrameType> = {
  query: QueryFrame,
  table: TableDataFrame,
  newtable: NewTableFrame,
  schemainfo: SchemaInfoFrame,
  tableinfo: TableInfoFrame,
  sequence: SequenceFrame,
  domain: DomainFrame,
  function: FunctionFrame,
  role: RoleFrame,
};

export const Frame = React.memo(
  (props: AbstractTabProps<FrameType>) => {
    const sType = props.type;
    const type = framesTypes[sType];
    assert(type);
    return React.createElement(
      type as FunctionComponent<AbstractTabProps<FrameType>>,
      props,
    );
  },
  (a, b) => equals(a, b),
);
