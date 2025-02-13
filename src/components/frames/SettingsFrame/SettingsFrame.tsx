import { useTab } from 'components/main/connected/ConnectedApp';
import { currentState } from 'state/state';

export function SettingsFrame() {
  const state = currentState();
  const c = state.currentConnectionConfiguration!;
  const title = `${c.user}@${c.host}${
    c.port !== 5432 ? `:${c.port}` : ''
  }/${state.database}`;
  useTab({
    f5() {},
  });
  return (
    <div>
      <h1>
        <span className="adjustment-icon2">
          <div />
        </span>
        Settings
      </h1>
      <h2>Current Connection</h2>
      <p>{title}</p>
      <h2>App Settings</h2>
      <p>Theme:</p>
      <select disabled>
        <option value="default">Default (Gray)</option>
        <option value="dark">Dark</option>
        <option value="light">Light (White)</option>
      </select>
    </div>
  );
}
