import { Dialog } from 'components/util/Dialog/Dialog';
import React, { useState } from 'react';
import { showError } from 'state/actions';
import { currentState } from 'state/state';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useIsMounted } from 'util/hooks';
import { useEvent } from 'util/useEvent';

type PrivilegesDialogProps =
  | {
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_role';
      host?: undefined | string;
      onCancel: () => void;
      onUpdate: (f: {
        role: string;
        privileges: {
          [k: string]: boolean | undefined;
        };
        host?: undefined | string;
      }) => Promise<void>;
      roleName?: string;
      privileges?: {
        [k: string]: boolean | undefined;
      };
      privilegesTypes: string[];
    }
  | {
      entityType: 'domain' | 'table' | 'sequence' | 'schema' | 'function';
      relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
      type: 'by_entity';
      onCancel: () => void;
      onUpdate: (f: {
        entityName: string;
        schema?: string;
        privileges: {
          [k: string]: boolean | undefined;
        };
      }) => Promise<void>;
      schema?: undefined | string;
      entity?: string;
      privileges?: {
        [k: string]: boolean | undefined;
      };
      privilegesTypes: string[];
    };

export function PrivilegesDialog(props: PrivilegesDialogProps) {
  const { relativeTo, onCancel, privileges, onUpdate, type } = props;
  const roleName = type === 'by_role' ? props.roleName : undefined;
  const tableName = type === 'by_entity' ? props.entity : undefined;
  const schemaName = type === 'by_entity' ? props.schema : undefined;
  const [tableNameValue, setTableNameValue] = useState(tableName);
  const [schemaNameValue, setSchemaNameValue] = useState(schemaName);
  const host = type === 'by_role' ? props.host : undefined;

  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onBlur = useEvent(() => {
    if (executing) return;
    onCancel();
  });
  const isMounted = useIsMounted();
  const [form, setForm] = useState<Record<string, boolean | undefined>>({
    ...privileges,
  });
  const [role, setRole] = useState<
    { name: string; host?: undefined | string } | undefined
  >(undefined);

  const updateDisabled =
    !!error ||
    executing ||
    equals(form, privileges) ||
    (type === 'by_role' && !role && !props.roleName) ||
    (type === 'by_entity' &&
      (!schemaNameValue ||
        (!tableNameValue && props.entityType !== 'schema'))) ||
    !props.privilegesTypes.find((t) => !!form[t] !== !!privileges?.[t]);

  const fieldsDisabled = executing || !!error;
  const onSave = useEvent(async () => {
    if (
      (type === 'by_role' && !props.roleName && !role) ||
      (type === 'by_entity' &&
        (!schemaNameValue ||
          (!tableNameValue && props.entityType !== 'schema')))
    )
      return;
    try {
      const update: Partial<Record<string, boolean>> = {};
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
      } else if (type === 'by_entity') {
        await onUpdate({
          schema: schemaNameValue!,
          entityName: tableNameValue!,
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

  const layout = React.useMemo(() => {
    return props.privilegesTypes.length > 2 &&
      !!props.privilegesTypes.find((t) => t.length > 10)
      ? 'large'
      : props.privilegesTypes.length <= 2
        ? props.privilegesTypes.find((t) => t.length > 10)
          ? 'small2'
          : 'small'
        : props.privilegesTypes.length === 3
          ? '3'
          : 'normal';
  }, [props.privilegesTypes]);

  const width =
    layout === 'small'
      ? 200
      : layout === 'small2' || layout === '3'
        ? 300
        : 510;
  const itemWidth =
    layout === 'large' || layout === '3'
      ? '33.3333%'
      : layout === 'normal'
        ? '25%'
        : '50%';

  return (
    <Dialog relativeTo={relativeTo} onBlur={onBlur}>
      <div className="dialog-form" style={{ lineHeight: '2.5em' }}>
        {error ? (
          <div className="dialog-form--error">
            <div className="dialog-form--error-message">{error.message}</div>
            <div className="dialog-form--error-buttons">
              <button className="button" onClick={() => setError(null)}>
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
            {host ? `@${host}` : ''}
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
        ) : type === 'by_entity' ? (
          <div
            style={{
              display: 'flex',
              gap: 20,
              width,
            }}
          >
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
            {props.entityType === 'schema' ? null : (
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
                    ?.[
                      props.entityType === 'sequence'
                        ? 'sequences'
                        : props.entityType === 'domain'
                          ? 'domains'
                          : props.entityType === 'function'
                            ? 'functions'
                            : 'tables'
                    ]?.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
              </select>
            )}
          </div>
        ) : (
          <div
            style={{
              width,
            }}
          >
            <select
              value={JSON.stringify(
                role ? [role.name, role.host] : [roleName, props.host],
              )}
              onChange={(e) => {
                const [name2, host2] = JSON.parse(e.target.value);
                setRole({ name: name2, host: host2 });
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
            width,
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
                      width: itemWidth,
                      textAlign: 'left',
                    }
                  : {
                      width: itemWidth,
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
        <div style={{ paddingTop: 7 }}>
          <button
            className="button"
            disabled={fieldsDisabled}
            style={{ fontWeight: 'normal' }}
            onClick={onCancel}
          >
            Cancel
          </button>{' '}
          <button
            className="button"
            disabled={updateDisabled}
            onClick={updateDisabled ? undefined : onSave}
          >
            Save <i className="fa fa-check" />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
