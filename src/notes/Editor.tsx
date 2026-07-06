/*
 * Thin CodeMirror 6 wrapper for the note body. Uncontrolled after mount:
 * `value` seeds the document, `onChange` reports every edit upward, and a
 * later `value` prop that differs from the current doc replaces it only when
 * the view isn't the source of the change (external reload, e.g. a hand-edit
 * picked up by the vault watcher).
 */

import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";

interface EditorProps {
  value: string;
  onChange: (body: string) => void;
  /** Test hook: receives the underlying view once created. */
  onReady?: (view: EditorView) => void;
}

export function Editor({ value, onChange, onReady }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValue = useRef(value);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const view = new EditorView({
      doc: initialValue.current,
      parent: hostRef.current!,
      extensions: [
        minimalSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    viewRef.current = view;
    view.focus();
    onReadyRef.current?.(view);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className="editor" aria-label="note editor" />;
}
