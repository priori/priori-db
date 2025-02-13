import React from 'react';
import { assert } from 'util/assert';
import { horizontalResize } from 'util/resize';
import { useEvent } from 'util/useEvent';

let tabsHeaderEL: HTMLElement | null = null;
let navEL: HTMLElement | null = null;
let headerEl: HTMLElement | null = null;
let appContentEl: HTMLElement | null = null;
let headerMenuEl: HTMLElement | null = null;
let headerMenuElI: HTMLElement | null = null;
let rootEl: HTMLElement | null = null;
let resizeIndicatorEl: HTMLElement | null = null;
let appAdjustmentIconEl: HTMLElement | null = null;

function updateElsLeftWidth(leftWidth: number) {
  assert(tabsHeaderEL);
  assert(navEL);
  assert(headerEl);
  assert(appContentEl);
  assert(headerMenuEl);
  assert(appAdjustmentIconEl);
  if (!resizeIndicatorEl) {
    resizeIndicatorEl = document.querySelector('.resize--indicator');
  }
  assert(resizeIndicatorEl);
  assert(rootEl);
  assert(headerMenuElI);
  headerEl.style.width = `${Math.max(leftWidth, 33)}px`;
  headerMenuEl.style.left =
    leftWidth <= 40 ? '0' : `${Math.max(leftWidth - 37, 0)}px`;
  appAdjustmentIconEl.style.left = `${Math.max(leftWidth > 40 ? Math.max(leftWidth - 37, 0) - 37 : -37, -37)}px`;
  headerMenuEl.style.opacity = leftWidth <= 40 ? '1' : '';
  headerMenuEl.style.width = leftWidth <= 40 ? '40px' : '';
  headerMenuElI.className = `fa ${
    leftWidth <= 40 ? 'fa-bars' : 'fa-chevron-left'
  }`;
  navEL.style.width = `${leftWidth}px`;
  appContentEl.style.left = `${leftWidth}px`;
  tabsHeaderEL.style.left = `${Math.max(leftWidth, 40)}px`;
  if (leftWidth < 90) {
    resizeIndicatorEl.style.opacity = '0.03';
    rootEl.classList.remove('left-nav-resizing');
  } else {
    resizeIndicatorEl.style.opacity = '';
    if (!rootEl?.classList.contains('left-nav-resizing'))
      rootEl.classList.add('left-nav-resizing');
  }
}

export function useLeftArea() {
  const [leftWidth, setLeftWidth] = React.useState(250);
  const onResizeMouseDown = useEvent(async (e: React.MouseEvent) => {
    tabsHeaderEL = document.querySelector('.tabs-header');
    navEL = document.querySelector('.nav');
    headerEl = document.querySelector('.header');
    appContentEl = document.querySelector('.app-content');
    headerMenuEl = document.querySelector('.header--menu');
    headerMenuElI = document.querySelector('.header--menu>i');
    appAdjustmentIconEl = document.querySelector('.settings-button');
    rootEl = document.querySelector('#root>div');
    assert(tabsHeaderEL);
    assert(rootEl);
    assert(navEL);
    assert(headerEl);
    assert(appContentEl);
    assert(headerMenuEl);
    rootEl.classList.add('left-nav-resizing');

    const inc2 = await horizontalResize(
      e,
      (inc) => {
        if (inc + leftWidth > 400) {
          return false;
        }
        updateElsLeftWidth(leftWidth + inc < 90 ? 0 : leftWidth + inc);

        return true;
      },
      document.documentElement,
      leftWidth,
    );

    if (inc2 === undefined) {
      updateElsLeftWidth(leftWidth);
      setLeftWidth(leftWidth);
    } else {
      updateElsLeftWidth(leftWidth + inc2 < 90 ? 0 : leftWidth + inc2);
      setLeftWidth(leftWidth + inc2 < 90 ? 0 : leftWidth + inc2);
    }
    rootEl.classList.remove('left-nav-resizing');
    resizeIndicatorEl = null;
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 1);
  });

  const toggleLeftArea = useEvent(() => {
    //  left area
    setLeftWidth(leftWidth ? 0 : 250);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 1);
  });

  return {
    onResizeMouseDown,
    leftWidth,
    toggleLeftArea,
  };
}
