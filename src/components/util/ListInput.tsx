/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert';
import { Component } from 'react';

const wm = new WeakMap<any>();
let count = 0;

export interface ListInputProps<Entry> {
  newEntry(): Entry;
  onChange(val: any): void;
  entryRender(
    e: Entry,
    set: (e2: Entry) => void,
    remove: null | (() => void)
  ): JSX.Element | null;
  entries: Entry[];
  // eslint-disable-next-line react/require-default-props
  type?: 'div' | 'span' | 'tr' | undefined;
  // eslint-disable-next-line react/require-default-props
  itemType?: 'div' | 'span' | 'tr' | undefined;
  // eslint-disable-next-line react/require-default-props
  itemStyle?: any | undefined;
  // eslint-disable-next-line react/require-default-props
  className?: string | undefined;
  // eslint-disable-next-line react/require-default-props
  itemClass?: string | undefined;
  // eslint-disable-next-line react/require-default-props
  style?: any;
}
export class ListInput<Entry extends object> extends Component<
  ListInputProps<Entry>,
  never
> {
  cache = new WeakMap<Entry>();

  newEntry: Entry | undefined;

  timeout: any;

  clone: any;

  el: HTMLElement | null = null;

  firstMousePos: any;

  firstPos: any;

  positions:
    | {
        left: number;
        right: number;
        top: number;
        bottom: number;
        center: number;
        el: HTMLElement;
      }[]
    | null = null;

  rowEl: any;

  lock: HTMLElement | null = null;

  firstScroll = 0;

  gap = 0;

  constructor(props: ListInputProps<Entry>) {
    super(props);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.buildNewEntry();
  }

  // componentWillReceiveProps (props) {
  //   if ( !this.newState || props.entries !== this.newState ) {
  //     if ( this.cache.clear )
  //       this.cache.clear();
  //     else
  //       this.cache = new WeakMap();
  //     this.newState = null;
  //   }
  // }

  onMouseUp(e: MouseEvent) {
    if (this.timeout) clearTimeout(this.timeout);
    const started = !!this.clone;
    if (started) {
      assert(!!this.positions);
      const yMove = e.pageY - this.firstMousePos.y;
      const center = this.firstPos.y + yMove + this.clone.offsetHeight / 2;
      const pos = [...this.positions];
      pos.slice(pos.length - 1, 1);
      const dropPos = pos
        .map((p, index) => ({
          distance: Math.abs(p.center - center),
          index,
        }))
        .reduce((current, item) => {
          if (current.distance < item.distance) return current;
          return item;
        }).index;
      let index = -1;
      const { el } = this;
      assert(!!el);
      const els = [...(el.children as any as any[])];
      for (const i in els) {
        if (els[i] === this.rowEl) {
          index = parseInt(i, 10);
        }
      }
      const entries = [...this.props.entries];
      const entry = entries.splice(index, 1)[0];
      entries.splice(dropPos, 0, entry);
      this.setNewState(entries);
    }
    if (this.clone) this.clone.parentNode.removeChild(this.clone);
    if (this.lock) (this.lock.parentNode as HTMLElement).removeChild(this.lock);
    this.rowEl.style.display =
      (this.props.itemStyle && this.props.itemStyle.display) || null;
    this.rowEl.style.opacity = null;
    this.clone = null;
    this.lock = null;
    this.rowEl = null;
    const { el } = this;
    assert(!!el);
    el.style.position = '';
    el.style.height = '';
    if (started) {
      assert(!!this.positions);
      this.positions.forEach((pos) => {
        pos.el.style.marginTop =
          (this.props.itemStyle && this.props.itemStyle.marginTop) || null;
        if (this.props.itemStyle && this.props.itemStyle.margin)
          pos.el.style.margin = this.props.itemStyle.margin;
        pos.el.style.width = '';
        pos.el.style.top = '';
        pos.el.style.position = '';
      });
    }
    this.positions = null;
    window.removeEventListener('mouseup', this.onMouseUp, true);
  }

  onMouseMove(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const xMove = e.pageX - this.firstMousePos.x;
    const yMove = e.pageY - this.firstMousePos.y;
    const center = this.firstPos.y + yMove + this.clone.offsetHeight / 2;
    this.clone.style.top = `${
      this.firstPos.y +
      yMove +
      this.firstScroll -
      document.documentElement.scrollTop
    }px`;
    this.clone.style.left = `${this.firstPos.x + xMove}px`;
    assert(!!this.positions);
    const pos = [...this.positions];
    pos.slice(pos.length - 1, 1);
    const dropPos = pos
      .map((p, index) => ({ distance: Math.abs(p.center - center), index }))
      .reduce((current, item) => {
        if (current.distance < item.distance) return current;
        return item;
      }).index;
    pos.forEach((p, i) => {
      const gap = i >= dropPos ? this.gap : 0;
      p.el.style.position = 'absolute';
      // pos.el.style.top = (pos.top-rect.top + gap) + 'px'
      p.el.style.top = `${p.top + gap}px`;
    });
  }

  onMouseDown(e: React.MouseEvent) {
    if (
      !e.target ||
      (e.target as HTMLElement).closest(
        'input,textarea,select,button,a,[tabindex],[tabIndex]'
      )
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rowEl = (e.target as HTMLElement).closest(
      '.list-input-item'
    ) as HTMLElement;
    const rect = rowEl.getClientRects()[0];
    window.addEventListener('mouseup', this.onMouseUp, true);
    this.rowEl = rowEl;
    this.firstScroll = document.documentElement.scrollTop;
    this.firstMousePos = { y: e.pageY, x: e.pageX };
    this.firstPos = { y: rect.top, x: rect.left };
    // e.preventDefault()
    // e.stopPropagation()
    this.timeout = setTimeout(() => {
      this.timeout = null;
      this.start();
    }, 10); // 250
  }

  setNewState(newState: Entry[]) {
    // this.newState = newState;
    this.props.onChange(newState);
    // setTimeout(()=>this.newState = null,1)
  }

  buildNewEntry() {
    const newEntry = this.props.newEntry();
    if (typeof newEntry !== 'object' || !newEntry) {
      throw new Error('Novo registro inválido. Registros devem ser objetos.');
    }
    if (wm.has(newEntry)) {
      throw new Error('Novo registro inválido. Objeto já utilizado.');
    }
    wm.set(newEntry, count);
    count += 1;
    this.newEntry = newEntry;
  }

  start() {
    assert(!!this.el);
    this.el.style.position = 'relative';
    this.el.style.height = `${this.el.offsetHeight}px`;
    const els = [...(this.el.children as any as any[])];
    // els.splice(els.length-1,1)
    const currentDisplay = this.rowEl.style.display;
    this.rowEl.style.display = 'none';
    const lastTop = els[els.length - 1].getClientRects()[0].top;
    const positions = els
      .filter((el) => el !== this.rowEl)
      .map((el) => {
        const { left, top, right, bottom } = el.getClientRects()[0];
        const y = (top + bottom) / 2;
        return { el, left, top, right, bottom, center: y };
      });
    this.rowEl.style.display = currentDisplay;
    const pos2 = els
      .filter((el) => el !== this.rowEl)
      .map((el) => {
        const { left, top, right, bottom } = el.getClientRects()[0];
        const y = (top + bottom) / 2;
        return { el, left, top, right, bottom, center: y };
      });
    const lastTop2 = els[els.length - 1].getClientRects()[0].top;
    this.gap = lastTop2 - lastTop;
    const rect = this.el.getClientRects()[0];
    pos2.forEach((pos) => {
      pos.el.style.position = 'absolute';
      pos.el.style.top = `${pos.top - rect.top}px`;
      pos.el.style.width = `${pos.right - pos.left}px`;
      pos.el.style.marginTop = '0';
    });
    const rect2 = this.el.getClientRects()[0];
    this.positions = positions.map((pos) => {
      return { ...pos, top: pos.top - rect2.top };
    });
    const clone = this.rowEl.cloneNode(true);
    clone.style.width = `${this.rowEl.offsetWidth}px`;
    clone.style.position = 'fixed';
    clone.style.top = `${this.firstPos.y}px`;
    clone.style.left = `${this.firstPos.x}px`;
    const lock = document.createElement('div');
    lock.style.background = 'white';
    // eslint-disable-next-line no-multi-assign
    clone.style.zIndex = lock.style.zIndex = '999999';
    lock.style.opacity = '0';
    lock.style.position = 'fixed';
    lock.style.top = '0';
    lock.style.left = '0';
    lock.style.right = '0';
    lock.style.bottom = '0';
    this.lock = lock;
    this.clone = clone;
    this.lock.addEventListener('mousemove', this.onMouseMove, false);
    document.body.appendChild(clone);
    document.body.appendChild(lock);
    this.rowEl.style.opacity = '0';
  }

  entryRender(e: Entry) {
    if (this.cache.has(e)) {
      return this.cache.get(e);
    }
    const el = this.props.entryRender(
      e,
      (newValue) => {
        let index = this.props.entries.indexOf(e);
        if (index === -1) index = this.props.entries.length;
        const { props } = this;
        if (wm.has(newValue) && wm.get(newValue) !== wm.get(e))
          throw new Error('Valor inválido.');
        wm.set(newValue, wm.get(e));
        const newState = [
          ...props.entries.filter((_, i2) => i2 < index),
          newValue,
          ...props.entries.filter((_, i2) => i2 > index),
        ];
        if (this.newEntry === e) {
          this.buildNewEntry();
        }
        this.cache.delete(e);
        this.setNewState(newState);
        // ;
      },
      this.newEntry === e
        ? null
        : () => {
            const index = this.props.entries.indexOf(e);
            const newState = [
              ...this.props.entries.filter((_, i2) => i2 < index),
              ...this.props.entries.filter((_, i2) => i2 > index),
            ];
            this.cache.delete(e);
            this.setNewState(newState);
          }
    );
    this.cache.set(e, el);
    return el;
  }

  render() {
    const { props } = this;
    if (!(props.entries instanceof Array))
      throw new Error('Entries deve ser um Array.');
    for (const e of props.entries)
      if (!e || typeof e !== 'object')
        throw new Error('Registro inválido. Registros devem ser objetos.');
    props.entries.forEach((e) => {
      if (!wm.has(e)) {
        wm.set(e, count);
        count += 1;
      }
    });
    const types = {
      container: this.props.type || 'div',
      item: this.props.itemType || 'div',
    };
    return (
      <types.container
        className={`list-input${
          this.props.className ? ` ${this.props.className}` : ''
        }`}
        style={this.props.style}
        ref={(el: HTMLElement | null) => {
          this.el = el;
        }}
      >
        {[...props.entries, this.newEntry].map((e) => (
          <types.item
            style={this.props.itemStyle}
            key={wm.get(e)}
            onMouseDown={this.newEntry === e ? undefined : this.onMouseDown}
            className={`list-input-item${
              this.props.itemClass ? ` ${this.props.itemClass}` : ''
            }`}
          >
            {e ? this.entryRender(e) : null}
          </types.item>
        ))}
      </types.container>
    );
  }
}
