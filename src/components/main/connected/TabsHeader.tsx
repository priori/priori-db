import { assert } from 'util/assert';
import { Component, KeyboardEventHandler } from 'react';
import { equals } from 'util/equals';
import {
  activateTab,
  updateHeaderTabsDisplayOrder,
  askToCloseTab,
  newQueryTabInTheEnd,
  keepTabOpen,
  updateTabText,
  extraTableTab,
} from '../../../state/actions';
import { Tab } from '../../../types';

export interface TabsHeaderProps {
  tabs: Tab[];
  onActiveTabMouseDown: () => void;
  left: number;
}

export interface TabWidth extends Tab {
  width: number;
}

export interface TabsHeaderState {
  tabs: TabWidth[];
  sorting: boolean;
  initialClientX: number;
  offset: number;
  editing: Tab | null;
  longOver?: Tab | null;
  firstLongOver?: boolean;
  addButtonTouched: boolean;
}

export class TabsHeader extends Component<TabsHeaderProps, TabsHeaderState> {
  static hintRender(t: Tab) {
    return (
      <>
        {TabsHeader.statusRender(t, {
          right: '9px',
          top: '3px',
          left: 'unset',
          position: 'absolute',
          fontSize: '21px',
        })}

        <h1>
          {' '}
          {t.props.type === 'role' ||
          t.props.type === 'domain' ||
          t.props.type === 'function' ||
          t.props.type === 'sequence' ||
          t.props.type === 'tableinfo' ||
          t.props.type === 'schemainfo' ||
          t.props.type === 'settings' ? (
            <span
              className="adjustment-icon--small"
              style={{
                display: 'inline-block',
                opacity: 1,
                marginRight: 5,
                position: 'relative',
                top: -1,
              }}
            >
              <div />
            </span>
          ) : t.props.type === 'query' ? (
            <span
              style={{
                fontFamily: 'Inconsolata',
                marginRight: '3px',
                letterSpacing: '-0.5px',
                position: 'relative',
                top: '-1px',
                left: '-1px',
              }}
            >
              &lt;/&gt;
            </span>
          ) : t.props.type === 'table' ? (
            <i
              className="fa fa-database"
              style={{ position: 'relative', top: -1, marginRight: 4 }}
            />
          ) : t.props.type === 'newtable' ? (
            <i
              className="fa fa-plus"
              style={{ position: 'relative', top: -1, marginRight: 4 }}
            />
          ) : null}
          {t.props.type === 'table'
            ? 'Table Data'
            : t.props.type === 'query'
              ? 'Query'
              : t.props.type === 'role'
                ? 'Role Settings'
                : t.props.type === 'domain'
                  ? 'Domain Settings'
                  : t.props.type === 'function'
                    ? 'Function Settings'
                    : t.props.type === 'newtable'
                      ? 'New Table'
                      : t.props.type === 'sequence'
                        ? 'Sequence Settings'
                        : t.props.type === 'tableinfo'
                          ? 'Table Settings'
                          : t.props.type === 'schemainfo'
                            ? 'Schema Settings'
                            : t.props.type === 'settings'
                              ? 'Settings'
                              : ''}
        </h1>
        {t.props.type === 'settings' ? (
          <h2>DB &amp; App Settings</h2>
        ) : t.title && t.props.type !== 'newtable' ? (
          <h2>{t.title}</h2>
        ) : t.title2 ? (
          <h2>{t.title2}</h2>
        ) : null}
      </>
    );
  }

  static statusRender(t: Tab, style?: React.CSSProperties) {
    if (!t.status) return null;
    return (
      <span
        style={
          style ?? {
            position: 'relative',
            fontSize: 14,
            top: -1,
            left: -25,
            color: 'rgba(0,0,0,.2)',
          }
        }
      >
        {t.status === 'running' ? (
          <i
            className="fa fa-circle-o-notch fa-spin fa-3x fa-fw"
            style={{
              display: 'inline-block',
              fontSize: 'inherit',
            }}
          />
        ) : t.status === 'success' ? (
          <i
            className="fa fa-check"
            style={{
              display: 'inline-block',
              fontSize: 'inherit',
            }}
          />
        ) : t.status === 'error' ? (
          <i
            className="fa fa-exclamation-triangle"
            style={{
              display: 'inline-block',
              fontSize: 'inherit',
            }}
          />
        ) : null}
      </span>
    );
  }

