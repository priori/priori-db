import { assert } from 'util/assert';
import { createRoot } from 'react-dom/client';
import { ipcRenderer } from 'electron';
import { forceClose } from 'util/useWindowCloseConfirm';
import AppWrapper from './AppWrapper';

const container = document.getElementById('root');
assert(container !== null);
createRoot(container).render(<AppWrapper />);

ipcRenderer.on('close', () => {
  window.close();
});

ipcRenderer.on('force-close', () => {
  forceClose();
});
