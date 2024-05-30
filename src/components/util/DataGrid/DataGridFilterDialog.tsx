import React, { useState } from 'react';
import { Filter, operators, operators2, operators3, db } from 'db/db';
import { Dialog } from '../Dialog/Dialog';

function ValueListInput({
  values,
  onChange,
}: {
  values: (string | null)[];
  onChange: (vs: (string | null)[]) => void;
}) {
  return (
    <div>
      {[...values, null].map((value, i) => (
        <span style={{ display: 'flex', gap: 5, marginBottom: 5 }} key={i}>
          <textarea
            value={value ?? ''}
            key={i}
            style={
              i === values.length
                ? { opacity: 0.3, width: 135 }
                : { width: 135 }
            }
            onKeyDown={(e) => {
              if (
                e.target instanceof HTMLTextAreaElement &&
                e.target.value === '' &&
                (e.key === 'Backspace' || e.key === 'Delete')
              ) {
                onChange(
                  i === values.length
                    ? [...values, null]
                    : values.map((v, vi) => (vi === i ? null : v)),
                );
              }
            }}
            placeholder={
              i < values.length && value === null ? 'null' : undefined
            }
            onChange={(e) => {
              onChange(
                i === values.length
                  ? [...values, e.target.value]
                  : values.map((v, vi) => (vi === i ? e.target.value : v)),
              );
            }}
          />
          <i
            style={{
              width: 10,
              visibility:
                i === values.length || (i === 0 && values.length === 1)
                  ? 'hidden'
                  : undefined,
            }}
            className="fa fa-close"
            onClick={() => {
              if (i === values.length) return;
              onChange(values.filter((_, vi) => vi !== i));
            }}
          />
        </span>
      ))}
    </div>
  );
}

let t: ReturnType<typeof setTimeout>;

const scopesMap = {
  '[': ']',
  '(': ')',
  '{': '}',
};

function validSqlCalc(s: string) {
  const scopes: ('(' | '[' | '{')[] = [];
  let inString: false | "'" | '"' = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (ch === inString) inString = false;
    } else if (ch === "'" || ch === '"') {
      inString = ch;
    } else if (ch in scopesMap) {
      scopes.push(ch as '(' | '[' | '{');
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (scopes.length === 0) return false;
      if (ch !== scopesMap[scopes[scopes.length - 1]]) return false;
      scopes.pop();
    }
  }
  return !inString && scopes.length === 0;
}
const cache = new Map<string, boolean>();
let timeout: ReturnType<typeof setTimeout> | null = null;
function validSql(s: string) {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    cache.clear();
    timeout = null;
  }, 30000);
  if (cache.has(s)) return cache.get(s)!;
  const valid = validSqlCalc(s);
  cache.set(s, valid);
  return valid;
}

interface DataGridFilterDialogProps {
  fields: { name: string }[];
  onClose: () => void;
  onChange: (filter: Filter) => void;
  currentFilter?: Filter | undefined;
}

function fit() {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 10);
}

