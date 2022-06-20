import assert from 'assert';
import { QueryArrayResult } from 'pg';
import React, {
  CSSProperties,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import { useEventListener } from 'util/useEventListener';
import { SizeControlledArea } from './util/SizeControlledArea';

const letterSize = 6;

export interface GridProps {
  style: CSSProperties;
  result: QueryArrayResult | undefined;
  // eslint-disable-next-line react/require-default-props
  onScroll?: (() => void) | undefined;
}

export interface GridCoreProps {
  // style: CSSProperties;
  result: QueryArrayResult;
  width: number;
  // eslint-disable-next-line react/require-default-props
  onScroll?: (() => void) | undefined;
  // height: number;
}

export interface GridState {
  slice: [number, number];
  active?: { rowIndex: number; colIndex: number };
  selection?: { rowIndex: [number, number]; colIndex: [number, number] };
  mouseDown?: { rowIndex: number; colIndex: number };
}

function getValString(val: unknown) {
  return val === null
    ? 'null'
    : val instanceof Date
    ? val.toLocaleString()
    : typeof val === 'object'
    ? JSON.stringify(val)
    : `${val}`;
}

function buildBaseWidths(res: QueryArrayResult) {
  const fieldsSizes = res.fields.map((f, index) => {
    let max = f.name.length;
    for (const row of res.rows) {
      const val = row[index];
      const valString = getValString(val);
      const { length } = valString;
      if (length > max) {
        max = length;
      }
    }
    return max;
  });
  return fieldsSizes.map(
    (maxLength) => (maxLength > 40 ? 40 : maxLength) * letterSize + 11
  );
}
// const navWidth = 250,
const rowHeight = 23;
const scrollWidth = 10;
const headerHeight = 21;
// medidos em tamanho de linha
const rowsByRender = 200;
const topRenderOffset = 50;
const allowedBottomDistance = 50;
const allowedTopDistance = 10;

function getType(val: unknown) {
  return val === null
    ? 'null'
    : typeof val === 'boolean' ||
      typeof val === 'string' ||
      typeof val === 'number'
    ? typeof val
    : val instanceof Date
    ? 'date'
    : undefined;
}

function buildFinalWidths(initialColsWidths: number[], areaWidth: number) {
  if (initialColsWidths.length === 0) {
    return { finalWidths: [], widths: [] };
  }
  const minWidth = initialColsWidths.reduce((a: number, b: number) => a + b, 1);
  const finalWidth = areaWidth > minWidth ? areaWidth : minWidth;
  const ratio = finalWidth / minWidth;
  const floatSizes = initialColsWidths.map((w: number) => w * ratio);
  const roundedSizes = floatSizes.map((w) => Math.round(w));
  const fields = initialColsWidths.map((_, i) => i);
  const sortedByDiff = [...fields];
  sortedByDiff.sort((aIndex, bIndex) => {
    const floatA = floatSizes[aIndex];
    const roundedA = roundedSizes[aIndex];
    const floatB = floatSizes[bIndex];
    const roundedB = roundedSizes[bIndex];
    return floatB - roundedB - (floatA - roundedA);
  });
  const totalRounded = roundedSizes.reduce((a, b) => a + b);
  const finalWidths = [...roundedSizes];
  if (finalWidth > totalRounded) {
    let temQueSomar = finalWidth - totalRounded;
    while (temQueSomar > 0) {
      for (const index of sortedByDiff) {
        finalWidths[index] += 1;
        temQueSomar -= 1;
        if (temQueSomar === 0) break;
      }
    }
  } else if (finalWidth < totalRounded) {
    let temQueSub = totalRounded - finalWidth;
    while (temQueSub > 0) {
      for (let c = sortedByDiff.length - 1; c >= 0; c -= 1) {
        const index = sortedByDiff[c];
        finalWidths[index] -= 1;
        temQueSub -= 1;
        if (temQueSub === 0) break;
      }
    }
  }
  return {
    widths: finalWidths,
    width: finalWidth,
  };
}

function cellClassName(
  colIndex: number,
  rowIndex: number,
  selection:
    | {
        colIndex: [number, number];
        rowIndex: [number, number];
      }
    | undefined = undefined
): string | undefined {
  if (!selection) return undefined;
  if (
    selection.colIndex[0] <= colIndex &&
    colIndex <= selection.colIndex[1] &&
    selection.rowIndex[0] <= rowIndex &&
    rowIndex <= selection.rowIndex[1]
  ) {
    return `selected${
      (selection.rowIndex[0] === rowIndex ? ' selection-first-row' : '') +
      (selection.colIndex[1] === colIndex ? ' selection-last-col' : '')
    }`;
  }
  if (
    selection.colIndex[0] === colIndex + 1 &&
    selection.rowIndex[0] <= rowIndex &&
    rowIndex <= selection.rowIndex[1]
  ) {
    return 'selection-left';
  }
  if (
    selection.colIndex[0] <= colIndex &&
    colIndex <= selection.colIndex[1] &&
    selection.rowIndex[1] === rowIndex - 1
  ) {
    return 'selection-bottom';
  }
  return undefined;
}

function activePos(
  widths: number[],
  colIndex: number,
  rowIndex: number,
  scrollTop: number,
  scrollLeft: number,
  containerWidth: number
) {
  let fieldLeft = 0;
  for (const c in widths) {
    const w = widths[c];
    if (`${colIndex}` === c) break;
    fieldLeft += w;
  }
  fieldLeft += 1;
  const top = headerHeight + rowIndex * rowHeight - scrollTop + 1;
  const activeCellLeft = fieldLeft - (scrollLeft < 0 ? 0 : scrollLeft);
  const left = activeCellLeft < 0 ? 0 : activeCellLeft;
  const leftCrop = fieldLeft - scrollLeft < 0 ? -(fieldLeft - scrollLeft) : 0;
  const originalWidth = widths[colIndex] - 1 - leftCrop;
  const needToCropRight = originalWidth + left > containerWidth;
  const width = needToCropRight ? containerWidth - left : originalWidth;
  return { top, left, leftCrop, width };
}

function scrollTo(
  el: HTMLElement,
  widths: number[],
  colIndex: number,
  rowIndex: number
) {
  const y = rowIndex * rowHeight;
  const y2 = (rowIndex + 1) * rowHeight;
  let fieldLeft = 0;
  for (const c in widths) {
    const w = widths[c];
    if (`${colIndex}` === c) break;
    fieldLeft += w;
  }
  const x = fieldLeft;
  const x2 = x + widths[colIndex] + 1;
  let { scrollTop } = el;
  let { scrollLeft } = el;
  if (scrollTop < y2 - el.offsetHeight + scrollWidth)
    scrollTop = y2 - el.offsetHeight + scrollWidth;
  else if (scrollTop > y) scrollTop = y;
  if (x < scrollLeft) scrollLeft = x;
  else if (x2 + scrollWidth > scrollLeft + el.offsetWidth)
    scrollLeft = x2 - el.offsetWidth + scrollWidth;
  if (el.scrollTop !== scrollTop || el.scrollLeft !== scrollLeft) {
    el.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'auto' });
  }
}

