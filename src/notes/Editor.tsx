/*
 * Thin CodeMirror 6 wrapper for the note body. Uncontrolled after mount:
 * `value` seeds the document, `onChange` reports every edit upward, and a
 * later `value` prop that differs from the current doc replaces it only when
 * the view isn't the source of the change (external reload, e.g. a hand-edit
 * picked up by the vault watcher).
 */

import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { Compartment, type Extension } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { livePreview } from "./livePreview";

/** "live" renders markdown in place (Obsidian-style); "raw" is plain source. */
export type EditorMode = "live" | "raw";

function modeExtension(mode: EditorMode): Extension {
  return mode === "live" ? livePreview() : [];
}

interface EditorProps {
  value: string;
  onChange: (body: string) => void;
  mode?: EditorMode;
  /** Test hook: receives the underlying view once created. */
  onReady?: (view: EditorView) => void;
}

export function Editor({ value, onChange, mode = "live", onReady }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValue = useRef(value);
  const initialMode = useRef(mode);
  const onReadyRef = useRef(onReady);
  // Compartment instead of remounting on mode change: reconfiguring in place
  // preserves undo history, cursor, scroll, and focus mid-edit.
  const modeCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const view = new EditorView({
      doc: initialValue.current,
      parent: hostRef.current!,
      extensions: [
        minimalSetup,
        // GFM base so strikethrough/task-list nodes exist for live preview;
        // harmless in raw mode.
        markdown({ base: markdownLanguage }),
        modeCompartment.current.of(modeExtension(initialMode.current)),
        // Tab indents inside the editor (4 spaces) rather than moving focus
        // between page/footer elements; Shift+Tab dedents.
        indentUnit.of("    "),
        keymap.of([indentWithTab]),
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
    viewRef.current?.dispatch({
      effects: modeCompartment.current.reconfigure(modeExtension(mode)),
    });
  }, [mode]);

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
