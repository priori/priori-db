import { useRef } from 'react';

export function useEvent<T extends (...a: any[]) => unknown>(fn: T): T {
  const ref = useRef<T | null>(null);
  if (!ref.current)
    ref.current = function (...args) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this as any;
      return fn.apply(self, args);
    } as T;
  return ref.current as T;
}
