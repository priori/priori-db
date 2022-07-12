import React from 'react';
import { equals } from 'util/equals';
import {
  activePos,
  getType,
  getValString,
  rowHeight,
  scrollWidth,
} from './util';

interface UpdateActivePos {
  activeEl: HTMLDivElement;
  finalWidths: number[];
  active: { colIndex: number; rowIndex: number };
  scrollTop: number;
  scrollLeft: number;
  containerHeight: number;
  containerWidth: number;
  hasBottomScrollbar: boolean;
  hasRightScrollbar: boolean;
}
export function update({
  activeEl,
  finalWidths,
  active,
  scrollTop,
  scrollLeft,
  containerHeight,
  containerWidth,
  hasBottomScrollbar,
  hasRightScrollbar,
}: UpdateActivePos) {
  const { top, left, leftCrop, topCrop, wrapperWidth, wrapperHeight } =
    activePos(
      finalWidths,
      active.colIndex,
      active.rowIndex,
      scrollTop,
      scrollLeft,
      containerWidth,
      containerHeight,
      hasBottomScrollbar,
      hasRightScrollbar
    );
  activeEl.style.top = `${top}px`;
  activeEl.style.left = `${left}px`;
  const wrapper2El = activeEl.firstChild as HTMLDivElement;
  wrapper2El.style.marginLeft = `-${leftCrop}px`;
  activeEl.style.width = `${wrapperWidth + 4}px`;
  if (topCrop) {
    wrapper2El.style.marginTop = `-${topCrop}px`;
  } else if (wrapper2El.style.marginTop) {
    wrapper2El.style.marginTop = '';
  }
  if (wrapperHeight) {
    activeEl.style.height = `${wrapperHeight}px`;
  } else if (activeEl.style.height) {
    activeEl.style.height = '';
  }
  // activeEl.style.height = `${width + 4}px`;
  activeEl.style.display =
    wrapperHeight === 0 ||
    top < 0 ||
    wrapperWidth < 0 ||
    top > containerHeight - (hasBottomScrollbar ? scrollWidth : 0)
      ? 'none'
      : '';
}

interface DataGridActiveCellProps {
  active: {
    colIndex: number;
    rowIndex: number;
  };
  elRef: React.MutableRefObject<HTMLDivElement | null>;
  value: string | number | null | undefined;
  scrollTop: number;
  scrollLeft: number;
  containerWidth: number;
  containerHeight: number;
  finalWidths: number[];
  hasBottomScrollbar: boolean;
  hasRightScrollbar: boolean;
}
export const DataGridActiveCell = React.memo(
  ({
    active,
    elRef,
    value,
    scrollLeft,
    scrollTop,
    containerWidth,
    containerHeight,
    finalWidths,
    hasBottomScrollbar,
    hasRightScrollbar,
  }: DataGridActiveCellProps) => {
    const val = value;
    const type = getType(val);
    const valString = getValString(val);
    const { top, left, leftCrop, wrapperWidth } = activePos(
      finalWidths,
      active.colIndex,
      active.rowIndex,
      scrollLeft,
      scrollTop,
      containerWidth,
      containerHeight,
      hasBottomScrollbar,
      hasRightScrollbar
    );
    const key = `${active.rowIndex}/${active.colIndex}`;
    const even = active.rowIndex % 2;

    return (
      <div
        style={{
          position: 'absolute',
          top,
          left,
          width: wrapperWidth + 4,
          display: top < 0 || wrapperWidth < 0 ? 'none' : '',
        }}
        key={key}
        ref={elRef}
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
  },
  (prev, next) => equals(prev, next)
);