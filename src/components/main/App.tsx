import { useAppState } from 'state/state';
import { useEventListener } from 'util/useEventListener';
import { showError } from 'state/actions';
import { grantError } from 'util/errors';
import { Home } from './home/Home';
import { ConnectedApp } from './connected/ConnectedApp';

export function App() {
  const state = useAppState();
  useEventListener(window, 'unhandledrejection', (e: PromiseRejectionEvent) => {
    e.promise.catch((err) => {
      showError(grantError(err));
    });
  });
  useEventListener(window, 'error', (e: ErrorEvent) => {
    showError(
      e.error
        ? grantError(e.error)
        : new Error(
            `${e.message}${
              e.lineno
                ? `\nLine: ${e.lineno} ${
                    e.filename ? ` File: ${e.filename}` : ''
                  }`
                : ''
            }`
          )
    );
  });
  if (state.connected) return <ConnectedApp state={state} />;
  return <Home {...state} />;
}
