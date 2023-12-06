import { Dialog } from 'components/util/Dialog/Dialog';
import { useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import { SchemaPrivileges } from 'types';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

type SchemaPrivilegesDialogProps =
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_role';
      onCancel: () => void;
      onUpdate: (f: {
        role: string;
        privileges: SchemaPrivileges;
      }) => Promise<void>;
      roleName?: string;
      privileges?: SchemaPrivileges;
    }
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_schema';
      onCancel: () => void;
      onUpdate: (f: {
        schema: string;
        privileges: SchemaPrivileges;
      }) => Promise<void>;
      schema?: string;
      privileges?: SchemaPrivileges;
    };

export function SchemaPrivilegesDialog(props: SchemaPrivilegesDialogProps) {
  const { relativeTo, onCancel, privileges, onUpdate, type } = props;
  const roleName = type === 'by_role' ? props.roleName : undefined;
  const schemaName = type === 'by_schema' ? props.schema : undefined;
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
    (type === 'by_schema' && !schemaNameValue) ||
    !(
      !!form.create !== !!privileges?.create ||
      !!form.usage !== !!privileges?.usage
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
      (type === 'by_schema' && !schemaNameValue)
    )
      return;
    try {
      setExecuting(true);
      if (type === 'by_role')
        await onUpdate({
          role: roleNameInput!,
          privileges: {
            create: form.create,
            usage: form.usage,
          },
        });
      else if (type === 'by_schema')
        await onUpdate({
          schema: schemaNameValue!,
          privileges: {
            create: form.create,
            usage: form.usage,
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
      <div
        className="dialog-form"
        style={{ lineHeight: '2.5em', color: '#000', textAlign: 'center' }}
      >
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
        ) : type === 'by_schema' && props.schema ? (
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '20px',
              textAlign: 'center',
            }}
          >
            {props.schema}
          </div>
        ) : type === 'by_schema' ? (
          <div style={{ display: 'flex', gap: 20 }}>
            <select
              onChange={(e) => {
                setSchemaNameValue(e.target.value);
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
            width: '200px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={
              !!form.usage === !!privileges?.usage
                ? {
                    opacity: 0.3,
                    width: '50%',
                    textAlign: 'left',
                  }
                : {
                    width: '50%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, usage: !form.usage });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, usage: !form.usage })
            }
          >
            {form.usage ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            USAGE
          </div>
          <div
            style={
              !!form.create === !!privileges?.create
                ? {
                    opacity: 0.3,
                    width: '50%',
                    textAlign: 'left',
                  }
                : {
                    width: '50%',
                    textAlign: 'left',
                  }
            }
            tabIndex={0}
            onKeyDown={
              executing || !!error
                ? undefined
                : (e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setForm({ ...form, create: !form.create });
                    }
                  }
            }
            onClick={
              executing || !!error
                ? undefined
                : () => setForm({ ...form, create: !form.create })
            }
          >
            {form.create ? (
              <i className="fa fa-check-square-o" />
            ) : (
              <i className="fa fa-square-o" />
            )}{' '}
            CREATE
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
