import { useRef } from 'react';

export function useEvent<T extends (...a: Parameters<T>) => ReturnType<T>>(
  fn: T
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const ref = useRef<T | null>(null);
  if (!ref.current)
    // eslint-disable-next-line func-names
    ref.current = function (...args) {
      const self = this as unknown;
      return fnRef.current.apply(self, args);
    } as T;
  return ref.current as T;
}
