import React, { useState } from 'react';

type Entry = (
  | { entityName: string; schema?: string }
  | { roleName: string }
) & {
  internal?: boolean;
};
export function useInternals<T extends Entry[]>(
  list: T,
): {
  list: T;
  internals: {
    name: string;
    count: number;
    open: () => void;
    isOpen: boolean;
  }[];
} {
  const [openInternals, setOpenInternals] = useState<{ [k: string]: boolean }>(
    {},
  );

  const internals1 = React.useMemo<
    { name: string; count: number; fn: (v: Entry) => boolean }[]
  >(() => {
    const internals0 = [] as {
      name: string;
      count: number;
      fn: (entry: Entry) => boolean;
    }[];
    const internalItens = list.filter((r) => r.internal);
    if (internalItens.length === 0) {
      return internals0;
    }
    if ('roleName' in internalItens[0]) {
      const prefix = internalItens[0].roleName.split('_')[0];
      if (
        internalItens.every((r) =>
          (r as { roleName: string }).roleName.startsWith(prefix),
        )
      ) {
        internals0.push({
          name: `${prefix}_*`,
          count: internalItens.length,
          fn: (entry: Entry) =>
            (entry as { roleName: string }).roleName.startsWith(`${prefix}_`),
        });
      } else {
        internals0.push({
          name: 'internal',
          count: internalItens.length,
          fn: () => true,
        });
      }
    } else {
      if ('schema' in internalItens[0]) {
        const schemas = new Set(
          internalItens.map((r) => (r as { schema: string }).schema),
        );
        if (schemas.size <= 2 && internalItens.length > 2) {
          for (const schema of schemas) {
            internals0.push({
              name: `${schema}.*`,
              count: internalItens.filter(
                (r) => (r as { schema: string }).schema === schema,
              ).length,
              fn: (entry: Entry) =>
                (entry as { schema: string }).schema === schema,
            });
          }
          internals0.sort((a, b) => a.name.localeCompare(b.name));
          return internals0;
        }
      }

      internals0.push({
        name: 'internal',
        count: internalItens.length,
        fn: () => true,
      });
    }
    return internals0;
  }, [list]);

  const filter = React.useMemo(() => {
    const iternalsOpen: {
      name: string;
      count: number;
      fn: (entry: Entry) => boolean;
    }[] = internals1.filter((r) => !!openInternals[r.name]);
    return (entry: Entry) => {
      if (!entry.internal) return true;
      for (const i of iternalsOpen) {
        if (i.fn(entry)) {
          return true;
        }
      }
      return false;
    };
  }, [internals1, openInternals]);

  const internals = React.useMemo(() => {
    return internals1.map((r) => ({
      ...r,
      open: () => {
        setOpenInternals((prev) => ({ ...prev, [r.name]: !prev[r.name] }));
      },
    }));
  }, [internals1, setOpenInternals]);

  return React.useMemo(() => {
    return {
      list: list.filter((r) => filter(r as Entry)) as T,
      internals: internals.map((r) => ({
        ...r,
        isOpen: !!openInternals[r.name],
      })),
    };
  }, [internals, list, openInternals, filter]);
}
