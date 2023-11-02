import { assert } from 'util/assert';
import { NavSchema, Tab } from 'types';
import { useEffect, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { equals } from 'util/equals';
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

function height(schema: NavSchema) {
  if (!schema.open || !schema.tables) return 0;
  if (schema.fullView) {
    assert(schema.functions && schema.sequences && schema.domains);
    return (
      schema.tables.length * 20 +
      3 * 20 +
      (schema.functionsOpen ? schema.functions.length * 20 : 0) +
      (schema.sequencesOpen ? schema.sequences.length * 20 : 0) +
      (schema.domainsOpen ? schema.domains.length * 20 : 0)
    );
  }
  return schema.tables.length * 20 + 20;
}

type Focused =
  | {
      type: 'table' | 'tableinfo' | 'function' | 'domain' | 'sequence';
      schema: string;
      name: string;
    }
  | {
      type: 'role' | 'schema';
      name: string;
    }
  | { type: 'roles' }
  | { type: 'functions' | 'sequences' | 'domains'; schema: string }
  | { type: 'full view button'; schema: string }
  | null;

export function notFound(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean }[],
  focused: Focused,
) {
  if (!focused) return true;
  return (
    (focused.type === 'role' && !roles.find((r) => r.name === focused.name)) ||
    (focused.type === 'schema' &&
      !schemas.find((s) => s.name === focused.name)) ||
    (focused.type === 'table' &&
      !schemas
        .find((s) => s.name === focused.schema)
        ?.tables.find((t) => t.name === focused.name)) ||
    (focused.type === 'function' &&
      !schemas
        .find((s) => s.name === focused.schema)
        ?.functions.find((t) => t.name === focused.name)) ||
    (focused.type === 'domain' &&
      !schemas
        .find((s) => s.name === focused.schema)
        ?.domains.find((t) => t.name === focused.name)) ||
    (focused.type === 'sequence' &&
      !schemas
        .find((s) => s.name === focused.schema)
        ?.sequences.find((t) => t.name === focused.name)) ||
    ((focused.type === 'functions' ||
      focused.type === 'sequences' ||
      focused.type === 'domains') &&
      !schemas.find((s) => s.name === focused.schema))
  );
}

