import * as React from "react";
import { Component } from "react";

export class Editor extends Component<any, any> {
  editor: any = null;
  focus = false;

  constructor(props: { style: { [k: string]: string | number } }) {
    super(props);
    this.state = {};
  }

  show() {
    setTimeout(() => {
      this.editor.getInputField().focus();
      this.editor.refresh();
    }, 1);
  }

  hide() {
    this.focus = this.editor.hasFocus();
    this.editor.getInputField().blur();
  }

  getQuery() {
    const query = this.editor.getSelection() || this.editor.getValue();
    return query;
  }

  el: HTMLElement | null = null;
  timeout: any = null;
  setEditor(el: HTMLDivElement | null) {
    if (!el) {
      this.timeout = setTimeout(() => {
        if (this.el) this.el.innerHTML = "";
        this.el = null;
      }, 1);
      return;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (el == this.el) return;
    this.el = el;
    const editor = (this.editor = (window as any).CodeMirror(el, {
      value: "",
      lineNumbers: true,
      lineWrapping: true,
      mode: "text/x-sql"
    }));
    // var charWidth = editor.defaultCharWidth(), basePadding = 4;
    // editor.on("renderLine", function(cm:any, line:any, elt:any) {
    //     console.log(cm,line,elt);
    //     var off = (window as any).CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
    //     elt.style.textIndent = "-" + off + "px";
    //     elt.style.paddingLeft = (basePadding + off) + "px";
    // });
    editor.refresh();
    this.editor.getInputField().focus();
  }

  render() {
    return (
      <div
        className="editor"
        style={this.props.style}
        ref={el => this.setEditor(el)}
      />
    );
  }
}
