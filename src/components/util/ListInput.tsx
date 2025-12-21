import { assert } from 'util/assert';
import { Component, CSSProperties, ReactElement } from 'react';

export interface ListInputProps<Entry> {
  newEntry(): Entry;
  onChange(val: Entry[]): void;
  entryRender(
    e: Entry,
    set: (e2: Entry) => void,
    remove: null | (() => void),
  ): ReactElement | null;
  entries: Entry[];
  type?: 'div' | 'span' | 'tr' | undefined;
  itemType?: 'div' | 'span' | 'tr' | undefined;
  itemStyle?: CSSProperties | undefined;
  className?: string | undefined;
  itemClass?: string | undefined;
  style?: CSSProperties;
}

export class ListInput<Entry extends object> extends Component<
  ListInputProps<Entry>,
  never
> {
  wm = new WeakMap<Entry, number>();

  count = 0;

  cache = new WeakMap<Entry>();

  newEntry: Entry | undefined;

  timeout: ReturnType<typeof setTimeout> | null = null;

  clone: HTMLElement | null = null;

  el: HTMLElement | null = null;

  firstMousePos: { x: number; y: number } | undefined = undefined;

  firstPos: { x: number; y: number } | undefined = undefined;

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

  rowEl: HTMLElement | null = null;

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
      assert(!!this.clone);
      assert(!!this.firstMousePos);
      assert(!!this.firstPos);
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
      const els = [...(el.children as unknown as HTMLElement[])];
      for (const i in els) {
        if (els[i] === this.rowEl) {
          index = parseInt(i, 10);
        }
      }
      const entries = [...this.props.entries];
      const entry = entries.splice(index, 1)[0];
      if (entry) entries.splice(dropPos, 0, entry);
      this.setNewState(entries);
    }
    if (this.clone) {
      assert(this.clone.parentNode);
      this.clone.parentNode.removeChild(this.clone);
    }
    if (this.lock) (this.lock.parentNode as HTMLElement).removeChild(this.lock);
    assert(this.rowEl);
    this.rowEl.style.display =
      (this.props.itemStyle && `${this.props.itemStyle.display}`) || '';
    this.rowEl.style.opacity = '';
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
          (this.props.itemStyle && `${this.props.itemStyle.marginTop}`) || '';
        if (this.props.itemStyle && this.props.itemStyle.margin)
          pos.el.style.margin = `${this.props.itemStyle.margin}`;
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
    assert(!!this.firstMousePos);
    const xMove = e.pageX - this.firstMousePos.x;
    const yMove = e.pageY - this.firstMousePos.y;
    assert(!!this.clone);
    assert(!!this.firstPos);
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

  onMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (
      e.target instanceof HTMLElement &&
      (e.target.matches(
        'input,textarea,select,button,a,[tabindex],[tabIndex]',
      ) ||
        e.currentTarget.contains(
          e.target.closest(
            'input,textarea,select,button,a,[tabindex],[tabIndex]',
          ),
        ))
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rowEl = (e.target as HTMLElement).closest(
      '.list-input-item',
    ) as HTMLElement;
    const rect = rowEl.getClientRects()[0];
    window.addEventListener('mouseup', this.onMouseUp, true);
    this.rowEl = rowEl;
    this.firstScroll = document.documentElement.scrollTop;
    this.firstMousePos = { y: e.pageY, x: e.pageX };
    assert(rect);
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
    if (this.wm.has(newEntry)) {
      throw new Error('Novo registro inválido. Objeto já utilizado.');
    }
    this.wm.set(newEntry, this.count);
    this.count += 1;
    this.newEntry = newEntry;
  }

  start() {
    assert(!!this.el);
    assert(this.rowEl);
    this.el.style.position = 'relative';
    this.el.style.height = `${this.el.offsetHeight}px`;
    const els = [...(this.el.children as unknown as HTMLElement[])];
    // els.splice(els.length-1,1)
    const currentDisplay = this.rowEl.style.display;
    this.rowEl.style.display = 'none';
    const rect3 = els[els.length - 1]?.getClientRects()[0];
    assert(rect3);
    const lastTop = rect3.top;
    const positions = els
      .filter((el) => el !== this.rowEl)
      .map((el) => {
        const rect4 = el.getClientRects()[0];
        assert(rect4);
        const { left, top, right, bottom } = rect4;
        const y = (top + bottom) / 2;
        return { el, left, top, right, bottom, center: y };
      });
    this.rowEl.style.display = currentDisplay;
    const pos2 = els
      .filter((el) => el !== this.rowEl)
      .map((el) => {
        const rect = el.getClientRects()[0];
        assert(rect);
        const { left, top, right, bottom } = rect;
        const y = (top + bottom) / 2;
        return { el, left, top, right, bottom, center: y };
      });
    const rectLast = els[els.length - 1]?.getClientRects()[0];
    assert(rectLast);
    const lastTop2 = rectLast.top;
    this.gap = lastTop2 - lastTop;
    const rect = this.el.getClientRects()[0];
    pos2.forEach((pos) => {
      pos.el.style.position = 'absolute';
      pos.el.style.top = `${pos.top - (rect?.top ?? 0)}px`;
      pos.el.style.width = `${pos.right - pos.left}px`;
      pos.el.style.marginTop = '0';
    });
    const rect2 = this.el.getClientRects()[0];
    this.positions = positions.map((pos) => {
      return { ...pos, top: pos.top - (rect2?.top ?? 0) };
    });
    const clone = this.rowEl.cloneNode(true) as HTMLElement;
    clone.style.width = `${this.rowEl.offsetWidth}px`;
    clone.style.position = 'fixed';
    assert(!!this.firstPos);
    clone.style.top = `${this.firstPos.y}px`;
    clone.style.left = `${this.firstPos.x}px`;
    const lock = document.createElement('div');
    lock.style.background = 'white';
    clone.style.zIndex = '999999';
    lock.style.zIndex = '999999';
    lock.style.opacity = '0';
    lock.style.position = 'fixed';
    lock.style.top = '0';
    lock.style.left = '0';
    lock.style.right = '0';
    lock.style.bottom = '0';
    const selects2 = clone.querySelectorAll('select');
    const selects = this.rowEl.querySelectorAll('select');
    for (let i = 0; i < selects.length; i += 1) {
      const sel2 = selects2[i];
      const sel = selects[i];
      if (
        sel instanceof HTMLSelectElement &&
        sel2 instanceof HTMLSelectElement
      ) {
        sel2.selectedIndex = sel.selectedIndex;
        sel2.value = sel.value;
      }
    }
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
        if (this.wm.has(newValue) && this.wm.get(newValue) !== this.wm.get(e))
          throw new Error('Valor inválido.');
        this.wm.set(newValue, this.wm.get(e) as number);
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
          },
    );
    this.cache.set(e, el);
    return el;
  }

  override render() {
    const { props } = this;
    if (!(props.entries instanceof Array))
      throw new Error('Entries deve ser um Array.');
    for (const e of props.entries)
      if (!e || typeof e !== 'object')
        throw new Error('Registro inválido. Registros devem ser objetos.');
    props.entries.forEach((e) => {
      if (!this.wm.has(e)) {
        this.wm.set(e, this.count);
        this.count += 1;
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
            key={e ? this.wm.get(e) : -1}
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
