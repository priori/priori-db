import { closeTab, reloadNav } from 'state/actions';
import { DB } from 'db/DB';
import { useState } from 'react';
import { FunctionFrameProps } from 'types';
import { throwError } from 'util/throwError';
import { useEvent } from 'util/useEvent';
import { useService } from 'util/useService';
import { first } from 'db/Connection';
import { Dialog } from 'components/util/Dialog';
import { Comment } from './TableInfoFrame';

export function FunctionFrame(props: FunctionFrameProps) {
  const name =
    props.name.lastIndexOf('(') > 0
      ? props.name.substring(0, props.name.lastIndexOf('('))
      : props.name;
  const service = useService(() => {
    return first(
      `
      SELECT
        pg_get_functiondef(oid) definition,
        obj_description(oid) comment
      FROM pg_proc
      WHERE
        proname = $2 AND
        pronamespace = $1::regnamespace
    `,
      [props.schema, name]
    ) as Promise<{
      definition: string;
      comment: string;
    }>;
  }, [props.schema, props.name]);

  const [state, set] = useState({
    dropCascadeConfirmation: false,
    dropConfirmation: false,
    editComment: false,
  });

  const dropCascade = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: true,
      dropConfirmation: false,
    });
  });

  const drop = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: true,
    });
  });

  const yesClick = useEvent(() => {
    if (state.dropCascadeConfirmation)
      DB.dropFunction(props.schema, props.name, true).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
    else
      DB.dropFunction(props.schema, props.name).then(
        () => {
          setTimeout(() => closeTab(props), 10);
          reloadNav();
        },
        (err) => {
          throwError(err);
        }
      );
  });

  const onUpdateComment = useEvent(async (text: string) => {
    await DB.updateFunction(props.schema, name, { comment: text });
    await service.reload();
    set({ ...state, editComment: false });
  });

  const noClick = useEvent(() => {
    set({
      ...state,
      dropCascadeConfirmation: false,
      dropConfirmation: false,
    });
  });

  return (
    <div>
      <h1>
        {props.schema}.{props.name}
      </h1>
      <div className="table-info-frame__actions">
        <button
          type="button"
          onClick={() => set({ ...state, editComment: true })}
        >
          Comment <i className="fa fa-file-text-o" />
        </button>{' '}
        <button
          type="button"
          onClick={
            state.dropCascadeConfirmation || state.dropConfirmation
              ? undefined
              : drop
          }
        >
          Drop Function <i className="fa fa-close" />
        </button>{' '}
        {state.dropCascadeConfirmation || state.dropConfirmation ? (
          <Dialog
            onBlur={noClick}
            relativeTo={
              state.dropCascadeConfirmation ? 'nextSibling' : 'previousSibling'
            }
          >
            {state.dropCascadeConfirmation
              ? 'Do you really want to drop cascade this function?'
              : 'Do you really want to drop this function?'}
            <div>
              <button type="button" onClick={yesClick}>
                Yes
              </button>{' '}
              <button type="button" onClick={noClick}>
                No
              </button>
            </div>
          </Dialog>
        ) : null}
        <button
          type="button"
          onClick={
            state.dropCascadeConfirmation || state.dropConfirmation
              ? undefined
              : dropCascade
          }
        >
          Drop Cascade <i className="fa fa-warning" />
        </button>
      </div>
      {service?.lastValidData?.definition ? (
        <div className="view">{service.lastValidData.definition}</div>
      ) : null}
      {service?.lastValidData?.comment || state.editComment ? (
        <Comment
          value={service?.lastValidData?.comment || ''}
          edit={state.editComment}
          onUpdate={onUpdateComment}
          onCancel={() => set({ ...state, editComment: false })}
        />
      ) : null}
    </div>
  );
}
