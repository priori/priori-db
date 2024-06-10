import { Filter } from 'types';

const simpleFilterOperators = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  nlike: 'NOT LIKE',
  like: 'LIKE',
  ilike: 'ILIKE',
  nilike: 'NOT ILIKE',
  similar: 'SIMILAR TO',
  nsimilar: 'NOT SIMILAR TO',
};

const filterOperatorsFuncs = {
  posix: (label: (l: string) => string, n: string, v: string) =>
    `regexp_like(${label(n)}, ${v})`,
  nposix: (label: (l: string) => string, n: string, v: string | null) =>
    `NOT regexp_like(${label(n)}, ${v})`,
  posixi: (label: (l: string) => string, n: string, v: string | null) =>
    `regexp_like(${label(n)}, ${v}, 'i')`,
  nposixi: (label: (l: string) => string, n: string, v: string | null) =>
    `NOT regexp_like(${label(n)}, ${v}, 'i')`,
  // mysql
  regexplike: (label: (l: string) => string, n: string, v: string) =>
    `regexp_like(${label(n)}, ${v})`,
  nregexplike: (label: (l: string) => string, n: string, v: string | null) =>
    `NOT regexp_like(${label(n)}, ${v})`,
};

const filterOperatorsFuncs2 = {
  between: (label: (l: string) => string, n: string, v: string, v2: string) =>
    `${label(n)} BETWEEN ${v} AND ${v2}`,
  nbetween: (label: (l: string) => string, n: string, v: string, v2: string) =>
    `${label(n)} NOT BETWEEN ${v} AND ${v2}`,
};

function wrapWithParentheses(s: string) {
  return `(${s})`;
}

export function buildFinalQueryWhere(
  label: (l: string) => string,
  str: (s: string) => string,
  filter2: Filter,
): {
  where: string;
  params: (string | null)[];
} {
  return {
    where:
      'type' in filter2
        ? (filter2.where as string)
        : filter2.length === 1 && filter2[0].length === 0
          ? ''
          : filter2
              .map((ands) =>
                ands
                  .map((f) =>
                    f.operator in simpleFilterOperators
                      ? `${f.field ? label(f.field) : '"???"'} ${
                          simpleFilterOperators[
                            f.operator as keyof typeof simpleFilterOperators
                          ]
                        } ${
                          f.sql && f.value
                            ? wrapWithParentheses(f.value ?? '')
                            : f.sql
                              ? '<<SQL>>'
                              : (f as { value: string | null }).value === null
                                ? 'NULL'
                                : str((f as { value: string }).value)
                        }`
                      : f.operator in filterOperatorsFuncs
                        ? (f.sql && !f.value ? '-- ' : '') +
                          filterOperatorsFuncs[
                            f.operator as keyof typeof filterOperatorsFuncs
                          ](
                            label,
                            f.field,
                            f.sql
                              ? f.value
                                ? wrapWithParentheses(f.value)
                                : '<<SQL>>'
                              : (f as { value: string | null }).value === null
                                ? 'NULL'
                                : str((f as { value: string }).value),
                          )
                        : f.operator in filterOperatorsFuncs2
                          ? (f.sql && !f.value ? '-- ' : '') +
                            filterOperatorsFuncs2[
                              f.operator as keyof typeof filterOperatorsFuncs2
                            ](
                              label,
                              f.field,
                              f.sql
                                ? f.value
                                  ? wrapWithParentheses(f.value)
                                  : '<<SQL>>'
                                : (f as { value: string | null }).value === null
                                  ? 'NULL'
                                  : str((f as { value: string }).value),
                              !('value2' in f)
                                ? ''
                                : 'sql2' in f && f.sql2
                                  ? f.value2
                                    ? wrapWithParentheses(f.value2)
                                    : '<<SQL>>'
                                  : (f as { value2: string | null }).value2 ===
                                      null
                                    ? 'NULL'
                                    : str((f as { value2: string }).value2),
                            )
                          : f.operator === 'null'
                            ? `${label(f.field)} IS NULL`
                            : f.operator === 'notnull'
                              ? `${label(f.field)} IS NOT NULL`
                              : f.operator === 'in' || f.operator === 'nin'
                                ? `${f.field ? label(f.field) : '???'} ${
                                    f.operator === 'in' ? 'IN' : 'NOT IN'
                                  } (${(f as { values: string[] }).values
                                    .map(str)
                                    .join(', ')})`
                                : f.field
                                  ? /* --  */ `${label(f.field)} ???`
                                  : /* --  */ `???${
                                      (f as { value?: string | null }).value ===
                                      null
                                        ? ' null'
                                        : (f as { value?: string }).value
                                          ? ` ${str((f as { value: string }).value)}`
                                          : ''
                                    }`,
                  )
                  .filter((v) => v),
              )
              .map((p) => p.join('\nAND ') || '  ??')
              .join('\nOR\n')
              .replace(/\nAND --/g, '\n-- AND '),
    params: [],
  };
}

