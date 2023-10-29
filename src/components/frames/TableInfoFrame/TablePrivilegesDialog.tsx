import { Dialog } from 'components/util/Dialog/Dialog';
import { useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import { TablePrivileges } from 'types';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

type TablePrivilegesDialogProps =
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_role';
      onCancel: () => void;
      onUpdate: (f: {
        role: string;
        privileges: TablePrivileges;
      }) => Promise<void>;
      roleName?: string;
      privileges?: TablePrivileges;
    }
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_table';
      onCancel: () => void;
      onUpdate: (f: {
        table: string;
        schema: string;
        privileges: TablePrivileges;
      }) => Promise<void>;
      schema?: string;
      table?: string;
      privileges?: TablePrivileges;
    };

export function TablePrivilegesDialog(props: TablePrivilegesDialogProps) {
  const { relativeTo, onCancel, privileges, onUpdate, type } = props;
  const roleName = type === 'by_role' ? props.roleName : undefined;

  const tableName = type === 'by_table' ? props.table : undefined;
  const schemaName = type === 'by_table' ? props.schema : undefined;
  const [tableNameValue, setTableNameValue] = useState(tableName);
  const [schemaNameValue, setSchemaNameValue] = useState(schemaName);

  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onBlur = useEvent(() => {
    if (executing) return;
    onCancel();
  });
  const isMounted = useIsMounted();
  const [form, setForm] = useState({
    ...privileges,
  });
  const [roleNameInput, setRoleName] = useState(roleName);

  const updateDisabled =
    !!error ||
    executing ||
    equals(form, privileges) ||
    (type === 'by_role' && !roleNameInput) ||
    (type === 'by_table' && (!schemaNameValue || !tableNameValue)) ||
    !(
      !!form.update !== !!privileges?.update ||
      !!form.insert !== !!privileges?.insert ||
      !!form.select !== !!privileges?.select ||
      !!form.delete !== !!privileges?.delete ||
      !!form.truncate !== !!privileges?.truncate ||
      !!form.references !== !!privileges?.references ||
      !!form.trigger !== !!privileges?.trigger
    );

  // const updateDisabled =
  //   !!error ||
  //   executing ||
  //   form.cols.length === 0 ||
  //   !!form.cols.find((c) => !c.name);
  const fieldsDisabled = executing || !!error;
  const onSave = useEvent(async () => {
    if (
      (!roleNameInput && type === 'by_role') ||
      (type === 'by_table' && (!schemaNameValue || !tableNameValue))
    )
      return;
    try {
      setExecuting(true);
      if (type === 'by_role')
        await onUpdate({
          role: roleNameInput!,
          privileges: {
            update: form.update,
            insert: form.insert,
            select: form.select,
            delete: form.delete,
            truncate: form.truncate,
            references: form.references,
            trigger: form.trigger,
          },
        });
      else if (type === 'by_table')
        await onUpdate({
          schema: schemaNameValue!,
          table: tableNameValue!,
          privileges: {
            update: form.update,
            insert: form.insert,
            select: form.select,
            delete: form.delete,
            truncate: form.truncate,
            references: form.references,
            trigger: form.trigger,
          },
        });
    } catch (e) {
      if (isMounted()) setError(grantError(e));
      else showError(grantError(e));
    } finally {
      if (isMounted()) setExecuting(false);
    }
  });

  const { roles, schemas } = currentState();

  return (
    <Dialog relativeTo={relativeTo} onBlur={onBlur}>
      <div className="dialog-form" style={{ lineHeight: '2.5em' }}>
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

        {roleName ? (
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '20px',
            }}
          >
            {roleName}
          </div>
        ) : schemaName && tableName ? (
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '20px',
            }}
          >
            {schemaName}.{tableName}
          </div>
        ) : type === 'by_table' ? (
          <div style={{ display: 'flex', gap: 20 }}>
            <select
              onChange={(e) => {
                setSchemaNameValue(e.target.value);
                setTableNameValue('');
              }}
              value={schemaNameValue}
            >
              <option value="" />
              {schemas?.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              disabled={!schemaNameValue}
              value={tableNameValue}
              onChange={(e) => {
                setTableNameValue(e.target.value);
              }}
            >
              <option value="" />
              {schemaNameValue &&
                schemas
                  ?.find((s) => s.name === schemaNameValue)
                  ?.tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
            </select>
          </div>
        ) : (
          <div>
            <select onChange={(e) => setRoleName(e.target.value)}>
              <option value="" />
              {roles?.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            width: '500px',
            flexWrap: 'wrap',
          }}
        >
          <div
            tabIndex={0}
            style={
              !!form.update === !!privileges?.update
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, update: !form.update });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, update: !form.update })
            }
          >
            {form.update ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            UPDATE
          </div>
          <div
            style={
              !!form.insert === !!privileges?.insert
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, insert: !form.insert });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, insert: !form.insert })
            }
          >
            {form.insert ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            INSERT
          </div>
          <div
            style={
              !!form.select === !!privileges?.select
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, select: !form.select });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, select: !form.select })
            }
          >
            {form.select ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            SELECT
          </div>
          <div
            style={
              !!form.delete === !!privileges?.delete
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, delete: !form.delete });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, delete: !form.delete })
            }
          >
            {form.delete ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            DELETE
          </div>
          <div
            style={
              !!form.truncate === !!privileges?.truncate
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, truncate: !form.truncate });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, truncate: !form.truncate })
            }
          >
            {form.truncate ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            TRUNCATE
          </div>
          <div
            style={
              !!form.references === !!privileges?.references
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, references: !form.references });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, references: !form.references })
            }
          >
            {form.references ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            REFERENCES
          </div>
          <div
            style={
              !!form.trigger === !!privileges?.trigger
                ? {
                    opacity: 0.3,
                    width: '25%',
                    textAlign: 'left',
                  }
                : {
                    width: '25%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, trigger: !form.trigger });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, trigger: !form.trigger })
            }
          >
            {form.trigger ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            TRIGGER
          </div>
        </div>
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
