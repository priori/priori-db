import React, { useEffect, useMemo, useRef, useState } from 'react';
import { assert } from 'util/assert';
import { equals } from 'util/equals';
import { grantError } from 'util/errors';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { activeCellUpdate } from './DataGridActiveCell';
import { DataGridCoreProps, DataGridState } from './DataGridCore';
import { useGridColsSizes } from './useGridColsSizes';
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
  toText,
  toTsv,
  topRenderOffset,
} from './util';
import { ContextMenuEvent } from './ContextMenu';

const isIOS = process?.platform === 'darwin';

export function useMoreTime(b: boolean, timeout: number) {
  const [b2, setB2] = useState(b);
  useEffect(() => {
    if (b === b2) return () => {};
    if (!b) {
      const t = setTimeout(() => {
        setB2(b);
      }, timeout);
      return () => {
        clearTimeout(t);
      };
    }
    setB2(b);
    return () => {};
  }, [b, b2, timeout]);
  return b2;
}

function fixInsertRows(
  update: {
    [x: string]:
      | {
          [colIndex: string]: string | null;
        }
      | 'REMOVE';
  },
  indexStart: number,
  indexEnd: number,
  rowsLength: number,
) {
  if (indexEnd >= rowsLength) {
    const start = Math.max(rowsLength, indexStart);
    let removedCount = 0;
    for (let i = start; i <= indexEnd || update[i]; i += 1) {
      if (!update[i]) {
        removedCount += 1;
      } else if (removedCount) {
        update[i - removedCount] = update[i];
        delete update[i];
      }
    }
    return removedCount;
  }
  return 0;
}

function fixSelection(
  selection:
    | {
        rowIndex: [number, number];
        colIndex: [number, number];
      }
    | undefined,
  fixedCount: number,
) {
  return selection && fixedCount
    ? selection.rowIndex[1] - fixedCount >= selection.rowIndex[0]
      ? {
          rowIndex: [
            selection.rowIndex[0],
            selection.rowIndex[1] - fixedCount,
          ] as [number, number],
          colIndex: selection.colIndex,
        }
      : undefined
    : selection;
}

function fixActive(
  active: { rowIndex: number; colIndex: number } | undefined,
  fixedCount: number,
  rowIndex: [number, number],
) {
  return fixedCount &&
    active &&
    active.rowIndex >= rowIndex[0] &&
    active.rowIndex <= rowIndex[1]
    ? undefined
    : fixedCount && active && active.rowIndex > rowIndex[0]
      ? {
          rowIndex: active.rowIndex - fixedCount,
          colIndex: active.colIndex,
        }
      : active;
}

