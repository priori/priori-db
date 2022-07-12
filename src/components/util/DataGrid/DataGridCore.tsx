import assert from 'assert';
import { QueryArrayResult } from 'pg';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import {
  DataGridActiveCell,
  update as activeUpdate,
} from './DataGridActiveCell';
import { DataGridTable } from './DataGridTable';
import { DataGridThead } from './DataGridThead';
import {
  allowedBottomDistance,
  allowedTopDistance,
  buildBaseWidths,
  buildFinalWidths,
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

export interface DataGridCoreProps {
  result: QueryArrayResult;
  width: number;
  onScroll?: (() => void) | undefined;
  height: number;
  emptyTable?: string | undefined;
}

export interface DataGridState {
  slice: [number, number];
  active?: { rowIndex: number; colIndex: number };
  selection?: { rowIndex: [number, number]; colIndex: [number, number] };
  mouseDown?: { rowIndex: number; colIndex: number };
}

export function DataGridCore(props: DataGridCoreProps) {
  const [state, setState] = useState({
    slice: [0, rowsByRender],
  } as DataGridState);

  const headerElRef = useRef(null as HTMLTableElement | null);

  const scrollRef = useRef({ left: 0, top: 0 });

  const timeoutRef = useRef(null as ReturnType<typeof setTimeout> | null);

  const elRef = useRef(null as HTMLDivElement | null);

  const activeElRef = useRef(null as HTMLDivElement | null);

  const lastScrollTimeRef = useRef(null as Date | null);

  const gridContentRef = useRef<HTMLDivElement | null>(null);

  const baseWidths = useMemo(
    () => buildBaseWidths(props.result),
    [props.result]
  );

  useEffect(() => {
    scrollRef.current = { left: 0, top: 0 };
    gridContentRef.current?.scrollTo(0, 0);
    setState((state2) => ({
      ...state2,
      active: undefined,
      selection: undefined,
    }));
  }, [props.result]);

  const hasRightScrollbar0 =
    rowHeight * props.result.rows.length + headerHeight + 1 > props.height;
  const hasBottomScrollbar =
    baseWidths.reduce((a, b) => a + b, 0) +
      (hasRightScrollbar0 ? scrollWidth : 0) +
      2 >
    props.width;
  const hasRightScrollbar =
    hasRightScrollbar0 ||
    rowHeight * props.result.rows.length +
      headerHeight +
      1 +
      (hasBottomScrollbar ? scrollWidth : 0) >
      props.height;
  const { widths: finalWidths, width: gridContentTableWidth } = useMemo(
    () =>
      buildFinalWidths(
        baseWidths,
        props.width - (hasRightScrollbar ? scrollWidth : 0) - 1
      ),
    [baseWidths, props.width, hasRightScrollbar]
  );

  useEffect(() => {
    if (state.active) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(
        el,
        finalWidths,
        state.active.colIndex,
        state.active.rowIndex,
        hasRightScrollbar,
        hasBottomScrollbar
      );
    }
  }, [finalWidths, state.active, hasRightScrollbar, hasBottomScrollbar]);

  useEffect(() => {
    if (state.selection && state.mouseDown) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(
        el,
        finalWidths,
        state.mouseDown.colIndex === state.selection.colIndex[0]
          ? state.selection.colIndex[1]
          : state.selection.colIndex[0],
        state.mouseDown.rowIndex === state.selection.rowIndex[0]
          ? state.selection.rowIndex[1]
          : state.selection.rowIndex[0],
        hasRightScrollbar,
        hasBottomScrollbar
      );
    }
  }, [
    finalWidths,
    state.mouseDown,
    state.selection,
    hasRightScrollbar,
    hasBottomScrollbar,
  ]);

  const gridContentMarginTop = `-${headerHeight}px`;
  assert(props.result.rows instanceof Array);
  const gridContentHeight = `${
    headerHeight + props.result.rows.length * rowHeight
  }px`;
  const gridContentTableTop = `${state.slice[0] * rowHeight}px`;

  const visibleRows = useMemo(
    () =>
      (props.result.rows as (string | number | null)[][]).filter(
        (_, i) => state.slice[0] <= i && i <= state.slice[1]
      ),
    [props.result.rows, state.slice]
  );

  const visibleStartingInEven = !!(state.slice[0] % 2);

  function getColIndex(x: number) {
    let left = 0;
    let indexCount = -1;
    for (const w of finalWidths) {
      if (x < left) return indexCount;
      left += w;
      indexCount += 1;
    }
    return finalWidths.length - 1;
  }
  useEffect(() => {
    if (state.active && activeElRef.current)
      activeUpdate({
        activeEl: activeElRef.current,
        finalWidths,
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
    finalWidths,
    props.height,
    props.width,
    hasBottomScrollbar,
    hasRightScrollbar,
  ]);

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
      activeUpdate({
        activeEl: activeElRef.current,
        finalWidths,
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
          container.offsetHeight / (rowHeight * 2)
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
      props.result.rows.length - 1
    );
    const colIndex = Math.min(
      Math.max(getColIndex(x), 0),
      props.result.fields.length - 1
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
      (rowIndex >= props.result.rows.length ||
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
      props.result.rows.length - 1
    );
    const colIndex = Math.min(
      Math.max(getColIndex(x), 0),
      props.result.fields.length - 1
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

  const onMouseDown = useEvent((e: React.MouseEvent<HTMLElement>) => {
    if (e.button === 1 || e.button === 2) return;
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
    if (rowIndex >= props.result.rows.length) {
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

  const onBlur = useEvent(() => {
    setState({
      ...state,
      mouseDown: undefined,
    });
  });

  function moveBy(x0: number, y0: number, selection: boolean) {
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
    } else if (state.active.rowIndex + y >= props.result.rows.length) {
      y = props.result.rows.length - state.active.rowIndex - 1;
    }
    if (x === 0 && y === 0) return;
    setState({
      ...state,
      selection: !selection
        ? undefined
        : !state.selection
        ? {
            colIndex: [
              Math.min(state.active.colIndex + x, state.active.colIndex),
              Math.max(state.active.colIndex + x, state.active.colIndex),
            ],
            rowIndex: [
              Math.min(state.active.rowIndex + y, state.active.rowIndex),
              Math.max(state.active.rowIndex + y, state.active.rowIndex),
            ],
          }
        : {
            colIndex: [
              Math.min(
                state.active.colIndex + x,
                state.selection.colIndex[0] === state.active.colIndex
                  ? state.selection.colIndex[1]
                  : state.selection.colIndex[0]
              ),
              Math.max(
                state.active.colIndex + x,
                state.selection.colIndex[0] === state.active.colIndex
                  ? state.selection.colIndex[1]
                  : state.selection.colIndex[0]
              ),
            ],
            rowIndex: [
              Math.min(
                state.active.rowIndex + y,
                state.selection.rowIndex[0] === state.active.rowIndex
                  ? state.selection.rowIndex[1]
                  : state.selection.rowIndex[0]
              ),
              Math.max(
                state.active.rowIndex + y,
                state.selection.rowIndex[0] === state.active.rowIndex
                  ? state.selection.rowIndex[1]
                  : state.selection.rowIndex[0]
              ),
            ],
          },
      active: {
        colIndex: state.active.colIndex + x,
        rowIndex: state.active.rowIndex + y,
      },
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

  const onKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (e.key === 'a' && e.ctrlKey) {
      setState({
        ...state,
        selection: {
          colIndex: [0, props.result.fields.length - 1],
          rowIndex: [0, props.result.rows.length - 1],
        },
      });
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
          0
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
      }
    }
  });

  return (
    <div
      style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute' }}
      tabIndex={0}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      ref={elRef}
    >
      <div className="grid-header-wrapper">
        <table
          className="grid-header"
          style={{
            width: gridContentTableWidth,
            zIndex: 3,
          }}
          ref={headerElRef}
        >
          <DataGridThead
            fields={props.result.fields}
            finalWidths={finalWidths}
          />
        </table>
      </div>
      {state.active ? (
        <DataGridActiveCell
          scrollLeft={scrollRef.current.top}
          scrollTop={scrollRef.current.left}
          containerHeight={props.height}
          containerWidth={props.width}
          finalWidths={finalWidths}
          active={state.active}
          hasBottomScrollbar={hasBottomScrollbar}
          hasRightScrollbar={hasRightScrollbar}
          value={
            props.result.rows[state.active.rowIndex][state.active.colIndex]
          }
          elRef={activeElRef}
        />
      ) : null}
      <div
        className="grid-content"
        onScroll={onScroll}
        ref={gridContentRef}
        style={{
          overflowX: hasBottomScrollbar ? 'scroll' : 'hidden',
          overflowY: hasRightScrollbar ? 'scroll' : 'hidden',
        }}
      >
        <div
          style={{
            marginTop: gridContentMarginTop,
            height: gridContentHeight,
            borderBottom: '1px solid #ddd',
          }}
        >
          <DataGridTable
            visibleStartingInEven={visibleStartingInEven}
            visibleRows={visibleRows}
            slice={state.slice}
            selection={state.selection}
            gridContentTableTop={gridContentTableTop}
            gridContentTableWidth={gridContentTableWidth}
            fields={props.result.fields}
            finalWidths={finalWidths}
          />
        </div>
      </div>
      {props.result.rows.length === 0 && props.emptyTable ? (
        <div className="empty-table">
          <div>{props.emptyTable}</div>
        </div>
      ) : null}
    </div>
  );
}