  prevEl: HTMLInputElement | null = null;

  mouseOverTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: TabsHeaderProps) {
    super(props);

    const areaWidth = window.innerWidth - props.left - 40;
    let width = areaWidth / props.tabs.length;
    if (width > 220) width = 220;
    width += 1;
    const tabs = props.tabs
      ? props.tabs.map((t) => ({
          ...t,
          width,
        }))
      : [];

    this.state = {
      tabs,
      sorting: false,
      initialClientX: 0,
      offset: 0,
      editing: null,
      addButtonTouched: false,
    };
    this.fit = this.fit.bind(this);
    this.windowMouseMove = this.windowMouseMove.bind(this);
    this.windowMouseUp = this.windowMouseUp.bind(this);
    this.windowBlur = this.windowBlur.bind(this);

    window.addEventListener('resize', this.fit);
    window.addEventListener('mousemove', this.windowMouseMove);
    window.addEventListener('mouseup', this.windowMouseUp);
    window.addEventListener('blur', this.windowBlur);
  }

  UNSAFE_componentWillReceiveProps(next: TabsHeaderProps) {
    if ((this.props, equals(next, this.props))) return;
    if (
      this.state.sorting &&
      !equals(
        {
          tabs: this.props.tabs.map((t) => t.props.uid),
          left: this.props.left,
          onActiveTabMouseDown: this.props.onActiveTabMouseDown,
        },
        {
          tabs: next.tabs.map((t) => t.props.uid),
          left: next.left,
          onActiveTabMouseDown: next.onActiveTabMouseDown,
        },
      )
    )
      this.applySort();
    const tabs = next.tabs.map((t, index) => {
      const currentTab = this.state.tabs.find(
        (t2) => t2.props.uid === t.props.uid,
      );
      const current = currentTab || t;
      return {
        ...current,
        width:
          currentTab && typeof currentTab.width === 'number'
            ? currentTab.width
            : !t.keep &&
                this.state.tabs[index] &&
                this.state.tabs[index].keep === false &&
                typeof this.state.tabs[index].width === 'number'
              ? this.state.tabs[index].width
              : 0,
      };
    });
    this.setState((state) => ({
      ...state,
      tabs,
    }));
    setTimeout(() => {
      this.fit();
    }, 1);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.fit);
    window.removeEventListener('mousemove', this.windowMouseMove);
    window.removeEventListener('mouseup', this.windowMouseUp);
    window.removeEventListener('blur', this.windowBlur);
  }

  onInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      this.setState((state) => ({
        ...state,
        editing: null,
      }));
    }
  };

  onDoubleClick(t: Tab) {
    if (this.mouseOverTimeout) clearTimeout(this.mouseOverTimeout);
    if (t.props.type === 'query') {
      this.setState((state) => ({
        ...state,
        editing: t,
        longOver: null,
        firstLongOver: false,
      }));
    } else if (t.active && t.props.type === 'table' && t.active && t.keep) {
      if (this.state.longOver) {
        this.setState((state) => ({
          ...state,
          longOver: null,
          firstLongOver: false,
        }));
      }
      extraTableTab(t.props.schema, t.props.table);
    } else {
      if (this.state.longOver) {
        this.setState((state) => ({
          ...state,
          longOver: null,
          firstLongOver: false,
        }));
      }
      keepTabOpen(t);
    }
  }

  blurInput(input: HTMLInputElement) {
    const { editing } = this.state;
    assert(editing);
    if (input.value || editing.title)
      updateTabText(editing.props.uid, input.value);
    if (this.mouseOverTimeout) clearTimeout(this.mouseOverTimeout);
    this.setState((state) => ({
      ...state,
      editing: null,
      longOver: null,
      firstLongOver: false,
    }));
  }

  tabsDoubleClick(e: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    if (this.mouseOverTimeout) clearTimeout(this.mouseOverTimeout);
    if (this.state.longOver)
      this.setState((state) => ({
        ...state,
        longOver: null,
        firstLongOver: false,
      }));
    const el = e.target;
    if (el instanceof HTMLElement) {
      if (el.matches('.tabs-header__tabs')) {
        newQueryTabInTheEnd();
      }
    }
  }

  private fit() {
    const areaWidth = window.innerWidth - this.props.left - 40;
    let width = areaWidth / this.state.tabs.length;
    if (width > 220) width = 220;
    width += 1;
    this.setState((state) => ({
      ...state,
      tabs: state.tabs.map((t) => ({ ...t, width })),
    }));
  }

  private mouseDown(e: React.MouseEvent<HTMLSpanElement>, t: Tab) {
    e.preventDefault();
    if (t.active) {
      this.props.onActiveTabMouseDown();
    }
    activateTab(t);
    if (this.mouseOverTimeout) clearTimeout(this.mouseOverTimeout);
    this.setState((state) => ({
      ...state,
      sorting: true,
      initialClientX: e.clientX,
      offset: 0,
      longOver: null,
    }));
  }

  private windowMouseUp() {
    if (!this.state.sorting) return;
    const { tabs } = this.calculate();
    tabs.sort((a, b) => a.left - b.left);
    this.applySort();
    updateHeaderTabsDisplayOrder(tabs.map((a) => a.props.uid));
  }

  private windowBlur() {
    if (this.state.sorting) this.applySort();
  }

  private applySort() {
    this.setState((state) => ({ ...state, sorting: false }));
  }

  private windowMouseMove(e: MouseEvent) {
    if (!this.state.sorting) return;
    this.setState((state) => ({
      ...state,
      offset: e.clientX - state.initialClientX,
    }));
  }

  private calculate() {
    const areaWidth = window.innerWidth - this.props.left - 40;
    let offsetWidth = areaWidth / this.state.tabs.length;
    if (offsetWidth > 220) offsetWidth = 220;
    const styleWidth = offsetWidth + 1;
    const currentActiveIndex = this.props.tabs.findIndex((t) => t.active);
    const indexOffset = Math.round(this.state.offset / offsetWidth);
    const finalActiveIndex = currentActiveIndex + indexOffset;
    const tabs = this.props.tabs.map((t, i) => {
      if (t.active) {
        let left = this.state.offset + currentActiveIndex * offsetWidth;
        if (left < 0) left = 0;
        if (left && left + styleWidth + 1 > areaWidth)
          left = areaWidth - offsetWidth;
        return { ...t, left, styleWidth };
      }
      let i2 = i;
      if (i2 < currentActiveIndex && i2 >= finalActiveIndex) i2 += 1;
      else if (i2 > currentActiveIndex && i2 <= finalActiveIndex) i2 -= 1;
      const left = offsetWidth * i2;
      return { ...t, left, styleWidth };
    });
    return { tabs, width: styleWidth };
  }

  render() {
    if (!this.state.sorting) {
      return (
        <div className="tabs-header" style={{ left: this.props.left }}>
          <span
            className="tabs-header__tabs"
            onDoubleClick={(e) => {
              this.tabsDoubleClick(e);
            }}
          >
            {this.props.tabs.map((t, index) => {
              const { width } = this.state.tabs[index];
              return (
                <span
                  className={`tabs-header__tab${
                    t.active ? ' tabs-header__tab--active' : ''
                  }${!t.title ? ' tabs-header__tab--empty' : ''}`}
                  key={t.keep ? t.props.uid : -index}
                  onMouseDown={(e) => {
                    if (this.state.editing !== t) {
                      if (this.state.editing && this.prevEl) {
                        this.blurInput(this.prevEl);
                      }
                      this.mouseDown(e, t);
                    }
                  }}
                  onDoubleClick={() => this.onDoubleClick(t)}
                  onMouseLeave={() => {
                    if (this.mouseOverTimeout)
                      clearTimeout(this.mouseOverTimeout);
                    if (this.state.longOver) {
                      this.mouseOverTimeout = setTimeout(() => {
                        this.setState({ longOver: null, firstLongOver: false });
                      }, 50);
                    }
                  }}
                  onMouseEnter={() => {
                    if (this.mouseOverTimeout)
                      clearTimeout(this.mouseOverTimeout);
                    if (this.state.longOver) {
                      this.setState({ longOver: t, firstLongOver: false });
                    } else {
                      this.mouseOverTimeout = setTimeout(() => {
                        this.setState({ longOver: t, firstLongOver: true });
                      }, 1000);
                    }
                  }}
                  style={{ width, zIndex: 9 }}
                >
                  {this.state.editing === t ? (
                    <span style={{ flex: 1 }}>
                      <input
                        className="tabs-header__input"
                        type="text"
                        defaultValue={t.title ?? ''}
                        ref={(el: HTMLInputElement | null) => {
                          if (el) {
                            el.focus();
                            el.setSelectionRange(0, (t.title ?? '').length);
                          }
                          this.prevEl = el;
                        }}
                        onKeyDown={this.onInputKeyDown}
                        onBlur={(e) =>
                          this.blurInput(e.target as HTMLInputElement)
                        }
                      />
                    </span>
                  ) : (
                    <span
                      className={`tabs-header__tab-name ${
                        t.keep ? '' : ' tabs-header__tab-name--preview'
                      }`}
                    >
                      {t.title || t.title2}
                    </span>
                  )}
                  {TabsHeader.statusRender(t)}
                  {this.state.editing === t ? (
                    <i className="tabs-header__close fa fa-close" />
                  ) : (
                    <i
                      className="tabs-header__close fa fa-close"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        if (this.mouseOverTimeout)
                          clearTimeout(this.mouseOverTimeout);
                        if (this.state.longOver) {
                          this.setState((state) => ({
                            ...state,
                            longOver: null,
                            firstLongOver: false,
                          }));
                        }
                        askToCloseTab(t.props);
                        e.stopPropagation();
                      }}
                    />
                  )}{' '}
                  {this.state.longOver && this.state.longOver === t ? (
                    <div
                      className="tabs-header__tab__hint"
                      style={
                        this.state.firstLongOver
                          ? {
                              animation: 'show 0.5s',
                            }
                          : undefined
                      }
                      ref={(el) => {
                        if (
                          el &&
                          el.getBoundingClientRect().right > window.innerWidth
                        ) {
                          el.style.left = 'auto';
                          el.style.right = '10px';
                        } else if (el && index === 0) {
                          el.style.marginLeft = '10px';
                        }
                      }}
                    >
                      {TabsHeader.hintRender(t)}
                    </div>
                  ) : null}
                </span>
              );
            })}
          </span>
          <span
            className="tabs-header__add"
            data-hint={this.state.addButtonTouched ? undefined : 'New Query'}
            onMouseLeave={() => {
              this.setState((state) => ({
                ...state,
                addButtonTouched: false,
              }));
            }}
            onClick={() => {
              this.setState((state) => ({
                ...state,
                addButtonTouched: true,
              }));
              newQueryTabInTheEnd();
            }}
          >
            <i className="tabs-header__plus fa fa-plus" />
          </span>
        </div>
      );
    }

    const { tabs, width } = this.calculate();
    return (
      <>
        <div
          className="tabs-header"
          style={{ left: this.props.left, zIndex: 8 }}
        >
          <span className="tabs-header__tabs" style={{ zIndex: 8 }}>
            {tabs.map((t, index) => (
              <span
                className={`tabs-header__tab${
                  t.active ? ' tabs-header__tab--active' : ''
                }${t.keep ? '' : ' preview'}${!t.title ? ' tabs-header__tab--empty' : ''}`}
                key={t.keep ? t.props.uid : -index}
                style={{
                  width,
                  position: 'absolute',
                  left: t.left,
                }}
              >
                <span
                  className={`tabs-header__tab-name ${
                    t.keep ? '' : ' tabs-header__tab-name--preview'
                  }`}
                >
                  {t.title || t.title2}
                </span>
                {TabsHeader.statusRender(t)}
                <i className="tabs-header__close fa fa-close" />
              </span>
            ))}
          </span>
          <span
            className="tabs-header__add"
            data-hint="New Query"
            onClick={() => newQueryTabInTheEnd()}
          >
            <i className="tabs-header__plus fa fa-plus" />
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 7,
          }}
        />
      </>
    );
  }
}
