import { Dialog } from 'components/util/Dialog/Dialog';
import { useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import { TablePrivileges, TablePrivilegesType } from 'types';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

type TablePrivilegesDialogProps =
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_role';
      host?: string;
      onCancel: () => void;
      onUpdate: (f: {
        role: string;
        privileges: TablePrivileges;
        host?: string;
      }) => Promise<void>;
      roleName?: string;
      privileges?: TablePrivileges;
      privilegesTypes: TablePrivilegesType[];
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
      privilegesTypes: TablePrivilegesType[];
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
  const [role, setRole] = useState<{ name: string; host?: string } | undefined>(
    undefined,
  );

  const updateDisabled =
    !!error ||
    executing ||
    equals(form, privileges) ||
    (type === 'by_role' && !role && !props.roleName) ||
    (type === 'by_table' && (!schemaNameValue || !tableNameValue)) ||
    !props.privilegesTypes.find((t) => !!form[t] !== !!privileges?.[t]);

  // const updateDisabled =
  //   !!error ||
  //   executing ||
  //   form.cols.length === 0 ||
  //   !!form.cols.find((c) => !c.name);
  const fieldsDisabled = executing || !!error;
  const onSave = useEvent(async () => {
    if (
      (type === 'by_role' && !props.roleName && !role) ||
      (type === 'by_table' && (!schemaNameValue || !tableNameValue))
    )
      return;
    try {
      const update: Partial<Record<TablePrivilegesType, boolean>> = {};
      for (const key of props.privilegesTypes) {
        if (typeof form[key] === 'boolean' && form[key] !== privileges?.[key]) {
          update[key] = form[key];
        }
      }
      setExecuting(true);
      if (type === 'by_role') {
        await onUpdate({
          role: role?.name || props.roleName!,
          privileges: update,
          host: role?.host || props.host,
        });
      } else if (type === 'by_table') {
        await onUpdate({
          schema: schemaNameValue!,
          table: tableNameValue!,
          privileges: update,
        });
      }
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
            <select
              value={JSON.stringify(
                role ? [role.name, role.host] : [roleName, props.host],
              )}
              onChange={(e) => {
                const [name2, host] = JSON.parse(e.target.value);
                setRole({ name: name2, host });
              }}
            >
              <option value="" />
              {roles?.map((r) => (
                <option
                  key={JSON.stringify([r.name, r.host])}
                  value={JSON.stringify([r.name, r.host])}
                >
                  {r.name}
                  {r.host ? `@${r.host}` : ''}
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
          {props.privilegesTypes.map((t) => (
            <div
              key={t}
              tabIndex={0}
              style={
                !!form[t] === !!privileges?.[t]
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
                        setForm({ ...form, [t]: !form?.[t] });
                      }
                    }
              }
              onClick={
                executing || !!error
                  ? undefined
                  : () => setForm({ ...form, [t]: !form?.[t] })
              }
            >
              {form?.[t] ? (
                <i className="fa fa-check-square-o" />
              ) : (
                <i className="fa fa-square-o" />
              )}{' '}
              {t.replace(/[A-Z]/g, ' $&').toUpperCase()}
            </div>
          ))}
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
