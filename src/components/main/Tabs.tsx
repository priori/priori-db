import { Component, MouseEventHandler } from 'react';
import {
  activateTab,
  changeTabsSort,
  askToCloseTab,
  newQuery,
  keepTabOpen,
  updateTabText,
} from '../../actions';
import { Tab } from '../../types';

export interface TabsProps {
  tabs: Tab[];
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
    const tabs = next.tabs.map((t) => {
      const currentTab = this.state.tabs.find(
        (t2) => t2.props.uid === t.props.uid
      );
      const current = currentTab || t;
      return {
        ...current,
        width:
          currentTab && typeof currentTab.width === 'number'
            ? currentTab.width
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

  onDoubleClick(t: Tab) {
    if (t.props.type === 'query') {
      this.setState((state) => ({
        ...state,
        editing: t,
      }));
    } else {
      keepTabOpen(t);
    }
  }

  tabsDoubleClick: MouseEventHandler<HTMLSpanElement> = (e) => {
    const el = e.target;
    if (el instanceof HTMLElement) {
      if (el.matches('span.tabs')) {
        newQuery();
      }
    }
  };

  blurInput(input: HTMLInputElement) {
    updateTabText(this.state.editing, input.value);
    this.setState((state) => ({
      ...state,
      editing: null,
    }));
  }

  UNSAFE_componentWillUnmount() {
    window.removeEventListener('resize', this.fit);
    window.removeEventListener('mousemove', this.windowMouseMove);
    window.removeEventListener('mouseup', this.windowMouseUp);
    window.removeEventListener('blur', this.windowBlur);
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
    changeTabsSort(tabs.map((a) => a.props.uid));
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
        <div className="tabs-header">
          <span className="tabs" onDoubleClick={this.tabsDoubleClick}>
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
          <span className="add" onClick={() => newQuery()}>
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
        <span className="add" onClick={() => newQuery()}>
          <i className="fa fa-plus" />
        </span>
      </div>
    );
  }
}
