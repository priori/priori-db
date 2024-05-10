import { NavSchema } from 'types';
import {
  newTable,
  openSchema,
  previewTable,
  previewSchemaInfo,
  previewTableInfo,
  keepOpenTable,
  keepTableInfo,
  keepSchemaInfo,
  keepFunction,
  previewFunction,
  previewDomain,
  keepDomain,
  previewSequence,
  keepSequence,
  fullView,
  openFunctions,
  openDomains,
  openSequences,
  extraTableTab,
  keepOpenRole,
  previewRole,
} from '../../../../state/actions';
import { height, useNavTree } from './navTreeUtils';
import { Tabs } from './navUtils';

function grantScrollVisibility(el: HTMLDivElement | null) {
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
}

export function NavTree({
  schemas,
  tabs,
  roles,
  onBlur,
  disabled,
}: {
  tabs: Tabs;
  schemas: NavSchema[];
  roles: { name: string; isUser: boolean }[];
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void;
  disabled?: boolean;
}) {
  const { active } = tabs;
  const {
    onDivBlur,
    onKeyDown,
    onKeyUp,
    onFocus,
    setFocused,
    focused,
    rolesOpen,
    setRolesOpen,
  } = useNavTree(schemas, roles, onBlur, disabled);

  return (
    <div
      className="nav-tree"
      tabIndex={0}
      onBlur={onDivBlur}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={onFocus}
    >
      {schemas &&
        schemas.map((schema) => (
          <div
            className={`schema${schema.current ? ' schema--current' : ''}${
              schema.internal ? ' schema--internal' : ''
            }`}
            key={schema.name}
          >
            <div
              className={`schema-name arrow${schema.open ? ' open' : ''}${
                schema.fullView ? ' full-view' : ''
              }${
                focused?.type === 'schema' && focused.name === schema.name
                  ? ' focused'
                  : ''
              }`}
              onClick={() => openSchema(schema.name)}
              onMouseDown={() =>
                setFocused({ type: 'schema', name: schema.name })
              }
              ref={
                focused?.type === 'schema' && focused.name === schema.name
                  ? grantScrollVisibility
                  : undefined
              }
            >
              {schema.name}
              <span
                className="view-mode"
                onClick={(e) => {
                  fullView(schema.name);
                  e.stopPropagation();
                }}
              >
                <i className="fa fa-eye" />
              </span>
              <span
                className="schema-info"
                onClick={(e) => {
                  previewSchemaInfo(schema.name);
                  e.stopPropagation();
                }}
                onDoubleClick={() => {
                  keepSchemaInfo(schema.name);
                }}
              >
                <i className="fa fa-info-circle" />
              </span>
              <span
                className="new-table"
                onClick={(e) => {
                  newTable(schema.name);
                  e.stopPropagation();
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
                  const isOpen = tabs.open.table(schema.name, t.name);
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
                      }${
                        focused?.type === 'table' &&
                        focused.schema === schema.name &&
                        focused.name === t.name
                          ? ' focused'
                          : ''
                      }`}
                      key={t.name}
                    >
                      <div
                        className="table-name"
                        onClick={() => previewTable(schema.name, t)}
                        onMouseDown={() => {
                          setFocused({
                            type: 'table',
                            schema: schema.name,
                            name: t.name,
                          });
                        }}
                        onDoubleClick={() => {
                          if (isActive && active.keep) {
                            extraTableTab(schema.name, t.name);
                            return;
                          }
                          keepOpenTable(schema.name, t);
                        }}
                        ref={
                          focused?.type === 'table' &&
                          focused.name === t.name &&
                          focused.schema === schema.name
                            ? grantScrollVisibility
                            : undefined
                        }
                      >
                        <i className="table-type fa fa-table" />
                        {t.name}
                      </div>
                      <span
                        className="table-info"
                        onClick={(e) => {
                          previewTableInfo(schema.name, t.name);
                          e.stopPropagation();
                        }}
                        onDoubleClick={() => {
                          keepTableInfo(schema.name, t.name);
                        }}
                      >
                        <i className="fa fa-info-circle" />
                      </span>
                    </div>
                  );
                })}
              {schema.fullView ? null : (
                <div
                  className={`more${
                    focused?.type === 'full view button' &&
                    focused.schema === schema.name
                      ? ' focused'
                      : ''
                  }`}
                  ref={
                    focused?.type === 'full view button' &&
                    focused.schema === schema.name
                      ? grantScrollVisibility
                      : undefined
                  }
                  onClick={() => {
                    fullView(schema.name);
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
                    className={`group-name functions arrow${
                      schema.functionsOpen ? ' open' : ''
                    }${
                      focused?.type === 'functions' &&
                      focused.schema === schema.name
                        ? ' focused'
                        : ''
                    }`}
                    onMouseDown={() =>
                      setFocused({ type: 'functions', schema: schema.name })
                    }
                    onClick={() =>
                      schema.functions &&
                      schema.functions.length &&
                      openFunctions(schema)
                    }
                    ref={
                      focused?.type === 'functions' &&
                      focused.schema === schema.name
                        ? grantScrollVisibility
                        : undefined
                    }
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
                      ? schema.functions.map((f, k) => {
                          const isActive =
                            active &&
                            active.props.type === 'function' &&
                            active.props.schema === schema.name &&
                            active.props.name === f.name;
                          const isOpen = tabs.open.function(
                            schema.name,
                            f.name,
                          );
                          return (
                            <div
                              key={k}
                              className={`function${isActive ? ' active' : ''}${
                                isOpen ? ' open' : ''
                              }${
                                focused?.type === 'function' &&
                                focused.schema === schema.name &&
                                focused.name === f.name
                                  ? ' focused'
                                  : ''
                              }`}
                            >
                              <div
                                className="function-name"
                                ref={
                                  focused?.type === 'function' &&
                                  focused.name === f.name &&
                                  focused.schema === schema.name
                                    ? grantScrollVisibility
                                    : undefined
                                }
                                onClick={(e) => {
                                  previewFunction(schema.name, f.name);
                                  e.stopPropagation();
                                }}
                                onDoubleClick={() => {
                                  keepFunction(schema.name, f.name);
                                }}
                                onMouseDown={() =>
                                  setFocused({
                                    type: 'function',
                                    schema: schema.name,
                                    name: f.name,
                                  })
                                }
                              >
                                {f.name}
                              </div>
                            </div>
                          );
                        })
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
                    }${
                      focused?.type === 'sequences' &&
                      focused.schema === schema.name
                        ? ' focused'
                        : ''
                    }`}
                    ref={
                      focused?.type === 'sequences' &&
                      focused.schema === schema.name
                        ? grantScrollVisibility
                        : undefined
                    }
                    onClick={() => {
                      if (schema.sequences && schema.sequences.length)
                        openSequences(schema);
                    }}
                    onMouseDown={() => {
                      setFocused({
                        type: 'sequences',
                        schema: schema.name,
                      });
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
                      {schema.sequences.map((f, k) => {
                        const isActive =
                          active &&
                          active.props.type === 'sequence' &&
                          active.props.schema === schema.name &&
                          active.props.name === f.name;
                        const isOpen = tabs.open.sequence(schema.name, f.name);
                        return (
                          <div
                            key={k}
                            className={`sequence${isActive ? ' active' : ''}${
                              isOpen ? ' open' : ''
                            }${
                              focused?.type === 'sequence' &&
                              focused.schema === schema.name &&
                              focused.name === f.name
                                ? ' focused'
                                : ''
                            }`}
                          >
                            <div
                              className="sequence-name"
                              ref={
                                focused?.type === 'sequence' &&
                                focused.schema === schema.name
                                  ? grantScrollVisibility
                                  : undefined
                              }
                              onClick={(e) => {
                                previewSequence(schema.name, f.name);
                                e.stopPropagation();
                              }}
                              onDoubleClick={() => {
                                keepSequence(schema.name, f.name);
                              }}
                              onMouseDown={() =>
                                setFocused({
                                  type: 'sequence',
                                  schema: schema.name,
                                  name: f.name,
                                })
                              }
                            >
                              <i className="fa fa-list-ol" /> {f.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {schema.fullView && schema.domains ? (
                <div
                  className={`group${schema.domains.length ? '' : ' empty'}`}
                >
                  <div
                    className={`group-name domains arrow${
                      schema.domainsOpen ? ' open' : ''
                    }${
                      focused?.type === 'domains' &&
                      focused.schema === schema.name
                        ? ' focused'
                        : ''
                    }`}
                    onClick={() => {
                      if (schema.domains && schema.domains.length)
                        openDomains(schema);
                    }}
                    ref={
                      focused?.type === 'domains' &&
                      focused.schema === schema.name
                        ? grantScrollVisibility
                        : undefined
                    }
                    onMouseDown={() => {
                      setFocused({
                        type: 'domains',
                        schema: schema.name,
                      });
                    }}
                  >
                    Domains &amp; Enums
                    <span
                      style={{
                        float: 'right',
                        fontWeight: 'bold',
                        position: 'absolute',
                        color: 'rgba(0,0,0,.2)',
                        right: '10px',
                      }}
                    >
                      {schema.domains.length}
                    </span>
                  </div>
                  {schema.domainsOpen ? (
                    <div className="domains">
                      {schema.domains.map((f, k) => {
                        const isActive =
                          active &&
                          active.props.type === 'domain' &&
                          active.props.schema === schema.name &&
                          active.props.name === f.name;
                        const isOpen = tabs.open.domain(schema.name, f.name);
                        return (
                          <div
                            key={k}
                            className={`domain${isActive ? ' active' : ''}${
                              isOpen ? ' open' : ''
                            }${
                              focused?.type === 'domain' &&
                              focused.schema === schema.name &&
                              focused.name === f.name
                                ? ' focused'
                                : ''
                            }`}
                          >
                            <div
                              className="domain-name"
                              ref={
                                focused?.type === 'domain' &&
                                focused.name === f.name &&
                                focused.schema === schema.name
                                  ? grantScrollVisibility
                                  : undefined
                              }
                              onClick={(e) => {
                                previewDomain(schema.name, f.name);
                                e.stopPropagation();
                              }}
                              onDoubleClick={() => {
                                keepDomain(schema.name, f.name);
                              }}
                              onMouseDown={() => {
                                setFocused({
                                  type: 'domain',
                                  schema: schema.name,
                                  name: f.name,
                                });
                              }}
                            >
                              <i className="fa fa-list-ul" /> {f.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      <div className="schema schema--internal">
        <div
          className={`schema-name arrow ${rolesOpen ? 'open' : ''}${
            focused?.type === 'roles' ? ' focused' : ''
          }`}
          onClick={() => {
            setRolesOpen(!rolesOpen);
          }}
          onMouseDown={() => {
            setFocused({ type: 'roles' });
          }}
          ref={focused?.type === 'roles' ? grantScrollVisibility : undefined}
        >
          Users &amp; Roles
        </div>
        <div
          className="tables"
          style={{
            overflow: 'hidden',
            height: rolesOpen ? roles.length * 20 : 0,
          }}
        >
          {roles.map((r) => (
            <div
              className={`table${
                active &&
                active.props.type === 'role' &&
                active.props.name === r.name
                  ? ' active'
                  : ''
              }${tabs.open.role(r.name) ? ' open' : ''}${
                focused?.type === 'role' && focused.name === r.name
                  ? ' focused'
                  : ''
              }${r.name.startsWith('pg_') ? ' internal' : ''}`}
              key={r.name}
            >
              <div
                className="table-name"
                onClick={() => {
                  previewRole(r.name);
                }}
                onDoubleClick={() => {
                  keepOpenRole(r.name);
                }}
                ref={
                  focused?.type === 'role' && focused.name === r.name
                    ? grantScrollVisibility
                    : undefined
                }
                onMouseDown={() => setFocused({ type: 'role', name: r.name })}
              >
                {r.isUser ? (
                  <i className="table-type fa fa-user" />
                ) : (
                  <i className="table-type fa fa-users" />
                )}{' '}
                {r.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
