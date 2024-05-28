/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from 'react';

type EditorState = {
  content: string;
  cursorStart: { line: number; ch: number };
  cursorEnd: { line: number; ch: number };
};

function isSameEditorState(state: EditorState, state2: EditorState) {
  if (state.content !== state2.content) return false;
  if (
    state.cursorStart.line === state.cursorEnd.line &&
    state.cursorStart.ch === state.cursorEnd.ch &&
    state2.cursorStart.line === state2.cursorEnd.line &&
    state2.cursorStart.ch === state2.cursorEnd.ch
  )
    return true;
  return (
    state.cursorStart.line === state2.cursorStart.line &&
    state.cursorStart.ch === state2.cursorStart.ch &&
    state.cursorEnd.line === state2.cursorEnd.line &&
    state.cursorEnd.ch === state2.cursorEnd.ch
  );
}
export interface EditorProps {
  height: number;
  onChange?: (contentChanged: boolean) => void;
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
  setQueryValue(query: string) {
    this.editor.setValue(query);
  }

  // lastHistory: any = null;

  // eslint-disable-next-line react/no-unused-class-component-methods
  setEditorState(
    { content, cursorStart, cursorEnd }: EditorState,
    historyPolicity: 'clear' | 'replace' | 'push',
  ) {
    if (historyPolicity === 'replace') {
      // this.editor.setHistory(this.lastHistory);
      this.editor.undo();
    }
    // if (historyPolicity === 'push') {
    //   this.lastHistory = this.editor.getHistory();
    // }
    this.editor.setValue(content);
    this.editor.setSelection(cursorStart, cursorEnd);
    if (historyPolicity === 'clear') this.editor.clearHistory();
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

    let prev = this.getEditorState();
    this.editor.on('change', () => {
      const v = this.getEditorState();
      if (isSameEditorState(v, prev)) return;
      const contentChanged = v.content !== prev.content;
      prev = v;
      if (this.props.onChange) this.props.onChange(contentChanged);
    });
    this.editor.on('cursorActivity', () => {
      const v = this.getEditorState();
      if (isSameEditorState(v, prev)) return;
      const contentChanged = v.content !== prev.content;
      prev = v;
      if (this.props.onChange) this.props.onChange(contentChanged);
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
    const { height } = this.props;
    if (this.editor && this.editor.refresh) {
      this.editor.refresh();
      setTimeout(() => this.editor.refresh(), 1);
    }
    if (this.editor && height === 40 && this.editor.isReadOnly() === false) {
      this.editor.setOption('readOnly', true);
    } else if (
      this.editor &&
      height !== 40 &&
      this.editor.isReadOnly() === true
    ) {
      this.editor.setOption('readOnly', false);
    }
    return (
      <div
        className="editor"
        style={
          {
            height,
            '--editor-height': `${height}px`,
          } as React.CSSProperties
        }
        ref={(el) => this.setEditor(el)}
      />
    );
  }
}
