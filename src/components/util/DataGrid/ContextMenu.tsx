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

export function ContextMenu({
  x,
  y,
  onSelectOption,
  rowIndex,
  colIndex,
  update,
  selection,
  rowsLength,
}: {
  x: number;
  y: number;
  onSelectOption: (e: ContextMenuEvent) => void;
  selection:
    | {
        rowIndex: [number, number];
        colIndex: [number, number];
      }
    | undefined;
  rowIndex: number;
  colIndex: number;
  rowsLength: number;
  update: {
    [rowIndex: string]: { [colIndex: string]: string | null } | 'REMOVE';
  };
}) {
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
  const isInSelection =
    !!selection &&
    selection.rowIndex[0] <= rowIndex &&
    rowIndex <= selection?.rowIndex[1] &&
    selection.colIndex[0] <= colIndex &&
    colIndex <= selection?.colIndex[1];
  let updateCount = 0;
  let deleteCount = 0;
  if (selection?.rowIndex)
    for (const [updateIndex0, updateRow] of Object.entries(update)) {
      const updateIndex = parseInt(updateIndex0, 10);
      if (
        updateIndex >= selection.rowIndex[0] &&
        updateIndex <= Math.max(selection.rowIndex[1], rowsLength - 1)
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
  const currentCellUpdate =
    update?.[rowIndex] &&
    update[rowIndex] !== 'REMOVE' &&
    colIndex in update[rowIndex];
  const currentRowDelete = update?.[rowIndex] === 'REMOVE';
  const updates = isInSelection ? updateCount : currentCellUpdate ? 1 : 0;
  const deletes = isInSelection ? deleteCount : currentRowDelete ? 1 : 0;
  const options: {
    title: string;
    icon: string;
    action: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }[] = [];
  const selectionRowsSize = selection?.rowIndex
    ? Math.min(selection.rowIndex[1], rowsLength - 1) -
      selection.rowIndex[0] +
      1
    : 0;
  if (updates === 1 && currentCellUpdate) {
    options.push({
      title: `Undo value update `,
      icon: 'undo',
      action: () => {
        onSelectOption({
          type: 'undo update',
          rowIndex: [rowIndex, rowIndex],
          colIndex: [colIndex, colIndex],
        });
      },
    });
  } else if (deletes === 1 && currentRowDelete) {
    options.push({
      title: `Unmark row for removal `,
      icon: 'undo',
      action: () => {
        onSelectOption({
          type: 'undo delete',
          rowIndex: [rowIndex, rowIndex],
        });
      },
    });
  }
  if (
    (isInSelection && selectionRowsSize === 1) ||
    (!isInSelection && rowIndex < rowsLength)
  ) {
    options.push({
      title: `Mark row for removal `,
      icon: 'close',
      action: () => {
        onSelectOption({
          type: 'delete',
          rowIndex: [rowIndex, rowIndex],
        });
      },
    });
  }
  if (isInSelection) {
    if (updates > 0 && !(updates === 1 && currentCellUpdate)) {
      options.push({
        title: `Undo ${updates} value update${updates > 1 ? 's' : ''} `,
        icon: 'undo',
        action: () => {
          onSelectOption({
            type: 'undo update',
            ...selection,
          });
        },
      });
    }
    if (deletes > 0 && !(deletes === 1 && currentRowDelete)) {
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
    if (deletes < selectionRowsSize && selectionRowsSize > 1) {
      options.push({
        ...rowsListeners,
        title: `Mark ${selectionRowsSize} row${selectionRowsSize > 1 ? 's' : ''}  for removal `,
        icon: 'close',
        action: () => {
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
  }
  if (!currentCellUpdate && !currentRowDelete) {
    options.push({
      title: 'Update value ',
      icon: 'pencil',
      action: () => {
        onSelectOption({
          type: 'update',
          rowIndex,
          colIndex,
        });
      },
    });
  }
  if (isInSelection && updates && deletes && deletes + updates > 1) {
    options.push({
      title: `Undo all ${deletes + updates} changes in selection`,
      icon: 'undo',
      action: () => {
        onSelectOption({
          type: 'undo all',
          ...selection,
        });
      },
    });
  }
  if (update[rowsLength]) {
    if (isInSelection && selection.rowIndex[1] >= rowsLength) {
      const quantity =
        selection.rowIndex[1] -
        Math.max(selection.rowIndex[0], rowsLength) +
        (update?.[selection.rowIndex[1]] ? 1 : 0);
      options.push({
        title: `Undo ${quantity} row insert${quantity > 1 ? 's' : ''} `,
        icon: 'undo',
        ...rowsListeners,
        action: () => {
          onSelectOption({
            type: 'undo inserts',
            rowIndex: [
              Math.max(selection.rowIndex[0], rowsLength),
              selection.rowIndex[1] - (update?.[selection.rowIndex[1]] ? 0 : 1),
            ],
          });
        },
      });
    } else if (rowIndex >= rowsLength) {
      options.push({
        ...rowsListeners,
        title: `Undo row insert `,
        icon: 'undo',
        action: () => {
          onSelectOption({
            type: 'undo inserts',
            rowIndex: [rowIndex, rowIndex],
          });
        },
      });
    }
  }
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
        ...(y + options.length * optionHeight + extraHeight < window.innerHeight
          ? { top: y }
          : { bottom: window.innerHeight - y }),
        ...(x + contextMenuWidth < window.innerWidth
          ? { left: x }
          : { right: window.innerWidth - x }),
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
      {options.map((option, index) => (
        <div
          key={index}
          onClick={option.action}
          onMouseEnter={option.onMouseEnter}
          onMouseLeave={option.onMouseLeave}
        >
          <i className={`fa fa-${option.icon}`} style={{ width: 14 }} />{' '}
          {option.title}
        </div>
      ))}
    </div>
  );
}
