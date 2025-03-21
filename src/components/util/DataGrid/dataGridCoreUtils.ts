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
  activeCell: { rowIndex: number; colIndex: number } | undefined,
  fixedCount: number,
  rowIndex: [number, number],
) {
  return fixedCount &&
    activeCell &&
    activeCell.rowIndex >= rowIndex[0] &&
    activeCell.rowIndex <= rowIndex[1]
    ? undefined
    : fixedCount && activeCell && activeCell.rowIndex > rowIndex[0]
      ? {
          rowIndex: activeCell.rowIndex - fixedCount,
          colIndex: activeCell.colIndex,
        }
      : activeCell;
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
        activeCell: undefined,
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

  const activeCellElRef = useRef(null as HTMLDivElement | null);

  const lastScrollTimeRef = useRef(null as Date | null);

  function edit() {
    if (!state.contextMenu?.hintOnly) {
      const { top, left, width } = elRef
        .current!.querySelector('.grid__active-cell-wrapper')!
        .getClientRects()[0];
      setState((s) => ({
        ...s,
        selection:
          s.selection &&
          s.activeCell!.rowIndex >= s.selection.rowIndex[0] &&
          s.activeCell!.rowIndex <= s.selection.rowIndex[1] &&
          s.activeCell!.colIndex >= s.selection.colIndex[0] &&
          s.activeCell!.colIndex <= s.selection.colIndex[1]
            ? s.selection
            : {
                colIndex: [s.activeCell!.colIndex, s.activeCell!.colIndex],
                rowIndex: [s.activeCell!.rowIndex, s.activeCell!.rowIndex],
              },
        activeCell: {
          rowIndex: s.activeCell!.rowIndex,
          colIndex: s.activeCell!.colIndex,
        },
        contextMenu: {
          rowIndex: s.activeCell!.rowIndex,
          colIndex: s.activeCell!.colIndex,
          x: left,
          y: top + rowHeight + 3,
          y2: top,
          x2: left + width - 1,
          noPk: !!props.pks?.length,
          codeResult: !props.onUpdate,
          hintOnly: true,
        },
      }));
    }
  }

  useEffect(() => {
    if (!state.notice && !state.contextMenu?.hintOnly) return () => {};
    const timeout = setTimeout(
      () => {
        setState((s) =>
          s.notice && state.contextMenu?.hintOnly
            ? {
                ...s,
                contextMenu: undefined,
                notice: undefined,
              }
            : s.notice
              ? {
                  ...s,
                  notice: undefined,
                }
              : state.contextMenu?.hintOnly
                ? {
                    ...s,
                    contextMenu: undefined,
                  }
                : s,
        );
      },
      state.notice ? 2500 : 4000,
    );
    return () => {
      clearTimeout(timeout);
    };
  }, [state.notice, state.contextMenu]);

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

  const activeCellUpdate2 = useEvent(
    (
      widths: number[],
      hasBottomScrollbar: boolean,
      hasRightScrollbar: boolean,
    ) => {
      if (activeCellElRef.current && state.activeCell)
        activeCellUpdate({
          activeCellEl: activeCellElRef.current,
          finalWidths: widths,
          activeCell: state.activeCell,
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
    activeCellUpdate: activeCellUpdate2,
    selection: state.selection,
  });

  useEffect(() => {
    if (state.activeCell) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(
        el,
        colsWidths,
        state.activeCell.colIndex,
        state.activeCell.rowIndex,
        hasRightScrollbar,
        hasBottomScrollbar,
      );
    }
  }, [colsWidths, state.activeCell, hasRightScrollbar, hasBottomScrollbar]);

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
    if (state.activeCell && activeCellElRef.current)
      activeCellUpdate({
        activeCellEl: activeCellElRef.current,
        finalWidths: colsWidths,
        activeCell: state.activeCell,
        scrollTop: scrollRef.current.top,
        scrollLeft: scrollRef.current.left,
        containerHeight: props.height,
        containerWidth: props.width,
        hasBottomScrollbar,
        hasRightScrollbar,
      });
  }, [
    state.activeCell,
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
      activeCell: { rowIndex, colIndex },
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
      activeCell: { rowIndex, colIndex },
      contextMenu: undefined,
    }));
  });

  function tabMove(e: React.KeyboardEvent, direction = 1) {
    if (!state.activeCell) return;
    const colIndex =
      state.activeCell.colIndex + direction === props.result.fields.length
        ? 0
        : state.activeCell.colIndex + direction === -1
          ? props.result.fields.length - 1
          : state.activeCell.colIndex + direction;
    const rowIndex =
      state.activeCell.colIndex + direction === props.result.fields.length
        ? state.activeCell.rowIndex + 1
        : state.activeCell.colIndex + direction === -1
          ? state.activeCell.rowIndex - 1
          : state.activeCell.rowIndex;
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
          activeCell: { rowIndex, colIndex },
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
    if (!state.activeCell) return;
    let x = x0;
    let y = y0;
    if (state.activeCell.colIndex + x < 0) {
      x = -state.activeCell.colIndex;
    } else if (state.activeCell.colIndex + x >= props.result.fields.length) {
      x = props.result.fields.length - state.activeCell.colIndex - 1;
    }
    if (state.activeCell.rowIndex + y < 0) {
      y = -state.activeCell.rowIndex;
    } else if (
      state.activeCell.rowIndex + y >=
      props.result.rows.length + extraRows
    ) {
      y = props.result.rows.length - state.activeCell.rowIndex - 1 + extraRows;
    }
    if (x === 0 && y === 0) return;
    setState((s) => {
      if (!s.activeCell) return s;
      const newEditing =
        (s.editing || editing) &&
        (!props.pks || !props.pks.length) &&
        s.activeCell.rowIndex + y < props.result.rows.length
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
                  Math.min(s.activeCell.colIndex + x, s.activeCell.colIndex),
                  Math.max(s.activeCell.colIndex + x, s.activeCell.colIndex),
                ],
                rowIndex: [
                  Math.min(s.activeCell.rowIndex + y, s.activeCell.rowIndex),
                  Math.max(s.activeCell.rowIndex + y, s.activeCell.rowIndex),
                ],
              }
            : {
                colIndex: [
                  Math.min(
                    s.activeCell.colIndex + x,
                    state.selection.colIndex[0] === s.activeCell.colIndex
                      ? state.selection.colIndex[1]
                      : state.selection.colIndex[0],
                  ),
                  Math.max(
                    s.activeCell.colIndex + x,
                    state.selection.colIndex[0] === s.activeCell.colIndex
                      ? state.selection.colIndex[1]
                      : state.selection.colIndex[0],
                  ),
                ],
                rowIndex: [
                  Math.min(
                    s.activeCell.rowIndex + y,
                    state.selection.rowIndex[0] === s.activeCell.rowIndex
                      ? state.selection.rowIndex[1]
                      : state.selection.rowIndex[0],
                  ),
                  Math.max(
                    s.activeCell.rowIndex + y,
                    state.selection.rowIndex[0] === s.activeCell.rowIndex
                      ? state.selection.rowIndex[1]
                      : state.selection.rowIndex[0],
                  ),
                ],
              },
        activeCell: {
          colIndex: s.activeCell.colIndex + x,
          rowIndex: s.activeCell.rowIndex + y,
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
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        notice: {
          key: (s.notice?.key ?? 0) + 1,
          rows: s.selection!.rowIndex[1] - s.selection!.rowIndex[0] + 1,
          cols: s.selection!.colIndex[1] - s.selection!.colIndex[0] + 1,
        },
      }));
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
    if (state.activeCell?.rowIndex === props.result.rows.length - 1) {
      fetchMoreRows0();
    }
  }, [state.activeCell?.rowIndex, props.result.rows.length, fetchMoreRows0]);

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
    if (state.activeCell && activeCellElRef.current)
      activeCellUpdate({
        activeCellEl: activeCellElRef.current,
        finalWidths: colsWidths,
        activeCell: state.activeCell,
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
      activeCell: { colIndex: 0, rowIndex: i },
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
      activeCell:
        s.activeCell && s.activeCell.rowIndex < props.result.rows.length + 1
          ? s.activeCell
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
        e.target.classList.contains('grid__active-cell')
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
      (e.key === 'F2' || e.key === 'Enter') &&
      (!state.activeCell ||
        state.update?.[state.activeCell.rowIndex] !== 'REMOVE')
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
      if (e.shiftKey || state.activeCell) {
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
      if (e.shiftKey || state.activeCell) {
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
      if (e.shiftKey || state.activeCell) {
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
      if (e.shiftKey || state.activeCell) {
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
    } else if (state.activeCell) {
      if (e.key === 'Escape') {
        if (state.contextMenu || state.notice) {
          setState((s) => ({
            ...s,
            contextMenu: undefined,
            notice: undefined,
          }));
        } else if (elRef.current) elRef.current.blur();
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
        e.key &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        (!state.activeCell ||
          state.update?.[state.activeCell.rowIndex] !== 'REMOVE')
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (
          !(
            props.pks?.length ||
            (state.activeCell &&
              state.activeCell.rowIndex >= props.result.rows.length)
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
          update: s.activeCell
            ? {
                ...s.update,
                [s.activeCell.rowIndex]:
                  s.update?.[s.activeCell.rowIndex] === 'REMOVE'
                    ? 'REMOVE'
                    : {
                        ...(s.update?.[s.activeCell.rowIndex] as {
                          [colIndex: string]: string | null;
                        }),
                        [s.activeCell.colIndex]: e.key,
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
        activeCell: fixActive(s.activeCell, fixedCount, e.rowIndex),
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
        activeCell: fixActive(s.activeCell, fixedCount, e.rowIndex),
      }));
    } else if (e.type === 'update') {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
        editing: true,
        activeCell: { rowIndex: e.rowIndex, colIndex: e.colIndex },
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
        activeCell: fixActive(s.activeCell, removes, e.rowIndex),
      }));
    } else if (e.type === 'copy') {
      setState((s) => ({
        ...s,
        contextMenu: undefined,
      }));
      document.execCommand('copy');
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
      const codeResult =
        !props.onUpdate || rowIndex >= props.result.rows.length + extraRows;
      const noPk =
        !props.onUpdate ||
        !props.pks ||
        !props.pks.length ||
        rowIndex >= props.result.rows.length + extraRows;
      setState((s) => ({
        ...s,
        selection:
          s.selection &&
          rowIndex >= s.selection.rowIndex[0] &&
          rowIndex <= s.selection.rowIndex[1] &&
          colIndex >= s.selection.colIndex[0] &&
          colIndex <= s.selection.colIndex[1]
            ? s.selection
            : {
                colIndex: [colIndex, colIndex],
                rowIndex: [rowIndex, rowIndex],
              },
        activeCell: {
          rowIndex,
          colIndex,
        },
        contextMenu: {
          rowIndex,
          colIndex,
          x: e.clientX,
          y: e.clientY,
          noPk,
          codeResult,
        },
        mouseDown: undefined,
      }));
      return;
    }
    if (e.shiftKey && state.activeCell) {
      setState((state2) => ({
        ...state2,
        selection: state2.activeCell
          ? {
              rowIndex: [
                Math.min(state2.activeCell.rowIndex, rowIndex),
                Math.max(state2.activeCell.rowIndex, rowIndex),
              ],
              colIndex: [
                Math.min(state2.activeCell.colIndex, colIndex),
                Math.max(state2.activeCell.colIndex, colIndex),
              ],
            }
          : undefined,
        activeCell: { rowIndex, colIndex },
        contextMenu: undefined,
      }));
      return;
    }
    setState((state2) => ({
      ...state2,
      mouseDown: { rowIndex, colIndex },
      activeCell: { rowIndex, colIndex },
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
      colIndex === state.activeCell?.colIndex &&
      rowIndex === state.activeCell?.rowIndex &&
      (!state.activeCell ||
        state.update?.[state.activeCell.rowIndex] !== 'REMOVE')
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
    if (!state.activeCell) return;
    if (
      state.update?.[state.activeCell.rowIndex] === 'REMOVE' ||
      (
        state.update?.[state.activeCell.rowIndex] as
          | {
              [colIndex: string]: string | null;
            }
          | undefined
      )?.[state.activeCell.colIndex] === value
    )
      return;
    setState((s) => ({
      ...s,
      contextMenu: undefined,
      update: s.activeCell
        ? {
            ...s.update,
            [s.activeCell.rowIndex]:
              state.update?.[s.activeCell.rowIndex] === 'REMOVE'
                ? 'REMOVE'
                : {
                    ...(s.update?.[s.activeCell.rowIndex] as {
                      [colIndex: string]: string | null;
                    }),
                    [s.activeCell.colIndex]: value,
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
    state.activeCell?.rowIndex !== undefined &&
    state.update?.[state.activeCell.rowIndex] !== 'REMOVE' &&
    typeof (
      state.update?.[state.activeCell.rowIndex] as {
        [colIndex: string]: string | null;
      }
    )?.[state.activeCell.colIndex] !== 'undefined';

  const activeCellValue =
    state.activeCell?.rowIndex !== undefined &&
    state.update?.[state.activeCell.rowIndex] !== 'REMOVE' &&
    typeof state.update[state.activeCell.rowIndex] !== 'undefined' &&
    typeof (
      state.update?.[state.activeCell.rowIndex] as {
        [colIndex: string]: string | null;
      }
    )?.[state.activeCell.colIndex] !== 'undefined'
      ? (
          state.update?.[state.activeCell.rowIndex] as {
            [colIndex: string]: string | null;
          }
        )?.[state.activeCell.colIndex]
      : state.activeCell
        ? props.result.rows[state.activeCell.rowIndex]?.[
            state.activeCell.colIndex
          ]
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
    activeCellElRef,
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
