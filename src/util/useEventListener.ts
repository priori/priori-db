import { useEffect } from 'react';
import { useEvent } from './useEvent';

export function useEventListener<K extends keyof WindowEventMap>(
  el: Window,
  event: K,
  listener: (e: WindowEventMap[K]) => void,
  capture?: boolean,
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  el: Document,
  event: K,
  listener: (e: DocumentEventMap[K]) => void,
  capture?: boolean,
): void;
export function useEventListener<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  capture?: boolean,
): void;
export function useEventListener(
  el: HTMLElement | Window | Document,
  type:
    | keyof WindowEventMap
    | keyof DocumentEventMap
    | keyof HTMLElementEventMap,
  listener0: (e: Event) => void,
  capture = false,
) {
  const listener = useEvent(listener0);
  useEffect(() => {
    el.addEventListener(type, listener, capture);
    return () => {
      el.removeEventListener(type, listener, capture);
    };
  }, [el, type, listener, capture]);
}
