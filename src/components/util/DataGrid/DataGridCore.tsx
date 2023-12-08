import { QueryArrayResult } from 'pg';
import { DataGridActiveCell } from './DataGridActiveCell';
import { DataGridTable } from './DataGridTable';
import { DataGridThead } from './DataGridThead';
import { DataGridSort } from './DataGrid';
import { DataGridSortDialog } from './DataGridSortDialog';
import { DataGridFilterDialog, Filter } from './DataGridFilterDialog';
import { useDataGridCore } from './dataGridCoreUtils';
import { DataGridUpdateInfoDialog } from './DataGridUpdateInfo';

export interface DataGridCoreProps {
  result: QueryArrayResult;
  width: number;
  // eslint-disable-next-line react/no-unused-prop-types
  onScroll?: (() => void) | undefined;
  height: number;
  emptyTable?: string | undefined;
  // eslint-disable-next-line react/no-unused-prop-types
  onUpdate?: (u: {
    updates: {
      where: { [fieldName: string]: string | number | null };
      values: { [fieldName: string]: string | null };
    }[];
    inserts: { [fieldName: string]: string | null }[];
  }) => Promise<boolean>;
  pks?: string[];
  currentFilter?: Filter;
  currentSort?: DataGridSort;
  onChangeSort?: (sort: DataGridSort) => void;
  onChangeFilter?: (filter: Filter) => void;
}

export interface DataGridState {
  slice: [number, number];
  active?: { rowIndex: number; colIndex: number };
  selection?: { rowIndex: [number, number]; colIndex: [number, number] };
  mouseDown?: { rowIndex: number; colIndex: number };
  openSortDialog: boolean;
  openFilterDialog: boolean;
  editing: boolean | 2 | 1;
  update: { [rowIndex: string]: { [colIndex: string]: string | null } };
  updateFail?: Error;
  updateRunning?: boolean;
}

export function DataGridCore(props: DataGridCoreProps) {
  const {
    state,
    elRef,
    gridContentTableWidth,
    headerElRef,
    colsWidths,
    pendingRowsUpdate,
    pendingInserts,
    scrollRef,
    hasBottomScrollbar,
    hasRightScrollbar,
    activeElRef,
    gridContentRef,
    gridContentMarginTop,
    gridContentHeight,
    visibleStartingInEven,
    visibleRows,
    gridContentTableTop,
    totalChanges,
    onBlur,
    onKeyDown,
    onMouseDown,
    onDoubleClick,
    onChange,
    onEditBlur,
    onFilterClose,
    onScroll,
    onSortClose,
    onSortClick,
    onFilterClick,
    nop,
    onDiscardClick,
    applyClick,
    onPlusClick,
    extraBottomSpace,
    onDiscardFailClick,
    applyingUpdate,
    onStartResize,
  } = useDataGridCore(props);

  return (
    <div
      style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute' }}
      tabIndex={0}
      className={state.editing ? 'editing' : undefined}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      ref={elRef}
    >
      <div className="grid-header-wrapper">
        <table
          className="grid-header"
          style={{
            width: gridContentTableWidth,
            zIndex: 3,
          }}
          ref={headerElRef}
        >
          <DataGridThead
            fields={props.result.fields}
            pks={props.pks}
            colsWidths={colsWidths}
            currentSort={props.currentSort}
            onChangeSort={pendingRowsUpdate ? undefined : props.onChangeSort}
            onStartResize={onStartResize}
          />
        </table>
      </div>
      {state.active ? (
        <DataGridActiveCell
          scrollLeft={scrollRef.current.top}
          scrollTop={scrollRef.current.left}
          containerHeight={props.height}
          containerWidth={props.width}
          colsWidths={colsWidths}
          active={state.active}
          hasBottomScrollbar={hasBottomScrollbar}
          hasRightScrollbar={hasRightScrollbar}
          onChange={onChange}
          changed={
            typeof state.update?.[state.active.rowIndex]?.[
              state.active.colIndex
            ] !== 'undefined'
          }
          onBlur={onEditBlur}
          editing={state.editing}
          value={
            typeof state.update[state.active.rowIndex] !== 'undefined' &&
            typeof state.update[state.active.rowIndex][
              state.active.colIndex
            ] !== 'undefined'
              ? state.update[state.active.rowIndex]?.[state.active.colIndex]
              : props.result.rows[state.active.rowIndex]?.[
                  state.active.colIndex
                ]
          }
          elRef={activeElRef}
        />
      ) : null}
      <div
        className="grid-content"
        onScroll={onScroll}
        ref={gridContentRef}
        style={{
          overflowX: hasBottomScrollbar ? 'scroll' : 'hidden',
          overflowY: hasRightScrollbar ? 'scroll' : 'hidden',
        }}
      >
        <div
          style={{
            height: gridContentHeight + extraBottomSpace + gridContentMarginTop,
          }}
        >
          <div
            style={{
              width: gridContentTableWidth,
              height: gridContentHeight + extraBottomSpace,
            }}
            className="grid-content--table-wrapper-outer"
          >
            <div
              style={{
                marginTop: gridContentMarginTop,
                height: gridContentHeight,
              }}
              className="grid-content--table-wrapper"
            >
              <DataGridTable
                visibleStartingInEven={visibleStartingInEven}
                visibleRows={visibleRows}
                slice={state.slice}
                selection={state.selection}
                gridContentTableTop={gridContentTableTop}
                gridContentTableWidth={gridContentTableWidth}
                fields={props.result.fields}
                finalWidths={colsWidths}
                update={state.update}
              />
            </div>
          </div>
        </div>
      </div>

      {state.openSortDialog && props.onChangeSort && (
        <DataGridSortDialog
          onClose={onSortClose}
          fields={props.result.fields}
          currentSort={props.currentSort}
          onChangeSort={props.onChangeSort}
        />
      )}

      {state.openFilterDialog && props.onChangeFilter && (
        <DataGridFilterDialog
          onChange={props.onChangeFilter}
          currentFilter={props.currentFilter}
          onClose={onFilterClose}
          fields={props.result.fields}
        />
      )}

      {props.onChangeSort ? (
        pendingRowsUpdate > 0 ? (
          <i className="fa fa-sort disabled" onMouseDown={nop} />
        ) : (
          <i className="fa fa-sort" onMouseDown={onSortClick} />
        )
      ) : null}

      {pendingRowsUpdate > 0 ? (
        <>
          {props.onChangeFilter ? (
            <i className="fa fa-filter disabled" onMouseDown={nop} />
          ) : null}
          {props.onUpdate ? (
            <i className="fa fa-plus disabled" onMouseDown={nop} />
          ) : null}
        </>
      ) : (
        <>
          {props.onChangeFilter ? (
            <i className="fa fa-filter" onMouseDown={onFilterClick} />
          ) : null}
          {props.onUpdate ? (
            <i className="fa fa-plus" onMouseDown={onPlusClick} />
          ) : null}
        </>
      )}

      {props.result.rows.length === 0 && props.emptyTable ? (
        <div className="empty-table">
          <div>{props.emptyTable}</div>
        </div>
      ) : pendingRowsUpdate > 0 || pendingInserts > 0 ? (
        <DataGridUpdateInfoDialog
          onDiscardFailClick={onDiscardFailClick}
          pendingRowsUpdate={pendingRowsUpdate}
          pendingInserts={pendingInserts}
          totalChanges={totalChanges}
          onDiscardClick={onDiscardClick}
          onApplyClick={applyClick}
          fail={state.updateFail}
          applyingUpdate={applyingUpdate}
        />
      ) : null}
    </div>
  );
}
