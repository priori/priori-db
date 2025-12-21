import { Filter, db, operatorsLabels } from 'db/db';
import React, { useState } from 'react';
import { useService } from 'util/useService';
import { assert } from 'util/assert';
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
  let inSingleLineComment = false;
  let inCommentBlock = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inSingleLineComment) {
      if (ch === '\n' && inSingleLineComment) {
        inSingleLineComment = false;
      }
    } else if (inCommentBlock) {
      if (ch === '/' && s[i - 1] === '*') {
        inCommentBlock = false;
      }
    } else if (inString) {
      if (ch === inString) inString = false;
    } else if (ch === "'" || ch === '"') {
      inString = ch;
    } else if (ch && ch in scopesMap) {
      scopes.push(ch as '(' | '[' | '{');
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (scopes.length === 0) return false;
      const last = scopes[scopes.length - 1];
      assert(last);
      if (ch !== scopesMap[last]) return false;
      scopes.pop();
    } else if (ch === '-' && s[i - 1] === '-') {
      inSingleLineComment = true;
    } else if (ch === '*' && s[i - 1] === '/') {
      inCommentBlock = true;
    }
  }
  return !inString && scopes.length === 0 && !inCommentBlock;
}
const cache = new Map<string, boolean>();
let timeout: ReturnType<typeof setTimeout> | null = null;
export function validSql(s: string) {
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

export function DataGridFilterDialog(props: DataGridFilterDialogProps) {
  const [focus, setFocus] = useState<[number, number, 0 | 1] | null>(null);

  const operatorsS = useService(() => db().operators(), []);
  const operators = operatorsS.lastValidData ?? [];

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
    (filter.length > 1 || (filter.length === 1 && filter[0]!.length > 3));

  const updatedSqlQuery =
    editQuery && 'type' in filter && filter.type === 'query';

  return (
    <Dialog
      relativeTo="previousSibling"
      onBlur={props.onClose}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      relativeToSelector=".grid__scroll"
      className={`form ${
        !('type' in filter) && isBigForm
          ? 'grid__filter-dialog__big-form'
          : 'grid__filter-dialog__small-form'
      }`}
    >
      <h1 style={{ margin: 0, marginBottom: 20, lineHeight: '1em' }}>Filter</h1>
      <button
        className={`grid__filter-dialog__where-sql${
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
                ? 'grid__filter-dialog__sql-invalid'
                : undefined
            }
          >
            <textarea
              className="grid__filter-dialog__sql-where"
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
              className="grid__filter-dialog__edit-button"
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
              className="grid__filter-dialog__sql-where"
              value={db().buildFilterWhere(filter)}
              readOnly
            />
            <button
              className="grid__filter-dialog__edit-button"
              style={
                !('type' in filter) &&
                filter.length === 1 &&
                filter[0]!.length === 0 &&
                db().buildFilterWhere(filter)
                  ? { opacity: 0.14 }
                  : undefined
              }
              onClick={() => {
                setEditQuery(db().buildFilterWhere(filter));
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
              <div className="grid__filter-dialog__and-group">
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
                          operatorsLabels[
                            formField?.operator as keyof typeof operatorsLabels
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
                                              | keyof typeof operatorsLabels
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
                                                | keyof typeof operatorsLabels
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
                                                | keyof typeof operatorsLabels
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
                      {operators.map((operator) => (
                        <option key={operator} value={operator}>
                          {
                            operatorsLabels[
                              operator as keyof typeof operatorsLabels
                            ]
                          }
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
                            ? 'grid__filter-dialog__input-focus'
                            : undefined
                        }
                      >
                        {!formField?.sql &&
                        (formField?.operator === 'in' ||
                          formField?.operator === 'nin') ? (
                          <span
                            style={{ position: 'relative' }}
                            className="grid__filter-dialog__input-wrapper"
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
                            className={`grid__filter-dialog__input-wrapper${
                              formField?.sql ? ' grid__filter-dialog__sql' : ''
                            }${
                              formField?.sql &&
                              !validSql(formField?.value ?? '')
                                ? ' grid__filter-dialog__sql-invalid'
                                : ''
                            }`}
                          >
                            {formField?.sql ? (
                              <div
                                className="grid__filter-dialog__small-ops"
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
                                  : ((formField as { value: string } | null)
                                      ?.value ?? '')
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
                              <span className="grid__filter-dialog__sql-tip">
                                SQL
                              </span>
                            ) : null}
                          </span>
                        )}
                        <span
                          className="grid__filter-dialog__value-type"
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
                                                      : ((
                                                          formField as {
                                                            value:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value ?? ''),
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
                              ? 'grid__filter-dialog__input-focus'
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
                            className={`grid__filter-dialog__input-wrapper${
                              formField?.sql2 ? ' grid__filter-dialog__sql' : ''
                            }${
                              formField?.sql2 &&
                              !validSql(formField?.value2 ?? '')
                                ? ' grid__filter-dialog__sql-invalid'
                                : ''
                            }`}
                          >
                            {formField?.sql2 ? (
                              <div
                                className="grid__filter-dialog__small-ops"
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
                              <span className="grid__filter-dialog__sql-tip">
                                SQL
                              </span>
                            ) : null}
                          </span>
                          <span className="grid__filter-dialog__value-type">
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
                                                      : ((
                                                          formField as {
                                                            value2:
                                                              | string
                                                              | null;
                                                          }
                                                        ).value2 ?? ''),
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
                    className="grid__filter-dialog__or"
                    style={{ marginRight: 0 }}
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
          className="button"
          style={{ fontWeight: 'normal' }}
          onClick={onCancelClick}
        >
          Cancel
        </button>
        <button className="button" onClick={onApplyClick} disabled={disabled}>
          Apply <i className="fa fa-check" />
        </button>
      </div>
    </Dialog>
  );
}
