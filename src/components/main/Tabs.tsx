import * as React from "react";
import { Component } from "react";
import { activateTab, changeTabsSort, closeTab, newQuery } from "../../actions";
import { AbstractTabProps, FrameProps } from "../../types";
import { updateTabText } from "../../state";

export interface TabsProps {
  tabs: FrameProps[];
}
export interface Tab extends AbstractTabProps {
  width: number;
}
export interface TabsState {
  tabs: Tab[];
  sorting: boolean;
  initialClientX: number;
  offset: number;
  editing: FrameProps | null;
}

export class Tabs extends Component<TabsProps, TabsState> {
  constructor(props: TabsProps) {
    super(props);

    const areaWidth = window.innerWidth - 250 - 40;
    let width = areaWidth / props.tabs.length;
    if (width > 220) width = 220;
    width++;
    const tabs = props.tabs
      ? props.tabs.map(t => {
          return {
            ...t,
            width
          };
        })
      : [];

    this.state = {
      tabs,
      sorting: false,
      initialClientX: 0,
      offset: 0,
      editing: null
    };
    this.fit = this.fit.bind(this);
    this.windowMouseMove = this.windowMouseMove.bind(this);
    this.windowMouseUp = this.windowMouseUp.bind(this);
    this.windowBlur = this.windowBlur.bind(this);

    window.addEventListener("resize", this.fit);
    window.addEventListener("mousemove", this.windowMouseMove);
    window.addEventListener("mouseup", this.windowMouseUp);
    window.addEventListener("blur", this.windowBlur);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.fit);
    window.removeEventListener("mousemove", this.windowMouseMove);
    window.removeEventListener("mouseup", this.windowMouseUp);
    window.removeEventListener("blur", this.windowBlur);
  }

  private windowMouseMove(e: any) {
    if (!this.state.sorting) return;
    this.set({
      offset: e.clientX - this.state.initialClientX
    });
  }

  private mouseDown(e: any, t: FrameProps) {
    activateTab(t);
    this.set({
      sorting: true,
      initialClientX: e.clientX,
      offset: 0
    });
  }
  private windowMouseUp() {
    if (!this.state.sorting) return;
    const { tabs } = this.calculate();
    tabs.sort((a, b) => a.left - b.left);
    this.applySort();
    changeTabsSort(tabs.map(a => a.uid));
  }
  private windowBlur() {
    if (this.state.sorting) this.applySort();
  }

  private applySort() {
    this.set({ sorting: false });
  }

  private set(o: any) {
    this.setState(o);
  }

  componentWillReceiveProps(next: TabsProps) {
    if (this.state.sorting) this.applySort();
    const tabs = next.tabs.map(t => {
      const current = this.state.tabs.find(t2 => t2.uid == t.uid) || t;
      return {
        ...current,
        width: (current as any).width || 0
      };
    });
    this.set({
      tabs
    });
    setTimeout(() => {
      this.fit();
    }, 1);
  }

  private fit() {
    const areaWidth = window.innerWidth - 250 - 40;
    let width = areaWidth / this.state.tabs.length;
    if (width > 220) width = 220;
    width++;
    this.set({
      tabs: this.state.tabs.map(t => ({ ...t, width }))
    });
  }

  prevEl: HTMLInputElement | null = null;
  render() {
    if (!this.state.sorting) {
      return (
        <div className="tabs-header">
          <span className="tabs">
            {this.props.tabs.map((t, index) => {
              const width = this.state.tabs[index].width;
              return (
                <span
                  className={"tab" + (t.active ? " active" : "")}
                  key={t.uid}
                  onMouseDown={(e: React.MouseEvent<HTMLSpanElement>) => {
                    if (this.state.editing != t) {
                      if (this.state.editing && this.prevEl) {
                        this.blurInput(this.prevEl);
                      }
                      this.mouseDown(e, t);
                    }
                  }}
                  onDoubleClick={() => this.onDoubleClick(t)}
                  style={{ width }}
                >
                  {this.state.editing == t ? (
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
                      onBlur={(e: React.MouseEvent<HTMLInputElement>) =>
                        this.blurInput(e.target as HTMLInputElement)
                      }
                    />
                  ) : (
                    <span className="tab-name">{t.title}...</span>
                  )}
                  {this.state.editing == t ? (
                    <i className="fa fa-close" />
                  ) : (
                    <i
                      className="fa fa-close"
                      onClick={(e: React.MouseEvent<HTMLElement>) => {
                        closeTab(t);
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
          {tabs.map(t => (
            <span
              className={"tab" + (t.active ? " active" : "")}
              key={t.uid}
              style={{ width, position: "absolute", left: t.left }}
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

  blurInput(input: HTMLInputElement) {
    updateTabText(this.state.editing, input.value);
    this.setState({
      ...this.state,
      editing: null
    });
  }

  onDoubleClick(t: FrameProps) {
    if (t.type == "query") {
      this.setState({
        ...this.state,
        editing: t
      });
    }
  }

  private calculate() {
    let pos = 0;
    const areaWidth = window.innerWidth - 250 - 40;
    let offsetWidth = areaWidth / this.state.tabs.length;
    if (offsetWidth > 220) offsetWidth = 220;
    const styleWidth = offsetWidth + 1;

    const currentActiveIndex = this.props.tabs.findIndex(t => t.active);
    let indexOffset = Math.round(this.state.offset / offsetWidth);
    const finalActiveIndex = currentActiveIndex + indexOffset;
    const tabs = this.props.tabs.map((t, i) => {
      if (t.active) {
        pos += offsetWidth;
        let left = this.state.offset + currentActiveIndex * offsetWidth;
        if (left < 0) left = 0;
        if (left && left + styleWidth + 1 > areaWidth)
          left = areaWidth - offsetWidth;
        return { ...t, left, styleWidth };
      }
      if (i < currentActiveIndex && i >= finalActiveIndex) i++;
      else if (i > currentActiveIndex && i <= finalActiveIndex) i--;
      const left = offsetWidth * i;
      return { ...t, left, styleWidth };
    });
    return { tabs, width: styleWidth };
  }
}
