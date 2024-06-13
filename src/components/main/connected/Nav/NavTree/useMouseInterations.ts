import {
  keepDomain,
  keepFunction,
  keepOpenRole,
  keepOpenTable,
  keepSequence,
  openDomains,
  openFunctions,
  openRoles,
  openSchema,
  openSequences,
  previewDomain,
  previewFunction,
  previewRole,
  previewSequence,
  previewTable,
} from 'state/actions';
import { NavSchema } from 'types';
import { assert } from 'util/assert';
import { useEvent } from 'util/useEvent';
import { NavTreeItem } from './useTree';
import { Focus } from './useNavTree';

export function useMouseInterations(
  setFocused: (v: Focus) => void,
  schemas: NavSchema[],
  disabled?: boolean,
) {
  const onMouseDown = useEvent((e: NavTreeItem) => {
    setFocused({
      type: e.type,
      key: e.key,
      schema: e.schema,
      name: e.title,
    } as Focus);
  });

  const onClick = useEvent((e: NavTreeItem) => {
    if (disabled) return;
    if (e.children) {
      if (e.type === 'schema-folder') {
        openSchema(e.title);
      } else if (e.type === 'functions-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.functions && s.functions.length > 0) openFunctions(s);
      } else if (e.type === 'domains-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.domains && s.domains.length > 0) openDomains(s);
      } else if (e.type === 'sequences-folder') {
        const s = schemas.find((v) => v.name === e.schema);
        assert(s);
        if (s.sequences && s.sequences.length > 0) openSequences(s);
      } else if (e.type === 'roles-folder') {
        openRoles();
      }
    } else if (e.type === 'table' || e.type === 'view' || e.type === 'mview') {
      const t = schemas
        .find((v) => v.name === e.schema)
        ?.tables.find((v) => v.name === e.title);
      assert(t);
      previewTable(e.schema, { name: e.title, type: t.type });
    } else if (e.type === 'function' || e.type === 'procedure') {
      previewFunction(e.schema, e.title);
    } else if (e.type === 'domain') {
      previewDomain(e.schema, e.title);
    } else if (e.type === 'sequence') {
      previewSequence(e.schema, e.title);
    } else if (e.type === 'role' || e.type === 'user') {
      previewRole(e.title);
    }
  });

  const onDblClick = useEvent((e: NavTreeItem) => {
    if (disabled) return;
    if (e.type === 'table' || e.type === 'view' || e.type === 'mview') {
      const t = schemas
        .find((v) => v.name === e.schema)
        ?.tables.find((v) => v.name === e.title);
      assert(e.schema);
      assert(t);
      keepOpenTable(e.schema, { name: e.title, type: t.type });
    } else if (e.type === 'function' || e.type === 'procedure') {
      assert(e.schema);
      keepFunction(e.schema, e.title);
    } else if (e.type === 'domain') {
      assert(e.schema);
      keepDomain(e.schema, e.title);
    } else if (e.type === 'sequence') {
      assert(e.schema);
      keepSequence(e.schema, e.title);
    } else if (e.type === 'role' || e.type === 'user') {
      keepOpenRole(e.title);
    }
  });
  return {
    onMouseDown,
    onClick,
    onDblClick,
  };
}
