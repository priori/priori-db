/* eslint-disable @typescript-eslint/no-explicit-any */
import { closeCurrent, newQuery, nextTab, prevTab } from '../actions';

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
    closeCurrent();
    e.preventDefault();
    e.stopPropagation();
  } else if (
    (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) ||
    e.key === 'F5'
  ) {
    if ((window as any).f5) {
      (window as any).f5();
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

// hotload fix
if ((window as any).stopShortcuts) {
  (window as any).stopShortcuts();
}
(window as any).stopShortcuts = () => {
  window.removeEventListener('keydown', listener);
};

window.addEventListener('keydown', listener);
