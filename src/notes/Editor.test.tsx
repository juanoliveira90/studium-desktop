import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EditorView } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorSelection } from "@codemirror/state";
import { Editor, type EditorMode } from "./Editor";

function renderEditor(value: string, onChange = vi.fn(), mode?: EditorMode) {
  let view: EditorView | undefined;
  const result = render(
    <Editor value={value} onChange={onChange} mode={mode} onReady={(v) => (view = v)} />,
  );
  return { view: view!, onChange, rerender: result.rerender };
}

/** Force a full parse, then nudge the live-preview plugin to rebuild. */
async function settleLivePreview(view: EditorView) {
  ensureSyntaxTree(view.state, view.state.doc.length, 1000);
  view.dispatch({ selection: view.state.selection });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Editor", () => {
  it("shows the initial document", () => {
    renderEditor("# Reading SICP\n\nChapter 1.");

    expect(screen.getByLabelText("note editor")).toHaveTextContent("Reading SICP");
    expect(screen.getByLabelText("note editor")).toHaveTextContent("Chapter 1.");
  });

  it("reports edits through onChange", () => {
    const { view, onChange } = renderEditor("start");

    view.dispatch({ changes: { from: 5, insert: " typed" } });

    expect(onChange).toHaveBeenCalledWith("start typed");
  });

  it("inserts spaces when Tab is pressed instead of moving focus", () => {
    const { view } = renderEditor("note");
    const tabBinding = indentWithTab;

    const handled = tabBinding.run!(view);

    expect(handled).toBe(true);
    expect(view.state.doc.toString()).toBe("    note");
  });

  it("hides markdown syntax by default (live mode)", async () => {
    const { view } = renderEditor("text\n\n## Title");
    await settleLivePreview(view);

    expect(view.contentDOM.textContent).not.toContain("##");
    expect(view.contentDOM.querySelector(".cm-live-h2")).toBeTruthy();
  });

  it("shows raw markdown syntax in raw mode", async () => {
    const { view } = renderEditor("text\n\n## Title", vi.fn(), "raw");
    await settleLivePreview(view);

    expect(view.contentDOM.textContent).toContain("## Title");
    expect(view.contentDOM.querySelector(".cm-live-h2")).toBeNull();
  });

  it("reconfigures the same view when the mode prop flips, keeping doc and cursor", async () => {
    const onChange = vi.fn();
    const views: EditorView[] = [];
    const doc = "text\n\n## Title";
    const { rerender } = render(
      <Editor value={doc} onChange={onChange} mode="live" onReady={(v) => views.push(v)} />,
    );
    const view = views[0];
    view.dispatch({ selection: EditorSelection.single(4) });
    await settleLivePreview(view);
    expect(view.contentDOM.textContent).not.toContain("##");

    rerender(
      <Editor value={doc} onChange={onChange} mode="raw" onReady={(v) => views.push(v)} />,
    );
    await settleLivePreview(view);

    expect(views).toHaveLength(1); // same instance, no remount
    expect(view.contentDOM.textContent).toContain("##");
    expect(view.state.selection.main.head).toBe(4);
  });
});
