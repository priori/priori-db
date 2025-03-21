import { assert } from 'util/assert';
import React from 'react';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';

const safeMargin = 15;

function relativeEl(
  el: HTMLElement,
  to: 'nextSibling' | 'previousSibling' | 'parentNode',
  relativeToSelector?: string,
) {
  if (relativeToSelector) {
    if (to === 'parentNode') {
      const el2 = el.closest(relativeToSelector);
      assert(el2 instanceof HTMLElement);
      return el2;
    }
    if (to === 'nextSibling') {
      let el2 = el.nextElementSibling;
      while (el2 && !el2.matches(relativeToSelector)) {
        el2 = el2.nextElementSibling;
      }
      assert(el2 instanceof HTMLElement);
      return el2;
    }
    if (to === 'previousSibling') {
      let el2 = el.previousElementSibling;
      while (el2 && !el2.matches(relativeToSelector)) {
        el2 = el2.previousElementSibling;
      }
      assert(el2 instanceof HTMLElement);
      return el2;
    }
  }
  if (to === 'nextSibling') {
    assert(
      el.nextElementSibling && el.nextElementSibling instanceof HTMLElement,
    );
    return el.nextElementSibling;
  }
  if (to === 'previousSibling') {
    assert(
      el.previousElementSibling &&
        el.previousElementSibling instanceof HTMLElement,
    );
    return el.previousElementSibling;
  }
  assert(el.parentElement && el.parentElement instanceof HTMLElement);
  return el.parentElement;
}

function positionRelativeTo(
  el: HTMLElement,
  to: HTMLElement,
  h: number,
  w: number,
) {
  const container =
    (to.closest('.frame') as HTMLElement | null) || document.body;
  const rect = to.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const top0 = rect.top + rect.height / 2 - h / 2;
  const left0 = rect.left + rect.width / 2 - w / 2;
  const containerWidth = container.clientWidth;
  const containerRight = containerRect.left + containerWidth;
  const containerHeight = container.clientHeight;
  const containerBottom = containerRect.top + containerHeight;
  const top =
    top0 < containerRect.top + safeMargin &&
    h + 2 * safeMargin <= containerHeight
      ? containerRect.top + safeMargin
      : top0 + h > containerBottom - safeMargin &&
          h + 2 * safeMargin <= containerHeight
        ? containerBottom - h - safeMargin
        : top0;
  const left =
    w + 2 * safeMargin > containerWidth
      ? w < containerWidth
        ? containerRect.left + containerWidth / 2 - w / 2
        : document.documentElement.offsetWidth / 2 - w / 2
      : left0 < containerRect.left + safeMargin
        ? containerRect.left + safeMargin
        : left0 + w > containerRight - safeMargin
          ? containerRight - w - safeMargin
          : left0;
  const posContainer = to.closest('.dialog');
  const boundingClientRect = posContainer
    ? posContainer.getBoundingClientRect()
    : { left: 0, top: 0 };
  const containerPosTop = boundingClientRect.top;
  const containerPosLeft = boundingClientRect.left;
  el.style.top = `${top - containerPosTop}px`;
  el.style.left = `${left - containerPosLeft}px`;
}

export function Dialog({
  onBlur,
  children,
  relativeTo,
  relativeToSelector,
  className,
  onMouseDown,
  onKeyDown: onKeyDownProp,
}: {
  onBlur: () => void;
  children: React.ReactNode;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
  relativeToSelector?: string;
  className?: string;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const elRef = React.useRef<HTMLElement | null>(null);
  const fit = useEvent(() => {
    if (elRef.current) {
      const to = relativeEl(elRef.current, relativeTo, relativeToSelector);
      if (to) {
        elRef.current.style.top = '-10000px';
        elRef.current.style.left = '-10000px';
        const h = elRef.current.offsetHeight;
        const w = elRef.current.offsetWidth;
        positionRelativeTo(elRef.current, to, h, w);
      }
    }
  });
  useEventListener(window, 'scroll', fit, true);
  useEventListener(window, 'resize', fit, true);
  const ref = useEvent((el: HTMLDivElement | null) => {
    if (el) {
      elRef.current = el;
      el.style.top = '-10000px';
      el.style.left = '-10000px';
      el.style.position = 'fixed';
      const to = relativeEl(el, relativeTo, relativeToSelector) as HTMLElement;
      const p = el.parentNode;
      assert(p);
      const h = el.offsetHeight;
      const w = el.offsetWidth;
      const next = el.nextSibling;
      p.removeChild(el);
      positionRelativeTo(el, to, h, w);
      if (next) p.insertBefore(el, next);
      else p.appendChild(el);
      el.focus();
    }
  });
  const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDownProp) onKeyDownProp(e);
    if (e.isPropagationStopped()) return;
    if (e.key === 'Escape' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  const onBlurListener = useEvent((e: React.FocusEvent<HTMLDivElement>) => {
    const dialogEl = e.currentTarget;
    setTimeout(() => {
      if (dialogEl.contains(document.activeElement)) return;
      onBlur();
    }, 1);
  });
  return (
    <div
      className={`dialog${className ? ` ${className}` : ''}`}
      onKeyDownCapture={onKeyDown}
      tabIndex={0}
      ref={ref}
      onBlur={onBlurListener}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
