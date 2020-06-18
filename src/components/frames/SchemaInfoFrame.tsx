import * as React from "react";
import { SchemaInfoFrameProps } from "../../types";
import { Frame } from "./Frame";
import { dropSchema, dropSchemaCascade } from "../../actions";

export class SchemaInfoFrame extends Frame<SchemaInfoFrameProps, any> {
  constructor(props: SchemaInfoFrameProps) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div
        className={"frame schema-info" + (this.props.active ? " active" : "")}
        ref={(el: HTMLDivElement) => (this.el = el)}
      >
        <h1>{this.props.schema}</h1>
        <button onClick={() => this.drop()}>Drop Schema</button>{" "}
        <button onClick={() => this.dropCascade()}>Drop Cascade</button>
      </div>
    );
  }

  dropCascade() {
    if (confirm("Do you really want to drop cascade this schema?"))
      dropSchemaCascade(this.props.schema);
  }

  drop() {
    if (confirm("Do you really want to drop this schema?"))
      dropSchema(this.props.schema);
  }
}
