import { useAppState } from 'state/state';
import { ConnectedApp } from './connected/ConnectedApp';
import { Home } from './home/Home';

export function App() {
  const state = useAppState();
  if (state.connected) return <ConnectedApp state={state} />;
  return <Home {...state} />;
}
