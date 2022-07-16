import assert from 'assert';
import React from 'react';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';

const safeMargin = 15;

function relativeEl(
  el: HTMLElement,
  to: 'nextSibling' | 'previousSibling' | 'parentNode'
) {
  if (to === 'nextSibling') {
    assert(
      el.nextElementSibling && el.nextElementSibling instanceof HTMLElement
    );
    return el.nextElementSibling;
  }
  if (to === 'previousSibling') {
    assert(
      el.previousElementSibling &&
        el.previousElementSibling instanceof HTMLElement
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
  w: number
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
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

export function Dialog({
  onBlur,
  children,
  relativeTo,
}: {
  onBlur: () => void;
  children: React.ReactNode;
  relativeTo: 'nextSibling' | 'previousSibling' | 'parentNode';
}) {
  const elRef = React.useRef<HTMLElement | null>(null);
  const fit = useEvent(() => {
    if (elRef.current) {
      const to = relativeEl(elRef.current, relativeTo);
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
      const to = relativeEl(el, relativeTo) as HTMLElement;
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
    if (e.key === 'Escape') {
      e.currentTarget.blur();
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
      className="dialog"
      onKeyDown={onKeyDown}
      tabIndex={0}
      ref={ref}
      onBlur={onBlurListener}
    >
      {children}
    </div>
  );
}
