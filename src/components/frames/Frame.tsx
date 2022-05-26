/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from 'react';
import { AbstractTabProps } from '../../types';

function keys(a: any, b: any): string[] {
  const k1 = Object.keys(a).concat(Object.keys(b));
  const keys2 = k1.filter((k, i) => k1.indexOf(k) === i);
  return keys2;
}

function equals(a: any, b: any) {
  if (a === b) return true;
  if ((a && !b) || (!a && b)) return false;
  if (typeof a === 'object' && typeof b === 'object') {
    const keys2 = keys(a, b);
    for (const i of keys2) {
      if (!equals(a[i], b[i])) return false;
    }
    return true;
  }
  if (
    typeof a === 'number' &&
    Number.isNaN(a) &&
    typeof b === 'number' &&
    Number.isNaN(b)
  )
    return true;
  return false;
}

export abstract class Frame<T extends AbstractTabProps, T2> extends Component<
  T,
  T2
> {
  el: HTMLElement | null = null;

  UNSAFE_componentWillReceiveProps(nextProps: T) {
    for (const i of keys(this.props, nextProps)) {
      const isEquals = equals((this.props as any)[i], (nextProps as any)[i]);
      if (!isEquals) {
        if (typeof (this as any)[`${i}Prop`] === 'function')
          ((this as any)[`${i}Prop`] as any)((nextProps as any)[i], nextProps);
      }
    }
  }

  shouldComponentUpdate(nextProps: T, nextState: T2) {
    if (!equals(nextState, this.state)) return true;
    for (const i of keys(nextProps, this.props)) {
      const isEquals = equals((this.props as any)[i], (nextProps as any)[i]);
      if (!isEquals) {
        if (typeof (this as any)[`${i}Prop`] !== 'function') return true;
      }
    }
    return false;
  }

  activeProp(nextVal: any) {
    if (nextVal) this.show();
    else this.hide();
  }

  show() {
    if (this.el) this.el.classList.add('active');
  }

  hide() {
    if (this.el) this.el.classList.remove('active');
  }
}
