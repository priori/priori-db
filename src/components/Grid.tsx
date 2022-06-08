/* eslint-disable jsx-a11y/click-events-have-key-events */
import { assert } from 'console';
import { QueryArrayResult } from 'pg';
import React, {
  CSSProperties,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { equals } from './util/equals';
import { SizeControlledArea } from './util/SizeControlledArea';

const letterSize = 6;

export interface GridProps {
  style: CSSProperties;
  result: QueryArrayResult | undefined;
}
export interface GridCoreProps {
  // style: CSSProperties;
  result: QueryArrayResult;
  width: number;
  // height: number;
}

export interface GridState {
  slice: [number, number];
  selected?: { rowIndex: number; colIndex: number };
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

function selectPos(
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
  const selectedCellLeft = fieldLeft - (scrollLeft < 0 ? 0 : scrollLeft);
  const left = selectedCellLeft < 0 ? 0 : selectedCellLeft;
  const leftCrop = fieldLeft - scrollLeft < 0 ? -(fieldLeft - scrollLeft) : 0;
  const originalWidth = widths[colIndex] - 1 - leftCrop;
  const needToCropRight = originalWidth + left > containerWidth;
  const width = needToCropRight ? containerWidth - left : originalWidth;
  return { top, left, leftCrop, width };
}

export function GridCore(props: GridCoreProps) {
  const [state, setState] = useState({
    slice: [0, rowsByRender],
  } as GridState);

  const baseWidths = useMemo(
    () => buildBaseWidths(props.result),
    [props.result]
  );

  const headerElRef = useRef(null as HTMLTableElement | null);

  const scrollRef = useRef({ left: 0, top: 0 });

  const timeoutRef = useRef(null as ReturnType<typeof setTimeout> | null);

  const elRef = useRef(null as HTMLDivElement | null);

  const selectedElRef = useRef(null as HTMLElement | null);

  const lastScrollTimeRef = useRef(null as Date | null);

  useEffect(() => {
    scrollRef.current = { left: 0, top: 0 };
    setState((state2) => ({
      ...state2,
      selected: undefined,
    }));
  }, [props.result]);

  const { widths: finalWidths, width: gridContentTableWidth } = useMemo(
    () => buildFinalWidths(baseWidths, props.width - 1),
    [baseWidths, props.width]
  );
  const gridContentMarginTop = `-${headerHeight}px`;
  assert(props.result.rows instanceof Array);
  const gridContentHeight = `${
    headerHeight + props.result.rows.length * rowHeight
  }px`;
  const gridContentTableTop = `${state.slice[0] * rowHeight}px`;
  const visibleRows = props.result.rows.filter(
    (_, i) =>
      (state.slice as number[])[0] <= i && i <= (state.slice as number[])[1]
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

  function updateSelectPos() {
    if (!state.selected || !selectedElRef.current) return;
    const { top, left, leftCrop, width } = selectPos(
      finalWidths,
      state.selected.colIndex,
      state.selected.rowIndex,
      scrollRef.current.top,
      scrollRef.current.left,
      props.width
    );
    const selectedEl = selectedElRef.current;
    selectedEl.style.top = `${top}px`;
    selectedEl.style.left = `${left}px`;
    const wrapper2El = selectedEl.firstChild as HTMLDivElement;
    wrapper2El.style.marginLeft = `-${leftCrop}px`;
    selectedEl.style.width = `${width}px`;
    selectedEl.style.display = top < 0 || width < 0 ? 'none' : '';
  }

  function gridContentScrollListener(e: React.UIEvent<HTMLElement>) {
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
    updateSelectPos();
    const fn = () => {
      lastScrollTimeRef.current = null;
      // relative to top. to render by the center use scrollTop + container.offsetHeight / 2
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
  }

  function clickListener(e: React.MouseEvent<HTMLElement>) {
    const el = elRef.current as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    if (x < 0 || y < 0 || x > el.offsetWidth || y > el.offsetHeight) return;
    x += scrollRef.current.left;
    y += scrollRef.current.top;
    const rowIndex = Math.floor(y / rowHeight);
    const colIndex = getColIndex(x);
    if (
      rowIndex >= props.result.rows.length ||
      colIndex >= props.result.fields.length ||
      (state.selected &&
        state.selected.rowIndex === rowIndex &&
        state.selected.colIndex === colIndex)
    )
      return;
    setState((state2) => ({
      ...state2,
      selected: { rowIndex, colIndex },
    }));
  }

  function selectedRender(widths: number[]): JSX.Element {
    if (!state.selected) return <></>;
    const row = props.result.rows[state.selected.rowIndex];
    const val = row[state.selected.colIndex];
    const type = getType(val);
    const valString = getValString(val);
    const { top, left, leftCrop, width } = selectPos(
      widths,
      state.selected.colIndex,
      state.selected.rowIndex,
      scrollRef.current.top,
      scrollRef.current.left,
      props.width - scrollWidth
    );
    const key = `${state.selected.rowIndex}/${state.selected.colIndex}`;
    const even = state.selected.rowIndex % 2;

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
          selectedElRef.current = el;
          if (el) {
            el.classList.remove('active');
            setTimeout(() => {
              if (selectedElRef.current)
                selectedElRef.current.classList.add('active');
            }, 10);
          }
        }}
        className={`selected-cell-wrapper ${type}${even ? ' even' : ' odd'}`}
      >
        <div
          style={{ marginLeft: `${-leftCrop}px`, height: `${rowHeight - 1}px` }}
          className="selected-cell-wrapper2"
        >
          <div className="selected-cell">
            {valString && valString.length > 200
              ? `${valString.substring(0, 200)}...`
              : valString}
          </div>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute' }}
      onClick={clickListener}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      // onBlur={() => {
      // this.setState({selected:undefined});
      // }}
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
      {selectedRender(finalWidths)}
      <div className="grid-content" onScroll={gridContentScrollListener}>
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
                    return (
                      <td key={index}>
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
          render={(width: number) => <GridCore result={res} width={width} />}
        />
      );
    }
    return <div className="grid" />;
  },
  (a, b) => a.result === b.result && equals(a.style, b.style)
);
