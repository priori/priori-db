import * as React from "react";
import { Component } from "react";
import { AbstractTabProps } from "../../types";

function keys(a: any, b: any) {
  const k1 = Object.keys(a).concat(Object.keys(b));
  const keys = k1.filter((k, i) => k1.indexOf(k) == i);
  return keys;
}

function equals(a: any, b: any) {
  if (a === b) return true;
  if ((a && !b) || (!a && b)) return false;
  if (typeof a == "object" && typeof b == "object") {
    for (const i of keys(a, b)) {
      if (!equals(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a == "number" && isNaN(a) && typeof b == "number" && isNaN(b))
    return true;
  return false;
}

export abstract class Frame<T extends AbstractTabProps, T2> extends Component<
  T,
  T2
> {
  constructor(props: T) {
    super(props);
  }

  activeProp(nextVal: any) {
    if (nextVal) this.show();
    else this.hide();
  }

  componentWillReceiveProps(nextProps: T) {
    for (const i of keys(this.props, nextProps)) {
      const isEquals = equals((this.props as any)[i], (nextProps as any)[i]);
      if (!isEquals) {
        if (typeof (this as any)[i + "Prop"] == "function")
          ((this as any)[i + "Prop"] as any)((nextProps as any)[i], nextProps);
      }
    }
  }

  shouldComponentUpdate(nextProps: T, nextState: T2) {
    if (!equals(nextState, this.state)) return true;
    for (const i of keys(nextProps, this.props)) {
      const isEquals = equals((this.props as any)[i], (nextProps as any)[i]);
      if (!isEquals) {
        if (typeof (this as any)[i + "Prop"] != "function") return true;
      }
    }
    return false;
  }

  show() {
    if (this.el) this.el.classList.add("active");
  }

  hide() {
    if (this.el) this.el.classList.remove("active");
  }
  el: HTMLElement | null = null;
}
