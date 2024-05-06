import { label } from './DB';

export const operators = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  like: 'LIKE',
  nlike: 'NOT LIKE',
  ilike: 'ILIKE',
  nilike: 'NOT ILIKE',
  similar: 'SIMILAR TO',
  nsimilar: 'NOT SIMILAR TO',
  posix: 'REGEXP LIKE (POSIX)',
  nposix: 'NOT REGEXP LIKE (POSIX)',
  posixi: 'REGEXP ILIKE',
  nposixi: 'NOT REGEXP ILIKE',
  null: 'IS NULL',
  notnull: 'IS NOT NULL',
  in: 'IN',
  nin: 'NOT IN',
  between: 'BETWEEN',
  nbetween: 'NOT BETWEEN',
};

export const operators2 = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  nlike: 'NOT LIKE',
  ilike: 'ILIKE',
  nilike: 'NOT ILIKE',
  similar: 'SIMILAR TO',
  nsimilar: 'NOT SIMILAR TO',
};
export const operators3 = {
  posix: (n: string, v: string) => `regexp_like(${label(n)}, ${v})`,
  nposix: (n: string, v: string | null) =>
    `NOT regexp_like(${label(n)}, ${v}))`,
  posixi: (n: string, v: string | null) => `regexp_ilike(${label(n)}, ${v}))`,
  nposixi: (n: string, v: string | null) =>
    `NOT regexp_ilike(${label(n)}, ${v}))`,
  between: (n: string, v: string, v2: string) =>
    `${label(n)} BETWEEN ${v} AND ${v2}`,
  nbetween: (n: string, v: string, v2: string) =>
    `${label(n)} NOT BETWEEN ${v} AND ${v2}`,
};

export type Filter =
  | (
      | {
          field: string;
          operator:
            | 'eq'
            | 'ne'
            | 'gt'
            | 'gte'
            | 'lt'
            | 'lte'
            | 'like'
            | 'nlike'
            | 'ilike'
            | 'nilike'
            | 'similar'
            | 'nsimilar'
            | 'posix'
            | 'nposix'
            | 'posixi'
            | 'nposixi'
            | 'null'
            | 'notnull'
            | '';
          value: string | null;
          sql?: boolean;
        }
      | {
          field: string;
          operator: 'in' | 'nin';
          values: (string | null)[];
          sql?: never;
        }
      | {
          field: string;
          operator: 'between' | 'nbetween';
          value: string | null;
          value2: string | null;
          sql?: boolean;
          sql2?: boolean;
        }
    )[][]
  | { type: 'query'; where: string };

export function wrapWithParentheses(s: string) {
  return `(${s})`;
}

export function str(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

export type Sort = {
  field: string;
  direction: 'asc' | 'desc';
}[];

export function buildWhere(filter: Filter): {
  where: string;
  params: (string | null)[];
} {
  return {
    where:
      'type' in filter
        ? (filter.where as string)
        : filter.length === 1 && filter[0].length === 0
          ? ''
          : filter
              .map((ands) =>
                ands
                  .map((f) =>
                    f.operator in operators2
                      ? `${f.field ? label(f.field) : '"???"'} ${
                          operators2[f.operator as keyof typeof operators2]
                        } ${
                          f.sql && f.value
                            ? wrapWithParentheses(f.value ?? '')
                            : f.sql
                              ? '<<SQL>>'
                              : (f as { value: string | null }).value === null
                                ? 'NULL'
                                : str((f as { value: string }).value)
                        }`
                      : f.operator in operators3
                        ? (f.sql && !f.value ? '-- ' : '') +
                          operators3[f.operator as keyof typeof operators3](
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
                        : f.operator === 'in' || f.operator === 'nin'
                          ? `${f.field ? label(f.field) : '???'} ${
                              f.operator === 'in' ? 'IN' : 'NOT IN'
                            } (${(f as { values: string[] }).values
                              .map(str)
                              .join(', ')})`
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
              )
              .map((p) => p.join('\nAND ') || '  ??')
              .join('\nOR\n')
              .replace(/\nAND --/g, '\n-- AND '),
    params: [],
  };
}
