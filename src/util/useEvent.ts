import useEventJs from './useEventJs';

export function useEvent<T extends (...a: Parameters<T>) => ReturnType<T>>(
  fn: T
): T {
  return (useEventJs as unknown as (f0: T) => T)(fn) as T;
}