function buildSql(filter: Filter): string {
  if ('type' in filter) return filter.where;
  if (filter.length === 1 && filter[0].length === 0) return '';
  const parts = filter.map((ands) =>
    ands
      .map((f) =>
        f.operator in operators2
          ? `${f.field ? db().label(f.field) : '"???"'} ${
              operators2[f.operator as keyof typeof operators2]
            } ${
              f.sql && f.value
                ? db().wrapWithParentheses(f.value ?? '')
                : f.sql
                  ? '<<SQL>>'
                  : (f as { value: string | null }).value === null
                    ? 'NULL'
                    : db().str((f as { value: string }).value)
            }`
          : f.operator in operators3
            ? (f.sql && !f.value ? '-- ' : '') +
              operators3[f.operator as keyof typeof operators3](
                f.field,
                f.sql
                  ? f.value
                    ? db().wrapWithParentheses(f.value)
                    : '<<SQL>>'
                  : (f as { value: string | null }).value === null
                    ? 'NULL'
                    : db().str((f as { value: string }).value),
                'sql2' in f && f.sql2
                  ? f.value2
                    ? db().wrapWithParentheses(f.value2)
                    : '<<SQL>>'
                  : (f as { value2: string | null }).value2 === null
                    ? 'NULL'
                    : db().str((f as { value2: string }).value2),
              )
            : f.operator === 'in' || f.operator === 'nin'
              ? `${f.field ? db().label(f.field) : '???'} ${
                  f.operator === 'in' ? 'IN' : 'NOT IN'
                } (${(f as { values: string[] }).values.map(db().str).join(', ')})`
              : f.field
                ? /* --  */ `${db().label(f.field)} ???`
                : /* --  */ `???${
                    (f as { value?: string | null }).value === null
                      ? ' null'
                      : (f as { value?: string }).value
                        ? ` ${db().str((f as { value: string }).value)}`
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

export function DataGridFilterDialog(props: DataGridFilterDialogProps) {
  const [focus, setFocus] = useState<[number, number, 0 | 1] | null>(null);

  const onCancelClick = () => {
    props.onClose();
  };
  const [filter, setFilter] = useState<Filter>(props.currentFilter ?? [[]]);

  const disabled =
    'type' in filter
      ? !validSql(filter.where)
      : !!filter.find((g) => g.find((f) => !f.field || !f.operator)) ||
        !!filter.find((g) =>
          g.find(
            (f) =>
              (f.sql && !validSql(f.value ?? '')) ||
              ((f.operator === 'between' || f.operator === 'nbetween') &&
                f.sql2 &&
                !validSql(f.value2 ?? '')),
          ),
        );

  const onApplyClick = () => {
    if (disabled) return;
    props.onChange(filter);
    props.onClose();
  };

  const [sqlVisible, setSqlVisible] = useState(false);

  const [editQuery, setEditQuery] = useState(null as string | null);

  const showSql = () => {
    if (editQuery !== null) return;
    setSqlVisible(!sqlVisible);
    setEditQuery(null);
    fit();
  };

  const isBigForm =
    !('type' in filter) &&
    (filter.length > 1 || (filter.length === 1 && filter[0].length > 3));

  const updatedSqlQuery =
    editQuery && 'type' in filter && filter.type === 'query';

  return (
    <Dialog
      relativeTo="previousSibling"
      onBlur={props.onClose}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className={`form ${
        !('type' in filter) && isBigForm
          ? 'data-grid-filter-dialog--big-form'
          : 'data-grid-filter-dialog--small-form'
      }`}
    >
      <h1 style={{ margin: 0, marginBottom: 20, lineHeight: '1em' }}>Filter</h1>
      <button
        type="button"
        className={`data-grid-filter-dialog--where-sql${
          sqlVisible ? ' active' : ''
        }`}
        onClick={showSql}
        style={
          updatedSqlQuery
            ? {
                opacity: 0.1,
              }
            : undefined
        }
      >
        WHERE <strong>SQL</strong>
      </button>

      {sqlVisible ? (
        editQuery !== null ? (
          <div
            style={{ position: 'relative', marginBottom: 15 }}
            className={
              !validSql(
                ('type' in filter &&
                  filter.type === 'query' &&
                  (filter.where as string)) ||
                  editQuery,
              )
                ? 'data-grid-filter-dialog--sql-invalid'
                : undefined
            }
          >
            <textarea
              className="data-grid-filter-dialog--sql-where"
              value={
                ('type' in filter &&
                  filter.type === 'query' &&
                  (filter.where as string)) ||
                editQuery
              }
              onChange={(e) => {
                setFilter({ type: 'query', where: e.target.value });
              }}
            />
            <button
              type="button"
              className="data-grid-filter-dialog--edit-button"
              style={updatedSqlQuery ? { opacity: 0.1 } : undefined}
              onClick={() => {
                if (updatedSqlQuery) return;
                setEditQuery(null);
              }}
            >
              Back <i className="fa fa-undo" />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', marginBottom: 15 }}>
            <textarea
              className="data-grid-filter-dialog--sql-where"
              value={buildSql(filter)}
              readOnly
            />
            <button
              type="button"
              className="data-grid-filter-dialog--edit-button"
              style={
                !('type' in filter) &&
                filter.length === 1 &&
                filter[0].length === 0 &&
                buildSql(filter)
                  ? { opacity: 0.14 }
                  : undefined
              }
              onClick={() => {
                setEditQuery(buildSql(filter));
              }}
            >
              Edit <i className="fa fa-pencil" />
            </button>
          </div>
        )
      ) : 'type' in filter ? null : (
        <div>
          {filter.map((group, gIndex) => (
            <React.Fragment key={gIndex}>
              <div className="data-grid-filter-dialog--and-group">
                {[...group, null].map((formField, i) => (
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      width: 550,
                      alignItems: 'flex-start',
                    }}
                    key={i}
                    className="form-row"
                  >
                    <strong
                      style={
                        i === 0
                          ? { visibility: 'hidden' }
                          : formField === null
                            ? { opacity: 0.16 }
                            : undefined
                      }
                    >
                      AND{' '}
                    </strong>
                    <select
                      style={{ width: 100 }}
                      value={formField?.field ?? ''}
                      onChange={(e) => {
                        if (formField === null) {
                          setFilter(
                            filter.map((g2, g2Index) =>
                              gIndex === g2Index
                                ? [
                                    ...group,
                                    {
                                      field: e.target.value,
                                      operator: '',
                                      value: '',
                                    },
                                  ]
                                : g2,
                            ),
                          );
                          fit();
                        } else {
                          setFilter(
                            filter.map((g2, g2Index) =>
                              gIndex === g2Index
                                ? group.map((f) =>
                                    f === formField
                                      ? { ...f, field: e.target.value }
                                      : f,
                                  )
                                : g2,
                            ),
                          );
                        }
                      }}
                    >
                      {formField?.field ? null : <option value="" />}
                      {props.fields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formField?.operator ?? ''}
                      style={{
                        width: 185,
                        fontSize:
                          operators[
                            formField?.operator as keyof typeof operators
                          ]?.length > 17
                            ? 11
                            : undefined,
                      }}
                      onChange={(e) => {
                        if (formField === null) {
                          setFilter(
                            filter.map((g2, g2Index) =>
                              gIndex === g2Index
                                ? [
                                    ...group,
                                    e.target.value === 'in' ||
                                    e.target.value === 'nin'
                                      ? ({
                                          field: '',
                                          operator: e.target.value,
                                          values: [''],
                                        } as {
                                          field: string;
                                          operator: 'in' | 'nin';
                                          values: string[];
                                        })
                                      : e.target.value === 'between' ||
                                          e.target.value === 'nbetween'
                                        ? {
                                            value2: '',
                                            field: '',
                                            operator: e.target.value,
                                            value: '',
                                          }
                                        : {
                                            operator: e.target.value as
                                              | keyof typeof operators
                                              | '',
                                            field: '',
                                            value: '',
                                          },
                                  ]
                                : g2,
                            ) as Filter,
                          );
                          fit();
                        } else {
                          setFilter(
                            filter.map((g2, g2Index) =>
                              gIndex === g2Index
                                ? group.map((f) =>
                                    f === formField
                                      ? (e.target.value === 'in' ||
                                          e.target.value === 'nin') &&
                                        !f.sql
                                        ? ({
                                            field: f.field,
                                            operator: e.target.value,
                                            values: (f as { values?: string[] })
                                              .values ?? [''],
                                          } as {
                                            field: string;
                                            operator: 'in' | 'nin';
                                            values: string[];
                                          })
                                        : e.target.value === 'between' ||
                                            e.target.value === 'nbetween'
                                          ? {
                                              field: f.field,
                                              operator: e.target.value,
                                              value:
                                                (f as { value?: string | null })
                                                  .value === undefined
                                                  ? ''
                                                  : (
                                                      f as {
                                                        value: string | null;
                                                      }
                                                    ).value,
                                              value2:
                                                (
                                                  f as {
                                                    value2?: string | null;
                                                  }
                                                ).value2 === undefined
                                                  ? ''
                                                  : (
                                                      f as {
                                                        value2: string | null;
                                                      }
                                                    ).value2,
                                              sql: formField.sql,
                                              sql2:
                                                'sql2' in formField
                                                  ? formField.sql2
                                                  : undefined,
                                            }
                                          : ({
                                              field: f.field,
                                              sql: formField.sql,
                                              operator: e.target.value as
                                                | keyof typeof operators
                                                | '',
                                              value:
                                                (f as { value?: string | null })
                                                  .value === undefined
                                                  ? ''
                                                  : (
                                                      f as {
                                                        value: string | null;
                                                      }
                                                    ).value,
                                            } as {
                                              field: string;
                                              operator:
                                                | keyof typeof operators
                                                | '';
                                              value: string | null;
                                              sql?: boolean;
                                            })
                                      : f,
                                  )
                                : g2,
                            ) as Filter,
                          );
                        }
                      }}
                    >
                      {formField?.operator ? null : <option value="" />}
                      {Object.keys(operators).map((operator) => (
                        <option key={operator} value={operator}>
                          {operators[operator as keyof typeof operators]}
                        </option>
                      ))}
                    </select>

                    <div style={{ width: 185 }}>
                      <div
                        style={{ display: 'flex', gap: 10 }}
                        className={
                          focus?.[0] === gIndex &&
                          focus?.[1] === i &&
                          focus?.[2] === 0
                            ? 'data-grid-filter-dialog--input-focus'
                            : undefined
                        }
                      >
                        {!formField?.sql &&
                        (formField?.operator === 'in' ||
                          formField?.operator === 'nin') ? (
                          <span
                            style={{ position: 'relative' }}
                            className="data-grid-filter-dialog--input-wrapper"
                          >
                            <ValueListInput
                              values={
                                (formField as { values: string[] }).values
                              }
                              onChange={(values) => {
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? group.map((f) =>
                                          f === formField
                                            ? {
                                                ...f,
                                                values,
                                              }
                                            : f,
                                        )
                                      : g2,
                                  ),
                                );
                              }}
                            />
                          </span>
                        ) : (
                          <span
                            style={{ position: 'relative' }}
                            className={`data-grid-filter-dialog--input-wrapper${
                              formField?.sql
                                ? ' data-grid-filter-dialog--sql'
                                : ''
                            }${
                              formField?.sql &&
                              !validSql(formField?.value ?? '')
                                ? ' data-grid-filter-dialog--sql-invalid'
                                : ''
                            }`}
                          >
                            {formField?.sql ? (
                              <div
                                className="data-grid-filter-dialog--small-ops"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <span className="selected">
                                  SQL Query Fragment
                                </span>
                              </div>
                            ) : null}
                            <textarea
                              style={
                                formField?.operator === 'notnull' ||
                                formField?.operator === 'null'
                                  ? { opacity: 0.3, resize: 'none' }
                                  : undefined
                              }
                              value={
                                formField?.operator === 'notnull' ||
                                formField?.operator === 'null'
                                  ? ''
                                  : (formField as { value: string } | null)
                                      ?.value ?? ''
                              }
                              disabled={
                                formField?.operator === 'notnull' ||
                                formField?.operator === 'null'
                              }
                              onFocus={() => {
                                clearTimeout(t);
                                t = setTimeout(() => {
                                  setFocus([gIndex, i, 0]);
                                }, 100);
                              }}
                              onBlur={() => {
                                clearTimeout(t);
                                setFocus(null);
                              }}
                              placeholder={
                                (formField as { value: string } | null)
                                  ?.value === null
                                  ? 'null'
                                  : undefined
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.target instanceof HTMLTextAreaElement &&
                                  e.target.value === '' &&
                                  (e.key === 'Backspace' || e.key === 'Delete')
                                ) {
                                  setFilter(
                                    filter.map((g2, g2Index) =>
                                      gIndex === g2Index
                                        ? group.map((f) =>
                                            f === formField
                                              ? {
                                                  ...f,
                                                  value: null,
                                                }
                                              : f,
                                          )
                                        : g2,
                                    ),
                                  );
                                }
                              }}
                              onChange={(e) => {
                                if (
                                  formField?.operator === 'notnull' ||
                                  formField?.operator === 'null'
                                )
                                  return;
                                if (formField === null) {
                                  setFilter(
                                    filter.map((g2, g2Index) =>
                                      gIndex === g2Index
                                        ? [
                                            ...group,
                                            {
                                              value: e.target.value,
                                              operator: '',
                                              field: '',
                                            },
                                          ]
                                        : g2,
                                    ),
                                  );
                                  fit();
                                } else {
                                  setFilter(
                                    filter.map((g2, g2Index) =>
                                      gIndex === g2Index
                                        ? group.map((f) =>
                                            f === formField
                                              ? { ...f, value: e.target.value }
                                              : f,
                                          )
                                        : g2,
                                    ),
                                  );
                                }
                              }}
                            />
                            {formField?.sql ? (
                              <span className="data-grid-filter-dialog--sql-tip">
                                SQL
                              </span>
                            ) : null}
                          </span>
                        )}
                        <span
                          className="data-grid-filter-dialog--value-type"
                          style={
                            formField?.operator === 'notnull' ||
                            formField?.operator === 'null'
                              ? { visibility: 'hidden' }
                              : undefined
                          }
                        >
                          <select
                            value={
                              formField?.sql
                                ? 'sql'
                                : (
                                      formField as {
                                        value?: string | null;
                                      } | null
                                    )?.value === null
                                  ? 'null'
                                  : ''
                            }
                            onChange={(e) => {
                              if (formField === null) {
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? [
                                          ...group,
                                          {
                                            value:
                                              e.target.value === 'null'
                                                ? null
                                                : '',
                                            operator: '',
                                            field: '',
                                            sql: e.target.value === 'sql',
                                          },
                                        ]
                                      : g2,
                                  ),
                                );
                                fit();
                              } else {
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? group.map((f) =>
                                          f === formField
                                            ? {
                                                ...f,
                                                value:
                                                  e.target.value === 'null'
                                                    ? null
                                                    : e.target.value ===
                                                          'sql' &&
                                                        (
                                                          formField as {
                                                            value:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value === null
                                                      ? ''
                                                      : (
                                                          formField as {
                                                            value:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value ?? '',
                                                sql: e.target.value === 'sql',
                                                values:
                                                  formField?.operator ===
                                                    'in' ||
                                                  formField?.operator === 'nin'
                                                    ? ['']
                                                    : undefined,
                                              }
                                            : f,
                                        )
                                      : g2,
                                  ) as Filter,
                                );
                              }
                            }}
                            style={{ opacity: 0 }}
                          >
                            {formField?.operator === 'in' ||
                            formField?.operator === 'nin' ? (
                              <option value="">Normal Values</option>
                            ) : (
                              <option value="">Normal Value</option>
                            )}
                            <option value="sql">SQL Query Fragment</option>
                            {formField?.operator === 'in' ||
                            formField?.operator === 'nin' ? null : (
                              <option value="null">NULL</option>
                            )}
                          </select>
                        </span>
                      </div>
                      {formField?.operator === 'between' ||
                      formField?.operator === 'nbetween' ? (
                        <div
                          style={{ display: 'flex', gap: 10 }}
                          className={
                            focus?.[0] === gIndex &&
                            focus?.[1] === i &&
                            focus?.[2] === 1
                              ? 'data-grid-filter-dialog--input-focus'
                              : undefined
                          }
                        >
                          <div
                            style={{
                              width: 33,
                              fontSize: 15,
                              fontWeight: 'bold',
                              marginTop: isBigForm ? 3 : 16,
                            }}
                          >
                            AND
                          </div>
                          <span
                            style={{ position: 'relative' }}
                            className={`data-grid-filter-dialog--input-wrapper${
                              formField?.sql2
                                ? ' data-grid-filter-dialog--sql'
                                : ''
                            }${
                              formField?.sql2 &&
                              !validSql(formField?.value2 ?? '')
                                ? ' data-grid-filter-dialog--sql-invalid'
                                : ''
                            }`}
                          >
                            {formField?.sql2 ? (
                              <div
                                className="data-grid-filter-dialog--small-ops"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <span className="selected">
                                  SQL Query Fragment
                                </span>
                              </div>
                            ) : null}
                            <textarea
                              style={{ width: 107 }}
                              value={
                                (formField as { value2: string } | null)
                                  ?.value2 ?? ''
                              }
                              onFocus={() => {
                                clearTimeout(t);
                                t = setTimeout(() => {
                                  setFocus([gIndex, i, 1]);
                                }, 100);
                              }}
                              onBlur={() => {
                                clearTimeout(t);
                                setFocus(null);
                              }}
                              placeholder={
                                (formField as { value2: string } | null)
                                  ?.value2 === null
                                  ? 'null'
                                  : undefined
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.target instanceof HTMLTextAreaElement &&
                                  e.target.value === '' &&
                                  (e.key === 'Backspace' || e.key === 'Delete')
                                ) {
                                  setFilter(
                                    filter.map((g2, g2Index) =>
                                      gIndex === g2Index
                                        ? group.map((f) =>
                                            f === formField
                                              ? {
                                                  ...f,
                                                  value2: null,
                                                }
                                              : f,
                                          )
                                        : g2,
                                    ),
                                  );
                                }
                              }}
                              onChange={(e) => {
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? group.map((f) =>
                                          f === formField
                                            ? {
                                                ...f,
                                                value2: e.target.value,
                                              }
                                            : f,
                                        )
                                      : g2,
                                  ),
                                );
                              }}
                            />
                            {formField?.sql2 ? (
                              <span className="data-grid-filter-dialog--sql-tip">
                                SQL
                              </span>
                            ) : null}
                          </span>
                          <span className="data-grid-filter-dialog--value-type">
                            <select
                              value={
                                formField?.sql2
                                  ? 'sql'
                                  : (
                                        formField as {
                                          value2?: string | null;
                                        } | null
                                      )?.value2 === null
                                    ? 'null'
                                    : ''
                              }
                              onChange={(e) => {
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? group.map((f) =>
                                          f === formField
                                            ? {
                                                ...f,
                                                value2:
                                                  e.target.value === 'null'
                                                    ? null
                                                    : e.target.value ===
                                                          'sql' &&
                                                        (
                                                          formField as {
                                                            value2:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value2 === null
                                                      ? ''
                                                      : (
                                                          formField as {
                                                            value2:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value2 ?? '',
                                                sql2: e.target.value === 'sql',
                                                values: undefined,
                                              }
                                            : f,
                                        )
                                      : g2,
                                  ),
                                );
                              }}
                              style={{ opacity: 0 }}
                            >
                              <option value="">Normal Value</option>
                              <option value="sql">SQL Query Fragment</option>
                              <option value="null">NULL</option>
                            </select>
                          </span>
                        </div>
                      ) : undefined}
                    </div>

                    <i
                      className="fa fa-close"
                      style={
                        formField === null &&
                        (gIndex === 0 || group.length !== 0)
                          ? { visibility: 'hidden' }
                          : undefined
                      }
                      onClick={
                        formField === null &&
                        (gIndex === 0 || group.length !== 0)
                          ? undefined
                          : () => {
                              if (formField === null && group.length === 0) {
                                setFilter(filter.filter((f) => f !== group));
                              } else
                                setFilter(
                                  filter.map((g2, g2Index) =>
                                    gIndex === g2Index
                                      ? group.filter((f) => f !== formField)
                                      : g2,
                                  ),
                                );
                            }
                      }
                    />
                  </div>
                ))}
              </div>
              {gIndex !== filter.length - 1 ? (
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: 17,
                    padding: 10,
                    paddingTop: 12,
                  }}
                >
                  OR
                </div>
              ) : (
                <div
                  style={{
                    marginBottom: 5,
                    marginTop: 6,
                    textAlign: !isBigForm ? 'right' : undefined,
                  }}
                >
                  <button
                    type="button"
                    className="data-grid-filter-dialog--or"
                    onClick={() => {
                      setFilter([...filter, []]);
                      fit();
                    }}
                  >
                    <i className="fa fa-plus" /> <strong>OR</strong>
                  </button>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div>
        <button
          style={{ fontWeight: 'normal' }}
          type="button"
          onClick={onCancelClick}
        >
          Cancel
        </button>
        <button onClick={onApplyClick} disabled={disabled} type="button">
          Apply <i className="fa fa-check" />
        </button>
      </div>
    </Dialog>
  );
}
