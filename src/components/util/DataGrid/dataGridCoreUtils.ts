import { assert } from 'util/assert';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { grantError } from 'util/errors';
import { activeCellUpdate } from './DataGridActiveCell';
import {
  allowedBottomDistance,
  allowedTopDistance,
  getSelectionData,
  headerHeight,
  rowHeight,
  rowsByRender,
  scrollTo,
  scrollWidth,
  toCsv,
  toHtml,
  topRenderOffset,
  toText,
  toTsv,
} from './util';
import { DataGridCoreProps, DataGridState } from './DataGridCore';
import { useGridColsSizes } from './useGridColsSizes';

const isIOS = process?.platform === 'darwin';

export function useDataGridCore(props: DataGridCoreProps) {
  const [state0, setState] = useState<DataGridState>({
    slice: [0, rowsByRender],
    openSortDialog: false,
    openFilterDialog: false,
    editing: false,
    update: {},
  });

  const scrollRef = useRef({ left: 0, top: 0 });

  const gridContentRef = useRef<HTMLDivElement | null>(null);

  let state = state0;
  const resultRef = useRef(props.result);
  if (resultRef.current !== props.result) {
    state = {
      slice: [0, rowsByRender],
      openSortDialog: false,
      openFilterDialog: false,
      editing: false,
      update: {},
      active: undefined,
      selection: undefined,
    };
    resultRef.current = props.result;
    scrollRef.current = { left: 0, top: 0 };
    gridContentRef.current?.scrollTo(0, 0);
    setState(state);
  }

  const len = resultRef.current.rows.length;

  const extraRows = useMemo(() => {
    if (!props.onUpdate) return 0;
    let i = 0;
    while (state.update[i + len] && Object.values(state.update[i + len]).length)
      i += 1;
    return i + 1;
  }, [props.onUpdate, state.update, len]);

  const headerElRef = useRef(null as HTMLTableElement | null);

  const timeoutRef = useRef(null as ReturnType<typeof setTimeout> | null);

  const elRef = useRef(null as HTMLDivElement | null);

  const activeElRef = useRef(null as HTMLDivElement | null);

  const lastScrollTimeRef = useRef(null as Date | null);

  const pendingInserts = Object.keys(state.update).filter(
    (i) => parseInt(i, 10) >= props.result.rows.length,
  ).length;
  const pendingRowsUpdate = Object.keys(state.update).length - pendingInserts;

  const extraBottomSpace =
    pendingRowsUpdate || pendingInserts
      ? 130
      : props.onChangeFilter || props.onChangeSort || props.onUpdate
      ? 68
      : 0;

  const totalChanges = Object.keys(state.update).reduce(
    (a, b) => a + Object.keys(state.update[b]).length,
    0,
  );

  const gridActiveCellUpdate = useEvent(
    (
      widths: number[],
      hasBottomScrollbar: boolean,
      hasRightScrollbar: boolean,
    ) => {
      if (activeElRef.current && state.active)
        activeCellUpdate({
          activeEl: activeElRef.current,
          finalWidths: widths,
          active: state.active,
          scrollTop: scrollRef.current.top,
          scrollLeft: scrollRef.current.left,
          containerHeight: props.height,
          containerWidth: props.width,
          hasBottomScrollbar,
          hasRightScrollbar,
        });
    },
  );

  const {
    colsWidths,
    hasRightScrollbar,
    hasBottomScrollbar,
    onStartResize,
    gridContentTableWidth,
  } = useGridColsSizes({
    result: props.result,
    width: props.width,
    height: props.height,
    extraRows,
    extraBottomSpace,
    elRef,
    activeCellUpdate: gridActiveCellUpdate,
  });

  useEffect(() => {
    if (state.active) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(
        el,
        colsWidths,
        state.active.colIndex,
        state.active.rowIndex,
        hasRightScrollbar,
        hasBottomScrollbar,
      );
    }
  }, [colsWidths, state.active, hasRightScrollbar, hasBottomScrollbar]);

  useEffect(() => {
    if (state.selection && state.mouseDown) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(
        el,
        colsWidths,
        state.mouseDown.colIndex === state.selection.colIndex[0]
          ? state.selection.colIndex[1]
          : state.selection.colIndex[0],
        state.mouseDown.rowIndex === state.selection.rowIndex[0]
          ? state.selection.rowIndex[1]
          : state.selection.rowIndex[0],
        hasRightScrollbar,
        hasBottomScrollbar,
      );
    }
  }, [
    colsWidths,
    state.mouseDown,
    state.selection,
    hasRightScrollbar,
    hasBottomScrollbar,
  ]);

  const gridContentMarginTop = -headerHeight;

  assert(props.result.rows instanceof Array);

  const gridContentHeight =
    headerHeight + (props.result.rows.length + extraRows) * rowHeight;

  const gridContentTableTop = `${state.slice[0] * rowHeight}px`;

  const visibleRows = useMemo(() => {
    const r = (props.result.rows as (string | number | null)[][]).filter(
      (_, i) => state.slice[0] <= i && i <= state.slice[1],
    );
    let i = extraRows;
    while (i) {
      i -= 1;
      const u = state.update[i];
      r.push(
        u && Object.values(u).length
          ? props.result.rows.map((_, j) => u?.[j])
          : [],
      );
    }
    return r;
  }, [props.result.rows, state.slice, extraRows, state.update]);

  const visibleStartingInEven = !!(state.slice[0] % 2);

  function getColIndex(x: number) {
    let left = 0;
    let indexCount = -1;
    for (const w of colsWidths) {
      if (x < left) return indexCount;
      left += w;
      indexCount += 1;
    }
    return colsWidths.length - 1;
  }

  useEffect(() => {
    if (state.active && activeElRef.current)
      activeCellUpdate({
        activeEl: activeElRef.current,
        finalWidths: colsWidths,
        active: state.active,
        scrollTop: scrollRef.current.top,
        scrollLeft: scrollRef.current.left,
        containerHeight: props.height,
        containerWidth: props.width,
        hasBottomScrollbar,
        hasRightScrollbar,
      });
  }, [
    state.active,
    colsWidths,
    props.height,
    props.width,
    hasBottomScrollbar,
    hasRightScrollbar,
  ]);

  useEventListener(window, 'mouseup', (e) => {
    if (!state.mouseDown) return;
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.min(
      Math.max(Math.floor(y / rowHeight), 0),
      props.result.rows.length - 1 + extraRows,
    );
    const colIndex = Math.min(
      Math.max(getColIndex(x), 0),
      props.result.fields.length - 1,
    );
    const selection = {
      rowIndex: [
        Math.min(rowIndex, state.mouseDown?.rowIndex ?? rowIndex),
        Math.max(rowIndex, state.mouseDown?.rowIndex ?? -1),
      ] as [number, number],
      colIndex: [
        Math.min(colIndex, state.mouseDown?.colIndex ?? colIndex),
        Math.max(colIndex, state.mouseDown?.colIndex ?? -1),
      ] as [number, number],
    };

    if (
      document.activeElement === elRef.current &&
      (rowIndex >= props.result.rows.length + extraRows ||
        colIndex >= props.result.fields.length)
    ) {
      setState((state2) => ({
        ...state2,
        selection,
        mouseDown: undefined,
      }));
      elRef.current?.blur();
      return;
    }
    setState((state2) => ({
      ...state2,
      active: { rowIndex, colIndex },
      selection,
      mouseDown: undefined,
    }));
  });

  useEventListener(window, 'mousemove', (e) => {
    if (!state.mouseDown) return;
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.min(
      Math.max(Math.floor(y / rowHeight), 0),
      props.result.rows.length - 1 + extraRows,
    );
    const colIndex = Math.min(
      Math.max(getColIndex(x), 0),
      props.result.fields.length - 1,
    );
    const selection = {
      rowIndex: [
        Math.min(rowIndex, state.mouseDown?.rowIndex ?? rowIndex),
        Math.max(rowIndex, state.mouseDown?.rowIndex ?? -1),
      ] as [number, number],
      colIndex: [
        Math.min(colIndex, state.mouseDown?.colIndex ?? colIndex),
        Math.max(colIndex, state.mouseDown?.colIndex ?? -1),
      ] as [number, number],
    };
    // if shift is pressed, select a range
    setState((state2) => ({
      ...state2,
      selection,
      active: { rowIndex, colIndex },
    }));
  });

  function tabMove(e: React.KeyboardEvent, direction = 1) {
    if (!state.active) return;
    const colIndex =
      state.active.colIndex + direction === props.result.fields.length
        ? 0
        : state.active.colIndex + direction === -1
        ? props.result.fields.length - 1
        : state.active.colIndex + direction;
    const rowIndex =
      state.active.colIndex + direction === props.result.fields.length
        ? state.active.rowIndex + 1
        : state.active.colIndex + direction === -1
        ? state.active.rowIndex - 1
        : state.active.rowIndex;
    if (rowIndex >= 0 && rowIndex < props.result.rows.length + extraRows) {
      setState((s) => ({
        ...s,
        selection: {
          colIndex: [colIndex, colIndex],
          rowIndex: [rowIndex, rowIndex],
        },
        editing: !!s.editing,
        active: { rowIndex, colIndex },
      }));
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function moveBy(
    x0: number,
    y0: number,
    selection: boolean,
    editing?: 1 | 2 | boolean,
  ) {
    if (!state.active) return;
    let x = x0;
    let y = y0;
    if (state.active.colIndex + x < 0) {
      x = -state.active.colIndex;
    } else if (state.active.colIndex + x >= props.result.fields.length) {
      x = props.result.fields.length - state.active.colIndex - 1;
    }
    if (state.active.rowIndex + y < 0) {
      y = -state.active.rowIndex;
    } else if (
      state.active.rowIndex + y >=
      props.result.rows.length + extraRows
    ) {
      y = props.result.rows.length - state.active.rowIndex - 1 + extraRows;
    }
    if (x === 0 && y === 0) return;
    setState((s) => {
      if (!s.active) return s;
      return {
        ...s,
        editing: editing === undefined ? s.editing : editing,
        selection: !selection
          ? undefined
          : !state.selection
          ? {
              colIndex: [
                Math.min(s.active.colIndex + x, s.active.colIndex),
                Math.max(s.active.colIndex + x, s.active.colIndex),
              ],
              rowIndex: [
                Math.min(s.active.rowIndex + y, s.active.rowIndex),
                Math.max(s.active.rowIndex + y, s.active.rowIndex),
              ],
            }
          : {
              colIndex: [
                Math.min(
                  s.active.colIndex + x,
                  state.selection.colIndex[0] === s.active.colIndex
                    ? state.selection.colIndex[1]
                    : state.selection.colIndex[0],
                ),
                Math.max(
                  s.active.colIndex + x,
                  state.selection.colIndex[0] === s.active.colIndex
                    ? state.selection.colIndex[1]
                    : state.selection.colIndex[0],
                ),
              ],
              rowIndex: [
                Math.min(
                  s.active.rowIndex + y,
                  state.selection.rowIndex[0] === s.active.rowIndex
                    ? state.selection.rowIndex[1]
                    : state.selection.rowIndex[0],
                ),
                Math.max(
                  s.active.rowIndex + y,
                  state.selection.rowIndex[0] === s.active.rowIndex
                    ? state.selection.rowIndex[1]
                    : state.selection.rowIndex[0],
                ),
              ],
            },
        active: {
          colIndex: s.active.colIndex + x,
          rowIndex: s.active.rowIndex + y,
        },
      };
    });
  }

  useEventListener(document, 'copy', (e: ClipboardEvent) => {
    if (
      document.activeElement === elRef.current &&
      e.clipboardData &&
      state.selection
    ) {
      e.preventDefault();
      e.stopPropagation();
      const d = e.clipboardData;
      const sels = getSelectionData(props.result, state.selection);
      d.setData('text/plain', toText(sels).join(''));
      d.setData('text/csv', toCsv(sels).join(''));
      d.setData('text/tab-separated-values', toTsv(sels).join(''));
      d.setData('text/html', toHtml(sels));
      d.setData('application/json', JSON.stringify(sels));
    }
  });

  const onScroll = useEvent((e: React.UIEvent<HTMLElement>) => {
    if (props.onScroll) props.onScroll();
    const container = e.target as HTMLElement;
    scrollRef.current = {
      left: container.scrollLeft,
      top: container.scrollTop,
    };
    if (headerElRef.current) {
      const headerEl = headerElRef.current;
      headerEl.style.marginLeft = `-${container.scrollLeft}px`;
    }
    if (state.active && activeElRef.current)
      activeCellUpdate({
        activeEl: activeElRef.current,
        finalWidths: colsWidths,
        active: state.active,
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
        containerHeight: props.height,
        containerWidth: props.width,
        hasBottomScrollbar,
        hasRightScrollbar,
      });
    const fn = () => {
      lastScrollTimeRef.current = null;
      const currentMiddleIndex = Math.floor(
        container.scrollTop / rowHeight +
          container.offsetHeight / (rowHeight * 2),
      );
      const goodUp = Math.max(currentMiddleIndex - state.slice[0], 0);
      const goodDown = Math.max(state.slice[1] - currentMiddleIndex, 0);
      if (
        (state.slice[0] && goodUp < allowedTopDistance) ||
        goodDown < allowedBottomDistance
      ) {
        const start = Math.max(currentMiddleIndex - topRenderOffset, 0);
        if (start !== state.slice[0])
          setState((state2) => ({
            ...state2,
            slice: [start, start + rowsByRender],
          }));
      }
    };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const now = new Date();
    if (
      lastScrollTimeRef.current &&
      now.getTime() - lastScrollTimeRef.current.getTime() > 160
    ) {
      fn();
    } else {
      if (!lastScrollTimeRef.current) lastScrollTimeRef.current = now;
      timeoutRef.current = setTimeout(fn, 160);
    }
  });

  const nop = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  });

  const onSortClick = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      ...state,
      openSortDialog: true,
    });
  });

  const onFilterClick = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      ...state,
      openFilterDialog: true,
    });
  });

  const onPlusClick = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let i = props.result.rows.length;
    while (state.update[i]) i += 1;
    setState((s) => ({
      ...s,
      editing: true,
      active: { colIndex: 0, rowIndex: i },
      selection: {
        colIndex: [0, 0],
        rowIndex: [i, i],
      },
    }));
  });

  const onDiscardClick = useEvent(() => {
    setState((s) => ({
      ...s,
      active:
        s.active && s.active.rowIndex < props.result.rows.length + 1
          ? s.active
          : undefined,
      selection: s.selection
        ? {
            rowIndex: [
              Math.min(s.selection.rowIndex[0], props.result.rows.length),
              Math.min(s.selection.rowIndex[1], props.result.rows.length),
            ],
            colIndex: s.selection.colIndex,
          }
        : undefined,
      update: {},
      updateFail: undefined,
    }));
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (e.target !== elRef.current) {
      if (
        e.target instanceof HTMLTextAreaElement &&
        e.target.classList.contains('active-cell')
      ) {
        const el = e.target;
        const cursorOnEnd =
          el.selectionEnd === el.value.length &&
          el.selectionStart === el.value.length;
        const cursor0 = el.selectionEnd === 0 && el.selectionStart === 0;
        if (e.key === 'ArrowDown' && cursorOnEnd) {
          moveBy(0, 1, false, 2);
        }
        if (e.key === 'ArrowRight' && cursorOnEnd) moveBy(1, 0, false, 2);
        if (e.key === 'ArrowLeft' && cursor0) moveBy(-1, 0, false, 1);
        if (e.key === 'ArrowUp' && cursor0) moveBy(0, -1, false, 1);
        if (e.key === 'Tab') {
          tabMove(e, e.shiftKey ? -1 : +1);
        }
      }
      return;
    }
    if (
      props.onUpdate &&
      props.pks?.length &&
      (e.key === 'F2' || e.key === 'Enter')
    ) {
      setState((s) => ({
        ...s,
        editing: true,
      }));
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'a' && (e.ctrlKey || (e.metaKey && isIOS))) {
      setState((s) => ({
        ...s,
        selection: {
          colIndex: [0, props.result.fields.length - 1],
          rowIndex: [0, props.result.rows.length - 1],
        },
      }));
    } else if (e.key === 'PageUp') {
      if (e.shiftKey || state.active) {
        const pageRows = Math.round((props.height - headerHeight) / rowHeight);
        moveBy(0, -pageRows, e.shiftKey);
        return;
      }
      assert(gridContentRef.current);
      gridContentRef.current.scrollTo({
        left: gridContentRef.current.scrollLeft,
        top: Math.max(
          gridContentRef.current.scrollTop -
            gridContentRef.current.offsetHeight,
          0,
        ),
        behavior: 'smooth',
      });
    } else if (e.key === 'PageDown') {
      if (e.shiftKey || state.active) {
        const pageRows = Math.round((props.height - headerHeight) / rowHeight);
        moveBy(0, pageRows, e.shiftKey);
        return;
      }
      assert(gridContentRef.current);
      gridContentRef.current.scrollTo({
        left: gridContentRef.current.scrollLeft,
        top:
          gridContentRef.current.scrollTop +
          gridContentRef.current.offsetHeight,
        behavior: 'smooth',
      });
    } else if (e.key === 'Home') {
      if (e.shiftKey || state.active) {
        moveBy(0, -Infinity, e.shiftKey);
        return;
      }
      assert(gridContentRef.current);
      gridContentRef.current.scrollTo({
        left: gridContentRef.current.scrollLeft,
        top: 0,
        behavior: 'smooth',
      });
    } else if (e.key === 'End') {
      if (e.shiftKey || state.active) {
        moveBy(0, Infinity, e.shiftKey);
        return;
      }
      assert(gridContentRef.current);
      gridContentRef.current.scrollTo({
        left: gridContentRef.current.scrollLeft,
        top:
          gridContentRef.current.scrollHeight -
          gridContentRef.current.offsetHeight +
          scrollWidth,
        behavior: 'smooth',
      });
    } else if (state.active) {
      if (e.key === 'Escape') {
        if (elRef.current) elRef.current.blur();
      } else if (e.key === 'ArrowDown') {
        moveBy(0, 1, e.shiftKey);
      } else if (e.key === 'ArrowUp') {
        moveBy(0, -1, e.shiftKey);
      } else if (e.key === 'ArrowLeft') {
        moveBy(-1, 0, e.shiftKey);
      } else if (e.key === 'ArrowRight') {
        moveBy(1, 0, e.shiftKey);
      } else if (e.key === 'Tab') {
        tabMove(e, e.shiftKey ? -1 : 1);
      } else if (
        props.onUpdate &&
        props.pks?.length &&
        e.key &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setState((s) => ({
          ...s,
          editing: 2,
          update: s.active
            ? {
                ...s.update,
                [s.active.rowIndex]: {
                  ...s.update?.[s.active.rowIndex],
                  [s.active.colIndex]: e.key,
                },
              }
            : s.update,
        }));
      }
    }
  });

  const onMouseDown = useEvent((e: React.MouseEvent<HTMLElement>) => {
    if (
      e.button === 1 ||
      e.button === 2 ||
      (e.target instanceof HTMLElement &&
        e.target.matches('input, textarea, select, button'))
    )
      return;
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    if (
      x < 0 ||
      y < 0 ||
      x > el.offsetWidth - (hasRightScrollbar ? scrollWidth : 0) ||
      y >
        el.offsetHeight - (hasBottomScrollbar ? scrollWidth : 0) - headerHeight
    ) {
      return;
    }
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex >= props.result.rows.length + extraRows) {
      return;
    }
    const colIndex = getColIndex(x);
    // if shift is pressed, select a range
    setState((state2) => ({
      ...state2,
      mouseDown: { rowIndex, colIndex },
      active: { rowIndex, colIndex },
      selection: undefined,
    }));
  });

  const onDoubleClick = useEvent((e: React.MouseEvent<HTMLElement>) => {
    if (
      e.button === 1 ||
      e.button === 2 ||
      !props.onUpdate ||
      !props.pks?.length
    )
      return;
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    if (
      x < 0 ||
      y < 0 ||
      x > el.offsetWidth - (hasRightScrollbar ? scrollWidth : 0) ||
      y >
        el.offsetHeight - (hasBottomScrollbar ? scrollWidth : 0) - headerHeight
    ) {
      return;
    }
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex >= props.result.rows.length + extraRows) {
      return;
    }
    const colIndex = getColIndex(x);
    if (
      colIndex === state.active?.colIndex &&
      rowIndex === state.active?.rowIndex
    ) {
      setState((s) => ({
        ...s,
        editing: true,
      }));
    }
  });

  const onBlur = useEvent(() => {
    setState((s) => ({
      ...s,
      mouseDown: undefined,
    }));
  });

  const onEditBlur = useEvent(() => {
    setState((s) => ({
      ...s,
      editing: false,
    }));
  });

  const onSortClose = useEvent(() => {
    setState({ ...state, openSortDialog: false });
  });

  const onFilterClose = useEvent(() => {
    setState({ ...state, openFilterDialog: false });
  });

  const onChange = useEvent((value: string | null) => {
    if (!state.active) return;
    if (
      state.update?.[state.active.rowIndex]?.[state.active.colIndex] === value
    )
      return;
    setState((s) => ({
      ...s,
      update: s.active
        ? {
            ...s.update,
            [s.active.rowIndex]: {
              ...s.update?.[s.active.rowIndex],
              [s.active.colIndex]: value,
            },
          }
        : s.update,
    }));
  });

  const onDiscardFailClick = useEvent(() => {
    setState((s) => ({
      ...s,
      updateFail: undefined,
    }));
  });

  const applyClick = useEvent(async () => {
    const { pks } = props;
    if (!pks || pks.length === 0 || !props.onUpdate) return;
    const updates = Object.keys(state.update)
      .filter((i) => parseInt(i, 10) < props.result.rows.length)
      .map((rowIndex) => {
        const values: { [name: string]: string | null } = {};
        for (const colIndex in state.update[rowIndex]) {
          const fieldName =
            props.result.fields[colIndex as unknown as number].name;
          const val = state.update[rowIndex][colIndex];
          assert(typeof fieldName === 'string');
          assert(val === null || typeof val === 'string');
          values[fieldName] = val;
        }
        const where: { [n: string]: string | number | null } = {};
        for (const name of pks) {
          const val =
            props.result.rows?.[rowIndex as unknown as number]?.[
              props.result.fields.findIndex((f) => f.name === name)
            ];
          assert(
            typeof val === 'string' || typeof val === 'number' || val === null,
          );
          where[name] = val;
        }
        return {
          where,
          values,
        };
      });

    const inserts = Object.keys(state.update)
      .filter((i) => parseInt(i, 10) >= props.result.rows.length)
      .map((rowIndex) => {
        const values: { [name: string]: string | null } = {};
        for (const colIndex in state.update[rowIndex]) {
          const fieldName =
            props.result.fields[colIndex as unknown as number].name;
          const val = state.update[rowIndex][colIndex];
          assert(typeof fieldName === 'string');
          assert(val === null || typeof val === 'string');
          values[fieldName] = val;
        }
        return values;
      });
    try {
      setState((s) => ({ ...s, updateRunning: true }));
      await props.onUpdate({ updates, inserts });
      setState((s) => ({ ...s, update: {}, updateRunning: false }));
    } catch (e) {
      setState((s) => ({
        ...s,
        updateFail: grantError(e),
        updateRunning: false,
      }));
    }
  });

  return {
    state,
    onStartResize,
    onBlur,
    onKeyDown,
    onMouseDown,
    onDoubleClick,
    elRef,
    gridContentTableWidth,
    headerElRef,
    colsWidths,
    pendingRowsUpdate,
    pendingInserts,
    scrollRef,
    hasBottomScrollbar,
    hasRightScrollbar,
    onChange,
    onEditBlur,
    activeElRef,
    onFilterClose,
    onScroll,
    gridContentRef,
    gridContentMarginTop,
    gridContentHeight,
    visibleStartingInEven,
    visibleRows,
    gridContentTableTop,
    onSortClose,
    onSortClick,
    onFilterClick,
    nop,
    totalChanges,
    onDiscardClick,
    applyClick,
    onPlusClick,
    extraRows,
    extraBottomSpace,
    onDiscardFailClick,
    applyingUpdate: state.updateRunning,
  };
}