export function NavTree({
  schemas,
  tabs,
  roles,
  onBlur,
}: {
  tabs: Tab[];
  schemas: NavSchema[];
  roles: { name: string; isUser: boolean }[];
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void;
}) {
  const active = tabs.find((c) => c.active) || null;
  const [rolesOpen, setRolesOpen] = useState(false);
  const [focused, setFocused] = useState<Focused>(null);
  const lastFocused = useRef<Focused>(focused);
  if (focused !== null) lastFocused.current = focused;

  const blur = useEvent((e: 'next' | 'prev' | 'up' | 'down') => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
    onBlur(e);
  });

  const onDivBlur = useEvent(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    setFocused(null);
  });

  const lastKeyUp = useRef({
    key: null as string | null,
    time: 0,
    focused: null as Focused | null,
  });
  const onKeyUp = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && e.ctrlKey) return;
    const doubleHit =
      (lastKeyUp.current.key === e.key &&
        Date.now() - lastKeyUp.current.time < 300 &&
        equals(focused, lastKeyUp.current.focused)) ||
      false;
    lastKeyUp.current.key = e.key;
    lastKeyUp.current.time = Date.now();
    lastKeyUp.current.focused = focused;
    if (
      doubleHit &&
      focused &&
      (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') &&
      (focused.type === 'table' ||
        focused.type === 'function' ||
        focused.type === 'domain' ||
        focused.type === 'sequence' ||
        focused.type === 'role')
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (focused.type === 'role') {
        keepOpenRole(focused.name);
      } else if (focused.type === 'table') {
        keepOpenTable(
          focused.schema,
          schemas
            .find((s) => s.name === focused.schema)!
            .tables.find((t) => t.name === focused.name)!,
        );
      } else if (focused.type === 'function') {
        keepFunction(focused.schema, focused.name);
      } else if (focused.type === 'domain') {
        keepDomain(focused.schema, focused.name);
      } else if (focused.type === 'sequence') {
        keepSequence(focused.schema, focused.name);
      }
    }
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && e.ctrlKey) return;
    const strongHit = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey;
    if (
      e.key === 'ArrowDown' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === ' ' ||
      e.key === 'Space' ||
      e.key === 'Escape'
    ) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // if (
      //   e.key &&
      //   e.key.length === 1 &&
      //   !(e.ctrlKey || e.metaKey || e.altKey)
      // ) {
      //   const input = document.querySelector('.nav--search input');
      //   if (input instanceof HTMLInputElement) {
      //     input.value = e.key;
      //     const k = e.key;
      //     setTimeout(() => {
      //       input.setAttribute('value', k);
      //       input.value = k;
      //       const ev = new Event('change', {
      //         bubbles: true,
      //         cancelable: true,
      //       });
      //       input.dispatchEvent(ev);
      //       input.focus();
      //     }, 1);
      //   }
      // }
      // return;
    }
    if (e.key === 'Escape') {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) {
        ae.blur();
      }
      return;
    }
    if (focused === null) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp')
        blur(e.key === 'ArrowDown' ? 'down' : 'up');
      else blur(e.shiftKey ? 'prev' : 'next');
      return;
    }
    const enter = e.key === 'Enter' || e.key === ' ' || e.key === 'Space';
    const direction =
      e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)
        ? +1
        : e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)
        ? -1
        : undefined;
    const right = e.key === 'ArrowRight';
    const left = e.key === 'ArrowLeft';
    if (focused.type === 'roles') {
      if (enter) {
        setRolesOpen(!rolesOpen);
      } else if (direction === -1) {
        const last = schemas[schemas.length - 1];
        if (last) {
          if (last.open) {
            if (last.fullView && last.open) {
              if (last.domains.length)
                setFocused({
                  type: 'domain',
                  schema: last.name,
                  name: last.domains[0].name,
                });
              else setFocused({ type: 'domains', schema: last.name });
            } else if (last.open)
              setFocused({
                type: 'full view button',
                schema: last.name,
              });
          } else setFocused({ type: 'schema', name: last.name });
        }
      } else if (right && !rolesOpen) {
        setRolesOpen(true);
      } else if (left && rolesOpen) {
        setRolesOpen(false);
      } else if (direction === 1 && roles) {
        if (!rolesOpen) {
          onBlur('down');
          return;
        }
        setFocused({ type: 'role', name: roles[0].name });
      }
    } else if (focused.type === 'role') {
      const index = roles.findIndex((s) => s.name === focused.name);
      if (enter) {
        if (strongHit) keepOpenRole(focused.name);
        else previewRole(focused.name);
      } else if (left) {
        setFocused({ type: 'roles' });
      } else if (direction && roles[index + direction]) {
        setFocused({
          type: 'role',
          name: roles[index + direction].name,
        });
      } else if (direction === -1) {
        setFocused({ type: 'roles' });
      } else if (direction === 1) {
        blur('down');
      }
    } else if (focused.type === 'schema') {
      const index = schemas.findIndex((s) => s.name === focused.name);
      const schema = schemas[index];
      if (
        enter ||
        (schema && schema.open && left) ||
        (schema && !schema.open && right)
      ) {
        openSchema(focused.name);
      } else if (right || left) {
        // nop
      } else if (direction !== undefined) {
        if (direction === 1 && schema && schema.open && schema.tables.length) {
          setFocused({
            type: 'table',
            schema: schema.name,
            name: schema.tables[0].name,
          });
        } else if (direction === 1 && !schema.open && schemas[index + 1]) {
          setFocused({
            type: 'schema',
            name: schemas[index + direction].name,
          });
        } else if (direction === -1) {
          if (index === 0) {
            blur('up');
            return;
          }
          const nextIndex = index + direction;
          const next = schemas[nextIndex];
          if (next) {
            if (next.fullView && next.open) {
              if (next.domainsOpen && next.domains.length)
                setFocused({
                  type: 'domain',
                  schema: next.name,
                  name: next.domains[next.domains.length - 1].name,
                });
              else
                setFocused({
                  type: 'domains',
                  schema: next.name,
                });
            } else if (next.open) {
              setFocused({
                type: 'full view button',
                schema: next.name,
              });
            } else {
              setFocused({ type: 'schema', name: next.name });
            }
          }
        } else if (direction === 1) {
          setFocused({ type: 'roles' });
        }
      }
    } else if (focused.type === 'table') {
      if (left) {
        setFocused({ type: 'schema', name: focused.schema });
        return;
      }
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      const tableIndex = schema?.tables.findIndex(
        (t) => t.name === focused.name,
      );
      if (enter) {
        if (strongHit) keepOpenTable(schema.name, schema.tables[tableIndex]);
        else previewTable(schema.name, schema.tables[tableIndex]);
      } else if (tableIndex === 0 && direction === -1) {
        setFocused({ type: 'schema', name: schema.name });
      } else if (tableIndex === schema.tables.length - 1 && direction === 1) {
        if (schema.fullView && schema.open) {
          setFocused({ type: 'functions', schema: schema.name });
        } else {
          setFocused({
            type: 'full view button',
            schema: schema.name,
          });
        }
      } else if (direction !== undefined) {
        const table = schema.tables[tableIndex + direction];
        if (table) {
          setFocused({ type: 'table', schema: schema.name, name: table.name });
        }
      }
    } else if (focused.type === 'full view button') {
      if (direction !== undefined) {
        const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
        const schema = schemas[schemaIndex];
        if (!schema) return;
        if (direction === -1) {
          if (schema.tables.length)
            setFocused({
              type: 'table',
              schema: schema.name,
              name: schema.tables[schema.tables.length - 1].name,
            });
          else setFocused({ type: 'schema', name: schema.name });
        } else if (schemas[schemaIndex + 1]) {
          setFocused({ type: 'schema', name: schemas[schemaIndex + 1].name });
        } else {
          setFocused({ type: 'roles' });
        }
      } else if (enter) {
        fullView(focused.schema);
        setFocused({ type: 'functions', schema: focused.schema });
      }
    } else if (focused.type === 'functions') {
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      if (left && !schema.functionsOpen) {
        setFocused({ type: 'schema', name: focused.schema });
        return;
      }
      if (
        enter ||
        (schema.functionsOpen && left) ||
        (!schema.functionsOpen && right)
      ) {
        if (schema.functions.length) openFunctions(schema);
      } else if (direction === -1) {
        if (schema.tables && schema.tables.length)
          setFocused({
            type: 'table',
            schema: schema.name,
            name: schema.tables[schema.tables.length - 1].name,
          });
        else setFocused({ type: 'schema', name: schema.name });
      } else if (direction === 1) {
        if (schema.functionsOpen && schema.functions.length) {
          setFocused({
            type: 'function',
            schema: schema.name,
            name: schema.functions[0].name,
          });
        } else {
          setFocused({ type: 'sequences', schema: schema.name });
        }
      }
    } else if (focused.type === 'function') {
      if (enter) {
        if (strongHit) keepFunction(focused.schema, focused.name);
        else previewFunction(focused.schema, focused.name);
        return;
      }
      if (left) {
        setFocused({ type: 'functions', schema: focused.schema });
        return;
      }
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      const fIndex = schema.functions.findIndex((f) => f.name === focused.name);
      if (direction && schema.functions[fIndex + direction]) {
        setFocused({
          type: 'function',
          schema: schema.name,
          name: schema.functions[fIndex + direction].name,
        });
      } else if (direction === -1) {
        setFocused({ type: 'functions', schema: schema.name });
      } else if (direction === 1) {
        setFocused({ type: 'sequences', schema: schema.name });
      }
    } else if (focused.type === 'sequences') {
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      if (left && !schema.sequencesOpen) {
        setFocused({ type: 'schema', name: focused.schema });
        return;
      }
      if (
        enter ||
        (schema.sequencesOpen && left) ||
        (!schema.sequencesOpen && right)
      ) {
        if (schema.sequences.length) openSequences(schema);
      } else if (direction === -1) {
        if (schema.functions && schema.functions.length && schema.functionsOpen)
          setFocused({
            type: 'function',
            schema: schema.name,
            name: schema.functions[schema.functions.length - 1].name,
          });
        else
          setFocused({
            type: 'functions',
            schema: schema.name,
          });
      } else if (direction === 1) {
        if (schema.sequencesOpen && schema.sequences.length) {
          setFocused({
            type: 'sequence',
            schema: schema.name,
            name: schema.sequences[0].name,
          });
        } else {
          setFocused({ type: 'domains', schema: schema.name });
        }
      }
    } else if (focused.type === 'sequence') {
      if (enter) {
        if (strongHit) keepSequence(focused.schema, focused.name);
        else previewSequence(focused.schema, focused.name);
        return;
      }
      if (left) {
        setFocused({ type: 'sequences', schema: focused.schema });
        return;
      }
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      const fIndex = schema.sequences.findIndex((f) => f.name === focused.name);
      if (direction && schema.sequences[fIndex + direction]) {
        setFocused({
          type: 'sequence',
          schema: schema.name,
          name: schema.sequences[fIndex + direction].name,
        });
      } else if (direction === -1) {
        setFocused({ type: 'sequences', schema: schema.name });
      } else if (direction === 1) {
        setFocused({ type: 'domains', schema: schema.name });
      }
    } else if (focused.type === 'domains') {
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      if (left && !schema.domainsOpen) {
        setFocused({ type: 'schema', name: focused.schema });
        return;
      }
      if (
        enter ||
        (schema.domainsOpen && left) ||
        (!schema.domainsOpen && right)
      ) {
        if (schema.domains.length) openDomains(schema);
      } else if (direction === -1) {
        if (schema.sequences && schema.sequences.length && schema.sequencesOpen)
          setFocused({
            type: 'sequence',
            schema: schema.name,
            name: schema.sequences[schema.sequences.length - 1].name,
          });
        else
          setFocused({
            type: 'sequences',
            schema: schema.name,
          });
      } else if (direction === 1) {
        if (schema.domainsOpen && schema.domains.length) {
          setFocused({
            type: 'domain',
            schema: schema.name,
            name: schema.domains[0].name,
          });
        } else if (schemas[schemaIndex + 1]) {
          setFocused({
            type: 'schema',
            name: schemas[schemaIndex + 1].name,
          });
        } else {
          setFocused({ type: 'roles' });
        }
      }
    } else if (focused.type === 'domain') {
      if (enter) {
        if (strongHit) keepDomain(focused.schema, focused.name);
        else previewDomain(focused.schema, focused.name);
        return;
      }
      if (left) {
        setFocused({ type: 'domains', schema: focused.schema });
        return;
      }
      const schemaIndex = schemas.findIndex((s) => s.name === focused.schema);
      const schema = schemas[schemaIndex];
      if (!schema) return;
      const dIndex = schema.domains.findIndex((f) => f.name === focused.name);
      if (direction && schema.domains[dIndex + direction]) {
        setFocused({
          type: 'domain',
          schema: schema.name,
          name: schema.domains[dIndex + direction].name,
        });
      } else if (direction === -1) {
        setFocused({ type: 'domains', schema: schema.name });
      } else if (direction === 1) {
        if (schemas[schemaIndex + 1])
          setFocused({ type: 'schema', name: schemas[schemaIndex + 1].name });
        else setFocused({ type: 'roles' });
      }
    }
  });

  useEffect(() => {
    if (focused) {
      if (notFound(schemas, roles, focused)) setFocused(null);
    }
  }, [schemas, roles, focused]);

  const onFocus = useEvent(() => {
    if (focused === null) {
      setFocused(
        lastFocused.current || { type: 'schema', name: schemas[0].name },
      );
    }
  });

  const grantVisibility = useEvent((el: HTMLDivElement | null) => {
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  });

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
                  ? grantVisibility
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
                  const isOpen = tabs.find(
                    (c) =>
                      (c.props.type === 'table' ||
                        c.props.type === 'tableinfo') &&
                      c.props.schema === schema.name &&
                      c.props.table === t.name,
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
                            ? grantVisibility
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
                      ? grantVisibility
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
                        ? grantVisibility
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
                          const isOpen = tabs.find(
                            (c) =>
                              c.props.type === 'function' &&
                              c.props.schema === schema.name &&
                              c.props.name === f.name,
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
                                    ? grantVisibility
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
                        ? grantVisibility
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
                        const isOpen = tabs.find(
                          (c) =>
                            c.props.type === 'sequence' &&
                            c.props.schema === schema.name &&
                            c.props.name === f.name,
                        );
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
                                  ? grantVisibility
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
                        ? grantVisibility
                        : undefined
                    }
                    onMouseDown={() => {
                      setFocused({
                        type: 'domains',
                        schema: schema.name,
                      });
                    }}
                  >
                    Domains
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
                        const isOpen = tabs.find(
                          (c) =>
                            c.props.type === 'domain' &&
                            c.props.schema === schema.name &&
                            c.props.name === f.name,
                        );
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
                                  ? grantVisibility
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
          ref={focused?.type === 'roles' ? grantVisibility : undefined}
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
                tabs.find(
                  (t) =>
                    t.props.type === 'role' &&
                    t.props.name === r.name &&
                    t.active,
                )
                  ? ' active'
                  : ''
              }${
                tabs.find(
                  (t) => t.props.type === 'role' && t.props.name === r.name,
                )
                  ? ' open'
                  : ''
              }${
                focused?.type === 'role' && focused.name === r.name
                  ? ' focused'
                  : ''
              }`}
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
                    ? grantVisibility
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
