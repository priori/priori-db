import { useRef } from 'react';

export function useEvent<T extends (...a: Parameters<T>) => ReturnType<T>>(
  fn: T
): T {
  const ref = useRef<T | null>(null);
  if (!ref.current)
    // eslint-disable-next-line func-names
    ref.current = function (...args) {
      const self = this as unknown;
      return fn.apply(self, args);
    } as T;
  return ref.current as T;
}
