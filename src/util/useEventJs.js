import { useRef } from 'react';

export default function useEventJs(fn) {
  const fnRef = useRef(null);
  fnRef.current = fn;
  const ref = useRef(null);
  if (!ref.current)
    ref.current = (...args) => {
      return fnRef.current.apply(this, args);
    };
  return ref.current;
}
