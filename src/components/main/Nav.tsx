import { Component } from "react";
import * as React from "react";
import {
  newSchema,
  newTable,
  openSchema,
  openTable,
  schemaInfo,
  tableInfo
} from "../../actions";
import { FrameProps, NavSchema } from "../../types";
import { fullView, openFunctions, openSequences } from "../../state";

export class Nav extends Component<
  { schemas: NavSchema[]; tabs: FrameProps[] },
  {}
> {
  render() {
    const active = this.props.tabs.find(c => c.active) || null;
    return (
      <div className="nav">
        {this.props.schemas &&
          this.props.schemas.map(schema => (
            <div className="schema" key={schema.name}>
              <div
                className={
                  "schema-name arrow" +
                  (schema.open ? " open" : "") +
                  (schema.fullView ? " full-view" : "")
                }
                onClick={() => openSchema(schema.name)}
              >
                {schema.name}
                <span
                  className="view-mode"
                  onClick={e => {
                    fullView(schema.name);
                    e.stopPropagation();
                  }}
                >
                  <i className="fa fa-eye" />
                </span>
                <span
                  className="schema-info"
                  onClick={e => {
                    schemaInfo(schema.name);
                    e.stopPropagation();
                  }}
                >
                  <i className="fa fa-info-circle" />
                </span>
                <span
                  className="new-table"
                  onClick={e => {
                    newTable(schema.name);
                    e.stopPropagation();
                  }}
                >
                  <i className="fa fa-plus" />
                </span>
              </div>
              <div
                className="tables"
                style={{ overflow: "hidden", height: this.height(schema) }}
              >
                {schema.tables &&
                  schema.tables.map(t => {
                    const isActive =
                      active &&
                      (active.type == "table" || active.type == "tableinfo") &&
                      active.schema == schema.name &&
                      active.table == t.name;
                    const isOpen = this.props.tabs.find(
                      c =>
                        (c.type == "table" || c.type == "tableinfo") &&
                        c.schema == schema.name &&
                        c.table == t.name
                    );
                    return (
                      <div
                        className={
                          "table" +
                          (isActive ? " active" : "") +
                          (isOpen ? " open" : "") + 
                          (t.type == 'VIEW' ? ' view' : t.type == 'MATERIALIZED VIEW' ? ' mview' : '')
                        }
                        key={t.name}
                      >
                        <div
                          className="table-name"
                          onClick={_ => openTable(schema.name, t)}
                        >
                          <i
                            className={
                              "table-type fa fa-table"
                            }
                          />
                          {t.name}
                        </div>
                        {t.type == "BASE TABLE" ? (
                          <span
                            className="table-info"
                            onClick={e => {
                              tableInfo(schema.name, t.name);
                              e.stopPropagation();
                            }}
                          >
                            <i className="fa fa-info-circle" />
                          </span>
                        ) : (
                          undefined
                        )}
                      </div>
                    );
                  })}
                {schema.fullView ? null : (
                  <div
                    className="more"
                    onClick={() => {
                      fullView(schema.name);
                    }}
                  >
                    <i className="fa fa-ellipsis-h" />
                  </div>
                )}
                {schema.fullView && schema.functions ? (
                  <div className={"group"+(schema.functions.length?'':' empty')}>
                    <div
                      className={
                        "group-name functions arrow" +
                        (schema.functionsOpen ? " open" : "")
                      }
                      onClick={() => schema.functions && schema.functions.length && openFunctions(schema)}
                    >
                      Functions <span
                      style={{
                        float: 'right',
                        fontWeight: 'bold',
                        position: 'absolute',
                        color: 'rgba(0,0,0,.2)',
                        right: '10px'
                      }}
                      >{schema.functions.length}</span>
                    </div>
                    <div className="functions">
                      {schema.functionsOpen
                        ? schema.functions.map((f, k) => (
                            <div key={k} className="function">
                              <div className="function-name">{f.name}</div>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                ) : null}
                {schema.fullView && schema.sequences ? (
                  <div className={"group"+(schema.sequences.length?'':' empty')}>
                    <div
                      className={
                        "group-name sequences arrow" +
                        (schema.sequencesOpen ? " open" : "")
                      }
                      onClick={() => schema.sequences && schema.sequences.length && openSequences(schema)}
                    >
                      Sequences
                      <span
                      style={{
                        float: 'right',
                        fontWeight: 'bold',
                        position: 'absolute',
                        color: 'rgba(0,0,0,.2)',
                        right: '10px'
                      }}
                      >{schema.sequences.length}</span>
                    </div>
                    {schema.sequencesOpen ? (
                      <div className="sequences">
                        {schema.sequences.map((f, k) => (
                          <div key={k} className="sequence">
                            <div className="sequence-name">
                              <i className="fa fa-list-ol" /> {f.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        <span className="new-schema" onClick={_ => newSchema()}>
          <i className="fa fa-plus" />
        </span>
      </div>
    );
  }

  private height(schema: NavSchema) {
    if (!schema.open || !schema.tables) return 0;
    if (schema.fullView) {
      if (!schema.functions || !schema.sequences) throw "e!";
      return (
        schema.tables.length * 20 +
        40 +
        (schema.functionsOpen ? schema.functions.length * 20 : 0) +
        (schema.sequencesOpen ? schema.sequences.length * 20 : 0)
      );
    }
    return schema.tables.length * 20 + 20;
  }
}
