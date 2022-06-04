import { SchemaInfoFrameProps } from '../../types';
import { dropSchema, dropSchemaCascade } from '../../actions';

export function SchemaInfoFrame(props: SchemaInfoFrameProps) {
  function dropCascade() {
    if (window.confirm('Do you really want to drop cascade this schema?'))
      dropSchemaCascade(props.schema);
  }

  function drop() {
    if (window.confirm('Do you really want to drop this schema?'))
      dropSchema(props.schema);
  }
  return (
    <div>
      <h1>{props.schema}</h1>
      <button type="button" onClick={() => drop()}>
        Drop Schema
      </button>{' '}
      <button type="button" onClick={() => dropCascade()}>
        Drop Cascade
      </button>
    </div>
  );
}
