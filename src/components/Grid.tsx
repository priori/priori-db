import * as React from "react";
import { Result } from "../db/Connection";

const letterSize = 6;

export interface GridProps {
  style: { [key: string]: string | number };
  result?: Result;
}
export interface GridCoreProps {
  style: { [key: string]: string | number };
  result: Result;
  width: number;
  height: number;
}

export interface GridState {
  widths: number[];
  slice: [number, number];
  selected?: { rowIndex: number; colIndex: number };
}
// export interface GridResult {
//   sizes: number[];
// }
function buildWidths(res: Result) {
  const fieldsSizes = res.fields.map((f, index) => {
    let max: number = f.name.length;
    res.rows.forEach(row => {
      const val = row[index],
        valString = getValString(val),
        length = valString.length;
      if (length > max) {
        max = length;
      }
    });
    return max;
  });
  return fieldsSizes.map(
    maxLength => (maxLength > 40 ? 40 : maxLength) * letterSize + 11
  );
}

function getValString(val: any) {
  return val === null
    ? "null"
    : val instanceof Date
      ? val.toLocaleString()
      : typeof val == "object" ? JSON.stringify(val) : val + "";
}

const // navWidth = 250,
  rowHeight = 23,
  scrollWidth = 10,
  headerHeight = 21,
  // medidos em tamanho de linha
  rowsByRender = 200,
  topRenderOffset = 50,
  allowedBottomDistance = 50,
  allowedTopDistance = 10;

function getType(val: any) {
  return val === null
    ? "null"
    : typeof val == "boolean" ||
      typeof val == "string" ||
      typeof val == "number"
      ? typeof val
      : val instanceof Date ? "date" : undefined;
}

function buildRoundedWidhts(initialWidths: number[], initialWidth: number) {
  const minWidth = initialWidths.reduce((a: number, b: number) => a + b, 1);
  const finalWidth = initialWidth > minWidth ? initialWidth : minWidth;
  const ratio = finalWidth / minWidth;
  const floatSizes = initialWidths.map((w: number) => w * ratio );
  const roundedSizes = floatSizes.map( w => Math.round(w) );
  const fields = initialWidths.map( (_,i) => i );
  const sortedByDiff = [...fields];
  sortedByDiff.sort( (aIndex,bIndex) => {
    const floatA = floatSizes[aIndex];
    const roundedA = roundedSizes[aIndex];
    const floatB = floatSizes[bIndex];
    const roundedB = roundedSizes[bIndex];
    return ( floatB - roundedB ) - ( floatA - roundedA );
  });
  const totalRounded = roundedSizes.reduce( (a, b) => a + b );
  const finalWidths = [...roundedSizes];
  if ( finalWidth > totalRounded ) {
    let temQueSomar = finalWidth - totalRounded;
    while ( temQueSomar > 0 ) {
      for ( const index of sortedByDiff ) {
        finalWidths[index]++;
        temQueSomar--;
        if ( temQueSomar == 0 )
          break;
      }
    }
  } else if ( finalWidth < totalRounded ) {
    let temQueSub = totalRounded - finalWidth;
    while ( temQueSub > 0 ) {
      for ( let c = sortedByDiff.length-1; c >= 0; c-- ) {
        const index = sortedByDiff[c];
        finalWidths[index]--;
        temQueSub--;
        if ( temQueSub == 0 )
          break;
      }
    }
  }
  return {
    widths: finalWidths,
    width: finalWidth
  }
}

interface SizeControlledAreaProps {
  render: (width:number,height:number) => React.ReactNode;
  style: { [key: string]: string | number };
  className?: string
}
class SizeControlledArea extends React.Component<SizeControlledAreaProps,{width:number,height:number}|{width:undefined,height:undefined}> {
  private el: HTMLDivElement;

