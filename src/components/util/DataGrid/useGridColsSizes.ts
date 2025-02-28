import { useMemo, useState } from 'react';
import { useEvent } from 'util/useEvent';
import { horizontalResize } from 'util/resize';
import { assert } from 'util/assert';
import { equals } from 'util/equals';
import { QueryResultDataField } from 'db/db';
import {
  getValString,
  headerHeight,
  letterSize,
  rowHeight,
  scrollWidth,
} from './util';
import { buildStyle } from './DataGridSelection';

type ResizeState = {
  widths: number[];
  touched: string[];
  fields: string[];
};

function buildFinalWidths(
  initialColsWidths: number[],
  areaWidth: number, // available width subtracting scrollbars
  state?: ResizeState,
) {
  if (state) {
    const withSum = state.widths.reduce((a: number, b: number) => a + b, 0) + 1;
    if (withSum < areaWidth) {
      return state.widths.map((w, i) =>
        i === state.widths.length - 1 ? w + areaWidth - withSum : w,
      );
    }
    return state.widths;
  }
  if (initialColsWidths.length === 0) {
    return [];
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
  return finalWidths;
}

export function useGridColsSizes({
  result,
  extraRows,
  width,
  extraBottomSpace,
  height,
  elRef,
  activeCellUpdate,
  selection,
}: {
  result: {
    rows: any[];
    fields: QueryResultDataField[];
  };
  extraRows: number;
  width: number;
  height: number;
  extraBottomSpace: number;
  elRef: React.MutableRefObject<HTMLDivElement | null>;
  selection?: {
    rowIndex: [number, number];
    colIndex: [number, number];
  };
  activeCellUpdate: (
    widths: number[],
    hasBottomScrollbar: boolean,
    hasRightScrollbar: boolean,
  ) => void;
}) {
  const baseWidths = useMemo(() => {
    const fieldsSizes = result.fields.map((f, index) => {
      let max = f.name.length;
      for (const row of result.rows) {
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
      (maxLength) => (maxLength > 40 ? 40 : maxLength) * letterSize + 11,
    );
  }, [result]);

  const baseWidthsSum = useMemo(
    () => baseWidths.reduce((a, b) => a + b, 0),
    [baseWidths],
  );

  const [state0, setState] = useState<ResizeState>();

  const state = useMemo(() => {
    if (!state0) return state0;
    if (
      equals(
        state0.fields,
        result.fields.map((f) => f.name),
      )
    ) {
      return state0;
    }
    return undefined;
  }, [state0, result.fields]);

  const stateColsWidthsSum = state?.widths.reduce((a, b) => a + b, 0) ?? 0;

  const hasRightScrollbar0 =
    rowHeight * (result.rows.length + extraRows) +
      headerHeight +
      1 +
      extraBottomSpace >
    height;

  const hasBottomScrollbar =
    stateColsWidthsSum + 1 > width ||
    baseWidthsSum + (hasRightScrollbar0 ? scrollWidth : 0) + 2 > width;

  const hasRightScrollbar =
    hasRightScrollbar0 ||
    rowHeight * result.rows.length +
      headerHeight +
      1 +
      (hasBottomScrollbar ? scrollWidth : 0) >
      height;

  const colsWidths = useMemo(
    () =>
      buildFinalWidths(
        baseWidths,
        width - (hasRightScrollbar ? scrollWidth : 0) - 1,
        state,
      ),
    [baseWidths, width, hasRightScrollbar, state],
  );

  const onStartResize = useEvent(async (index: number, e: React.MouseEvent) => {
    const rootEl = elRef.current as HTMLElement | null;
    assert(rootEl, `elRef.current is null`);
    const headerTableEl = rootEl.querySelector(
      'table.grid__header',
    ) as HTMLElement | null;
    const contentTableEl = rootEl.querySelector(
      '.grid__content table',
    ) as HTMLElement | null;
    const tableWrapperEl = rootEl.querySelector(
      '.grid__table-wrapper',
    ) as HTMLElement | null;
    const selectionEl = rootEl.querySelector(
      '.grid__content .grid__selection',
    ) as HTMLElement | null;
    assert(headerTableEl, `table.grid__header is null`);
    assert(contentTableEl, `.grid__content table is null`);
    assert(tableWrapperEl, `.grid__content is null`);
    const ths1 = Array.from(
      rootEl.querySelectorAll('.grid__header th'),
    ) as HTMLElement[];
    const ths2 = Array.from(
      rootEl.querySelectorAll('.grid__content table thead th'),
    ) as HTMLElement[];
    assert(ths1.length === ths2.length, `ths1.length !== ths2.length`);
    assert(ths2.length === colsWidths.length, `ths.length !== widths.length`);
    const initialPos = colsWidths
      .filter((_, i) => i < index)
      .reduce((a, b) => a + b, 0);
    const inc = await horizontalResize(
      e,
      (inc2) => {
        const colWidth = colsWidths[index - 1] + inc2;
        if (colWidth < 18) return false;
        const widthSum =
          colsWidths.reduce((a: number, b: number) => a + b, 0) + inc2 + 1;
        headerTableEl.style.width = `${widthSum}px`;
        contentTableEl.style.width = `${widthSum}px`;
        tableWrapperEl.style.width = `${widthSum}px`;
        ths1[index - 1].style.width = `${colWidth}px`;
        ths2[index - 1].style.width = `${colWidth}px`;
        const newColsWidths = colsWidths.map((w, i) =>
          i === index - 1 ? colWidth : w,
        );
        activeCellUpdate(newColsWidths, hasBottomScrollbar, hasRightScrollbar);
        if (selectionEl && selection) {
          const style = buildStyle({ selection, colsWidths: newColsWidths });
          selectionEl.style.left = `${style.left}px`;
          selectionEl.style.width = `${style.width}px`;
        }
        return true;
      },
      tableWrapperEl,
      initialPos,
      rootEl,
    );
    if (inc !== undefined) {
      const areaWidth = width - (hasRightScrollbar ? scrollWidth : 0) - 1;
      const withSum =
        colsWidths.reduce((a: number, b: number) => a + b, 1) + inc;
      const finalWidth = Math.max(areaWidth, withSum);
      const widthToDistribute = Math.max(areaWidth - withSum, 0);
      headerTableEl.style.width = `${finalWidth}px`;
      contentTableEl.style.width = `${finalWidth}px`;
      tableWrapperEl.style.width = ``;
      const newWidths = colsWidths.map(
        (w, i) =>
          (i === index - 1 ? w + inc : w) +
          (i === colsWidths.length - 1 ? widthToDistribute : 0),
      );
      ths1[index - 1].style.width = `${newWidths[index - 1]}px`;
      ths2[index - 1].style.width = `${newWidths[index - 1]}px`;
      if (selectionEl && selection) {
        const style = buildStyle({ selection, colsWidths: newWidths });
        selectionEl.style.left = `${style.left}px`;
        selectionEl.style.width = `${style.width}px`;
      }
      const fieldName = result.fields[index - 1].name;
      setState({
        touched: state
          ? [...state.touched, fieldName].filter(
              (v, i, a) => a.indexOf(v) === i,
            )
          : [fieldName],
        fields: result.fields.map((f) => f.name),
        widths: newWidths,
      });
    } else {
      const gridContentTableWidth =
        colsWidths.reduce((a: number, b: number) => a + b, 0) + 1;
      headerTableEl.style.width = `${gridContentTableWidth}px`;
      contentTableEl.style.width = `${gridContentTableWidth}px`;
      tableWrapperEl.style.width = ``;
      if (selectionEl && selection) {
        const style = buildStyle({ selection, colsWidths });
        selectionEl.style.left = `${style.left}px`;
        selectionEl.style.width = `${style.width}px`;
      }
      if (ths1[index - 1])
        ths1[index - 1].style.width = `${colsWidths[index - 1]}px`;
      if (ths2[index - 1])
        ths2[index - 1].style.width = `${colsWidths[index - 1]}px`;
      activeCellUpdate(colsWidths, hasBottomScrollbar, hasRightScrollbar);
    }
  });

  const gridContentTableWidth = useMemo(
    () => colsWidths.reduce((a, b) => a + b, 0) + 1,
    [colsWidths],
  );

  return {
    colsWidths,
    hasRightScrollbar,
    hasBottomScrollbar,
    onStartResize,
    gridContentTableWidth,
  };
}