export function GridCore(props: GridCoreProps) {
  const [state, setState] = useState({
    slice: [0, rowsByRender],
  } as GridState);

  const headerElRef = useRef(null as HTMLTableElement | null);

  const scrollRef = useRef({ left: 0, top: 0 });

  const timeoutRef = useRef(null as ReturnType<typeof setTimeout> | null);

  const elRef = useRef(null as HTMLDivElement | null);

  const activeElRef = useRef(null as HTMLElement | null);

  const lastScrollTimeRef = useRef(null as Date | null);

  const gridContentRef = useRef<HTMLDivElement | null>(null);

  const baseWidths = useMemo(
    () => buildBaseWidths(props.result),
    [props.result]
  );

  useEffect(() => {
    scrollRef.current = { left: 0, top: 0 };
    setState((state2) => ({
      ...state2,
      active: undefined,
    }));
  }, [props.result]);

  const { widths: finalWidths, width: gridContentTableWidth } = useMemo(
    () => buildFinalWidths(baseWidths, props.width - scrollWidth - 1),
    [baseWidths, props.width]
  );

  useEffect(() => {
    if (state.active) {
      const el = gridContentRef.current;
      assert(el);
      scrollTo(el, finalWidths, state.active.colIndex, state.active.rowIndex);
    }
  }, [finalWidths, state.active]);

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
          : state.selection.rowIndex[0]
      );
    }
  }, [finalWidths, state.mouseDown, state.selection]);

  const gridContentMarginTop = `-${headerHeight}px`;
  assert(props.result.rows instanceof Array);
  const gridContentHeight = `${
    headerHeight + props.result.rows.length * rowHeight
  }px`;
  const gridContentTableTop = `${state.slice[0] * rowHeight}px`;

  const visibleRows = useMemo(
    () =>
      props.result.rows.filter(
        (_, i) =>
          (state.slice as number[])[0] <= i && i <= (state.slice as number[])[1]
      ),
    [props.result.rows, state.slice]
  );

  const visibleStartingInEven = state.slice[0] % 2;

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

  function updateActivePos() {
    if (!state.active || !activeElRef.current) return;
    const { top, left, leftCrop, width } = activePos(
      finalWidths,
      state.active.colIndex,
      state.active.rowIndex,
      scrollRef.current.top,
      scrollRef.current.left,
      props.width
    );
    const activeEl = activeElRef.current;
    activeEl.style.top = `${top}px`;
    activeEl.style.left = `${left}px`;
    const wrapper2El = activeEl.firstChild as HTMLDivElement;
    wrapper2El.style.marginLeft = `-${leftCrop}px`;
    activeEl.style.width = `${width}px`;
    activeEl.style.display = top < 0 || width < 0 ? 'none' : '';
  }

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
      if (container.scrollTop > 10) {
        headerEl.style.boxShadow = 'rgba(0, 0, 0, 0.5) -3px 0px 10px';
      } else {
        headerEl.style.boxShadow = '';
      }
    }
    updateActivePos();
    const fn = () => {
      lastScrollTimeRef.current = null;
      const currentIndex = Math.floor(container.scrollTop / rowHeight);
      if (
        (state.slice as number[])[0] - currentIndex < allowedTopDistance ||
        currentIndex - (state.slice as number[])[1] < allowedBottomDistance
      ) {
        const start =
          currentIndex > topRenderOffset
            ? currentIndex - topRenderOffset
            : currentIndex;
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
      now.getTime() - lastScrollTimeRef.current.getTime() > 200
    ) {
      fn();
    } else {
      if (!lastScrollTimeRef.current) lastScrollTimeRef.current = now;
      timeoutRef.current = setTimeout(fn, 200);
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
        active: undefined,
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
    }));
  });

  const onMouseDown = useEvent((e: React.MouseEvent<HTMLElement>) => {
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    if (
      x < 0 ||
      y < 0 ||
      x > el.offsetWidth - scrollWidth ||
      y > el.offsetHeight - scrollWidth - headerHeight
    ) {
      if (state.active) {
        setState((state2) => ({ ...state2, active: undefined }));
      }
      return;
    }
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.floor(y / rowHeight);
    if (rowIndex >= props.result.rows.length) {
      if (state.active) {
        setState((state2) => ({ ...state2, active: undefined }));
      }
      return;
    }
    const colIndex = getColIndex(x);
    // if shift is pressed, select a range
    setState((state2) => ({
      ...state2,
      mouseDown: { rowIndex, colIndex },
      active: undefined,
      selection: undefined,
    }));
  });

  function activeRender(widths: number[]): JSX.Element {
    if (!state.active) return <></>;
    const row = props.result.rows[state.active.rowIndex];
    const val = row[state.active.colIndex];
    const type = getType(val);
    const valString = getValString(val);
    const { top, left, leftCrop, width } = activePos(
      widths,
      state.active.colIndex,
      state.active.rowIndex,
      scrollRef.current.top,
      scrollRef.current.left,
      props.width - scrollWidth
    );
    const key = `${state.active.rowIndex}/${state.active.colIndex}`;
    const even = state.active.rowIndex % 2;

    return (
      <div
        style={{
          position: 'absolute',
          top,
          zIndex: 2,
          left,
          width,
          display: top < 0 || width < 0 ? 'none' : '',
        }}
        key={key}
        ref={(el: HTMLDivElement) => {
          activeElRef.current = el;
        }}
        className={`active active-cell-wrapper ${even ? ' even' : ' odd'}`}
      >
        <div
          style={{ marginLeft: `${-leftCrop}px`, height: `${rowHeight - 1}px` }}
          className={`active-cell-wrapper2 ${type}`}
        >
          <div className="active-cell">
            {valString && valString.length > 200
              ? `${valString.substring(0, 200)}...`
              : valString}
          </div>
        </div>
      </div>
    );
  }

  const onBlur = useEvent(() => {
    setState({ ...state, active: undefined, mouseDown: undefined });
  });

  const onKeyDown = useEvent((e: React.KeyboardEvent) => {
    if (state.active) {
      if (e.key === 'Escape') {
        if (elRef.current) elRef.current.blur();
      } else if (e.key === 'ArrowDown') {
        if (state.active.rowIndex < props.result.rows.length - 1) {
          // if shift is pressed, select a range
          setState({
            ...state,
            active: {
              rowIndex: state.active.rowIndex + 1,
              colIndex: state.active.colIndex,
            },
          });
        }
      } else if (e.key === 'ArrowUp') {
        if (state.active.rowIndex > 0) {
          // if shift is pressed, select a range
          setState({
            ...state,
            active: {
              rowIndex: state.active.rowIndex - 1,
              colIndex: state.active.colIndex,
            },
          });
        }
      } else if (e.key === 'ArrowLeft') {
        if (state.active.colIndex > 0) {
          // if shift is pressed, select a range
          setState({
            ...state,
            active: {
              rowIndex: state.active.rowIndex,
              colIndex: state.active.colIndex - 1,
            },
          });
        }
      } else if (e.key === 'ArrowRight') {
        if (state.active.colIndex < props.result.fields.length - 1) {
          // if shift is pressed, select a range
          setState({
            ...state,
            active: {
              rowIndex: state.active.rowIndex,
              colIndex: state.active.colIndex + 1,
            },
          });
        }
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
          style={{ width: gridContentTableWidth, zIndex: 3 }}
          ref={headerElRef}
        >
          <thead>
            <tr>
              {props.result.fields.map((f, index) => (
                <th key={index} style={{ width: finalWidths[index] }}>
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      {activeRender(finalWidths)}
      <div className="grid-content" onScroll={onScroll} ref={gridContentRef}>
        <div
          style={{
            marginTop: gridContentMarginTop,
            height: gridContentHeight,
            borderBottom: '1px solid #ddd',
          }}
        >
          <table
            className="content-table"
            style={{
              width: gridContentTableWidth,
              position: 'relative',
              top: gridContentTableTop,
            }}
          >
            <thead style={{ visibility: 'hidden' }}>
              <tr>
                {props.result.fields.map((f, index) => (
                  <th key={index} style={{ width: finalWidths[index] }}>
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleStartingInEven ? (
                <tr style={{ display: 'none' }} />
              ) : null}
              {visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {props.result.fields.map((_, index) => {
                    const val = row[index];
                    const type = getType(val);
                    const valString = getValString(val);
                    const className = cellClassName(
                      index,
                      state.slice[0] + rowIndex,
                      state.selection
                    );
                    return (
                      <td key={index} className={className}>
                        <div className={type}>
                          <div className="cell">
                            {valString && valString.length > 200
                              ? `${valString.substring(0, 200)}...`
                              : valString}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const Grid = memo(
  (props: GridProps) => {
    const res = props.result;
    if (res) {
      return (
        <SizeControlledArea
          style={props.style}
          className="grid"
          render={(width: number) => (
            <GridCore result={res} width={width} onScroll={props.onScroll} />
          )}
        />
      );
    }
    return <div className="grid" />;
  },
  (a, b) =>
    a.result === b.result &&
    equals(a.style, b.style) &&
    a.onScroll === b.onScroll
);
