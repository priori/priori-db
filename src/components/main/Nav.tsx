import {
  newSchema,
  newTable,
  openSchema,
  pikTable,
  pikSchemaInfo,
  pikTableInfo,
  keepOpenTable,
  keepTableInfo,
  keepSchemaInfo,
  fullView,
  openFunctions,
  openSequences,
} from '../../actions';
import { NavSchema, Tab } from '../../types';

function height(schema: NavSchema) {
  if (!schema.open || !schema.tables) return 0;
  if (schema.fullView) {
    if (!schema.functions || !schema.sequences) throw new Error('e!');
    return (
      schema.tables.length * 20 +
      40 +
      (schema.functionsOpen ? schema.functions.length * 20 : 0) +
      (schema.sequencesOpen ? schema.sequences.length * 20 : 0)
    );
  }
  return schema.tables.length * 20 + 20;
}
export function Nav(props: { schemas: NavSchema[]; tabs: Tab[] }) {
  const active = props.tabs.find((c) => c.active) || null;
  return (
    <div className="nav">
      {props.schemas &&
        props.schemas.map((schema) => (
          <div className="schema" key={schema.name}>
            <div
              role="button"
              tabIndex={0}
              className={`schema-name arrow${schema.open ? ' open' : ''}${
                schema.fullView ? ' full-view' : ''
              }`}
              onClick={() => openSchema(schema.name)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
                  openSchema(schema.name);
                }
              }}
            >
              {schema.name}
              <span
                role="button"
                tabIndex={0}
                className="view-mode"
                onClick={(e) => {
                  fullView(schema.name);
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
                    fullView(schema.name);
                    e.stopPropagation();
                  }
                }}
              >
                <i className="fa fa-eye" />
              </span>
              <span
                role="button"
                tabIndex={0}
                className="schema-info"
                onClick={(e) => {
                  pikSchemaInfo(schema.name);
                  e.stopPropagation();
                }}
                onDoubleClick={() => {
                  keepSchemaInfo(schema.name);
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
                    pikSchemaInfo(schema.name);
                    e.stopPropagation();
                  }
                }}
              >
                <i className="fa fa-info-circle" />
              </span>
              <span
                role="button"
                tabIndex={0}
                className="new-table"
                onClick={(e) => {
                  newTable(schema.name);
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
                    newTable(schema.name);
                    e.stopPropagation();
                  }
                }}
              >
                <i className="fa fa-plus" />
              </span>
            </div>
            <div
              className="tables"
              style={{ overflow: 'hidden', height: height(schema) }}
            >
              {schema.tables &&
                schema.tables.map((t) => {
                  const isActive =
                    active &&
                    (active.props.type === 'table' ||
                      active.props.type === 'tableinfo') &&
                    active.props.schema === schema.name &&
                    active.props.table === t.name;
                  const isOpen = props.tabs.find(
                    (c) =>
                      (c.props.type === 'table' ||
                        c.props.type === 'tableinfo') &&
                      c.props.schema === schema.name &&
                      c.props.table === t.name
                  );
                  return (
                    <div
                      className={`table${isActive ? ' active' : ''}${
                        isOpen ? ' open' : ''
                      }${
                        t.type === 'VIEW'
                          ? ' view'
                          : t.type === 'MATERIALIZED VIEW'
                          ? ' mview'
                          : ''
                      }`}
                      key={t.name}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className="table-name"
                        onClick={() => pikTable(schema.name, t)}
                        onDoubleClick={() => {
                          keepOpenTable(schema.name, t);
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === ' ' ||
                            e.key === 'Enter' ||
                            e.key === 'Space'
                          ) {
                            pikTable(schema.name, t);
                          }
                        }}
                      >
                        <i className="table-type fa fa-table" />
                        {t.name}
                      </div>
                      {t.type === 'BASE TABLE' ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="table-info"
                          onClick={(e) => {
                            pikTableInfo(schema.name, t.name);
                            e.stopPropagation();
                          }}
                          onDoubleClick={() => {
                            keepTableInfo(schema.name, t.name);
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === ' ' ||
                              e.key === 'Enter' ||
                              e.key === 'Space'
                            ) {
                              pikTableInfo(schema.name, t.name);
                              e.stopPropagation();
                            }
                          }}
                        >
                          <i className="fa fa-info-circle" />
                        </span>
                      ) : undefined}
                    </div>
                  );
                })}
              {schema.fullView ? null : (
                <div
                  role="button"
                  tabIndex={0}
                  className="more"
                  onClick={() => {
                    fullView(schema.name);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === ' ' ||
                      e.key === 'Enter' ||
                      e.key === 'Space'
                    ) {
                      fullView(schema.name);
                    }
                  }}
                >
                  <i className="fa fa-ellipsis-h" />
                </div>
              )}
              {schema.fullView && schema.functions ? (
                <div
                  className={`group${schema.functions.length ? '' : ' empty'}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className={`group-name functions arrow${
                      schema.functionsOpen ? ' open' : ''
                    }`}
                    onClick={() =>
                      schema.functions &&
                      schema.functions.length &&
                      openFunctions(schema)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === ' ' ||
                        e.key === 'Enter' ||
                        e.key === 'Space'
                      ) {
                        if (schema.functions && schema.functions.length)
                          openFunctions(schema);
                      }
                    }}
                  >
                    Functions{' '}
                    <span
                      style={{
                        float: 'right',
                        fontWeight: 'bold',
                        position: 'absolute',
                        color: 'rgba(0,0,0,.2)',
                        right: '10px',
                      }}
                    >
                      {schema.functions.length}
                    </span>
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
                <div
                  className={`group${schema.sequences.length ? '' : ' empty'}`}
                >
                  <div
                    className={`group-name sequences arrow${
                      schema.sequencesOpen ? ' open' : ''
                    }`}
                    onClick={() => {
                      if (schema.sequences && schema.sequences.length)
                        openSequences(schema);
                    }}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (
                        e.key === ' ' ||
                        e.key === 'Enter' ||
                        e.key === 'Space'
                      ) {
                        if (schema.sequences && schema.sequences.length)
                          openSequences(schema);
                      }
                    }}
                  >
                    Sequences
                    <span
                      style={{
                        float: 'right',
                        fontWeight: 'bold',
                        position: 'absolute',
                        color: 'rgba(0,0,0,.2)',
                        right: '10px',
                      }}
                    >
                      {schema.sequences.length}
                    </span>
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
      <span
        className="new-schema"
        onClick={() => newSchema()}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space')
            newSchema();
        }}
      >
        <i className="fa fa-plus" />
      </span>
    </div>
  );
}
