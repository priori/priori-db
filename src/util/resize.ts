function resize(
  e: React.MouseEvent,
  fn: (v: { x: number; y: number }) => boolean | { x: number; y: number },
  type: 'horizontal' | 'vertical',
  el: HTMLElement,
  pos: number,
) {
  const x0 = e.clientX;
  const y0 = e.clientY;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();

  const lock = document.createElement('div');
  lock.style.cursor = type === 'horizontal' ? 'ew-resize' : 'ns-resize';
  let resolvePromise:
    | undefined
    | ((value: { x: number; y: number } | undefined) => void);
  lock.className = 'resize--lock';
  document.body.append(lock);

  const indicator = document.createElement('div');
  indicator.className = `resize--indicator resize--indicator--${type}`;
  lock.append(indicator);
  const rect = el.getClientRects()[0];
  if (type === 'horizontal') {
    indicator.style.top = `${rect.top}px`;
    indicator.style.height = `${rect.height}px`;
  } else {
    indicator.style.left = `${rect.left}px`;
    indicator.style.width = `${rect.width}px`;
  }
  indicator.style[type === 'horizontal' ? 'left' : 'top'] = `${
    pos + (type === 'horizontal' ? rect.left : rect.top)
  }px`;

  function stop(increment?: { x: number; y: number }) {
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('mousemove', moveListener);
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('mouseup', mouseupListener);
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('keydown', keydownListener);
    // eslint-disable-next-line no-use-before-define
    window.removeEventListener('resize', resizeListener);
    lock.remove();
    if (active instanceof HTMLElement) active.focus();
    resolvePromise?.(increment);
  }

  let lastValid: { x: number; y: number } | undefined;

  function moveListener(e2: MouseEvent) {
    const inc = { x: e2.pageX - x0, y: e2.clientY - y0 };
    const ret = fn(inc);
    if (ret === false) return;
    const jump =
      typeof ret === 'object' && (ret.x !== inc.x || ret.y !== inc.y);
    lastValid = jump ? ret : inc;
    indicator.style[type === 'horizontal' ? 'left' : 'top'] = `${
      pos +
      (type === 'horizontal' ? lastValid.x : lastValid.y) +
      (type === 'horizontal' ? rect.left : rect.top)
    }px`;
  }

  function keydownListener(e2: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e2.key === 'Escape') {
      stop();
    }
  }

  function mouseupListener(e2: MouseEvent) {
    const ret = fn({ x: e2.pageX - x0, y: e2.clientY - y0 });
    if (ret === false) {
      if (lastValid && fn(lastValid)) {
        stop(lastValid);
      } else {
        stop();
      }
      return;
    }
    indicator.style[type === 'horizontal' ? 'left' : 'top'] = `${
      pos +
      (type === 'horizontal' ? e2.pageX - x0 : e2.clientY - y0) +
      (type === 'horizontal' ? rect.left : rect.top)
    }px`;
    stop({ x: e2.pageX - x0, y: e2.clientY - y0 });
  }

  function resizeListener() {
    stop();
  }

  document.addEventListener('mousemove', moveListener);
  document.addEventListener('mouseup', mouseupListener);
  document.addEventListener('keydown', keydownListener);
  window.addEventListener('resize', resizeListener);

  return new Promise<{ x: number; y: number } | undefined>((resolve) => {
    resolvePromise = resolve;
  });
}

export function horizontalResize(
  e: React.MouseEvent,
  fn: (inc: number) => boolean | number,
  el: HTMLElement,
  pos: number,
) {
  return resize(
    e,
    ({ x, y }) => {
      const ret = fn(x);
      if (typeof ret === 'number') return { x: ret, y };
      return ret;
    },
    'horizontal',
    el,
    pos,
  ).then((v) => v?.x);
}
export function verticalResize(
  e: React.MouseEvent,
  fn: (inc: number) => boolean | number,
  el: HTMLElement,
  pos: number,
) {
  return resize(
    e,
    ({ x, y }) => {
      const ret = fn(y);
      if (typeof ret === 'number') return { x, y: ret };
      return ret;
    },
    'vertical',
    el,
    pos,
  ).then((v) => v?.y);
}
