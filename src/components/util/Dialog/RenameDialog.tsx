import { InputDialog } from './InputDialog';

export function RenameDialog({
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
      updateText="Rename"
    />
  );
}
