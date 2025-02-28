import { useEffect, useRef } from 'react';

export type ContextMenuEvent =
  | {
      type: 'undo update';
      rowIndex: [number, number];
      colIndex: [number, number];
    }
  | {
      type: 'update';
      rowIndex: number;
      colIndex: number;
    }
  | {
      type: 'delete';
      rowIndex: [number, number];
    }
  | {
      type: 'undo delete';
      rowIndex: [number, number];
    }
  | {
      type: 'undo all';
      rowIndex: [number, number];
      colIndex: [number, number];
    }
  | {
      type: 'undo inserts';
      rowIndex: [number, number];
    };

const optionHeight = 30;
const extraHeight = 10;
const contextMenuWidth = 230;
const readOnlyInfoHeight = 45;

export function ContextMenu({
  onSelectOption,
  update,
  selection: selection0,
  rowsLength,
  readOnly,
  rowIndex,
  colIndex,
  hintOnly,
  x,
  y,
  x2,
  y2,
}: {
  onSelectOption: (e: ContextMenuEvent) => void;
  selection?: {
    rowIndex: [number, number];
    colIndex: [number, number];
  };
  rowIndex: number;
  colIndex: number;
  rowsLength: number;
  readOnly: boolean;
  update: {
    [rowIndex: string]: { [colIndex: string]: string | null } | 'REMOVE';
  };
  hintOnly?: boolean;
  x: number;
  y: number;
  y2?: number;
  x2?: number;
}) {
  const selection =
    selection0 &&
    selection0.colIndex[0] <= colIndex &&
    selection0.colIndex[1] >= colIndex &&
    selection0.rowIndex[0] <= rowIndex &&
    selection0.rowIndex[1] >= rowIndex
      ? selection0
      : {
          colIndex: [colIndex, colIndex] as [number, number],
          rowIndex: [rowIndex, rowIndex] as [number, number],
        };
  const hoverElRef = useRef<HTMLElement | undefined | null>(null);
  const rowsSelectionElRef = useRef<HTMLElement | undefined | null>(null);
  const selectionElRef = useRef<HTMLElement | undefined | null>(null);
  const rowsListeners = {
    onMouseLeave() {
      if (rowsSelectionElRef.current) {
        rowsSelectionElRef.current.style.display = 'none';
      }
      if (selectionElRef.current) {
        selectionElRef.current.style.display = '';
      }
    },
    onMouseEnter() {
      if (rowsSelectionElRef.current) {
        rowsSelectionElRef.current.style.display = '';
      }
      if (selectionElRef.current) {
        selectionElRef.current.style.display = 'none';
      }
    },
  };
  const options: {
    title: string;
    icon: string;
    action?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }[] = [];
  if (!hintOnly) {
    let updateCount = 0;
    let deleteCount = 0;
    if (selection?.rowIndex)
      for (const [updateIndex0, updateRow] of Object.entries(update)) {
        const updateIndex = parseInt(updateIndex0, 10);
        if (
          updateIndex >= selection.rowIndex[0] &&
          updateIndex <= selection.rowIndex[1]
        ) {
          if (updateRow !== 'REMOVE') {
            for (const [updateColIndex0, updateCol] of Object.entries(
              updateRow,
            )) {
              const updateColIndex = parseInt(updateColIndex0, 10);
              if (
                updateCol &&
                updateColIndex >= selection.colIndex[0] &&
                updateColIndex <= selection.colIndex[1]
              ) {
                updateCount += 1;
              }
            }
          } else if (updateRow === 'REMOVE') {
            deleteCount += 1;
          }
        }
      }
    const updates = updateCount;
    const deletes = deleteCount;
    const rowsAvailableForRemoval = readOnly
      ? 0
      : Math.min(selection.rowIndex[1], rowsLength - 1) -
        selection.rowIndex[0] +
        1;
    const hasInserts = selection.rowIndex[1] >= rowsLength;
    if (updates === 1) {
      options.push({
        title: `Undo value update `,
        icon: 'undo',
        action:
          readOnly && !hasInserts
            ? undefined
            : () => {
                onSelectOption({
                  type: 'undo update',
                  rowIndex: selection.rowIndex,
                  colIndex: selection.colIndex,
                });
              },
      });
    } else if (deletes === 1) {
      options.push({
        title: `Unmark row for removal `,
        icon: 'undo',
        action: () => {
          onSelectOption({
            type: 'undo delete',
            rowIndex: selection.rowIndex,
          });
        },
      });
    }
    if (
      rowsAvailableForRemoval === 1 &&
      update[selection.rowIndex[1]] !== 'REMOVE'
    ) {
      options.push({
        title: `Mark row for removal `,
        icon: 'close',
        action: readOnly
          ? undefined
          : () => {
              onSelectOption({
                type: 'delete',
                rowIndex: [
                  selection.rowIndex[0],
                  Math.min(selection.rowIndex[1], rowsLength - 1),
                ],
              });
            },
      });
    }
    if (updates > 1) {
      options.push({
        title: `Undo ${updates} value update${updates > 1 ? 's' : ''} `,
        icon: 'undo',
        action:
          readOnly && !hasInserts
            ? undefined
            : () => {
                onSelectOption({
                  type: 'undo update',
                  ...selection,
                });
              },
      });
    }
    if (deletes > 1) {
      options.push({
        title: `Unmark ${deletes} row${deletes > 1 ? 's' : ''} for removal `,
        icon: 'undo',
        ...rowsListeners,
        action: () => {
          onSelectOption({
            type: 'undo delete',
            rowIndex: [
              selection.rowIndex[0],
              Math.min(selection.rowIndex[1], rowsLength - 1),
            ],
          });
        },
      });
    }
    if (deletes < rowsAvailableForRemoval && rowsAvailableForRemoval > 1) {
      options.push({
        ...rowsListeners,
        title: `Mark ${rowsAvailableForRemoval} row${rowsAvailableForRemoval > 1 ? 's' : ''}  for removal `,
        icon: 'close',
        action:
          readOnly && !hasInserts
            ? undefined
            : () => {
                onSelectOption({
                  type: 'delete',
                  rowIndex: [
                    selection.rowIndex[0],
                    Math.min(selection.rowIndex[1], rowsLength - 1),
                  ],
                });
              },
      });
    }
    if (updates && deletes && deletes + updates > 1) {
      options.push({
        title: `Undo all ${deletes + updates} changes in selection`,
        icon: 'undo',
        action:
          readOnly && !hasInserts
            ? undefined
            : () => {
                onSelectOption({
                  type: 'undo all',
                  ...selection,
                });
              },
      });
    }
    if (update[rowsLength]) {
      if (selection.rowIndex[1] >= rowsLength) {
        const quantity =
          selection.rowIndex[1] -
          Math.max(selection.rowIndex[0], rowsLength) +
          (update?.[selection.rowIndex[1]] ? 1 : 0);
        if (quantity > 0)
          options.push({
            title: `Undo ${quantity === 1 ? '' : `${quantity} `}row insert${quantity > 1 ? 's' : ''} `,
            icon: 'undo',
            ...rowsListeners,
            action: () => {
              onSelectOption({
                type: 'undo inserts',
                rowIndex: [
                  Math.max(selection.rowIndex[0], rowsLength),
                  selection.rowIndex[1] -
                    (update?.[selection.rowIndex[1]] ? 0 : 1),
                ],
              });
            },
          });
      }
    }
    if (update[rowIndex] !== 'REMOVE') {
      options.push({
        title: 'Update value ',
        icon: 'pencil',
        action:
          readOnly && rowIndex < rowsLength
            ? undefined
            : () => {
                onSelectOption({
                  type: 'update',
                  rowIndex,
                  colIndex,
                });
              },
      });
    }
    if (readOnly && selection.rowIndex[0] < rowsLength) {
      options.push({
        title: `Mark row for removal `,
        icon: 'close',
        action: undefined,
      });
    }
  }
  const showReadOnlyInfo =
    hintOnly ||
    (readOnly && (!options.length || options.some((o) => !o.action)));

  useEffect(() => {
    if (hoverElRef.current) {
      hoverElRef.current.classList.remove('hover');
    }
    if (selectionElRef.current) {
      selectionElRef.current.style.display = '';
    }
    return () => {
      if (selectionElRef.current) selectionElRef.current.style.display = '';
    };
  }, []);
  return (
    <div
      className="context-menu"
      style={{
        ...(y +
          options.length * optionHeight +
          extraHeight +
          (showReadOnlyInfo ? readOnlyInfoHeight : 0) <
        window.innerHeight
          ? { top: y }
          : { bottom: window.innerHeight - (y2 ?? y) }),
        ...(x + contextMenuWidth < window.innerWidth
          ? { left: x }
          : { right: window.innerWidth - (x2 ?? x) }),
      }}
      ref={(el) => {
        if (el) {
          hoverElRef.current = el.closest('.grid')?.querySelector('tr.hover');
          rowsSelectionElRef.current = el
            .closest('.grid')
            ?.querySelector('.grid--selection--rows');
          selectionElRef.current = el
            .closest('.grid')
            ?.querySelector('.grid--selection:not(.grid--selection--rows)');
          if (rowsSelectionElRef.current) {
            rowsSelectionElRef.current.style.display = 'none';
          }
        }
      }}
      onMouseEnter={() => {
        if (hoverElRef.current) {
          hoverElRef.current.classList.add('hover');
        }
      }}
      onMouseLeave={() => {
        if (hoverElRef.current) {
          hoverElRef.current.classList.remove('hover');
        }
        if (selectionElRef.current) selectionElRef.current.style.display = '';
      }}
    >
      {showReadOnlyInfo && (
        <div
          style={{
            textAlign: 'right',
            pointerEvents: 'none',
            height: readOnlyInfoHeight,
          }}
        >
          <span
            style={{
              display: 'block',
              position: 'absolute',
              borderLeft: '3px solid',
              height: 26,
              transform: 'rotate(-45deg)',
              marginLeft: 8,
              marginTop: -1,
              boxShadow: '1px 0 0 white, -1px 0 0 white',
            }}
          />
          <i
            className="fa fa-pencil"
            style={{ width: 18, float: 'left', fontSize: 24 }}
          />{' '}
          Read-only data <i className="fa fa-lock" />
          <br />
          <strong>No primary key configured!</strong>
        </div>
      )}
      {options.map((option, index) => (
        <div
          key={index}
          onClick={option.action}
          onMouseEnter={option.onMouseEnter}
          onMouseLeave={option.onMouseLeave}
          className={option.action ? undefined : 'disabled'}
        >
          <i className={`fa fa-${option.icon}`} style={{ width: 14 }} />{' '}
          {option.title}
        </div>
      ))}
    </div>
  );
}
