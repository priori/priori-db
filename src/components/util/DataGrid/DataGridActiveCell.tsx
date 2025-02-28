import React from 'react';
import { equals } from 'util/equals';
import { useEvent } from 'util/useEvent';
import {
  activeCellPos,
  getType,
  getValString,
  rowHeight,
  scrollWidth,
} from './util';

interface UpdateActivePos {
  activeCellEl: HTMLDivElement;
  finalWidths: number[];
  activeCell: { colIndex: number; rowIndex: number };
  scrollTop: number;
  scrollLeft: number;
  containerHeight: number;
  containerWidth: number;
  hasBottomScrollbar: boolean;
  hasRightScrollbar: boolean;
}
export function activeCellUpdate({
  activeCellEl,
  finalWidths,
  activeCell,
  scrollTop,
  scrollLeft,
  containerHeight,
  containerWidth,
  hasBottomScrollbar,
  hasRightScrollbar,
}: UpdateActivePos) {
  const { top, left, leftCrop, topCrop, wrapperWidth, wrapperHeight } =
    activeCellPos(
      finalWidths,
      activeCell.colIndex,
      activeCell.rowIndex,
      scrollTop,
      scrollLeft,
      containerWidth,
      containerHeight,
      hasBottomScrollbar,
      hasRightScrollbar,
    );
  activeCellEl.style.top = `${top}px`;
  activeCellEl.style.left = `${left}px`;
  const wrapper2El = activeCellEl.querySelector(
    '.grid__active-cell-wrapper>div>div',
  ) as HTMLDivElement;
  const strokeEl = activeCellEl.querySelector(
    '.grid__active-cell__stroke',
  ) as HTMLDivElement | null;
  wrapper2El.style.marginLeft = `-${leftCrop}px`;
  activeCellEl.style.width = `${wrapperWidth + 4}px`;
  if (topCrop) {
    wrapper2El.style.marginTop = `-${topCrop}px`;
    if (strokeEl) {
      strokeEl.style.marginTop = `-${topCrop}px`;
      if (topCrop > 10) strokeEl.style.display = 'none';
      else strokeEl.style.display = '';
    }
  } else if (wrapper2El.style.marginTop) {
    wrapper2El.style.marginTop = '';
    if (strokeEl) {
      strokeEl.style.marginTop = '';
      strokeEl.style.display = '';
    }
  }
  if (wrapperHeight) {
    activeCellEl.style.height = `${wrapperHeight}px`;
  } else if (activeCellEl.style.height) {
    activeCellEl.style.height = '';
  }
  activeCellEl.style.display =
    wrapperHeight === 0 ||
    top < 0 ||
    wrapperWidth < 0 ||
    top > containerHeight - (hasBottomScrollbar ? scrollWidth : 0)
      ? 'none'
      : '';
}

interface DataGridActiveCellProps {
  activeCell: {
    colIndex: number;
    rowIndex: number;
  };
  elRef: React.MutableRefObject<HTMLDivElement | null>;
  value: string | number | null | undefined;
  scrollTop: number;
  scrollLeft: number;
  containerWidth: number;
  containerHeight: number;
  colsWidths: number[];
  hasBottomScrollbar: boolean;
  hasRightScrollbar: boolean;
  onChange: (value: string | null) => void;
  editing: boolean | 1 | 2;
  changed: boolean;
  onBlur: () => void;
  field?: string;
  markedForRemoval?: boolean;
}
export const DataGridActiveCell = React.memo(
  ({
    activeCell,
    elRef,
    value,
    scrollLeft,
    scrollTop,
    containerWidth,
    containerHeight,
    colsWidths,
    hasBottomScrollbar,
    hasRightScrollbar,
    onChange,
    editing,
    changed,
    onBlur,
    field,
    markedForRemoval,
  }: DataGridActiveCellProps) => {
    const val = value;
    const type = getType(val, field);
    const valString = getValString(val);
    const { top, left, leftCrop, wrapperWidth } = activeCellPos(
      colsWidths,
      activeCell.colIndex,
      activeCell.rowIndex,
      scrollLeft,
      scrollTop,
      containerWidth,
      containerHeight,
      hasBottomScrollbar,
      hasRightScrollbar,
    );
    const key = `${activeCell.rowIndex}/${activeCell.colIndex}`;
    const even = activeCell.rowIndex % 2;
    const textareaRef = useEvent((el: HTMLTextAreaElement | null) => {
      if (el) {
        el.focus();
        if (editing === 2)
          el.setSelectionRange(el.value.length, el.value.length);
        else if (editing === true) {
          el.select();
        }
      }
    });
    const textareaOnChange = useEvent(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
      },
    );
    const textareaOnBlur = useEvent(() => {
      onBlur();
    });

    const onkeydown = useEvent(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (
          e.key === 'Escape' ||
          (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey)
        ) {
          if (e.target instanceof HTMLTextAreaElement) {
            const p = e.target?.closest('[tabindex]');
            if (p instanceof HTMLElement) p.focus();
          } else onBlur();
        } else if (
          (e.key === 'Delete' || e.key === 'Backspace') &&
          e.target instanceof HTMLTextAreaElement &&
          e.target.value === ''
        ) {
          onChange(null);
        }
      },
    );

    return (
      <div
        style={{
          position: 'absolute',
          top,
          left,
          pointerEvents: editing ? undefined : 'none',
          width: wrapperWidth + 4,
          display: top < 0 || wrapperWidth < 0 ? 'none' : '',
        }}
        key={key}
        ref={elRef}
        className={`grid__active-cell-wrapper ${even ? ' even' : ' odd'}${
          markedForRemoval ? ' grid__active-cell--marked-for-removal' : ''
        }`}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div
            style={{
              marginLeft: `${-leftCrop}px`,
              height: `${rowHeight - 1}px`,
            }}
            className={type}
          >
            {editing ? (
              <textarea
                onChange={textareaOnChange}
                onBlur={textareaOnBlur}
                onKeyDown={onkeydown}
                readOnly={!!markedForRemoval}
                ref={textareaRef}
                placeholder={val === null ? 'null' : undefined}
                className="grid__active-cell"
                defaultValue={val === null ? '' : valString}
              />
            ) : (
              <div className={`grid__active-cell${changed ? ' changed' : ''}`}>
                {valString && valString.length > 200
                  ? `${valString.substring(0, 200)}...`
                  : valString}
              </div>
            )}
          </div>
        </div>
        {markedForRemoval ? (
          <div className="grid__active-cell__stroke" />
        ) : null}
      </div>
    );
  },
  (prev, next) => equals(prev, next),
);
