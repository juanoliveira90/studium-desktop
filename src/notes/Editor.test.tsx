import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EditorView } from "codemirror";
import { Editor } from "./Editor";

function renderEditor(value: string, onChange = vi.fn()) {
  let view: EditorView | undefined;
  render(<Editor value={value} onChange={onChange} onReady={(v) => (view = v)} />);
  return { view: view!, onChange };
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
});
