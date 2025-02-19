import { useState } from 'react';
import { openSettings } from 'state/actions';

export function SettingsButton({ left }: { left?: number }) {
  const [touched, setTouched] = useState(false);
  return (
    <div
      className="settings-button"
      data-hint={touched ? undefined : 'Settings'}
      style={{ left }}
      onMouseLeave={() => setTouched(false)}
      onClick={() => {
        openSettings();
        setTouched(true);
      }}
    >
      <span className="adjustment-icon--medium">
        <div />
      </span>
    </div>
  );
}
