/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { askToCloseCurrent, newQuery, nextTab, prevTab } from '../actions';

// window.addEventListener('mousedown', e =>{
//     const el = e.target
//     if ( el instanceof HTMLElement && !(el.tagName in {'INPUT':1,'TEXTAREA':1,'SELECT':1,
// 'OPTION': 1}) ) {
//         const el2 = el.closest('[tabindex]')
//         if ( el2 && el2.getAttribute('tabindex') != '-1' ) {
//             (el2 as any).focus()
//         }
//         e.preventDefault()
//     }
// })

let listeners = [] as (() => void)[];
export function useF5(fn: () => void) {
  const fn2 = () => fn();
  listeners.push(fn2);
  return () => {
    listeners = listeners.filter((f) => f !== fn2);
  };
}

export function useShortcuts() {
  function listener(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 'Tab') {
      if (e.shiftKey) {
        prevTab();
      } else {
        nextTab();
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (
      (e.ctrlKey && (e.key === 'w' || e.key === 'W')) ||
      (e.ctrlKey && e.key === 'F4')
    ) {
      askToCloseCurrent();
      e.preventDefault();
      e.stopPropagation();
    } else if (
      (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
      e.key === 'F5'
    ) {
      for (const f of listeners) {
        f();
      }
    } else if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
      newQuery();
    } else if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
      // electron.ipcRenderer.send('newWindow')
    } else if (e.key === 'F11') {
      if ((document as any).webkitIsFullScreen) {
        (document as any).webkitExitFullscreen();
      } else {
        (document.documentElement as any).webkitRequestFullScreen();
      }
      // } else if ( e.altKey && e.key == 'F4' ) {
    }
  }
  useEffect(() => {
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}