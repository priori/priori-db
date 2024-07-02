import React, { useEffect } from 'react';
import { NavSchema, Tab } from 'types';
import { NavSearch } from '../NavSearch';
import { useTabs } from '../navUtils';

export function Launcher({
  schemas,
  tabs,
  onClose,
}: {
  schemas: NavSchema[];
  tabs: Tab[];
  onClose: () => void;
}) {
  const tabs2 = useTabs(tabs);
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    return () => {
      dialogRef.current?.close();
    };
  });
  const onClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={(el) => {
        if (el) {
          dialogRef.current = el;
          el.showModal();
        }
      }}
      className="launcher"
      onClose={onClose}
      onClick={onClick}
    >
      <NavSearch
        schemas={schemas}
        tabs={tabs2}
        onDone={onClose}
        onBlur={onClose}
        disabled={false}
      />
    </dialog>
  );
}
