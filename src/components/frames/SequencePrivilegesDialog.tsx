import { Dialog } from 'components/util/Dialog/Dialog';
import { useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import { SequencePrivileges } from 'types';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

type SequencePrivilegesDialogProps =
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_role';
      onCancel: () => void;
      onUpdate: (f: {
        role: string;
        privileges: SequencePrivileges;
      }) => Promise<void>;
      roleName?: string;
      privileges?: SequencePrivileges;
    }
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_sequence';
      onCancel: () => void;
      onUpdate: (f: {
        sequence: string;
        schema: string;
        privileges: SequencePrivileges;
      }) => Promise<void>;
      schema?: string;
      sequence?: string;
      privileges?: SequencePrivileges;
    };

export function SequencePrivilegesDialog(props: SequencePrivilegesDialogProps) {
  const { relativeTo, onCancel, privileges, onUpdate, type } = props;
  const roleName = type === 'by_role' ? props.roleName : undefined;

  const name = type === 'by_sequence' ? props.sequence : undefined;
  const schemaName = type === 'by_sequence' ? props.schema : undefined;
  const [sequenceNameValue, setSequenceNameValue] = useState(name);
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
    (type === 'by_sequence' && (!schemaNameValue || !sequenceNameValue)) ||
    !(
      !!form.update !== !!privileges?.update ||
      !!form.select !== !!privileges?.select ||
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
      (type === 'by_sequence' && (!schemaNameValue || !sequenceNameValue))
    )
      return;
    try {
      setExecuting(true);
      if (type === 'by_role')
        await onUpdate({
          role: roleNameInput!,
          privileges: {
            update: form.update,
            select: form.select,
            usage: form.usage,
          },
        });
      else if (type === 'by_sequence')
        await onUpdate({
          schema: schemaNameValue!,
          sequence: sequenceNameValue!,
          privileges: {
            update: form.update,
            select: form.select,
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
        ) : schemaName && name ? (
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '20px',
            }}
          >
            {schemaName}.{name}
          </div>
        ) : type === 'by_sequence' ? (
          <div style={{ display: 'flex', gap: 20 }}>
            <select
              onChange={(e) => {
                setSchemaNameValue(e.target.value);
                setSequenceNameValue('');
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
              value={sequenceNameValue}
              onChange={(e) => {
                setSequenceNameValue(e.target.value);
              }}
            >
              <option value="" />
              {schemaNameValue &&
                schemas
                  ?.find((s) => s.name === schemaNameValue)
                  ?.sequences?.map((t) => (
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
            width: '360px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={
              !!form.usage === !!privileges?.usage
                ? {
                    opacity: 0.3,
                    width: '33%',
                    textAlign: 'left',
                  }
                : {
                    width: '33%',
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
              !!form.select === !!privileges?.select
                ? {
                    opacity: 0.3,
                    width: '33%',
                    textAlign: 'left',
                  }
                : {
                    width: '33%',
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
            tabIndex={0}
            style={
              !!form.update === !!privileges?.update
                ? {
                    opacity: 0.3,
                    width: '33%',
                    textAlign: 'left',
                  }
                : {
                    width: '33%',
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
