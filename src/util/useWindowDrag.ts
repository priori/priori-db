import * as electron from 'electron';
import { useRef } from 'react';
import { useEventListener } from './useEventListener';

const dontDragSelector =
  'a, button, input, textarea, [tabindex]:not(.frame), select, .query-selector--query, .tabs-header__tab, .tabs-header__add, .nav-button, .settings-button, .favorite, .resize-helper, .query-frame--resize-helper, .bases-wrapper, .new-schema-form, .owner .fa-pencil, .columns-form-column';

// for double click events to work
const noOverlaySelector = '.tabs-header, .frame, .app-content, .nav-button';

const dragExceptionSelector =
  '.grid > div, .grid-content--table-wrapper-outer, .empty-table, .empty-table *, .grid-content, .nav-tree--wrapper, .grid-content--footer';

let extraTop: number | undefined;
if (window.navigator.userAgent.indexOf('Linux') !== -1) {
  setTimeout(() => {
    const initialScreenY = window.screenY;
    const aux = initialScreenY + 1;
    window.moveTo(window.screenX, aux);
    setTimeout(() => {
      extraTop = aux - window.screenY;
      window.moveTo(window.screenX, initialScreenY + extraTop);
    }, 10);
  }, 500);
}

export function useWindowDrag() {
  const lastPosRef = useRef<{
    win: { x: number; y: number };
    mouse: { x: number; y: number };
  } | null>(null);
  useEventListener(
    window,
    'mousedown',
    (e: MouseEvent) => {
      if (e.target instanceof HTMLElement || e.target === null)
        console.log(
          dontDragSelector,
          e.target?.closest(dontDragSelector),
          dragExceptionSelector,
          e.target?.matches(dragExceptionSelector),
        );
      const target = e.target as HTMLElement;
      if (
        !target.matches(dragExceptionSelector) &&
        target.closest(dontDragSelector)
      ) {
        return;
      }
      const isSelectable = getComputedStyle(target).userSelect;
      if (isSelectable === 'text' || isSelectable === 'auto') {
        return;
      }
      if (!target.closest(noOverlaySelector)) {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.width = '100vw';
        div.style.height = '100vh';
        div.style.top = '0';
        div.style.left = '0';
        div.style.zIndex = '999999';
        div.classList.add('drag-overlay');
        document.body.appendChild(div);
      }
      lastPosRef.current = {
        win: {
          x: window.screenX,
          y: window.screenY,
        },
        mouse: {
          x: e.screenX,
          y: e.screenY,
        },
      };
    },
    true,
  );

  useEventListener(window, 'mouseup', () => {
    lastPosRef.current = null;
    document.querySelectorAll('.drag-overlay').forEach((el) => el.remove());
  });

  useEventListener(window, 'mousemove', (e: MouseEvent) => {
    const lastPos = lastPosRef.current;
    if (!lastPos) return;
    const pos = {
      x: lastPos.win.x + e.screenX - lastPos.mouse.x,
      y: lastPos.win.y + e.screenY - lastPos.mouse.y + (extraTop || 0),
    };
    // window.moveTo(pos.x, pos.y);
    electron.ipcRenderer.send('pos', pos);
  });

  useEventListener(window, 'mouseleave', () => {
    lastPosRef.current = null;
    document.querySelectorAll('.drag-overlay').forEach((el) => el.remove());
  });

  useEventListener(window, 'blur', () => {
    lastPosRef.current = null;
    document.querySelectorAll('.drag-overlay').forEach((el) => el.remove());
  });
}
