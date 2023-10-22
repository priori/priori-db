import { useEffect } from 'react';
import { useEvent } from './useEvent';

const isIOS = process?.platform === 'darwin';

export function useShortcuts({
  nextTab,
  prevTab,
  closeTab,
  newTab,
  newWindow,
  f11,
  f5,
}: {
  nextTab?: () => void;
  prevTab?: () => void;
  closeTab?: () => void;
  newTab?: () => void;
  newWindow?: () => void;
  f11?: () => void;
  f5?: () => void;
}) {
  const listener = useEvent((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Tab') {
      if (e.shiftKey) {
        if (prevTab) prevTab();
      } else if (nextTab) nextTab();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      ((e.ctrlKey || (isIOS && e.metaKey)) &&
        (e.key === 'w' || e.key === 'W')) ||
      ((e.ctrlKey || (isIOS && e.metaKey)) && e.key === 'F4')
    ) {
      if (closeTab) closeTab();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      ((e.ctrlKey || (isIOS && e.metaKey)) &&
        (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
      e.key === 'F5'
    ) {
      if (f5) f5();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      (e.ctrlKey || (isIOS && e.metaKey)) &&
      (e.key === 't' || e.key === 'T')
    ) {
      if (newTab) newTab();
    } else if (
      (e.ctrlKey || (isIOS && e.metaKey)) &&
      (e.key === 'n' || e.key === 'N')
    ) {
      if (newWindow) newWindow();
      // electron.ipcRenderer.send('newWindow')
    } else if (e.key === 'F11') {
      if (f11) f11();
      // } else if ( e.altKey && e.key == 'F4' ) {
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [listener]);
}
