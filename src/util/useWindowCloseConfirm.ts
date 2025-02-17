import { useEffect } from 'react';

let state = 'on' as 'on' | 'close' | 'reload';
const closeNow = () => {
  state = 'close';
  window.close();
};

const reloadNow = () => {
  state = 'close';
  window.location.reload();
};

export function useWindowCloseConfirm(fn: (f: () => void) => void) {
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (state === 'close') return;
      e.preventDefault();
      e.returnValue = '';
      fn(
        (process.env.NODE_ENV && !document.hasFocus()) || state === 'reload'
          ? reloadNow
          : closeNow,
      );
    };
    window.addEventListener(`beforeunload`, listener);
    return () => window.removeEventListener(`beforeunload`, listener);
  }, [fn]);
}

export function reload() {
  state = 'reload';
  window.location.reload();
}

export function forceClose() {
  state = 'close';
  window.close();
}
