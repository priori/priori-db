import * as React from "react";
import { FrameProps, NewTableFrameProps, Type } from "../../types";
import { Frame } from "./Frame";
import { ListInput } from "../util/ListInput";
import { DB } from "../../db/DB";
import { Connection } from "../../db/Connection";
import { throwError } from "../../state";
import { closeThisAndReloadNav } from "../../actions";

export interface ColumnNewTable {
  name: string;
  type: Type | null;
  length: string;
  precision: string;
  notNull: boolean;
  primaryKey: boolean;
}

export interface NewTable {
  name: string;
  owner: string;
  schema: string;
  tableSpace: string;
  comment: string;
  like?: string;
  columns: ColumnNewTable[];
  hasOids: any;
  unlogged: any;
}

// class OpenCloseCategory extends Component<any,any> {
//     constructor(props:any){
//         super(props)
//         this.state = {open:false}
//     }
//     render(){
//         return <div style={{opacity: this.state.open ? 1 : 0.5, borderLeft: '4px solid #ccc', paddingLeft: '10px'}}>
//             <h2 onClick={e=>{
//                 this.setState({open:!this.state.open})
//             }}>{this.state.open?'- ':'+ '}{this.props.title}</h2>
//             {this.state.open ? this.props.children: null}
//         </div>
//     }
// }
class ColumnListInput extends ListInput<ColumnNewTable> {}

export class NewTableFrame extends Frame<
  NewTableFrameProps,
  { constraintsOpen: boolean; newTable: NewTable }
