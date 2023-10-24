import { Dialog } from 'components/util/Dialog/Dialog';
import { useState } from 'react';
import { grantError } from 'util/errors';
import { useEvent } from 'util/useEvent';
import { showError } from 'state/actions';
import { useIsMounted } from 'util/hooks';

export interface IndexForm {
  method?: string | undefined;
  unique?: true | false | undefined;
  cols: {
    name: string;
    sort?: 'asc' | 'desc' | undefined;
    nulls?: 'last' | 'first' | undefined;
  }[];
}
export function IndexDialog({
  relativeTo,
  onCancel,
  cols,
  onUpdate,
}: {
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
  onCancel: () => void;
  cols: string[];
  onUpdate: (f: IndexForm) => Promise<void>;
}) {
  const [form, setForm] = useState<IndexForm>({ cols: [] });
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onBlur = useEvent(() => {
    if (executing) return;
    onCancel();
  });
  const isMounted = useIsMounted();
  const updateDisabled =
    !!error ||
    executing ||
    form.cols.length === 0 ||
    !!form.cols.find((c) => !c.name);
  const fieldsDisabled = executing || !!error;
  const onSave = useEvent(async () => {
    try {
      setExecuting(true);
      await onUpdate(form);
    } catch (e) {
      if (isMounted()) setError(grantError(e));
      else showError(grantError(e));
    } finally {
      if (isMounted()) setExecuting(false);
    }
  });

  const onChangeColNulls = useEvent((val: string, index: number) => {
    if (index >= form.cols.length) {
      setForm({
        ...form,
        cols: [
          ...form.cols,
          {
            name: '',
            nulls: !val ? undefined : (val as 'first' | 'last'),
          },
        ],
      });
    } else {
      setForm({
        ...form,
        cols: form.cols.map((col, i) =>
          i === index
            ? { ...col, nulls: !val ? undefined : (val as 'first' | 'last') }
            : col,
        ),
      });
    }
  });
  const onColRemove = useEvent((i: number) => {
    setForm({
      ...form,
      cols: [...form.cols.filter((_, i2) => i2 !== i)],
    });
  });
  const onChangeColSort = useEvent((val: string, index: number) => {
    if (index >= form.cols.length) {
      setForm({
        ...form,
        cols: [
          ...form.cols,
          {
            name: '',
            sort: !val ? undefined : (val as 'asc' | 'desc'),
          },
        ],
      });
    } else {
      setForm({
        ...form,
        cols: form.cols.map((col, i) =>
          i === index
            ? { ...col, sort: !val ? undefined : (val as 'asc' | 'desc') }
            : col,
        ),
      });
    }
  });
  const onChangeColName = useEvent((val: string, index: number) => {
    if (index >= form.cols.length) {
      setForm({
        ...form,
        cols: [
          ...form.cols,
          {
            name: val,
          },
        ],
      });
    } else {
      setForm({
        ...form,
        cols: form.cols.map((col, i) =>
          i === index ? { ...col, name: val } : col,
        ),
      });
    }
  });

  return (
    <Dialog relativeTo={relativeTo} onBlur={onBlur}>
      <div className="dialog-form">
        {error ? (
          <div className="dialog-form--error">
            <div className="dialog-form--error-message">{error.message}</div>
            <div className="dialog-form--error-buttons">
              <button type="button" onClick={() => setError(null)}>
                Ok
              </button>
            </div>
          </div>
        ) : null}
        <select
          placeholder="Method"
          onChange={(e) => {
            setForm(
              e.target.value
                ? {
                    ...form,
                    method: e.target.value,
                  }
                : form.unique
                ? {
                    unique: form.unique,
                    cols: form.cols,
                  }
                : {
                    cols: form.cols,
                  },
            );
          }}
          style={
            !form.method
              ? { color: '#777', marginBottom: 0 }
              : { marginBottom: 0 }
          }
        >
          <option value="" style={{ color: '#ccc' }}>
            Method
          </option>
          <option value="btree">btree</option>
          <option value="hash">hash</option>
          <option value="gist">gist</option>
          <option value="spgist">spgist</option>
          <option value="gin">gin</option>
          <option value="brin">brin</option>
        </select>
        <div
          tabIndex={0}
          onKeyDown={
            executing || !!error
              ? undefined
              : (e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setForm({ ...form, unique: !form.unique });
                  }
                }
          }
          onClick={
            executing || !!error
              ? undefined
              : () => setForm({ ...form, unique: !form.unique })
          }
        >
          {form.unique ? (
            <i className="fa fa-check-square-o" />
          ) : (
            <i className="fa fa-square-o" />
          )}{' '}
          UNIQUE
        </div>
        {(form.cols.length === cols.length
          ? form.cols
          : [...form.cols, null]
        ).map((col, index) => (
          <div style={{ display: 'flex', width: '300px' }} key={index}>
            <select
              style={{ flex: 1 }}
              onChange={(e) => onChangeColName(e.target.value, index)}
              value={(col && col.name) || ''}
            >
              {col === null || !col.name ? <option value="" /> : null}
              {cols
                .filter(
                  (c) =>
                    (col && c === col.name) ||
                    !form.cols.find((col2) => col2.name === c),
                )
                .map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
            </select>
            <select
              value={(col && col.sort) || ''}
              style={{ flex: 0.5, marginLeft: '5px' }}
              onChange={(e) => onChangeColSort(e.target.value, index)}
            >
              <option value="" />
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
            <select
              style={{ flex: 1, marginLeft: '5px' }}
              value={(col && col.nulls) || ''}
              onChange={(e) => onChangeColNulls(e.target.value, index)}
            >
              <option value="" />
              <option value="last">NULLS LAST</option>
              <option value="first">NULLS FIRST</option>
            </select>
            {col === null ? (
              <span style={{ flex: 0.3 }} />
            ) : (
              <i
                className="fa fa-close"
                style={{ flex: 0.3, fontSize: 20, textAlign: 'right' }}
                onClick={() => onColRemove(index)}
              />
            )}
          </div>
        ))}

        <div>
          <button
            disabled={fieldsDisabled}
            style={{ fontWeight: 'normal' }}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>{' '}
          <button
            disabled={updateDisabled}
            type="button"
            onClick={updateDisabled ? undefined : onSave}
          >
            Save <i className="fa fa-check" />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