  constructor(props:SizeControlledAreaProps) {
    super(props);
    this.state = {
      width: undefined,
      height: undefined
    };
    this.ref = this.ref.bind(this);
    this.resizeListener = this.resizeListener.bind(this);
    window.addEventListener("resize", this.resizeListener);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeListener);
  }

  private timeout2: any = null;
  private resizeListener() {
    if (this.timeout2) clearTimeout(this.timeout2);
    this.timeout2 = setTimeout(() => {
      if ( !this.el || !this.el.parentElement )
        return;
      this.setState({
        width: this.el.offsetWidth,
        height: this.el.offsetWidth
      })
    }, 250);
  }
  ref(el:HTMLDivElement|null){
    if (!el )return;
    this.el = el;
    this.setState({
      width: el.offsetWidth,
      height: el.offsetWidth
    })
  }
  render() {
    return <div style={this.props.style} className={this.props.className} ref={this.ref}>
      {
        typeof this.state.width !== "undefined" && typeof this.state.height !== "undefined" ?
            this.props.render(this.state.width, this.state.height)
            : null
      }
    </div>
  }
}

export function Grid(props:GridProps) {
  const res = props.result;
  if (res) {
    return <SizeControlledArea
        style={props.style}
        className="grid"
        render={(width: number, height: number) => <GridCore
            result={res}
            style={props.style}
            width={width}
            height={height}
        />}/>;
  }
  return <div className="grid" />;
}

function selectPos(widths:number[],colIndex:number,rowIndex:number,scrollTop:number,scrollLeft:number, containerWidth:number) {
  let fieldLeft = 0;
  for (const c in widths) {
    const w = widths[c];
    if (colIndex + "" == c) break;
    fieldLeft += w;
  }
  fieldLeft++;
  const top = headerHeight + rowIndex * rowHeight - scrollTop + 1;
  const selectedCellLeft = fieldLeft - (scrollLeft < 0 ? 0 : scrollLeft);
  const left = selectedCellLeft < 0 ? 0 : selectedCellLeft;
  const leftCrop = fieldLeft - scrollLeft < 0 ? -(fieldLeft - scrollLeft) : 0;
  const originalWidth = widths[colIndex] - 1 - leftCrop;
  const needToCropRight = originalWidth + left > containerWidth;
  const width = needToCropRight ? containerWidth - left : originalWidth;
  return {top,left,leftCrop,width};
}

export class GridCore extends React.Component<GridCoreProps, GridState> {

  constructor(props: GridCoreProps) {
    super(props);
    this.state = {
      widths: buildWidths(props.result),
      // width: window.innerWidth - navWidth - scrollWidth,
      slice: [0, rowsByRender]
    };
    this.setHeader = this.setHeader.bind(this);
    this.setEl = this.setEl.bind(this);
    this.clickListener = this.clickListener.bind(this);
    this.gridContentScrollListener = this.gridContentScrollListener.bind(this);
  }

  setEl( el: HTMLElement | null ){
    this.el = el;
  }

  componentWillReceiveProps(next: GridCoreProps) {
    if (next.result != this.props.result) {
      this.scrollLeft = this.scrollTop = 0;
      this.setState({
        ...this.state,
        widths: next.result ? buildWidths(next.result) : undefined,
        selected: undefined
      });
    }
  }

  private headerEl: HTMLElement | null = null;
  private setHeader(el: HTMLElement | null) {
    this.headerEl = el;
  }

