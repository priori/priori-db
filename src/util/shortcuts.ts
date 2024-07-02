import { useEffect } from 'react';
import { useEvent } from './useEvent';

const isMac = process?.platform === 'darwin';

export function useShortcuts({
  nextTab,
  prevTab,
  closeTab,
  newTab,
  f11,
  save,
  open,
  f5,
  launcher,
}: {
  nextTab?: () => void;
  prevTab?: () => void;
  closeTab?: () => void;
  newTab?: () => void;
  f11?: () => void;
  f5?: () => void;
  save?: () => void | false;
  open?: () => void | false;
  launcher?: () => void;
}) {
  const listener = useEvent((e: KeyboardEvent) => {
    if (
      save &&
      ((e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
        (isMac && e.metaKey && (e.key === 's' || e.key === 'S')))
    ) {
      const r = save();
      if (r === false) return;
      e.preventDefault();
      e.stopPropagation();
    } else if (
      open &&
      ((e.ctrlKey && (e.key === 'o' || e.key === 'O')) ||
        (isMac && e.metaKey && (e.key === 'o' || e.key === 'O')))
    ) {
      const r = open();
      if (r === false) return;
      e.preventDefault();
      e.stopPropagation();
    } else if (e.ctrlKey && e.key === 'Tab') {
      if (e.shiftKey) {
        if (prevTab) prevTab();
      } else if (nextTab) nextTab();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      ((e.ctrlKey || (isMac && e.metaKey)) &&
        (e.key === 'w' || e.key === 'W')) ||
      ((e.ctrlKey || (isMac && e.metaKey)) && e.key === 'F4')
    ) {
      if (closeTab) closeTab();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      ((e.ctrlKey || (isMac && e.metaKey)) &&
        (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
      e.key === 'F5'
    ) {
      if (f5) f5();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      (e.ctrlKey || (isMac && e.metaKey)) &&
      (e.key === 't' || e.key === 'T')
    ) {
      if (newTab) newTab();
    } else if (e.key === 'F11') {
      if (f11) f11();
    } else if (
      (isMac && (e.key === 'q' || e.key === 'Q') && e.metaKey) ||
      (e.altKey && e.key === 'F4')
    ) {
      window.close();
    } else if (
      (e.ctrlKey && e.key === 'p') ||
      (e.key === 'p' && isMac && e.metaKey)
    ) {
      if (launcher) {
        launcher();
      }
      e.preventDefault();
      e.stopPropagation();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [listener]);
}