export function buildFilterWhere(
  label: (l: string) => string,
  str: (s: string) => string,
  filter: Filter,
): string {
  if ('type' in filter) return filter.where;
  if (filter.length === 1 && filter[0].length === 0) return '';
  const parts = filter.map((ands) =>
    ands
      .map((f) =>
        f.operator in simpleFilterOperators
          ? `${f.field ? label(f.field) : '"???"'} ${
              simpleFilterOperators[
                f.operator as keyof typeof simpleFilterOperators
              ]
            } ${
              f.sql && f.value
                ? wrapWithParentheses(f.value ?? '')
                : f.sql
                  ? '<<SQL>>'
                  : (f as { value: string | null }).value === null
                    ? 'NULL'
                    : str((f as { value: string }).value)
            }`
          : f.operator in filterOperatorsFuncs
            ? (f.sql && !f.value ? '-- ' : '') +
              filterOperatorsFuncs[
                f.operator as keyof typeof filterOperatorsFuncs
              ](
                label,
                f.field,
                f.sql
                  ? f.value
                    ? wrapWithParentheses(f.value)
                    : '<<SQL>>'
                  : (f as { value: string | null }).value === null
                    ? 'NULL'
                    : str((f as { value: string }).value),
              )
            : f.operator in filterOperatorsFuncs2
              ? (f.sql && !f.value ? '-- ' : '') +
                filterOperatorsFuncs2[
                  f.operator as keyof typeof filterOperatorsFuncs2
                ](
                  label,
                  f.field,
                  f.sql
                    ? f.value
                      ? wrapWithParentheses(f.value)
                      : '<<SQL>>'
                    : (f as { value: string | null }).value === null
                      ? 'NULL'
                      : str((f as { value: string }).value),
                  'sql2' in f && f.sql2
                    ? f.value2
                      ? wrapWithParentheses(f.value2)
                      : '<<SQL>>'
                    : (f as { value2: string | null }).value2 === null
                      ? 'NULL'
                      : str((f as { value2: string }).value2),
                )
              : f.operator === 'null'
                ? `${label(f.field)} IS NULL`
                : f.operator === 'notnull'
                  ? `${label(f.field)} IS NOT NULL`
                  : f.operator === 'in' || f.operator === 'nin'
                    ? `${f.field ? label(f.field) : '???'} ${
                        f.operator === 'in' ? 'IN' : 'NOT IN'
                      } (${(f as { values: string[] }).values.map(str).join(', ')})`
                    : f.field
                      ? /* --  */ `${label(f.field)} ???`
                      : /* --  */ `???${
                          (f as { value?: string | null }).value === null
                            ? ' null'
                            : (f as { value?: string }).value
                              ? ` ${str((f as { value: string }).value)}`
                              : ''
                        }`,
      )
      .filter((v) => v),
  );
  return parts
    .map((p) => p.join('\nAND ') || '  ??')
    .join('\nOR\n')
    .replace(/\nAND --/g, '\n-- AND ');
}
