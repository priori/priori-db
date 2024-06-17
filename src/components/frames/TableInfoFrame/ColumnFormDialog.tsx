import { useService } from 'util/useService';
import { useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useIsMounted } from 'util/hooks';
import { grantError } from 'util/errors';
import { showError } from 'state/actions';
import { Dialog } from 'components/util/Dialog/Dialog';
import { db } from 'db/db';
import { equals } from 'util/equals';

export interface ColumnForm {
  name: string;
  type: string;
  length?: number;
  scale?: number;
  comment: string | null;
  notNull: boolean;
  default?: string;
  enum?: string[];
}
export function ColumnFormDialog({
  onCancel,
  onUpdate,
  relativeTo,
  column,
}: {
  onCancel: () => void;
  onUpdate: (v: ColumnForm) => Promise<void>;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
  column?: ColumnForm;
}) {
  const [form, setForm] = useState<ColumnForm>(
    column
      ? { ...column }
      : { name: '', type: '', notNull: false, comment: null, enum: [''] },
  );
  const [error, setError] = useState<Error | null>(null);
  const { lastValidData } = useService(() => db().types(), []);
  const [executing, setExecuting] = useState(false);
  const onBlur = useEvent(() => {
    if (executing) return;
    onCancel();
  });
  const isMounted = useIsMounted();
  const onSave = useEvent(async () => {
    try {
      setError(null);
      setExecuting(true);
      await onUpdate(form);
    } catch (e) {
      if (isMounted()) setError(grantError(e));
      else showError(grantError(e));
    } finally {
      if (isMounted()) setExecuting(false);
    }
  });
  const updateDisabled =
    !!error ||
    executing ||
    !Object.keys(form).length ||
    !form.name ||
    !form.type ||
    (column &&
      column.name === form.name &&
      (column.comment || null) === (form.comment || null) &&
      column.notNull === form.notNull &&
      column.type === form.type &&
      column.scale === form.scale &&
      column.length === form.length &&
      (column.default || undefined) === (form.default || undefined) &&
      equals(column.enum, form.enum));
  const fieldsDisabled = executing || !!error;
  const type =
    (lastValidData && lastValidData.find((t) => t.name === form.type)) || null;
  return (
    <Dialog relativeTo={relativeTo} onBlur={onBlur}>
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
      <div className="dialog-form">
        <input
          disabled={fieldsDisabled}
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div style={{ display: 'flex', width: 250 }}>
          <select
            disabled={fieldsDisabled}
            value={form.type}
            onChange={(e) => {
              const newType = lastValidData?.find(
                (t) => t.name === e.target.value,
              );
              if (newType) {
                setForm({
                  ...form,
                  type: e.target.value,
                  length:
                    e.target.value === column?.type
                      ? column?.length
                      : undefined,
                  scale:
                    e.target.value === column?.type
                      ? column?.length
                      : undefined,
                });
              }
            }}
            style={!form.type ? { height: 39, color: '#777' } : { height: 39 }}
          >
            <option value="" style={{ color: '#ccc' }} disabled hidden>
              Type
            </option>
            {lastValidData?.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            )) ||
              (form.type && <option value={form.type}>{form.type}</option>)}
          </select>
          {type?.name.toLowerCase() === 'enum' ? (
            <div style={{ width: 277 }}>
              {[...(form.enum ?? []), ''].map((e, i) => (
                <input
                  key={i}
                  type="text"
                  style={{ height: 39, marginLeft: 5 }}
                  value={e}
                  onBlur={() => {
                    setForm({
                      ...form,
                      enum: form.enum!.filter((v) => v.trim()),
                    });
                  }}
                  onChange={(ev) => {
                    const newEnum = [...(form.enum ?? [])];
                    newEnum[i] = ev.target.value;
                    setForm({ ...form, enum: newEnum });
                  }}
                />
              ))}
            </div>
          ) : null}
          {type?.allowLength ? (
            <input
              disabled={fieldsDisabled}
              type="number"
              placeholder="LEN"
              value={form.length ? `${form.length}` || '' : ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  length:
                    e.target.value &&
                    !Number.isNaN(parseInt(e.target.value, 10)) &&
                    parseInt(e.target.value, 10) > 0
                      ? parseInt(e.target.value, 10)
                      : undefined,
                })
              }
              min={1}
              style={{ marginLeft: 5, width: 70 }}
            />
          ) : null}
          {type?.allowPrecision ? (
            <input
              disabled={fieldsDisabled}
              type="number"
              placeholder="SCALE"
              min={0}
              value={typeof form.scale === 'number' ? `${form.scale}` : ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  scale:
                    e.target.value &&
                    !Number.isNaN(parseInt(e.target.value, 10)) &&
                    parseInt(e.target.value, 10) >= 0
                      ? parseInt(e.target.value, 10)
                      : undefined,
                })
              }
              style={{ marginLeft: 5, width: 70 }}
            />
          ) : null}
        </div>
        <textarea
          disabled={fieldsDisabled}
          placeholder="Comment"
          value={form.comment || ''}
          onChange={(e) =>
            setForm({ ...form, comment: e.target.value || null })
          }
        />
        <div
          tabIndex={0}
          onKeyDown={
            executing || !!error
              ? undefined
              : (e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    setForm({ ...form, notNull: !form.notNull });
                  }
                }
          }
          onClick={
            executing || !!error
              ? undefined
              : () => setForm({ ...form, notNull: !form.notNull })
          }
        >
          {form.notNull ? (
            <i className="fa fa-check-square-o" />
          ) : (
            <i className="fa fa-square-o" />
          )}{' '}
          NOT NULL
        </div>
        <span className="default-input">
          <input
            disabled={fieldsDisabled}
            type="text"
            placeholder="Default"
            value={form.default || ''}
            onChange={(e) => setForm({ ...form, default: e.target.value })}
          />
        </span>
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
