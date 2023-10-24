/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, CSSProperties } from 'react';

export interface EditorProps {
  style: CSSProperties | undefined;
}
export class Editor extends Component<EditorProps, never> {
  editor: any = null;

  // focus = false;

  el: HTMLElement | null = null;

  timeout?: ReturnType<typeof setTimeout>;

  // eslint-disable-next-line react/no-unused-class-component-methods
  getQuery() {
    const query = this.editor.getSelection() || this.editor.getValue();
    return query;
  }

  // eslint-disable-next-line react/no-unused-class-component-methods
  getEditorState() {
    const start = this.editor.getCursor(true);
    const end = this.editor.getCursor(false);
    return {
      content: this.editor.getValue(),
      cursorStart: { line: start.line, ch: start.ch },
      cursorEnd: { line: end.line, ch: end.ch },
    };
  }

  // eslint-disable-next-line react/no-unused-class-component-methods
  setEditorState({
    content,
    cursorStart,
    cursorEnd,
  }: {
    content: string;
    cursorStart: { line: number; ch: number };
    cursorEnd: { line: number; ch: number };
  }) {
    this.editor.setValue(content);
    this.editor.setSelection(cursorStart, cursorEnd);
    this.editor.clearHistory();
    this.editor.getInputField().focus();
  }

  setEditor(el: HTMLDivElement | null) {
    if (!el) {
      this.timeout = setTimeout(() => {
        if (this.el) this.el.innerHTML = '';
        this.el = null;
      }, 1);
      return;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    if (el === this.el) return;
    this.el = el;
    this.editor = (window as any).CodeMirror(el, {
      value: '',
      lineNumbers: true,
      lineWrapping: true,
      mode: 'text/x-sql',
    });
    // var charWidth = editor.defaultCharWidth(), basePadding = 4;
    // editor.on("renderLine", function(cm:any, line:any, elt:any) {
    //     console.log(cm,line,elt);
    //     var off = (window as any).CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
    //     elt.style.textIndent = "-" + off + "px";
    //     elt.style.paddingLeft = (basePadding + off) + "px";
    // });
    this.editor.refresh();
    this.editor.getInputField().focus();
  }

  // hide() {
  //   this.focus = this.editor.hasFocus();
  //   this.editor.getInputField().blur();
  // }

  // show() {
  //   setTimeout(() => {
  //     this.editor.getInputField().focus();
  //     this.editor.refresh();
  //   }, 1);
  // }

  render() {
    const { style } = this.props;
    return (
      <div className="editor" style={style} ref={(el) => this.setEditor(el)} />
    );
  }
}