export function useDataGridCore(props: DataGridCoreProps) {
  const [state0, setState] = useState<DataGridState>({
    slice: [0, rowsByRender],
    openSortDialog: false,
    openFilterDialog: false,
    editing: false,
    update: {},
    fetchingNewRows: false,
    touched: false,
  });

  const scrollRef = useRef({ left: 0, top: 0 });

  const gridContentRef = useRef<HTMLDivElement | null>(null);

  let state = state0;
  const resultRef = useRef(props.result);
  const resultLengthRef = useRef(props.result.rows.length);

  const fields = useMemo(
    () => props.result.fields.map((f) => ({ name: f.name, type: f.type })),
    [props.result.fields],
  );
  const prevFields = useRef(fields);
  const sameFields = equals(fields, prevFields.current);
  if (!sameFields) prevFields.current = fields;

  if (resultRef.current !== props.result) {
    if (
      state.fetchingNewRows &&
      props.result.rows.length > resultLengthRef.current &&
      sameFields
    ) {
      resultRef.current = props.result;
      setState((s) => ({
        ...s,
        fetchingNewRows: false,
      }));
    } else {
      state = {
        slice: [0, rowsByRender],
        openSortDialog: false,
        openFilterDialog: false,
        editing: false,
        update: {},
        active: undefined,
        contextMenu: undefined,
        selection: undefined,
        touched: state.touched,
      };
      resultRef.current = props.result;
      resultLengthRef.current = props.result.rows.length;
      scrollRef.current = { left: 0, top: 0 };
      gridContentRef.current?.scrollTo(0, 0);
      setState(state);
    }
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

  const hintCloseTimeoutRef = useRef(
    null as ReturnType<typeof setTimeout> | null,
  );

  function edit() {
    if (!props.onUpdate) return;
    if (
      props.pks?.length ||
      (state.active && state.active.rowIndex >= props.result.rows.length)
    ) {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        editing: true,
      }));
    } else if (!state.contextMenu?.hintOnly) {
      const { top, left, width } = elRef
        .current!.querySelector('.active')!
        .getClientRects()[0];
      setState((s) => ({
        ...s,
        contextMenu: {
          rowIndex: s.active!.rowIndex,
          colIndex: s.active!.colIndex,
          x: left,
          y: top + rowHeight + 3,
          y2: top,
          x2: left + width - 1,
          readOnly: true,
          hintOnly: true,
        },
      }));
      if (hintCloseTimeoutRef.current)
        clearTimeout(hintCloseTimeoutRef.current);
      hintCloseTimeoutRef.current = setTimeout(() => {
        setState((s) =>
          s.contextMenu?.hintOnly
            ? {
                ...s,
                contextMenu: undefined,
              }
            : s,
        );
      }, 4000);
    }
  }

  const pendingInserts = Object.keys(state.update).filter(
    (i) => parseInt(i, 10) >= props.result.rows.length,
  ).length;

  const pendingRowsRemoval = Object.values(state.update).filter(
    (v) => v === 'REMOVE',
  ).length;

  const pendingRowsUpdate =
    Object.keys(state.update).length - pendingInserts - pendingRowsRemoval;

  const extraBottomSpace =
    (props.fetchMoreRows ? 90 : 0) +
    (pendingRowsUpdate || pendingInserts || pendingRowsRemoval
      ? 130
      : props.onChangeFilter || props.onChangeSort || props.onUpdate
        ? 68
        : 0);

  const totalChanges = Object.keys(state.update)
    .filter((k) => state.update[k] !== 'REMOVE')
    .reduce((a, b) => a + Object.keys(state.update[b]).length, 0);

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
    selection: state.selection,
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
        u === 'REMOVE'
          ? []
          : u && Object.values(u).length
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
        contextMenu: undefined,
      }));
      elRef.current?.blur();
      return;
    }
    setState((state2) => ({
      ...state2,
      active: { rowIndex, colIndex },
      selection,
      mouseDown: undefined,
      contextMenu: undefined,
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
      contextMenu: undefined,
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
      setState((s) => {
        const newEditing =
          (!props.pks || !props.pks.length) &&
          rowIndex < props.result.rows.length
            ? false
            : !!s.editing;
        if (!newEditing && s.editing) {
          elRef.current?.focus();
        }
        return {
          ...s,
          selection: {
            colIndex: [colIndex, colIndex],
            rowIndex: [rowIndex, rowIndex],
          },
          contextMenu: undefined,
          editing: newEditing,
          active: { rowIndex, colIndex },
        };
      });
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
      const newEditing =
        (s.editing || editing) &&
        (!props.pks || !props.pks.length) &&
        s.active.rowIndex + y < props.result.rows.length
          ? false
          : editing === undefined
            ? s.editing
            : s.editing;
      if (!newEditing && s.editing) {
        elRef.current?.focus();
      }
      return {
        ...s,
        editing: newEditing,
        contextMenu: undefined,
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

  const fetchMoreRows0 = useEvent(() => {
    if (!props.fetchMoreRows || state.fetchingNewRows) return;
    setState((s) => ({
      ...s,
      fetchingNewRows: true,
    }));
    setTimeout(() => {
      if (!props.fetchMoreRows || state.fetchingNewRows) return;
      props.fetchMoreRows?.();
    }, 1);
  });
  const fetchMoreRows = props.fetchMoreRows ? fetchMoreRows0 : undefined;

  useEffect(() => {
    if (state.active?.rowIndex === props.result.rows.length - 1) {
      fetchMoreRows0();
    }
  }, [state.active?.rowIndex, props.result.rows.length, fetchMoreRows0]);

  const onScroll = useEvent((e: React.UIEvent<HTMLElement>) => {
    if (props.onScroll) props.onScroll();
    const container = e.target as HTMLElement;
    scrollRef.current = {
      left: container.scrollLeft,
      top: container.scrollTop,
    };
    if (
      container.scrollTop + container.offsetHeight >=
      container.scrollHeight - 40 - extraBottomSpace
    ) {
      fetchMoreRows0();
    }
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
    if (state.contextMenu) {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
      }));
    }
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
      contextMenu: undefined,
      openSortDialog: true,
    });
  });

  const onFilterClick = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      ...state,
      contextMenu: undefined,
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
      contextMenu: undefined,
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
      contextMenu: undefined,
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
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
          tabMove(e, e.shiftKey ? -1 : +1);
        }
      }
      return;
    }
    if (
      props.onUpdate &&
      (e.key === 'F2' || e.key === 'Enter') &&
      (!state.active || state.update?.[state.active.rowIndex] !== 'REMOVE')
    ) {
      edit();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'a' && (e.ctrlKey || (e.metaKey && isIOS))) {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
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
      } else if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        tabMove(e, e.shiftKey ? -1 : 1);
      } else if (
        props.onUpdate &&
        e.key &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        (!state.active || state.update?.[state.active.rowIndex] !== 'REMOVE')
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (
          !(
            props.pks?.length ||
            (state.active && state.active.rowIndex >= props.result.rows.length)
          )
        ) {
          edit();
          return;
        }
        if (!state.touched && props.onTouch) {
          props.onTouch();
        }
        setState((s) => ({
          ...s,
          touched: true,
          editing: 2,
          contextMenu: undefined,
          update: s.active
            ? {
                ...s.update,
                [s.active.rowIndex]:
                  s.update?.[s.active.rowIndex] === 'REMOVE'
                    ? 'REMOVE'
                    : {
                        ...(s.update?.[s.active.rowIndex] as {
                          [colIndex: string]: string | null;
                        }),
                        [s.active.colIndex]: e.key,
                      },
              }
            : s.update,
        }));
      }
    }
  });

  const onContextMenuSelectOption = useEvent((e: ContextMenuEvent) => {
    if (e.type === 'undo delete') {
      const update2 = { ...state.update };
      for (let i = e.rowIndex[0]; i <= e.rowIndex[1]; i += 1) {
        if (update2[i] === 'REMOVE') delete update2[i];
      }
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        update: update2,
      }));
    } else if (e.type === 'delete') {
      const update2 = { ...state.update };
      for (let i = e.rowIndex[0]; i <= e.rowIndex[1]; i += 1) {
        update2[i] = 'REMOVE';
      }
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        update: update2,
      }));
    } else if (e.type === 'undo update') {
      const update2 = { ...state.update };
      for (let i = e.rowIndex[0]; i <= e.rowIndex[1]; i += 1) {
        const u = update2[i];
        if (u !== 'REMOVE' && u) {
          for (let i2 = e.colIndex[0]; i2 <= e.colIndex[1]; i2 += 1) {
            if (u[i2]) delete u[i2];
          }
          if (!Object.keys(update2[i]).length) delete update2[i];
        }
      }
      const fixedCount = fixInsertRows(
        update2,
        e.rowIndex[0],
        e.rowIndex[1],
        props.result.rows.length,
      );
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        update: update2,
        selection: fixSelection(s.selection, fixedCount),
        active: fixActive(s.active, fixedCount, e.rowIndex),
      }));
    } else if (e.type === 'undo all') {
      const update2 = { ...state.update };
      for (let i = e.rowIndex[0]; i <= e.rowIndex[1]; i += 1) {
        const u = update2[i];
        if (u === 'REMOVE') {
          delete update2[i];
        } else if (u) {
          for (let i2 = e.colIndex[0]; i2 <= e.colIndex[1]; i2 += 1) {
            delete u[i2];
          }
          if (!Object.keys(update2[i]).length) delete update2[i];
        }
      }
      const fixedCount = fixInsertRows(
        update2,
        e.rowIndex[0],
        e.rowIndex[1],
        props.result.rows.length,
      );
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        update: update2,
        selection: fixSelection(s.selection, fixedCount),
        active: fixActive(s.active, fixedCount, e.rowIndex),
      }));
    } else if (e.type === 'update') {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        editing: true,
        active: { rowIndex: e.rowIndex, colIndex: e.colIndex },
      }));
    } else if (e.type === 'undo inserts') {
      const update2 = { ...state.update };
      for (let i = e.rowIndex[0]; i <= e.rowIndex[1]; i += 1) {
        if (update2[i]) delete update2[i];
      }
      const removes = e.rowIndex[1] - e.rowIndex[0] + 1;
      let i = e.rowIndex[1] + 1;
      while (update2[i]) {
        update2[i - removes] = update2[i];
        delete update2[i];
        i += 1;
      }
      const selection =
        state.selection &&
        (state.selection.rowIndex[0] <= e.rowIndex[0] ||
          state.selection.rowIndex[1] >= e.rowIndex[1]) &&
        (state.selection.rowIndex[0] < e.rowIndex[0] ||
          state.selection.rowIndex[1] > e.rowIndex[1])
          ? {
              colIndex: state.selection.colIndex,
              rowIndex: [
                state.selection.rowIndex[0],
                state.selection.rowIndex[1] - removes,
              ] as [number, number],
            }
          : undefined;
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        update: update2,
        selection,
        active: fixActive(s.active, removes, e.rowIndex),
      }));
    }
  });

  const onMouseDown = useEvent((e: React.MouseEvent<HTMLElement>) => {
    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.matches('textarea')
    ) {
      if (document.activeElement === e.target) {
        return;
      }
      document.activeElement.blur();
    }
    if (
      e.button === 1 ||
      (e.target instanceof HTMLElement &&
        (e.target.matches('input, textarea, select, button') ||
          e.target.closest('.context-menu')))
    ) {
      if (
        !(e.target instanceof HTMLElement && e.target.closest('.context-menu'))
      )
        if (state.contextMenu) {
          setState((s) => ({
            ...s,
            contextMenu: undefined,
          }));
        }
      return;
    }
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
      if (state.contextMenu) {
        setState((s) => ({
          ...s,
          contextMenu: undefined,
        }));
      }
      return;
    }
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex >= props.result.rows.length + extraRows) {
      if (state.contextMenu) {
        setState((s) => ({
          ...s,
          contextMenu: undefined,
        }));
      }
      return;
    }
    const colIndex = getColIndex(x);
    if (e.button === 2) {
      if (!props.onUpdate || rowIndex >= props.result.rows.length + extraRows) {
        if (state.contextMenu) {
          setState((s) => ({
            ...s,
            contextMenu: undefined,
          }));
        }
        return;
      }
      const readOnly =
        !props.onUpdate ||
        !props.pks ||
        !props.pks.length ||
        rowIndex >= props.result.rows.length + extraRows;
      setState((s) => ({
        ...s,
        contextMenu: {
          rowIndex,
          colIndex,
          x: e.clientX,
          y: e.clientY,
          readOnly,
        },
        mouseDown: undefined,
      }));
      return;
    }
    // if shift is pressed, select a range
    setState((state2) => ({
      ...state2,
      mouseDown: { rowIndex, colIndex },
      active: { rowIndex, colIndex },
      selection: undefined,
      contextMenu: undefined,
    }));
  });

  const onDoubleClick = useEvent((e: React.MouseEvent<HTMLElement>) => {
    if (e.button === 1 || e.button === 2 || !props.onUpdate) return;
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
      rowIndex === state.active?.rowIndex &&
      (!state.active || state.update?.[state.active.rowIndex] !== 'REMOVE')
    ) {
      edit();
    }
  });

  const onBlur = useEvent(() => {
    setState((s) => ({
      ...s,
      contextMenu: undefined,
      mouseDown: undefined,
    }));
  });

  const onEditBlur = useEvent(() => {
    setState((s) => ({
      ...s,
      contextMenu: undefined,
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
      state.update?.[state.active.rowIndex] === 'REMOVE' ||
      (
        state.update?.[state.active.rowIndex] as
          | {
              [colIndex: string]: string | null;
            }
          | undefined
      )?.[state.active.colIndex] === value
    )
      return;
    setState((s) => ({
      ...s,
      contextMenu: undefined,
      update: s.active
        ? {
            ...s.update,
            [s.active.rowIndex]:
              state.update?.[s.active.rowIndex] === 'REMOVE'
                ? 'REMOVE'
                : {
                    ...(s.update?.[s.active.rowIndex] as {
                      [colIndex: string]: string | null;
                    }),
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
    if (!props.onUpdate) return;
    if (
      Object.keys(state.update).filter(
        (i) => parseInt(i, 10) < props.result.rows.length,
      ).length &&
      (!pks || !pks.length)
    ) {
      throw new Error('Primay Keys not found for table!');
    }
    const updates = Object.keys(state.update)
      .filter(
        (i) =>
          state.update[i] !== 'REMOVE' &&
          parseInt(i, 10) < props.result.rows.length,
      )
      .map((rowIndex) => {
        const values: { [name: string]: string | null } = {};
        if (state.update[rowIndex] !== 'REMOVE' && state.update[rowIndex])
          for (const colIndex in state.update[rowIndex] as {
            [k: string]: string | null;
          }) {
            const fieldName =
              props.result.fields[colIndex as unknown as number].name;
            const val = (
              state.update[rowIndex] as { [k: string]: string | null }
            )[colIndex];
            assert(typeof fieldName === 'string');
            assert(val === null || typeof val === 'string');
            values[fieldName] = val;
          }
        const where: { [n: string]: string | number | null } = {};
        if (pks)
          for (const name of pks) {
            const val =
              props.result.rows?.[rowIndex as unknown as number]?.[
                props.result.fields.findIndex((f) => f.name === name)
              ];
            assert(
              typeof val === 'string' ||
                typeof val === 'number' ||
                val === null,
            );
            where[name] = val;
          }
        return {
          where,
          values,
        };
      });
    const removals = Object.keys(state.update)
      .filter((i) => state.update[i] === 'REMOVE')
      .map((rowIndex) => {
        const where: { [n: string]: string | number | null } = {};
        if (pks)
          for (const name of pks) {
            const val =
              props.result.rows?.[rowIndex as unknown as number]?.[
                props.result.fields.findIndex((f) => f.name === name)
              ];
            assert(
              typeof val === 'string' ||
                typeof val === 'number' ||
                val === null,
            );
            where[name] = val;
          }
        return where;
      });

    const inserts = Object.keys(state.update)
      .filter((i) => parseInt(i, 10) >= props.result.rows.length)
      .map((rowIndex) => {
        const values: { [name: string]: string | null } = {};
        if (state.update[rowIndex] !== 'REMOVE' && state.update[rowIndex])
          for (const colIndex in state.update[rowIndex] as {
            [k: string]: string | null;
          }) {
            const fieldName =
              props.result.fields[colIndex as unknown as number].name;
            const val = (
              state.update[rowIndex] as {
                [k: string]: string | null;
              }
            )[colIndex];
            assert(typeof fieldName === 'string');
            assert(val === null || typeof val === 'string');
            values[fieldName] = val;
          }
        return values;
      });

    try {
      setState((s) => ({ ...s, contextMenu: undefined, updateRunning: true }));
      await props.onUpdate({ updates, inserts, removals });
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        updateRunning: false,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        updateFail: grantError(e),
        updateRunning: false,
      }));
    }
  });

  const fetchingNewRows = useMoreTime(!!state.fetchingNewRows, 200);

  const activeCellChanged =
    state.active?.rowIndex !== undefined &&
    state.update?.[state.active.rowIndex] !== 'REMOVE' &&
    typeof (
      state.update?.[state.active.rowIndex] as {
        [colIndex: string]: string | null;
      }
    )?.[state.active.colIndex] !== 'undefined';

  const activeCellValue =
    state.active?.rowIndex !== undefined &&
    state.update?.[state.active.rowIndex] !== 'REMOVE' &&
    typeof state.update[state.active.rowIndex] !== 'undefined' &&
    typeof (
      state.update?.[state.active.rowIndex] as {
        [colIndex: string]: string | null;
      }
    )?.[state.active.colIndex] !== 'undefined'
      ? (
          state.update?.[state.active.rowIndex] as {
            [colIndex: string]: string | null;
          }
        )?.[state.active.colIndex]
      : state.active
        ? props.result.rows[state.active.rowIndex]?.[state.active.colIndex]
        : undefined;

  const onChangeLimit0 = useEvent((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!props.onChangeLimit) return;
    if (e.target.value === 'unlimited') {
      props.onChangeLimit('unlimited');
    } else {
      props.onChangeLimit(parseInt(e.target.value, 10) as 1000 | 10000);
    }
  });

  const onChangeLimit =
    props.limit && props.onChangeLimit ? onChangeLimit0 : undefined;

  return {
    activeCellChanged,
    activeCellValue,
    activeElRef,
    applyClick,
    applyingUpdate: state.updateRunning,
    colsWidths,
    elRef,
    extraBottomSpace,
    extraRows,
    fetchMoreRows,
    fetchingNewRows,
    gridContentHeight,
    gridContentMarginTop,
    gridContentRef,
    gridContentTableTop,
    gridContentTableWidth,
    hasBottomScrollbar,
    hasRightScrollbar,
    headerElRef,
    nop,
    onBlur,
    onChange,
    onChangeLimit,
    onContextMenuSelectOption,
    onDiscardClick,
    onDiscardFailClick,
    onDoubleClick,
    onEditBlur,
    onFilterClick,
    onFilterClose,
    onKeyDown,
    onMouseDown,
    onPlusClick,
    onScroll,
    onSortClick,
    onSortClose,
    onStartResize,
    pendingInserts,
    pendingRowsRemoval,
    pendingRowsUpdate,
    scrollRef,
    state,
    totalChanges,
    visibleRows,
    visibleStartingInEven,
  };
}
