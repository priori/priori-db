import { useRef } from 'react';

export default function useEventJs(fn) {
  const fnRef = useRef(null);
  const ref = useRef(null);
  fnRef.current = fn;
  if (!ref.current)
    ref.current = (...args) => {
      return fnRef.current.apply(this, args);
    };
  return ref.current;
}
