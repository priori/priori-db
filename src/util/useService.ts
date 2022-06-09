import { DependencyList, useEffect, useRef, useState } from 'react';
import { useEvent } from './useEvent';

type ServiceState<T> =
  | {
      lastValidData: null;
      error: null;
      status: 'starting';
      reload: () => void;
    }
  | {
      lastValidData: T;
      error: null;
      status: 'success';
      reload: () => void;
    }
  | {
      lastValidData: T | null;
      error: Error;
      status: 'error';
      reload: () => void;
    }
  | {
      lastValidData: T | null;
      error: Error | null;
      status: 'reloading';
      reload: () => void;
    };
export function useService<T>(
  func: () => Promise<T>,
  deps: DependencyList
): ServiceState<T> {
  const [count, setCount] = useState(0);
  const reload = useEvent(() => {
    setCount(count + 1);
  });
  const [state, set] = useState({
    lastValidData: null as T | null,
    error: null as null | Error,
    status: 'starting' as 'starting' | 'reloading' | 'error' | 'success',
    reload,
  });
  const promiseRef = useRef(null as null | Promise<T>);
  useEffect(() => {
    let mounted = true;
    const promise = func();
    promiseRef.current = promise;
    if (state.status !== 'starting') {
      set({
        ...state,
        status: 'reloading',
      });
    }
    promise.then(
      (res) => {
        if (promiseRef.current === promise && mounted) {
          set({
            ...state,
            lastValidData: res,
            error: null,
            status: 'success',
          });
        }
      },
      (err) => {
        if (promiseRef.current === promise && mounted) {
          set({
            ...state,
            error: err instanceof Error ? err : new Error(`${err}`),
            status: 'error',
          });
        }
      }
    );
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, count]);

  return state;
}
