import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import * as monaco from 'monaco-editor';
import { useEvent } from 'util/useEvent';

type EditorState = {
  content: string;
  cursorStart: { line: number; ch: number };
  cursorEnd: { line: number; ch: number };
};

monaco.languages.getLanguages().forEach((lang) => {
  if (lang.id === 'sql') {
    monaco.languages.register({ id: 'sql' });
  }
});

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
  blur(): void;
}

monaco.editor.defineTheme('dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#262626',
  },
});

function isDark() {
  const theme = localStorage.getItem('theme') || 'soft-gray-theme';
  return theme === 'dark';
}

function useThemeChange(listener0: () => void) {
  const listener = useEvent(listener0);
  useEffect(() => {
    const observer = new MutationObserver(listener);
    observer.observe(document.body, { attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, [listener]);
}

export const Editor = forwardRef<EditorHandle, EditorProps>(
  (props: EditorProps, ref) => {
    const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(
      null,
    );

    const elRef = React.useRef<HTMLElement | null>(null);

    const timeout = React.useRef<ReturnType<typeof setTimeout>>();

    useThemeChange(() => {
      if (isDark()) {
        editorRef.current?.updateOptions({ theme: 'dark' });
      } else {
        editorRef.current?.updateOptions({ theme: 'vs-white' });
      }
    });

    const getQuery = useEvent(() => {
      const editor = editorRef.current!;
      const sel = editor.getSelection();
      if (sel) {
        const q = editor.getModel()!.getValueInRange(sel);
        if (q) return q;
      }
      return editor.getValue();
    });

    const getEditorState = useEvent(() => {
      const content = editorRef.current!.getValue();
      const selection = editorRef.current!.getSelection()!;
      return {
        content,
        cursorStart: {
          line: selection?.startLineNumber,
          ch: selection?.startColumn,
        },
        cursorEnd: {
          line: selection?.endLineNumber,
          ch: selection?.endColumn,
        },
      };
    });

    const setQueryValue = useEvent((query: string) => {
      editorRef.current?.setValue(query);
    });

    const setEditorState = useEvent(
      (
        { content, cursorStart, cursorEnd }: EditorState,
        historyPolicity: 'clear' | 'replace' | 'push',
      ) => {
        if (historyPolicity === 'clear') {
          editorRef.current?.setValue(content);
          const sel = new monaco.Selection(
            cursorStart.line,
            cursorStart.ch,
            cursorEnd.line,
            cursorEnd.ch,
          );
          editorRef.current?.setSelection(sel);
          return;
        }
        if (historyPolicity === 'replace') {
          editorRef.current?.trigger('source', 'undo', null);
        }
        editorRef.current?.executeEdits('source', [
          {
            range: editorRef.current!.getModel()!.getFullModelRange(),
            text: content,
          },
        ]);
        if (cursorStart && cursorEnd) {
          const sel = new monaco.Selection(
            cursorStart.line,
            cursorStart.ch,
            cursorEnd.line,
            cursorEnd.ch,
          );
          editorRef.current?.setSelection(sel);
        }
        editorRef.current?.focus();
      },
    );

    const setEditor = useEvent((el: HTMLDivElement | null) => {
      if (!el) {
        timeout.current = setTimeout(() => {
          editorRef.current?.dispose();
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
      editorRef.current = monaco.editor.create(el, {
        value: '',
        language: 'sql',
        theme: isDark() ? 'dark' : 'vs-white',
        automaticLayout: true,
        minimap: {
          enabled: false,
        },
        wordWrap: 'on',
        hideCursorInOverviewRuler: false,
        selectionHighlight: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          verticalSliderSize: 6,
          horizontalSliderSize: 6,
          alwaysConsumeMouseWheel: false,
        },
        overviewRulerBorder: false,
        contextmenu: false,
        multiCursorModifier: undefined,
      });
      editorRef.current.addCommand(monaco.KeyCode.F1, () => {});
      editorRef.current.addCommand(monaco.KeyCode.F2, () => {});

      let prev = getEditorState();
      editorRef.current.onDidChangeModelContent(() => {
        const v = getEditorState();
        if (isSameEditorState(v, prev)) return;
        const contentChanged = v.content !== prev.content;
        prev = v;
        if (props.onChange) props.onChange(contentChanged);
      });
      editorRef.current.onDidChangeCursorSelection(() => {
        const v = getEditorState();
        if (isSameEditorState(v, prev)) return;
        const contentChanged = v.content !== prev.content;
        prev = v;
        if (props.onChange) props.onChange(contentChanged);
      });
      editorRef.current.focus();
    });

    const blur = useEvent(() => {
      if (
        elRef.current &&
        document.activeElement &&
        document.activeElement.contains(elRef.current)
      )
        (document.activeElement as HTMLElement).blur();
    });

    useImperativeHandle(ref, () => ({
      getEditorState,
      setQueryValue,
      getQuery,
      setEditorState,
      blur,
    }));

    const { height } = props;
    if (editorRef.current && height <= 40) {
      editorRef.current?.updateOptions({ readOnly: true, domReadOnly: true });
    } else if (editorRef.current && height > 40) {
      editorRef.current?.updateOptions({ readOnly: false, domReadOnly: false });
    }

    return (
      <div
        className="editor"
        style={
          {
            height,
            '--editor-height': `${height}px`,
            ...(height <= 40 ? { overflow: 'hidden', opacity: 0 } : {}),
          } as React.CSSProperties
        }
        ref={setEditor}
      />
    );
  },
);