> {
  constructor(props: NewTableFrameProps) {
    super(props);
    this.onChangeCols = this.onChangeCols.bind(this);
    this.colFormRender = this.colFormRender.bind(this);
    this.state = {
      constraintsOpen: false,
      newTable: {
        name: "",
        owner: "",
        schema: props.schema,
        tableSpace: "",
        comment: "",
        unlogged: false,
        hasOids: null,
        columns: []
      }
    };
  }

  save() {
    const pks = this.state.newTable.columns.filter(col => col.primaryKey);

    const query = `CREATE TABLE "${this.props.schema}"."${
      this.state.newTable.name
    }"
        (
        ${this.state.newTable.columns
          .map(col => {
            if (!col.type) throw "Invalid type.";

            return (
              `"${col.name}" ${col.type.name} ` +
              ((col.type.allowLength || col.type.allowPrecision) && col.length
                ? `( ${col.length}${
                    col.type.allowPrecision && col.precision
                      ? ", " + col.precision
                      : ""
                  } )`
                : "") +
              (col.notNull ? " NOT NULL" : "") +
              (pks.length == 1 && col.primaryKey ? " PRIMARY KEY" : "")
            );
          })
          .join(",\n")}
            ${
              pks.length > 1
                ? "PRIMARY KEY (" +
                  pks.map(col => ` "${col.name}"`).join(", ") +
                  ")"
                : ""
            }
        )
        `;

    Connection.query(query).then(
      () => {
        closeThisAndReloadNav(this.props);
      },
      err => {
        throwError(err);
      }
    );
  }

  newEntry() {
    return {
      name: "",
      type: null,
      length: "",
      precision: "",
      notNull: false,
      primaryKey: false
    };
  }

  onChangeCols(cols: ColumnNewTable[]) {
    this.setState({
      ...this.state,
      newTable: { ...this.state.newTable, columns: cols }
    });
  }

  colFormRender(
    c: ColumnNewTable,
    set: (e2: ColumnNewTable) => void,
    drop: (() => void) | null
  ) {
    return (
      <div className="columns-form-column">
        <div className="columns-form-column-name">
          <input
            defaultValue={c.name}
            onChange={e =>
              set({ ...c, name: (e.target as HTMLInputElement).value })
            }
          />
        </div>
        <div className="columns-form-column-type">
          <select
            onChange={e =>
              set({
                ...c,
                type:
                  this.props.types.find(
                    t => t.name == (e.target as HTMLSelectElement).value
                  ) || null
              })
            }
          >
            <option value="" />
            {this.props.types.map(type => (
              <option key={type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="columns-form-column-length">
          {c.type && c.type.allowLength ? (
            <input
              type="number"
              style={{ width: "60px" }}
              onChange={e =>
                set({ ...c, length: (e.target as HTMLInputElement).value })
              }
            />
          ) : null}
        </div>
        <div className="columns-form-column-precision">
          {c.type && c.type.allowPrecision ? (
            <input
              type="number"
              style={{ width: "60px" }}
              onChange={e =>
                set({ ...c, precision: (e.target as HTMLInputElement).value })
              }
            />
          ) : null}
        </div>
        <div className="columns-form-column-notnull">
          {c.notNull ? (
            <i
              tabIndex={0}
              className="fa fa-check-square-o"
              onClick={() => set({ ...c, notNull: false })}
            />
          ) : (
            <i
              tabIndex={0}
              className="fa fa-square-o"
              onClick={() => set({ ...c, notNull: true })}
            />
          )}
        </div>
        <div className="columns-form-column-pk">
          {c.primaryKey ? (
            <i
              tabIndex={0}
              className="fa fa-check-square-o"
              onClick={() => set({ ...c, primaryKey: false })}
            />
          ) : (
            <i
              tabIndex={0}
              className="fa fa-square-o"
              onClick={() => set({ ...c, primaryKey: true })}
            />
          )}
        </div>
        <div className="columns-form-column-drop">
          {drop && (
            <i tabIndex={0} className="fa fa-close" onClick={() => drop()} />
          )}
        </div>
      </div>
    );
  }

  render() {
    return (
      <div
        className={"frame new-table" + (this.props.active ? " active" : "")}
        ref={el => (this.el = el)}
        style={{ overflowX: "auto", overflowY: "scroll" }}
      >
        <div style={{ width: "720px" }}>
          <h1>New Table in {this.props.schema}</h1>
          <div className="form-field input-form-field">
            Name:{" "}
            <input
              onChange={e =>
                this.setState({
                  ...this.state,
                  newTable: {
                    ...this.state.newTable,
                    name: (e.target as HTMLInputElement).value
                  }
                })
              }
            />
          </div>
          {/*
                <div className="form-field combo-form-field">
                    Owner:
                    <input onChange={e=>this.setState({...this.state,newTable:{...this.state.newTable,
                      owner:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field combo-form-field">
                    Schema:
                    <input defaultValue={this.state.newTable.schema}
                           onChange={e=>this.setState({...this.state,newTable:{...this.state.newTable,
                            schema:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field combo-form-field">
                    TableSpace:
                    <input onChange={e=>this.setState({...this.state,newTable:{...this.state.newTable,
                      tableSpace:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field textarea-form-field">
                    Comment:
                    <textarea
                        defaultValue={this.state.newTable.comment}
                        onChange={e=>this.setState({...this.state,newTable:{...this.state.newTable,
                          comment:(e.target as HTMLTextAreaElement).value}})} ></textarea>
                </div>*/}
          <h2>Columns</h2>

          <div className="columns-form">
            <div className="head">
              <div className="columns-form-head-name">Name</div>
              <div className="columns-form-head-type">Data Type</div>
              <div className="columns-form-head-length">Length</div>
              <div className="columns-form-head-precision">Precision</div>
              <div className="columns-form-head-notnull">Not Null</div>
              <div className="columns-form-head-pk">Primary Key</div>
            </div>
            <ColumnListInput
              entries={this.state.newTable.columns}
              newEntry={this.newEntry}
              onChange={this.onChangeCols}
              entryRender={this.colFormRender}
            />
          </div>
          {/*
                <OpenCloseCategory title="Constraints">
                    <h3>Primary Key</h3>
                    Name: <input type="text"/><br/>
                    Comment: <textarea></textarea><br/>
                    Columns: <br/>
                    Tablespace: <input type="text"/><br/>
                    Fill factor: <input type="number"/><br/>
                    Deferrable <i className="fa fa-square-o"/><br/>
                    Deferred <i className="fa fa-square-o"/>
                    <h3>Foreign Key</h3>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Comment</th>
                            <th>Definition</th>
                            <th>Columns</th>
                            <th>Actions</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <input type="text"/>
                                </td>
                                <td>
                                    <textarea></textarea>
                                </td>
                                <td>

                                    <i className="fa fa-square-o" /> Deferrable<br/>
                                    <i className="fa fa-square-o" /> Deferred<br/>
                                    Math type <select>
                                        <option value="SIMPLE">SIMPLE</option>
                                        <option value="FULL">FULL</option>
                                    </select><br/>
                                    <i className="fa fa-square-o" /> Validated<br/>
                                    <i className="fa fa-square-o" /> Auto FK index<br/>
                                    Convering index <input type="text" disabled={true}/>
                                </td>
                                <td>
                                    Local: <select>
                                        <option></option>
                                        {this.state.newTable.columns.filter(c=>c.name).map(c=> <option value={c.name} key={c.name}>
                                            {c.name}
                                        </option>)}
                                </select><br/>
                                    References: <input type="text"/> (combo, table)<br/>
                                    Referencing: <input type="text"/> (combo, column)
                                </td>
                                <td>
                                    On update <select>
                                        <option value="NO ACTION">NO ACTION</option>
                                        <option value="RESTRICT">RESTRICT</option>
                                        <option value="CASCADE">CASCADE</option>
                                        <option value="SET NULL">SET NULL</option>
                                        <option value="SET DEFAULT">SET DEFAULT</option>
                                    </select><br/>
                                    On delete <select>
                                        <option value="NO ACTION">NO ACTION</option>
                                        <option value="RESTRICT">RESTRICT</option>
                                        <option value="CASCADE">CASCADE</option>
                                        <option value="SET NULL">SET NULL</option>
                                        <option value="SET DEFAULT">SET DEFAULT</option>
                                    </select>
                                </td>
                                <td>
                                    <i className="fa fa-close"/>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <h3>Check</h3>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Comment</th>
                            <th>Check</th>
                            <th>No Inherit</th>
                            <th>Don't validate</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td><input type="text"/></td>
                            <td><textarea ></textarea></td>
                            <td>
                                <textarea></textarea>
                            </td>
                            <td>
                                <i className="fa fa-square-o" />
                            </td>
                            <td>
                                <i className="fa fa-square-o" />
                            </td>
                            <td>
                                <i className="fa fa-close"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    <h3>Unique</h3>
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Comment</th>
                            <th>Columns</th>
                            <th>Tablespace</th>
                            <th>Fill factor</th>
                            <th>Deferrable</th>
                            <th>Deferred</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><input type="text"/></td>
                                <td><textarea ></textarea></td>
                                <td>
                                    <select>
                                        <option></option>
                                    {this.state.newTable.columns.filter(c=>c.name).map(c=> <option value={c.name} key={c.name}>
                                        {c.name}
                                    </option>)}
                                </select></td>
                                <td>
                                    <input type="text"/>
                                </td>
                                <td>
                                    <input type="number"/>
                                </td>
                                <td>
                                    <i className="fa fa-square-o" />
                                </td>
                                <td>
                                    <i className="fa fa-square-o" />
                                </td>
                                <td>
                                    <i className="fa fa-close"/>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <h3>Exclude</h3>
                    <div>...</div>
                </OpenCloseCategory>
                <OpenCloseCategory title="Advanced">
                <div className="form-field textarea-form-field">
                    Of type: <input type="text"/>
                </div>
                <div className="form-field number-form-field">
                    Fill factor: <input type="number"/>
                </div>
                <div className="form-field checkbox-form-field"
                     onClick={e=>this.setState({newTable:{...this.state.newTable,hasOids:!this.state.newTable.hasOids}})}>
                    {this.state.newTable.hasOids? <i className="fa fa-check-square-o"/>: <i className="fa fa-square-o"/> }{' '}
                    Has Oids
                </div>
                <div className="form-field checkbox-form-field"
                     onClick={e=>this.setState({newTable:{...this.state.newTable,unlogged:!this.state.newTable.unlogged}})}>
                    {this.state.newTable.unlogged? <i className="fa fa-check-square-o"/>: <i className="fa fa-square-o"/> }{' '}
                    Unlogged
                </div>
                <div style={{ opacity: !this.state.newTable.like ? 0.5 : 1 }}>
                    <div className="form-field input-form-field">
                        Like: <input onChange={e=>this.setState({newTable:{...this.state.newTable,like:e.target.value}})} /> (combo)
                    </div>
                    <div className="form-field checkbox-form-field not-checked">
                        <i className="fa fa-square-o"/> With default value
                    </div>
                    <div className="form-field checkbox-form-field not-checked">
                        <i className="fa fa-square-o"/> With constraints
                    </div>
                    <div className="form-field checkbox-form-field not-checked">
                        <i className="fa fa-square-o"/> With indexes
                    </div>
                    <div className="form-field checkbox-form-field not-checked">
                        <i className="fa fa-square-o"/> With storage
                    </div>
                    <div className="form-field checkbox-form-field not-checked">
                        <i className="fa fa-square-o"/> With comments
                    </div>
                </div>
                </OpenCloseCategory>
                <OpenCloseCategory title="Parameter">
                    <pre>{`
Table custom auto-vacuum?
ANALYZE scale factor int (mostrar default), ANALYZE base threshold int (mostrar default), FREEZE maximum age,
VACCUUM cost delay, VACCUUM scale factor, FACUUM base threshold, FREEZE minimum age, FREEZE table age
Toast Table Custom auto-vacuum?
FREEZE maximum age, VACCUUM cost delay, VACCUUM cost limit, VACCUUM scale factor, FACUUM base threshold, FREEZE   minimum age, FREEZE table age
Security:
`}</pre>
                </OpenCloseCategory>
                <OpenCloseCategory title="Security">
                    <h3>Privileges</h3>
                    <table>
                        <thead>
                        <tr>
                            <th>Grantee</th>
                            <th>Privileges</th>
                            <th>Grantor</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <input type="text"/> (combo)
                                </td>
                                <td>
                                    <i className="fa fa-square-o"/> ALL <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> INSERT <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> SELECT <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> UPDATE <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> DELETE <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> TRUNCATE <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> REFERENCES <i className="fa fa-square-o"/> WITH GRANT OPTION<br/>
                                    <i className="fa fa-square-o" /> TRIGGER <i className="fa fa-square-o"/> WITH GRANT OPTION
                                </td>
                                <td><i className="fa fa-close"></i></td>
                            </tr>
                        </tbody>
                    </table>
                    <h4>Labels</h4>
                    <table>
                        <thead>
                        <tr>
                            <th>Provider</th>
                            <th>Label</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td><input/></td>
                            <td><input/></td>
                        </tr>
                        </tbody>
                    </table>
                </OpenCloseCategory>
                <OpenCloseCategory title="SQL">
                <textarea readOnly={true} style={{width:'100%',display:'block',height:'400px',padding:'10px'}}
                    value={`CREATE UNLOGGED TABLE public."asdfasdf asdf"
(
    LIKE public.actor
    INCLUDING DEFAULTS
    INCLUDING CONSTRAINTS
    INCLUDING INDEXES
    INCLUDING STORAGE
    INCLUDING COMMENTS,
    asdfasdf numeric(10, 2) NOT NULL,
    babasdf bigserial NOT NULL,
    PRIMARY KEY (asdfasdf, babasdf)
)
WITH (
    OIDS = TRUE,
    autovacuum_enabled = TRUE,
    toast.autovacuum_enabled = TRUE,
    autovacuum_analyze_scale_factor = 1234,
    autovacuum_analyze_threshold = 134,
    autovacuum_freeze_max_age = 234,
    autovacuum_vacuum_cost_delay = 1234,
    autovacuum_vacuum_cost_limit = 1234,
    autovacuum_vacuum_scale_factor = 1234,
    autovacuum_vacuum_threshold = 1234,
    autovacuum_freeze_min_age = 1234,
    autovacuum_freeze_table_age = 1234,
    toast.autovacuum_freeze_max_age = 12,
    toast.autovacuum_vacuum_cost_delay = 2,
    toast.autovacuum_vacuum_cost_limit = 12,
    toast.autovacuum_vacuum_scale_factor = 2,
    toast.autovacuum_vacuum_threshold = 123,
    toast.autovacuum_freeze_min_age = 13,
    toast.autovacuum_freeze_table_age = 123
)
TABLESPACE pg_default;

ALTER TABLE public."asdfasdf asdf"
OWNER to postgres;

SECURITY LABEL FOR asfasdf ON TABLE public."asdfasdf asdf" IS 'sdfasdfasdf';

GRANT INSERT ON TABLE public."asdfasdf asdf" TO pg_signal_backend WITH GRANT OPTION;

COMMENT ON TABLE public."asdfasdf asdf"
IS 'asdf asdf';
`} /><br/>
                </OpenCloseCategory><br/>
                        */}
          <br />
          <button onClick={() => this.save()}>Save</button>
        </div>
      </div>
    );
  }
}
