import { useState } from 'react';
import { db } from 'db/db';
import { useService } from 'util/useService';
import { assert } from 'util/assert';
import { NewTableFrameProps, TableColumnType } from '../../types';
import { ListInput } from '../util/ListInput';
import { closeThisAndReloadNav, showError } from '../../state/actions';

export interface ColumnNewTable {
  name: string;
  type: TableColumnType | null;
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
  // hasOids: any;
  // unlogged: any;
}

// class OpenCloseCategory extends Component<any,any> {
//     constructor(props:any){
//         super(props)
//         state = {open:false}
//     }
//     render(){
//         return <div style={{opacity: state.open ? 1 : 0.5, borderLeft: '4px solid #ccc', paddingLeft: '10px'}}>
//             <h2 onClick={e=>{
//                 setState({open:!state.open})
//             }}>{state.open?'- ':'+ '}{props.title}</h2>
//             {state.open ? props.children: null}
//         </div>
//     }
// }
class ColumnListInput extends ListInput<ColumnNewTable> {}

export function NewTableFrame(props: NewTableFrameProps) {
  const [state, setState] = useState({
    constraintsOpen: false,
    newTable: {
      name: '',
      owner: '',
      schema: props.schema,
      tableSpace: '',
      comment: '',
      // unlogged: false,
      // hasOids: null,
      columns: [],
    },
  } as { constraintsOpen: boolean; newTable: NewTable });

  const typesService = useService(() => db().types(), []);
  const types = typesService.lastValidData;

  function save() {
    db()
      .createTable(state.newTable)
      .then(
        () => {
          closeThisAndReloadNav(props.uid);
        },
        (err) => {
          showError(err);
        },
      );
  }

  const newEntry = () => {
    return {
      name: '',
      type: null,
      length: '',
      precision: '',
      notNull: false,
      primaryKey: false,
    } as ColumnNewTable;
  };

  const onChangeCols = (cols: ColumnNewTable[]) => {
    setState((state2) => ({
      ...state2,
      newTable: { ...state.newTable, columns: cols },
    }));
  };

  const colFormRender = (
    c: ColumnNewTable,
    set: (e2: ColumnNewTable) => void,
    drop: (() => void) | null,
  ) => {
    assert(types);
    return (
      <div className="columns-form-column">
        <div className="columns-form-column-name">
          <input
            defaultValue={c.name}
            onChange={(e) =>
              set({ ...c, name: (e.target as HTMLInputElement).value })
            }
          />
        </div>
        <div className="columns-form-column-type">
          <select
            onChange={(e) =>
              set({
                ...c,
                type:
                  types.find(
                    (t) => t.name === (e.target as HTMLSelectElement).value,
                  ) || null,
              })
            }
          >
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <option value="" />
            {types.map((type) => (
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
              style={{ width: '60px' }}
              onChange={(e) =>
                set({ ...c, length: (e.target as HTMLInputElement).value })
              }
            />
          ) : null}
        </div>
        <div className="columns-form-column-precision">
          {c.type && c.type.allowPrecision ? (
            <input
              type="number"
              style={{ width: '60px' }}
              onChange={(e) =>
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
              role="checkbox"
              aria-label="Not null"
              aria-checked
              onKeyDown={(e) => {
                if (e.key === 'Space' || e.key === ' ' || e.key === 'Enter')
                  set({ ...c, notNull: false });
              }}
              onClick={() => set({ ...c, notNull: false })}
            />
          ) : (
            <i
              tabIndex={0}
              role="checkbox"
              aria-checked={false}
              aria-label="Not null"
              onKeyDown={(e) => {
                if (e.key === 'Space' || e.key === ' ' || e.key === 'Enter')
                  set({ ...c, notNull: true });
              }}
              className="fa fa-square-o"
              onClick={() => set({ ...c, notNull: true })}
            />
          )}
        </div>
        <div className="columns-form-column-pk">
          {c.primaryKey ? (
            <i
              tabIndex={0}
              role="checkbox"
              aria-label="Primary Key"
              aria-checked
              onKeyDown={(e) => {
                if (e.key === 'Space' || e.key === ' ' || e.key === 'Enter')
                  set({ ...c, primaryKey: false });
              }}
              className="fa fa-check-square-o"
              onClick={() => set({ ...c, primaryKey: false })}
            />
          ) : (
            <i
              tabIndex={0}
              className="fa fa-square-o"
              role="checkbox"
              aria-label="Primary Key"
              aria-checked={false}
              onKeyDown={(e) => {
                if (e.key === 'Space' || e.key === ' ' || e.key === 'Enter')
                  set({ ...c, primaryKey: true });
              }}
              onClick={() => set({ ...c, primaryKey: true })}
            />
          )}
        </div>
        <div className="columns-form-column-drop">
          {drop && (
            <i
              tabIndex={0}
              className="fa fa-close"
              role="button"
              aria-label="Close"
              onKeyDown={(e) => {
                if (e.key === 'Space' || e.key === ' ' || e.key === 'Enter')
                  drop();
              }}
              onClick={() => drop()}
            />
          )}
        </div>
      </div>
    );
  };

  if (!types) return <div style={{ width: '720px' }} />;

  return (
    <div style={{ width: '720px' }}>
      <h1>New Table in {props.schema}</h1>
      <div className="form-field input-form-field">
        Name:{' '}
        <input
          onChange={(e) =>
            setState((state2) => ({
              ...state2,
              newTable: {
                ...state.newTable,
                name: (e.target as HTMLInputElement).value,
              },
            }))
          }
        />
      </div>
      {/*
                <div className="form-field combo-form-field">
                    Owner:
                    <input onChange={e=>setState({...state,newTable:{...state.newTable,
                      owner:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field combo-form-field">
                    Schema:
                    <input defaultValue={state.newTable.schema}
                           onChange={e=>setState({...state,newTable:{...state.newTable,
                            schema:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field combo-form-field">
                    TableSpace:
                    <input onChange={e=>setState({...state,newTable:{...state.newTable,
                      tableSpace:(e.target as HTMLInputElement).value}})} /> (combo)
                </div>
                <div className="form-field textarea-form-field">
                    Comment:
                    <textarea
                        defaultValue={state.newTable.comment}
                        onChange={e=>setState({...state,newTable:{...state.newTable,
                          comment:(e.target as HTMLTextAreaElement).value}})} ></textarea>
                </div> */}
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
          entries={state.newTable.columns}
          newEntry={newEntry}
          onChange={onChangeCols}
          entryRender={colFormRender}
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
                                        {state.newTable.columns.filter(c=>c.name).map(c=> <option value={c.name} key={c.name}>
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
                                    {state.newTable.columns.filter(c=>c.name).map(c=> <option value={c.name} key={c.name}>
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
                     onClick={e=>setState({newTable:{...state.newTable,hasOids:!state.newTable.hasOids}})}>
                    {state.newTable.hasOids? <i className="fa fa-check-square-o"/>: <i className="fa fa-square-o"/> }{' '}
                    Has Oids
                </div>
                <div className="form-field checkbox-form-field"
                     onClick={e=>setState({newTable:{...state.newTable,unlogged:!state.newTable.unlogged}})}>
                    {state.newTable.unlogged? <i className="fa fa-check-square-o"/>: <i className="fa fa-square-o"/> }{' '}
                    Unlogged
                </div>
                <div style={{ opacity: !state.newTable.like ? 0.5 : 1 }}>
                    <div className="form-field input-form-field">
                        Like: <input onChange={e=>setState({newTable:{...state.newTable,like:e.target.value}})} /> (combo)
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
      <button type="button" onClick={() => save()}>
        Save
      </button>
    </div>
  );
}
