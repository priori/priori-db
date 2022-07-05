import { closeTab, reloadNav } from 'state/actions';
import { DB } from 'db/DB';
import { useState } from 'react';
import { DomainFrameProps } from 'types';
import { throwError } from 'util/throwError';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';

interface DomainFrameServiceState {
  type: {
    [k: string]: string | number | null | boolean;
  };
}

export function DomainFrame(props: DomainFrameProps) {
  const service = useService(async () => {
    const [type] = await Promise.all([DB.pgType(props.schema, props.name)]);
    return { type } as DomainFrameServiceState;
  }, []);

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
  });
  const dropCascade = useEvent(() => {
    set({
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    if (state.dropCascadeConfirmation)
      DB.dropDomain(props.schema, props.name, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    else
      DB.dropDomain(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  });

  const noClick = useEvent(() => {
    set({
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  return (
    <div>
      <h1>
        {props.schema}.{props.name}
      </h1>
      {state.dropCascadeConfirmation || state.dropConfirmation ? (
        <div
          className="dialog"
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          tabIndex={0}
          ref={(el) => {
            if (el) el.focus();
          }}
          onBlur={(e) => {
            const dialogEl = e.currentTarget;
            setTimeout(() => {
              if (dialogEl.contains(document.activeElement)) return;
              noClick();
            }, 1);
          }}
        >
          {state.dropCascadeConfirmation
            ? 'Do you really want to drop cascade this domain?'
            : 'Do you really want to drop this domain?'}
          <div>
            <button type="button" onClick={yesClick}>
              Yes
            </button>{' '}
            <button type="button" onClick={noClick}>
              No
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={
          state.dropCascadeConfirmation || state.dropConfirmation
            ? undefined
            : drop
        }
      >
        Drop Domain
      </button>{' '}
      <button
        type="button"
        onClick={
          state.dropCascadeConfirmation || state.dropConfirmation
            ? undefined
            : dropCascade
        }
      >
        Drop Cascade
      </button>
      {service.lastValidData && service.lastValidData.type ? (
        <>
          <h2>pg_catalog.pg_type</h2>
          <div className="fields">
            {Object.entries(service.lastValidData.type).map(([k, v]) => (
              <div key={k} className="field">
                <strong>{k.startsWith('typ') ? k.substring(3) : k}:</strong>{' '}
                <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
