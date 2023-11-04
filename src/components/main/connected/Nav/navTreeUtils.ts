import { assert } from 'util/assert';
import { useEffect, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { equals } from 'util/equals';
import { NavSchema } from 'types';
import {
  openSchema,
  previewTable,
  keepOpenTable,
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
  keepOpenRole,
  previewRole,
} from '../../../../state/actions';

export function height(schema: NavSchema) {
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

export type Focused =
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

export function useNavTree(
  schemas: NavSchema[],
  roles: { name: string; isUser: boolean }[],
  onBlur: (e: 'next' | 'prev' | 'up' | 'down') => void,
) {
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
          // onBlur('down');
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
        // blur('down');
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

  return {
    onDivBlur,
    onKeyDown,
    onKeyUp,
    onFocus,
    focused,
    setFocused,
    rolesOpen,
    setRolesOpen,
  };
}
