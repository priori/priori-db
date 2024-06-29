import { Filter, Sort, QueryResultDataField } from 'db/db';
import { DataGridActiveCell } from './DataGridActiveCell';
import { DataGridTable } from './DataGridTable';
import { DataGridThead } from './DataGridThead';
import { DataGridSortDialog } from './DataGridSortDialog';
import { DataGridFilterDialog } from './DataGridFilterDialog';
import { useDataGridCore } from './dataGridCoreUtils';
import { DataGridUpdateInfoDialog } from './DataGridUpdateInfo';

export interface DataGridCoreProps {
  result: {
    rows: any[];
    fields: QueryResultDataField[];
  };
  // eslint-disable-next-line react/no-unused-prop-types
  fetchMoreRows?: () => void;
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
    removals: { [fieldName: string]: string | number | null }[];
  }) => Promise<boolean>;
  pks?: string[];
  currentFilter?: Filter;
  currentSort?: Sort;
  onChangeSort?: (sort: Sort) => void;
  onChangeFilter?: (filter: Filter) => void;
  // eslint-disable-next-line react/no-unused-prop-types
  onTouch?: () => void;
  limit?: 1000 | 10000 | 'unlimited';
  // eslint-disable-next-line react/no-unused-prop-types
  onChangeLimit?: (limit: 1000 | 10000 | 'unlimited') => void;
}

export interface DataGridState {
  slice: [number, number];
  active?: { rowIndex: number; colIndex: number };
  selection?: { rowIndex: [number, number]; colIndex: [number, number] };
  mouseDown?: { rowIndex: number; colIndex: number };
  contextMenu?: { rowIndex: number; mouseX: number; mouseY: number };
  openSortDialog: boolean;
  openFilterDialog: boolean;
  editing: boolean | 2 | 1;
  update: {
    [rowIndex: string]: { [colIndex: string]: string | null } | 'REMOVE';
  };
  updateFail?: Error;
  updateRunning?: boolean;
  fetchingNewRows?: boolean;
  touched: boolean;
}

export function DataGridCore(props: DataGridCoreProps) {
  const {
    activeCellChanged,
    activeCellValue,
    activeElRef,
    applyClick,
    applyingUpdate,
    colsWidths,
    elRef,
    extraBottomSpace,
    fetchingNewRows,
    gridContentHeight,
    gridContentMarginTop,
    gridContentRef,
    gridContentTableTop,
    gridContentTableWidth,
    hasBottomScrollbar,
    hasRightScrollbar,
    headerElRef,
    nop,
    onBlur,
    onChange,
    onContextMenuSelectOption,
    onDiscardClick,
    onDiscardFailClick,
    onDoubleClick,
    onEditBlur,
    onFilterClick,
    onFilterClose,
    onKeyDown,
    onMouseDown,
    onPlusClick,
    onScroll,
    onSortClick,
    onSortClose,
    onStartResize,
    pendingInserts,
    pendingRowsUpdate,
    scrollRef,
    pendingRowsRemoval,
    state,
    totalChanges,
    visibleRows,
    visibleStartingInEven,
    onChangeLimit,
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
          field={props.result.fields[state.active.colIndex].type}
          scrollLeft={scrollRef.current.top}
          scrollTop={scrollRef.current.left}
          containerHeight={props.height}
          containerWidth={props.width}
          colsWidths={colsWidths}
          active={state.active}
          hasBottomScrollbar={hasBottomScrollbar}
          hasRightScrollbar={hasRightScrollbar}
          onChange={onChange}
          changed={activeCellChanged}
          onBlur={onEditBlur}
          editing={state.editing}
          value={activeCellValue}
          markedForRemoval={state.update[state.active.rowIndex] === 'REMOVE'}
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
                contextMenu={state.contextMenu}
                onContextMenuSelectOption={onContextMenuSelectOption}
              />
            </div>
            {onChangeLimit && props.limit ? (
              <div
                style={{
                  top: gridContentHeight + gridContentMarginTop,
                }}
                className="grid-content--footer"
              >
                <select
                  value={props.limit}
                  disabled={
                    props.result.rows.length < 1000 ||
                    pendingRowsUpdate > 0 ||
                    pendingInserts > 0 ||
                    pendingRowsRemoval > 0
                  }
                  onChange={onChangeLimit}
                >
                  <option value="1000">LIMIT 1000</option>
                  <option value="10000">LIMIT 10000</option>
                  <option value="unlimited">
                    UNLIMITED (incremental fetching)
                  </option>
                </select>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {fetchingNewRows ? (
        <div className="grid-content--fetch-more-rows">
          <i className="fa fa-circle-o-notch fa-spin fa-3x fa-fw" />
        </div>
      ) : null}

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
            props.fetchMoreRows ? (
              <i
                className="fa fa-plus disabled"
                style={{
                  cursor: 'default',
                  color: 'gray',
                  background: '#f7f7f7',
                  opacity: 0.7,
                }}
                onMouseDown={nop}
              />
            ) : (
              <i className="fa fa-plus" onMouseDown={onPlusClick} />
            )
          ) : null}
        </>
      )}

      {props.result.rows.length === 0 && props.emptyTable ? (
        <div className="empty-table">
          <div>{props.emptyTable}</div>
        </div>
      ) : null}
      {pendingRowsUpdate > 0 || pendingInserts > 0 || pendingRowsRemoval > 0 ? (
        <DataGridUpdateInfoDialog
          onDiscardFailClick={onDiscardFailClick}
          pendingRowsUpdate={pendingRowsUpdate}
          pendingRowsRemoval={pendingRowsRemoval}
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
