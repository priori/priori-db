import { SimpleValue } from 'db/Connection';
import { QueryArrayResult } from 'pg';
import { renderToString } from 'react-dom/server';

const letterSize = 6;
export function getValString(val: unknown) {
  return val === null
    ? 'null'
    : val instanceof Date
    ? val.toLocaleString()
    : typeof val === 'object'
    ? JSON.stringify(val)
    : `${val}`;
}

export function buildBaseWidths(res: QueryArrayResult) {
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
    (maxLength) => (maxLength > 40 ? 40 : maxLength) * letterSize + 11,
  );
}
// const navWidth = 250,
export const rowHeight = 23;
export const scrollWidth = 10;
export const headerHeight = 21;
// medidos em tamanho de linha
export const rowsByRender = 250;
export const topRenderOffset = 100;
export const allowedBottomDistance = 50;
export const allowedTopDistance = 50;

export function getType(val: unknown) {
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

export function buildFinalWidths(
  initialColsWidths: number[],
  areaWidth: number,
) {
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

export function cellClassName(
  colIndex: number,
  rowIndex: number,
  selection:
    | {
        colIndex: [number, number];
        rowIndex: [number, number];
      }
    | undefined,
  hasChange: boolean,
): string | undefined {
  if (!selection) {
    if (hasChange) return 'changed';
    return undefined;
  }
  if (
    selection.colIndex[0] <= colIndex &&
    colIndex <= selection.colIndex[1] &&
    selection.rowIndex[0] <= rowIndex &&
    rowIndex <= selection.rowIndex[1]
  ) {
    return `selected${
      (selection.rowIndex[0] === rowIndex ? ' selection-first-row' : '') +
      (selection.colIndex[1] === colIndex ? ' selection-last-col' : '')
    }${hasChange ? ' changed' : ''}`;
  }
  if (
    selection.colIndex[0] === colIndex + 1 &&
    selection.rowIndex[0] <= rowIndex &&
    rowIndex <= selection.rowIndex[1]
  ) {
    return `selection-left${hasChange ? ' changed' : ''}`;
  }
  if (
    selection.colIndex[0] <= colIndex &&
    colIndex <= selection.colIndex[1] &&
    selection.rowIndex[1] === rowIndex - 1
  ) {
    return `selection-bottom${hasChange ? ' changed' : ''}`;
  }
  if (hasChange) return 'changed';
  return undefined;
}

export function activePos(
  widths: number[],
  colIndex: number,
  rowIndex: number,
  scrollTop: number,
  scrollLeft: number,
  containerWidth: number,
  containerHeight: number,
  hasBottomScrollbar: boolean,
  hasRightScrollbar: boolean,
) {
  let fieldLeft = 0;
  for (const c in widths) {
    const w = widths[c];
    if (`${colIndex}` === c) break;
    fieldLeft += w;
  }
  fieldLeft += 1;
  const top0 = headerHeight + rowIndex * rowHeight - scrollTop + 1;
  const activeCellLeft = fieldLeft - (scrollLeft < 0 ? 0 : scrollLeft);
  const left = activeCellLeft < 0 ? 0 : activeCellLeft;
  const leftCrop = fieldLeft - scrollLeft < 0 ? -(fieldLeft - scrollLeft) : 0;
  const originalWidth = widths[colIndex] - 1 - leftCrop;
  const containerAvailableWidth =
    containerWidth - (hasRightScrollbar ? scrollWidth : 0);
  const needToCropRight = originalWidth + left > containerAvailableWidth;
  const wrapperWidth = needToCropRight
    ? containerAvailableWidth - left
    : originalWidth;
  const top = top0 < headerHeight ? headerHeight : top0;
  const topCrop = top0 < headerHeight ? headerHeight - top0 : 0;
  const wrapperHeight = Math.max(
    Math.min(
      containerHeight - (hasBottomScrollbar ? scrollWidth : 0) - top0 + 3,
      rowHeight + 3 - topCrop,
    ),
    0,
  );
  return { top, left, leftCrop, topCrop, wrapperWidth, wrapperHeight };
}

export function scrollTo(
  el: HTMLElement,
  widths: number[],
  colIndex: number,
  rowIndex: number,
  hasRightScrollbar: boolean,
  hasBottomScrollbar: boolean,
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
  if (scrollTop < y2 - el.offsetHeight + (hasBottomScrollbar ? scrollWidth : 0))
    scrollTop = y2 - el.offsetHeight + (hasBottomScrollbar ? scrollWidth : 0);
  else if (scrollTop > y) scrollTop = y;
  if (x < scrollLeft) scrollLeft = x;
  else if (
    x2 + (hasRightScrollbar ? scrollWidth : 0) >
    scrollLeft + el.offsetWidth
  )
    scrollLeft = x2 - el.offsetWidth + (hasRightScrollbar ? scrollWidth : 0);
  if (el.scrollTop !== scrollTop || el.scrollLeft !== scrollLeft) {
    el.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'auto' });
  }
}

export function getSelectionData(
  result: QueryArrayResult<SimpleValue[]>,
  selection: { rowIndex: [number, number]; colIndex: [number, number] },
) {
  return result.rows
    .filter(
      (_, i) =>
        Math.min(...selection.rowIndex) <= i &&
        i <= Math.max(...selection.rowIndex),
    )
    .map((row) =>
      row.filter(
        (_, i) =>
          Math.min(...selection.colIndex) <= i &&
          i <= Math.max(...selection.colIndex),
      ),
    );
}

function toStringCellValue(cell: SimpleValue): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return cell.toString();
  if (typeof cell === 'boolean') return cell.toString();
  if (cell === null) return '';
  if (cell === undefined) return '';
  return JSON.stringify(cell);
}

function toTsvCellValue(cell: SimpleValue): string {
  const str = toStringCellValue(cell);
  if (
    str.indexOf('\r') !== -1 ||
    str.indexOf('\t') !== -1 ||
    str.indexOf('\\') !== -1 ||
    str.indexOf('\n') !== -1
  ) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n');
  }
  return str;
}

function toCsvCellValue(cell: SimpleValue): string {
  const str = toStringCellValue(cell);
  if (
    str.indexOf('"') !== -1 ||
    str.indexOf('\n') !== -1 ||
    str.indexOf(';') !== -1
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(data: ReturnType<typeof getSelectionData>): string[] {
  return data.flatMap((row, i0) =>
    i0
      ? [
          '\n',
          ...row.flatMap((cell, i) =>
            i ? [';', toCsvCellValue(cell)] : [toCsvCellValue(cell)],
          ),
        ]
      : [
          ...row.flatMap((cell, i) =>
            i ? [';', toCsvCellValue(cell)] : [toCsvCellValue(cell)],
          ),
        ],
  );
}

export function toTsv(data: ReturnType<typeof getSelectionData>): string[] {
  return data.flatMap((row, i0) =>
    i0
      ? [
          '\n',
          ...row.flatMap((cell, i) =>
            i ? ['\t', toTsvCellValue(cell)] : [toTsvCellValue(cell)],
          ),
        ]
      : [
          ...row.flatMap((cell, i) =>
            i ? ['\t', toTsvCellValue(cell)] : [toTsvCellValue(cell)],
          ),
        ],
  );
}

export function toHtml(data: ReturnType<typeof getSelectionData>): string {
  return renderToString(
    <table>
      <tbody>
        {data.map((row, i0) => (
          <tr key={i0}>
            {row.map((cell, i) => (
              <td key={i}>{toStringCellValue(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>,
  );
}

export function toText(data: ReturnType<typeof getSelectionData>): string[] {
  return toTsv(data);
}
