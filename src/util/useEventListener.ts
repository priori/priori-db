import { useEffect } from 'react';
import { useEvent } from './useEvent';

export function useEventListener<K extends keyof WindowEventMap>(
  el: Window,
  event: K,
  listener: (e: WindowEventMap[K]) => void
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  el: Document,
  event: K,
  listener: (e: DocumentEventMap[K]) => void
): void;
export function useEventListener<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void
): void;
export function useEventListener(
  el: HTMLElement | Window | Document,
  type:
    | keyof WindowEventMap
    | keyof DocumentEventMap
    | keyof HTMLElementEventMap,
  listener0: (e: Event) => void
) {
  const listener = useEvent(listener0);
  useEffect(() => {
    el.addEventListener(type, listener);
    return () => {
      el.removeEventListener(type, listener);
    };
  }, [el, type, listener]);
}
