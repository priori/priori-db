import { assert } from 'util/assert';
import { Component, KeyboardEventHandler } from 'react';
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

export interface TabsProps {
  tabs: Tab[];
  onActiveTabMouseDown: () => void;
}
export interface TabWidth extends Tab {
  width: number;
}
export interface TabsState {
  tabs: TabWidth[];
  sorting: boolean;
  initialClientX: number;
  offset: number;
  editing: Tab | null;
}

export class Tabs extends Component<TabsProps, TabsState> {
  static tabsDoubleClick(e: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    const el = e.target;
    if (el instanceof HTMLElement) {
      if (el.matches('span.tabs')) {
        newQueryTabInTheEnd();
      }
    }
  }

  prevEl: HTMLInputElement | null = null;

  constructor(props: TabsProps) {
    super(props);

    const areaWidth = window.innerWidth - 250 - 40;
    let width = areaWidth / props.tabs.length;
    if (width > 220) width = 220;
    width += 1;
    const tabs = props.tabs
      ? props.tabs.map((t) => {
          return {
            ...t,
            width,
          };
        })
      : [];

    this.state = {
      tabs,
      sorting: false,
      initialClientX: 0,
      offset: 0,
      editing: null,
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

  UNSAFE_componentWillReceiveProps(next: TabsProps) {
    if (this.state.sorting) this.applySort();
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
    if (t.props.type === 'query') {
      this.setState((state) => ({
        ...state,
        editing: t,
      }));
    } else if (t.active && t.props.type === 'table' && t.active && t.keep) {
      extraTableTab(t.props.schema, t.props.table);
    } else keepTabOpen(t);
  }

  blurInput(input: HTMLInputElement) {
    const { editing } = this.state;
    assert(editing);
    updateTabText(editing.props.uid, input.value);
    this.setState((state) => ({
      ...state,
      editing: null,
    }));
  }

  private fit() {
    const areaWidth = window.innerWidth - 250 - 40;
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
    this.setState((state) => ({
      ...state,
      sorting: true,
      initialClientX: e.clientX,
      offset: 0,
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
    // let pos = 0;
    const areaWidth = window.innerWidth - 250 - 40;
    let offsetWidth = areaWidth / this.state.tabs.length;
    if (offsetWidth > 220) offsetWidth = 220;
    const styleWidth = offsetWidth + 1;

    const currentActiveIndex = this.props.tabs.findIndex((t) => t.active);
    const indexOffset = Math.round(this.state.offset / offsetWidth);
    const finalActiveIndex = currentActiveIndex + indexOffset;
    const tabs = this.props.tabs.map((t, i) => {
      if (t.active) {
        // pos += offsetWidth;
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
        <div className="tabs-header" tabIndex={0} style={{ outline: 'none' }}>
          <span className="tabs" onDoubleClick={Tabs.tabsDoubleClick}>
            {this.props.tabs.map((t, index) => {
              const { width } = this.state.tabs[index];
              return (
                <span
                  className={`tab${t.active ? ' active' : ''}${
                    t.keep ? '' : ' pik'
                  }`}
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
                  style={{ width }}
                >
                  {this.state.editing === t ? (
                    <input
                      type="text"
                      defaultValue={t.title}
                      ref={(el: HTMLInputElement | null) => {
                        if (el) {
                          el.focus();
                          el.setSelectionRange(0, t.title.length);
                          // } else if ( this.state.editing == t && this.prevEl ){
                          // this.blurInput(this.prevEl);
                        }
                        this.prevEl = el;
                      }}
                      onKeyDown={this.onInputKeyDown}
                      onBlur={(e) =>
                        this.blurInput(e.target as HTMLInputElement)
                      }
                    />
                  ) : (
                    <span className="tab-name">{t.title}</span>
                  )}
                  {this.state.editing === t ? (
                    <i className="fa fa-close" />
                  ) : (
                    <i
                      className="fa fa-close"
                      onClick={(e) => {
                        askToCloseTab(t.props);
                        e.stopPropagation();
                      }}
                    />
                  )}
                </span>
              );
            })}
          </span>
          <span className="add" onClick={() => newQueryTabInTheEnd()}>
            <i className="fa fa-plus" />
          </span>
        </div>
      );
    }

    const { tabs, width } = this.calculate();
    return (
      <div className="tabs-header">
        <span className="tabs">
          {tabs.map((t, index) => (
            <span
              className={`tab${t.active ? ' active' : ''}${
                t.keep ? '' : ' pik'
              }`}
              key={t.keep ? t.props.uid : -index}
              style={{ width, position: 'absolute', left: t.left }}
            >
              <span className="tab-name">{t.title}</span>
              <i className="fa fa-close" />
            </span>
          ))}
        </span>
        <span className="add" onClick={() => newQueryTabInTheEnd()}>
          <i className="fa fa-plus" />
        </span>
      </div>
    );
  }
}
