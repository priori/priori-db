import { InputDialog } from './InputDialog';

export function UpdatePasswordDialog({
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
  return (
    <InputDialog
      value={value}
      onUpdate={onUpdate}
      onCancel={onCancel}
      relativeTo={relativeTo}
      type="password"
      updateText="Update Password"
    />
  );
}
