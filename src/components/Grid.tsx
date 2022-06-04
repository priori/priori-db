/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { Result } from '../db/util';

const letterSize = 6;

export interface GridProps {
  style: CSSProperties;
  result: Result | undefined;
}
export interface GridCoreProps {
  // style: CSSProperties;
  result: Result;
  width: number;
  // height: number;
}

export interface GridState {
  widths: number[];
  slice: [number, number];
  selected?: { rowIndex: number; colIndex: number };
}
// export interface GridResult {
//   sizes: number[];
// }

function getValString(val: unknown) {
  return val === null
    ? 'null'
    : val instanceof Date
    ? val.toLocaleString()
    : typeof val === 'object'
    ? JSON.stringify(val)
    : `${val}`;
}

function buildWidths(res: Result) {
  const fieldsSizes = res.fields.map((f) => {
    const max = f.name.length;
    // res.rows.forEach((row) => {
    //   const val = row[index];
    //   const valString = getValString(val);
    //   const th = valString.length;
    //   if (length > max) {
    //     max = length;
    //   }
    // });
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

function buildRoundedWidhts(initialWidths: number[], initialWidth: number) {
  const minWidth = initialWidths.reduce((a: number, b: number) => a + b, 1);
  const finalWidth = initialWidth > minWidth ? initialWidth : minWidth;
  const ratio = finalWidth / minWidth;
  const floatSizes = initialWidths.map((w: number) => w * ratio);
  const roundedSizes = floatSizes.map((w) => Math.round(w));
  const fields = initialWidths.map((_, i) => i);
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

export class GridCore extends Component<GridCoreProps, GridState> {
  private headerEl: HTMLElement | null = null;

  private scrollLeft = 0;

  private scrollTop = 0;

  private timeout: ReturnType<typeof setTimeout> | null = null;

  private el: HTMLElement | null = null;

  private selectedEl: HTMLElement | null = null;

  private lastScrollTime: Date | null = null;

  constructor(props: GridCoreProps) {
    super(props);
    this.state = {
      widths: buildWidths(props.result),
      // width: window.innerWidth - navWidth - scrollWidth,
      slice: [0, rowsByRender],
    };
    this.setHeader = this.setHeader.bind(this);
    this.setEl = this.setEl.bind(this);
    this.clickListener = this.clickListener.bind(this);
    this.gridContentScrollListener = this.gridContentScrollListener.bind(this);
  }

  UNSAFE_componentWillReceiveProps(next: GridCoreProps) {
    if (next.result !== this.props.result) {
      this.scrollTop = 0;
      this.scrollLeft = 0;
      this.setState((state) => ({
        ...state,
        widths: next.result ? buildWidths(next.result) : [],
        selected: undefined,
      }));
    }
  }

  setEl(el: HTMLElement | null) {
    this.el = el;
  }

  private setHeader(el: HTMLElement | null) {
    this.headerEl = el;
  }

  private getColIndex(x: number) {
    const { widths } = buildRoundedWidhts(
      this.state.widths,
      this.props.width - 1
    );
    let left = 0;
    let indexCount = -1;
    for (const w of widths) {
      if (x < left) return indexCount;
      left += w;
      indexCount += 1;
    }
    return widths.length - 1;
  }

  private gridContentScrollListener(e: React.UIEvent<HTMLElement>) {
    const container = e.target as HTMLElement;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;
    if (this.headerEl) {
      this.headerEl.style.marginLeft = `-${container.scrollLeft}px`;
      if (container.scrollTop > 10) {
        this.headerEl.style.boxShadow = 'rgba(0, 0, 0, 0.5) -3px 0px 10px';
      } else {
        this.headerEl.style.boxShadow = '';
      }
    }
    this.updateSelectPos();
    const fn = () => {
      this.lastScrollTime = null;
      // relative to top. to render by the center use scrollTop + container.offsetHeight / 2
      const currentIndex = Math.floor(container.scrollTop / rowHeight);
      if (
        (this.state.slice as number[])[0] - currentIndex < allowedTopDistance ||
        currentIndex - (this.state.slice as number[])[1] < allowedBottomDistance
      ) {
        const start =
          currentIndex > topRenderOffset
            ? currentIndex - topRenderOffset
            : currentIndex;
        this.setState((state) => ({
          ...state,
          slice: [start, start + rowsByRender],
        }));
      }
    };
    if (this.timeout) clearTimeout(this.timeout);
    const now = new Date();
    if (
      this.lastScrollTime &&
      now.getTime() - this.lastScrollTime.getTime() > 200
    ) {
      fn();
    } else {
      if (!this.lastScrollTime) this.lastScrollTime = now;
      this.timeout = setTimeout(fn, 200);
    }
  }

  private clickListener(e: React.MouseEvent<HTMLElement>) {
    const el = this.el as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top - headerHeight;
    if (x < 0 || y < 0 || x > el.offsetWidth || y > el.offsetHeight) return;
    x += this.scrollLeft;
    y += this.scrollTop;
    const rowIndex = Math.floor(y / rowHeight);
    const colIndex = this.getColIndex(x);
    if (
      rowIndex >= this.props.result.rows.length ||
      colIndex >= this.props.result.fields.length ||
      (this.state.selected &&
        this.state.selected.rowIndex === rowIndex &&
        this.state.selected.colIndex === colIndex)
    )
      return;
    this.setState((state) => ({
      ...state,
      selected: { rowIndex, colIndex },
    }));
  }

  private updateSelectPos() {
    if (!this.state.selected || !this.selectedEl) return;
    const { top, left, leftCrop, width } = selectPos(
      buildRoundedWidhts(this.state.widths, this.props.width - 1).widths,
      this.state.selected.colIndex,
      this.state.selected.rowIndex,
      this.scrollTop,
      this.scrollLeft,
      this.props.width
    );
    this.selectedEl.style.top = `${top}px`;
    this.selectedEl.style.left = `${left}px`;
    const wrapper2El = this.selectedEl.firstChild as HTMLDivElement;
    wrapper2El.style.marginLeft = `-${leftCrop}px`;
    // wrapper2El.style.width = originalWidth + "px";
    this.selectedEl.style.width = `${width}px`;
    this.selectedEl.style.display = top < 0 || width < 0 ? 'none' : '';
  }

  private selected(widths: number[]): JSX.Element {
    if (!this.state.selected) return <></>;
    const row = this.props.result.rows[this.state.selected.rowIndex];
    const val = row[this.state.selected.colIndex];
    const type = getType(val);
    const valString = getValString(val);
    const { top, left, leftCrop, width } = selectPos(
      widths,
      this.state.selected.colIndex,
      this.state.selected.rowIndex,
      this.scrollTop,
      this.scrollLeft,
      this.props.width - scrollWidth
    );
    const key = `${this.state.selected.rowIndex}/${this.state.selected.colIndex}`;
    const even = this.state.selected.rowIndex % 2;

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
          this.selectedEl = el;
          if (this.selectedEl) {
            this.selectedEl.classList.remove('active');
            setTimeout(() => {
              if (this.selectedEl) this.selectedEl.classList.add('active');
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

  render() {
    const { widths, width } = buildRoundedWidhts(
      this.state.widths,
      this.props.width - 1
    );
    const gridContentMarginTop = `-${headerHeight}px`;
    const gridContentHeight = `${
      headerHeight + this.props.result.rows.length * rowHeight
    }px`;
    const gridContentTableTop = `${this.state.slice[0] * rowHeight}px`;
    const visibleRows = this.props.result.rows.filter(
      (_, i) =>
        (this.state.slice as number[])[0] <= i &&
        i <= (this.state.slice as number[])[1]
    );
    const visibleStartingInEven = this.state.slice[0] % 2;
    const gridContentTableWidth = width;
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute' }}
        onClick={this.clickListener}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        // onBlur={() => {
        // this.setState({selected:undefined});
        // }}
        ref={this.setEl}
      >
        <div className="grid-header-wrapper">
          <table
            className="grid-header"
            style={{ width: gridContentTableWidth, zIndex: 3 }}
            ref={this.setHeader}
          >
            <thead>
              <tr>
                {this.props.result.fields.map((f, index) => (
                  <th key={index} style={{ width: widths[index] }}>
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        {this.selected(widths)}
        <div className="grid-content" onScroll={this.gridContentScrollListener}>
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
                  {this.props.result.fields.map((f, index) => (
                    <th key={index} style={{ width: widths[index] }}>
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
                    {this.props.result.fields.map((_, index) => {
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
}

interface SizeControlledAreaProps {
  render: (width: number, height: number) => ReactNode;
  style: CSSProperties;
  className: string | undefined;
}
class SizeControlledArea extends Component<
  SizeControlledAreaProps,
  { width: number; height: number } | { width: undefined; height: undefined }
> {
  private el: HTMLDivElement | null = null;

  private timeout2: ReturnType<typeof setTimeout> | null = null;

  constructor(props: SizeControlledAreaProps) {
    super(props);
    this.state = {
      width: undefined,
      height: undefined,
    };
    this.ref = this.ref.bind(this);
    this.resizeListener = this.resizeListener.bind(this);
    window.addEventListener('resize', this.resizeListener);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener);
  }

  private resizeListener() {
    if (this.timeout2) clearTimeout(this.timeout2);
    this.timeout2 = setTimeout(() => {
      if (!this.el || !this.el.parentElement) return;
      this.setState({
        width: this.el.offsetWidth,
        height: this.el.offsetWidth,
      });
    }, 250);
  }

  ref(el: HTMLDivElement | null) {
    if (!el) return;
    this.el = el;
    this.setState({
      width: el.offsetWidth,
      height: el.offsetWidth,
    });
  }

  render() {
    return (
      <div
        style={this.props.style}
        className={this.props.className}
        ref={this.ref}
      >
        {typeof this.state.width !== 'undefined' &&
        typeof this.state.height !== 'undefined'
          ? this.props.render(this.state.width, this.state.height)
          : null}
      </div>
    );
  }
}

export function Grid(props: GridProps) {
  const res = props.result;
  if (res) {
    return (
      <SizeControlledArea
        style={props.style}
        className="grid"
        render={(width: number /* , height: number */) => (
          <GridCore
            result={res}
            /* style={props.style} */
            width={width}
            /* height={height} */
          />
        )}
      />
    );
  }
  return <div className="grid" />;
}
