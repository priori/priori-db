import { useEffect } from 'react';

let state = 'on' as 'on' | 'close';
const closeNow = () => {
  state = 'close';
  window.close();
};
export function useWindowCloseConfirm(fn: () => void) {
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (state === 'close') return;
      e.preventDefault();
      e.returnValue = '';
      fn();
    };
    window.addEventListener(`beforeunload`, listener);
    return () => window.removeEventListener(`beforeunload`, listener);
  }, [fn]);
  return closeNow;
}
