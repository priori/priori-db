import * as React from "react";

const wm = new WeakMap();
let count = 0;

export interface ListInputProps<Entry>{
    newEntry(): Entry,
    onChange(val:any):void,
    entryRender(e:Entry,set:(e2:Entry)=>void, remove:(null|(()=>void))):JSX.Element|null,
    entries:Entry[],
    type?:string,
    itemType?:string,
    itemStyle?:any,
    className?:string,
    itemClass?:string,
    style?:any
}
export interface ListInputState{

}

export class ListInput<Entry> extends React.Component<ListInputProps<Entry>,ListInputState>{

    cache = new WeakMap()
    constructor(props:ListInputProps<Entry>){
        super(props);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.buildNewEntry();
    }
    newEntry:Entry
    timeout:any
    clone:any
    el:HTMLElement
    firstMousePos:any
    firstPos:any
    positions:{
      left:number,right:number,top:number,bottom:number,center:number,el:HTMLElement
    }[]|null = null
    rowEl:any
    firstScroll=0

    buildNewEntry(){
        const newEntry = this.props.newEntry();
        if ( typeof newEntry != 'object' || !newEntry ){
            throw 'Novo registro inválido. Registros devem ser objetos.';
        }
        if ( wm.has(newEntry) ) {
            throw 'Novo registro inválido. Objeto já utilizado.'
        }
        wm.set(newEntry,count++);
        this.newEntry = newEntry;
    }
    lock?:HTMLElement|null

    onMouseUp (e:MouseEvent) {
        if ( this.timeout )
            clearTimeout(this.timeout);
        const started = !!this.clone;
        if ( started ) {
            if ( !this.positions )
                throw 'No positions.'
            const yMove = e.pageY - this.firstMousePos.y,
                center = this.firstPos.y + yMove + this.clone.offsetHeight / 2,
                pos = [...this.positions];
            pos.slice(pos.length - 1, 1);
            let dropPos = pos.map((p, index) => ({
                distance: Math.abs(p.center - center),
                index
            })).reduce((current, item) => {
                if (current.distance < item.distance)
                    return current;
                return item;
            }).index;
            let index = -1;
            const els = [...(this.el.children as any as any[])];
            for (const i in els) {
                if (els[i] == this.rowEl) {
                    index = parseInt(i);
                }
            }
            const entries = [...this.props.entries];
            const entry = entries.splice(index,1)[0];
            entries.splice(dropPos,0,entry);
            this.setNewState(entries);
        }
        if ( this.clone )
            this.clone.parentNode.removeChild(this.clone);
        if ( this.lock)
            (this.lock.parentNode as HTMLElement).removeChild(this.lock);
        this.rowEl.style.display = this.props.itemStyle && this.props.itemStyle.display || null;
        this.rowEl.style.opacity = null;
        this.rowEl = this.lock = this.clone = null;
        this.el.style.height = this.el.style.position = null;
        if ( started ) {
            if ( !this.positions )
                throw 'No positions.'
            this.positions.forEach(pos => {
                pos.el.style.marginTop = this.props.itemStyle && this.props.itemStyle.marginTop || null;
                if ( this.props.itemStyle && this.props.itemStyle.margin )
                    pos.el.style.margin = this.props.itemStyle.margin;
                pos.el.style.width = pos.el.style.top = pos.el.style.position = null;
            });
        }
        this.positions = null;
        window.removeEventListener('mouseup',this.onMouseUp,true);
    }

    onMouseMove (e:MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const xMove = e.pageX - this.firstMousePos.x,
            yMove = e.pageY - this.firstMousePos.y,
            center = this.firstPos.y + yMove + this.clone.offsetHeight / 2;
        this.clone.style.top = (this.firstPos.y + yMove + this.firstScroll - document.documentElement.scrollTop) + 'px';
        this.clone.style.left = (this.firstPos.x + xMove) + 'px';
        if ( !this.positions )
            throw 'No positions.'
        const pos = [...this.positions];
        pos.slice(pos.length-1,1);
        let dropPos = pos.map((p,index)=>({distance: Math.abs(p.center - center),index})).reduce((current,item)=>{
            if ( current.distance < item.distance )
                return current;
            return item;
        }).index;
        pos.forEach((pos,i)=>{
            const gap = i >= dropPos ? this.gap : 0;
            pos.el.style.position = 'absolute';
            // pos.el.style.top = (pos.top-rect.top + gap) + 'px'
            pos.el.style.top = (pos.top + gap) + 'px';
        });
    }

    onMouseDown (e:MouseEvent) {
        if ( !e.target || (e.target as any).closest('input,textarea,select,button,a,[tabindex],[tabIndex]') ) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const rowEl = (e.target as any).closest('.list-input-item') as HTMLElement;
        const rect = rowEl.getClientRects()[0];
        window.addEventListener('mouseup',this.onMouseUp,true);
        this.rowEl = rowEl;
        this.firstScroll = document.documentElement.scrollTop;
        this.firstMousePos = {y:e.pageY, x: e.pageX};
        this.firstPos = {y:rect.top, x:rect.left};
        // e.preventDefault()
        // e.stopPropagation()
        this.timeout = setTimeout(()=>{
            this.timeout = null;
            this.start();
        },10); // 250
    }

