import assert from 'assert';
import { InputDialog } from 'components/util/Dialog/InputDialog';
import { currentState } from 'state/state';

export function ChangeSchemaDialog({
  value,
  onUpdate,
  onCancel,
  relativeTo,
}: {
  value: string;
  onUpdate: (v: string) => Promise<void>;
  onCancel: () => void;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  const appState = currentState();
  assert(appState.schemas);
  const schemas = appState.schemas.map((s) => s.name);
  return (
    <InputDialog
      value={value}
      onUpdate={onUpdate}
      onCancel={onCancel}
      options={schemas}
      relativeTo={relativeTo}
      updateText="Update"
    />
  );
}
