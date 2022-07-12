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
  func0: () => Promise<T>,
  deps: DependencyList
): ServiceState<T> {
  const [count, setCount] = useState(0);
  const reload = useEvent(() => {
    setCount(count + 1);
  });
  const [state, setState] = useState({
    lastValidData: null as T | null,
    error: null as null | Error,
    status: 'starting' as 'starting' | 'reloading' | 'error' | 'success',
    reload,
  });
  const firstStateRef = useRef(state);
  const func = useEvent(func0);
  const promiseRef = useRef(null as null | Promise<T>);
  useEffect(() => {
    let mounted = true;
    const promise = func();
    promiseRef.current = promise;
    if (firstStateRef.current.status !== 'starting') {
      setState((state2) => ({
        ...state2,
        status: 'reloading',
      }));
    }
    promise.then(
      (res) => {
        if (promiseRef.current === promise && mounted) {
          setState((state2) => ({
            ...state2,
            lastValidData: res,
            error: null,
            status: 'success',
          }));
        }
      },
      (err) => {
        if (promiseRef.current === promise && mounted) {
          setState((state2) => ({
            ...state2,
            error: err instanceof Error ? err : new Error(`${err}`),
            status: 'error',
          }));
        }
      }
    );
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, func, firstStateRef, setState, ...deps]);

  return state as ServiceState<T>;
}