    gap=0
    start () {
        this.el.style.position = 'relative';
        this.el.style.height = this.el.offsetHeight + 'px';
        const els = [...this.el.children as any as any[]];
        // els.splice(els.length-1,1)
        const currentDisplay = this.rowEl.style.display;
        this.rowEl.style.display = 'none';
        const lastTop = els[els.length-1].getClientRects()[0].top;
        const positions = els.filter(el=>el!=this.rowEl).map(el=>{
            const {left,top,right,bottom} = el.getClientRects()[0];
            const y = (top+bottom)/2;
            return { el, left, top, right, bottom, center: y };
        })
        this.rowEl.style.display = currentDisplay;
        const pos2 = els.filter(el=>el!=this.rowEl).map(el=>{
            const {left,top,right,bottom} = el.getClientRects()[0];
            const y = (top+bottom)/2;
            return { el, left, top, right, bottom, center: y };
        })
        const lastTop2 = els[els.length-1].getClientRects()[0].top;
        this.gap = lastTop2 - lastTop;
        const rect = this.el.getClientRects()[0];
        pos2.forEach(pos=>{
            pos.el.style.position = 'absolute';
            pos.el.style.top = (pos.top-rect.top) + 'px';
            pos.el.style.width = (pos.right - pos.left) + 'px';
            pos.el.style.marginTop = '0';
        });
        const rect2 = this.el.getClientRects()[0];
        this.positions = positions.map(pos=>{
            return {...pos,
                top: pos.top - rect2.top
            }
        });
        const clone = this.rowEl.cloneNode(true);
        clone.style.width = this.rowEl.offsetWidth+'px';
        clone.style.position = 'fixed';
        clone.style.top = this.firstPos.y + 'px';
        clone.style.left = this.firstPos.x + 'px';
        const lock = document.createElement('div');
        lock.style.background = 'white';
        clone.style.zIndex = lock.style.zIndex = '999999';
        lock.style.opacity = '0';
        lock.style.position = 'fixed';
        lock.style.top = '0';
        lock.style.left = '0';
        lock.style.right = '0';
        lock.style.bottom = '0';
        this.lock = lock;
        this.clone = clone;
        this.lock.addEventListener('mousemove',this.onMouseMove,false);
        document.body.appendChild(clone);
        document.body.appendChild(lock);
        this.rowEl.style.opacity = '0';
    }

    render () {
        const {props} = this;
        if ( !(props.entries instanceof Array) )
            throw 'Entries deve ser um Array.';
        for ( const e of props.entries )
            if ( !e || typeof e != 'object')
                throw 'Registro inválido. Registros devem ser objetos.';
        props.entries.forEach(e=>{
            if ( !wm.has(e) ) {
                wm.set(e,count++);
            }
        });
        const types = {
            container: this.props.type || 'div',
            item: this.props.itemType || 'div'
        };
        return <types.container
            className={'list-input'+(this.props.className?' '+this.props.className:'')}
            style={this.props.style}
            ref={(el:HTMLElement)=>this.el = el}>
            {[...props.entries,this.newEntry].map((e) => <types.item
                style={this.props.itemStyle}
                key={wm.get(e)}
                onMouseDown={this.newEntry == e ? undefined : this.onMouseDown}
                className={'list-input-item'+(this.props.itemClass?' '+this.props.itemClass:'')}>
                {this.entryRender(e)}
            </types.item>)}
        </types.container>
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

    setNewState(newState:Entry[]){
        // this.newState = newState;
        this.props.onChange(newState);
        // setTimeout(()=>this.newState = null,1)
    }

    entryRender (e:Entry) {
        if ( this.cache.has(e) ) {
            return this.cache.get(e);
        }
        const el = this.props.entryRender(e, (newValue)=>{
            let index = this.props.entries.indexOf(e)
            if ( index == -1 )
                index = this.props.entries.length;
            const {props} = this;
            if ( wm.has(newValue) && wm.get(newValue) != wm.get(e) )
                throw 'Valor inválido.';
            wm.set(newValue,wm.get(e));
            const newState = [...props.entries.filter((e,i2)=>i2<index), newValue, ...props.entries.filter((e,i2)=>i2>index)];
            if ( this.newEntry == e ) {
                this.buildNewEntry();
            }
            this.cache.delete(e);
            this.setNewState(newState);
            // ;
        }, this.newEntry == e ? null :() => {
            const index = this.props.entries.indexOf(e)
            const newState = [...this.props.entries.filter((e,i2)=>i2<index), ...this.props.entries.filter((e,i2)=>i2>index)];
            this.cache.delete(e);
            this.setNewState(newState);
        });
        this.cache.set(e,el);
        return el;
    }
}