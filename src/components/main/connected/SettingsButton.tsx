import { openSettings } from 'state/actions';

export function SettingsButton({ left }: { left?: number }) {
  return (
    <div className="settings-button" style={{ left }} onClick={openSettings}>
      <span className="adjustment-icon3">
        <div />
      </span>
    </div>
  );
}
