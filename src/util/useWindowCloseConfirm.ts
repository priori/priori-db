import { useEffect } from 'react';

let state = 'initial' as 'initial' | 'confirm' | 'reload';
const closeNow = () => {
  state = 'confirm';
  window.close();
};

const reloadNow = () => {
  state = 'confirm';
  window.location.reload();
};

export function useWindowCloseConfirm(
  fn: (close: () => void, decline: () => void) => void,
) {
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (state === 'confirm') return;
      e.preventDefault();
      e.returnValue = '';
      fn(
        (process.env.NODE_ENV && !document.hasFocus()) || state === 'reload'
          ? reloadNow
          : closeNow,
        () => {
          state = 'initial';
        },
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
  state = 'confirm';
  window.close();
}