  private scrollLeft = 0;
  private scrollTop = 0;
  private timeout: any = null;
  private gridContentScrollListener(e: React.UIEvent<HTMLDivElement>) {
    const container = e.target as HTMLElement;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;
    if (this.headerEl) {
      this.headerEl.style.marginLeft = "-" + container.scrollLeft + "px";
      if (container.scrollTop > 10) {
        this.headerEl.style.boxShadow = "rgba(0, 0, 0, 0.5) -3px 0px 10px";
      } else {
        this.headerEl.style.boxShadow = "";
      }
    }
    this.updateSelectPos();
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
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
        this.setState({
          ...this.state,
          slice: [start, start + rowsByRender]
        });
      }
    }, 1500);
  }

  private el: HTMLElement | null;
  private clickListener(e: React.MouseEvent<HTMLDivElement>) {
    const el = this.el as HTMLElement;
    const rect = el.getBoundingClientRect();
    let x = e.clientX - rect.left,
      y = e.clientY - rect.top - headerHeight;
    if (x < 0 || y < 0 || x > el.offsetWidth || y > el.offsetHeight) return;
    x += this.scrollLeft;
    y += this.scrollTop;
    const rowIndex = Math.floor(y / rowHeight),
      colIndex = this.getColIndex(x);
    if ( rowIndex >= this.props.result.rows.length || colIndex >= this.props.result.fields.length ||
      this.state.selected && this.state.selected.rowIndex === rowIndex && this.state.selected.colIndex === colIndex)
      return;
    this.setState({
      ...this.state,
      selected: { rowIndex, colIndex }
    });
  }

  private getColIndex(x: number) {
    const {widths} = buildRoundedWidhts( this.state.widths, this.props.width-1 );
    let left = 0,
      indexCount = -1;
    for (const w of widths) {
      if (x < left) return indexCount;
      left += w;
      indexCount++;
    }
    return widths.length - 1;
  }

  private updateSelectPos() {
    if (
      !this.state.selected ||
      !this.selectedEl
    )
      return;
    const {top,left,leftCrop,width} = selectPos ( buildRoundedWidhts( this.state.widths, this.props.width-1 ).widths,
        this.state.selected.colIndex, this.state.selected.rowIndex, this.scrollTop, this.scrollLeft, this.props.width );
    this.selectedEl.style.top = top + "px";
    this.selectedEl.style.left = left + "px";
    const wrapper2El = this.selectedEl.firstChild as HTMLDivElement;
    wrapper2El.style.marginLeft = "-" + leftCrop + "px";
    // wrapper2El.style.width = originalWidth + "px";
    this.selectedEl.style.width = width + "px";
    this.selectedEl.style.display = top < 0 || width < 0 ? "none" : "";
  }

  private selected(widths: number[]) {
    if ( !this.state.selected )
      return;
    const row = this.props.result.rows[this.state.selected.rowIndex];
    const val = row[this.state.selected.colIndex],
        type = getType(val),
        valString = getValString(val);
    const {top,left,leftCrop,width} = selectPos(widths,this.state.selected.colIndex,this.state.selected.rowIndex,
        this.scrollTop, this.scrollLeft, this.props.width - scrollWidth );
    const key = this.state.selected.rowIndex + "/" + this.state.selected.colIndex;
    const even = this.state.selected.rowIndex % 2;

    return (
      <div
        style={{
          position: "absolute",
          top,
          zIndex: 2,
          left,
          width,
          display: top < 0 || width < 0 ? "none" : ""
        }}
        key={key}
        ref={(el: HTMLDivElement) => {
          this.selectedEl = el;
          if (this.selectedEl) {
            this.selectedEl.classList.remove("active");
            setTimeout(() => {
              if (this.selectedEl) this.selectedEl.classList.add("active");
            }, 10);
          }
        }}
        className={
          "selected-cell-wrapper " +
          type +
          (even ? " even" : " odd")
        }
      >
        <div style={{ marginLeft: -leftCrop + "px", height: (rowHeight - 1)+"px" }} className="selected-cell-wrapper2">
          <div className="selected-cell">
          {valString && valString.length > 200
            ? valString.substr(0, 200) + "..."
            : valString}
          </div>
        </div>
      </div>
    );
  }

  private selectedEl: HTMLElement | null = null;

  render() {
    const {widths, width} = buildRoundedWidhts( this.state.widths, this.props.width-1 );
    const gridContentMarginTop = "-" + headerHeight + "px";
    const gridContentHeight = headerHeight + this.props.result.rows.length * rowHeight + "px";
    const gridContentTableTop = this.state.slice[0] * rowHeight + "px";
    const visibleRows = this.props.result.rows.filter( (_, i) =>
        (this.state.slice as number[])[0] <= i && i <= (this.state.slice as number[])[1] );
    const visibleStartingInEven = this.state.slice[0] % 2;
    const gridContentTableWidth = width;
    return (
      <div
        style={{ top: 0, left: 0, bottom: 0, right: 0, position: "absolute" }}
        onClick={this.clickListener}
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
              borderBottom: "1px solid #ddd"
            }}
          >
            <table
              className="content-table"
              style={{
                width: gridContentTableWidth,
                position: "relative",
                top: gridContentTableTop
              }}
            >
              <thead style={{ visibility: "hidden" }}>
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
                  <tr style={{ display: "none" }} />
                ) : (
                  null
                )}
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
                                  ? valString.substr(0, 200) + "..."
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