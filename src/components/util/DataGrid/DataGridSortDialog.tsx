import { Sort } from 'db/db';
import { useState } from 'react';
import { equals } from 'util/equals';
import { Dialog } from '../Dialog/Dialog';

interface DataGridSortDialogProps {
  fields: { name: string }[];
  currentSort?: Sort;
  onChangeSort: (sort: Sort) => void;
  onClose: () => void;
}

export function DataGridSortDialog(props: DataGridSortDialogProps) {
  const [form, setForm] = useState(
    props.currentSort?.map((s) => ({ ...s })) ?? [],
  );

  const disabled =
    equals(form, props.currentSort) ||
    !!form.find((s) => !s.field || !s.direction);

  const onCancelClick = () => {
    props.onClose();
  };

  const onApplyClick = () => {
    if (disabled) return;
    props.onChangeSort(form);
    props.onClose();
  };

  return (
    <Dialog
      relativeTo="previousSibling"
      onBlur={props.onClose}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      className="form"
    >
      <h1
        style={{
          margin: 0,
          marginBottom: 20,
          lineHeight: '1em',
          fontFamily: 'sans-serif',
        }}
      >
        Sort
      </h1>
      {[...form, null].map((formField, i) => (
        <div
          style={{
            display: 'flex',
            gap: 10,
            width: 300,
            opacity: formField === null ? 0.3 : undefined,
          }}
          className="form-row"
          key={i}
        >
          <select
            value={formField?.field ?? ''}
            onChange={(e) => {
              if (formField === null) {
                setForm([...form, { field: e.target.value, direction: 'asc' }]);
              } else {
                setForm(
                  form.map((f) =>
                    f === formField ? { ...f, field: e.target.value } : f,
                  ),
                );
              }
            }}
          >
            {!formField || !formField.field ? <option value="" /> : null}

            {props.fields
              .filter(
                (op) =>
                  !form.find((s) => s.field === op.name) ||
                  op.name === formField?.field,
              )
              .map((f, index) => (
                <option key={index} value={f.name}>
                  {f.name}
                </option>
              ))}
          </select>
          <select
            style={{ width: 80 }}
            value={formField?.direction ?? 'asc'}
            onChange={(e) => {
              if (formField === null) {
                setForm([
                  ...form,
                  { field: '', direction: e.target.value as 'asc' | 'desc' },
                ]);
              } else {
                setForm(
                  form.map((f) =>
                    f === formField
                      ? { ...f, direction: e.target.value as 'asc' | 'desc' }
                      : f,
                  ),
                );
              }
            }}
          >
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
          {formField ? (
            <i
              className="fa fa-close"
              onClick={() => {
                setForm(form.filter((f) => f !== formField));
              }}
            />
          ) : (
            <i className="fa fa-close" style={{ visibility: 'hidden' }} />
          )}
        </div>
      ))}
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
