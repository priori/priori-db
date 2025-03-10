import { assert } from 'util/assert';
import { createRoot } from 'react-dom/client';
import { ipcRenderer } from 'electron';
import { forceClose } from 'util/useWindowCloseConfirm';
import '../style/style.css';
import '../vendor/font-awesome-4.6.3/css/font-awesome.min.css';
import { App } from '../components/main/App';

const container = document.getElementById('root');
assert(container !== null);
createRoot(container).render(<App />);

window.onstorage = () => {
  document.body.className =
    localStorage.getItem('theme') || 'modern-light-theme';
};
document.body.className = localStorage.getItem('theme') || 'modern-light-theme';

ipcRenderer.on('close', () => {
  window.close();
});

ipcRenderer.on('force-close', () => {
  forceClose();
});
