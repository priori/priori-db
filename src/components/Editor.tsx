/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef, useImperativeHandle } from 'react';

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

export interface EditorHandle {
  setEditorState(
    { content, cursorStart, cursorEnd }: EditorState,
    historyPolicity: 'clear' | 'replace' | 'push',
  ): void;
  getQuery(): string;
  getEditorState(): EditorState;
  setQueryValue(query: string): void;
  editor: any;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  (props: EditorProps, ref) => {
    const editorRef = React.useRef<any>(null);

    // focus = false;

    const elRef = React.useRef<HTMLElement | null>(null);

    const timeout = React.useRef<ReturnType<typeof setTimeout>>();

    function getQuery() {
      const query =
        editorRef.current.getSelection() || editorRef.current.getValue();
      return query;
    }

    function getEditorState() {
      const start = editorRef.current.getCursor(true);
      const end = editorRef.current.getCursor(false);
      return {
        content: editorRef.current.getValue(),
        cursorStart: { line: start.line, ch: start.ch },
        cursorEnd: { line: end.line, ch: end.ch },
      };
    }

    function setQueryValue(query: string) {
      editorRef.current.setValue(query);
    }

    function setEditorState(
      { content, cursorStart, cursorEnd }: EditorState,
      historyPolicity: 'clear' | 'replace' | 'push',
    ) {
      if (historyPolicity === 'replace') {
        // editor.current.setHistory(this.lastHistory);
        editorRef.current.undo();
      }
      // if (historyPolicity === 'push') {
      //   this.lastHistory = editor.current.getHistory();
      // }
      editorRef.current.setValue(content);
      editorRef.current.setSelection(cursorStart, cursorEnd);
      if (historyPolicity === 'clear') editorRef.current.clearHistory();
      editorRef.current.getInputField().focus();
    }

    function setEditor(el: HTMLDivElement | null) {
      if (!el) {
        timeout.current = setTimeout(() => {
          if (elRef.current) elRef.current.innerHTML = '';
          elRef.current = null;
        }, 1);
        return;
      }
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = undefined;
      }
      if (el === elRef.current) return;
      elRef.current = el;
      editorRef.current = (window as any).CodeMirror(el, {
        value: '',
        lineNumbers: true,
        lineWrapping: true,
        mode: 'text/x-sql',
      });

      let prev = getEditorState();
      editorRef.current.on('change', () => {
        const v = getEditorState();
        if (isSameEditorState(v, prev)) return;
        const contentChanged = v.content !== prev.content;
        prev = v;
        if (props.onChange) props.onChange(contentChanged);
      });
      editorRef.current.on('cursorActivity', () => {
        const v = getEditorState();
        if (isSameEditorState(v, prev)) return;
        const contentChanged = v.content !== prev.content;
        prev = v;
        if (props.onChange) props.onChange(contentChanged);
      });
      // var charWidth = editor.defaultCharWidth(), basePadding = 4;
      // editor.on("renderLine", function(cm:any, line:any, elt:any) {
      //     console.log(cm,line,elt);
      //     var off = (window as any).CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;
      //     elt.style.textIndent = "-" + off + "px";
      //     elt.style.paddingLeft = (basePadding + off) + "px";
      // });
      editorRef.current.refresh();
      editorRef.current.getInputField().focus();
    }

    // hide() {
    //   this.focus = editor.current.hasFocus();
    //   editor.current.getInputField().blur();
    // }

    // show() {
    //   setTimeout(() => {
    //     editor.current.getInputField().focus();
    //     editor.current.refresh();
    //   }, 1);
    // }

    useImperativeHandle(ref, () => ({
      getEditorState,
      editor: editorRef.current,
      setQueryValue,
      getQuery,
      setEditorState,
    }));

    const { height } = props;
    if (editorRef.current && editorRef.current.refresh) {
      editorRef.current.refresh();
      setTimeout(() => editorRef.current.refresh(), 1);
    }
    if (
      editorRef.current &&
      height === 40 &&
      editorRef.current.isReadOnly() === false
    ) {
      editorRef.current.setOption('readOnly', true);
    } else if (
      editorRef.current &&
      height !== 40 &&
      editorRef.current.isReadOnly() === true
    ) {
      editorRef.current.setOption('readOnly', false);
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
        ref={(el) => setEditor(el)}
      />
    );
  },
);
