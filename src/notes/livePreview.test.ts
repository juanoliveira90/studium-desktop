import { afterEach, describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorSelection, EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { livePreview } from "./livePreview";

let view: EditorView | undefined;

afterEach(() => {
  view?.destroy();
  view = undefined;
});

/**
 * Real CodeMirror in jsdom. The parser may not have finished when the view
 * mounts, so force a full parse, then dispatch the selection to make the
 * live-preview plugin rebuild its decorations, and give the DOM a macrotask
 * to settle before asserting on contentDOM.
 */
async function mount(doc: string, anchor = 0, head = anchor): Promise<EditorView> {
  view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(anchor, head),
      extensions: [markdown({ base: markdownLanguage }), livePreview()],
    }),
  });
  ensureSyntaxTree(view.state, view.state.doc.length, 1000);
  view.dispatch({ selection: EditorSelection.single(anchor, head) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return view;
}

const rendered = (v: EditorView) => v.contentDOM.textContent ?? "";
const find = (v: EditorView, selector: string) => v.contentDOM.querySelector(selector);

describe("livePreview", () => {
  it("hides heading syntax and applies the heading class when the cursor is elsewhere", async () => {
    const v = await mount("text\n\n## Title");

    expect(rendered(v)).not.toContain("##");
    expect(rendered(v)).toContain("Title");
    expect(find(v, ".cm-live-h2")).toBeTruthy();
    expect(find(v, ".cm-live-hline2")).toBeTruthy();
  });

  it("reveals heading syntax on the line the cursor is on", async () => {
    const doc = "text\n\n## Title";
    const v = await mount(doc, doc.indexOf("##"));

    expect(rendered(v)).toContain("## Title");
  });

  it("hides bold and emphasis marks", async () => {
    const v = await mount("para\n\nsome **bold** and *italic* text");

    expect(rendered(v)).not.toContain("**");
    expect(rendered(v)).not.toContain("*");
    expect(rendered(v)).toContain("bold");
    expect(rendered(v)).toContain("italic");
    expect(find(v, ".cm-live-strong")).toBeTruthy();
    expect(find(v, ".cm-live-em")).toBeTruthy();
  });

  it("hides link syntax and URL, keeping the styled label", async () => {
    const v = await mount("para\n\nsee [label](https://example.org) here");

    expect(rendered(v)).not.toContain("https://example.org");
    expect(rendered(v)).not.toContain("[");
    expect(rendered(v)).toContain("label");
    expect(find(v, ".cm-live-link")).toBeTruthy();
  });

  it("hides inline code marks", async () => {
    const v = await mount("para\n\nrun `make` now");

    expect(rendered(v)).not.toContain("`");
    expect(rendered(v)).toContain("make");
    expect(find(v, ".cm-live-code")).toBeTruthy();
  });

  it("hides strikethrough marks (GFM)", async () => {
    const v = await mount("para\n\n~~gone~~ still here");

    expect(rendered(v)).not.toContain("~~");
    expect(rendered(v)).toContain("gone");
    expect(find(v, ".cm-live-strike")).toBeTruthy();
  });

  it("replaces task markers with checkbox widgets and bullets with •", async () => {
    const v = await mount("para\n\n- [ ] buy milk\n- [x] call home");

    expect(rendered(v)).not.toContain("[ ]");
    expect(rendered(v)).not.toContain("[x]");
    expect(rendered(v)).toContain("☐");
    expect(rendered(v)).toContain("☑");
    expect(rendered(v)).toContain("•");
    expect(v.contentDOM.querySelectorAll(".cm-live-task")).toHaveLength(2);
    expect(find(v, ".cm-live-bullet")).toBeTruthy();
  });

  it("keeps ordered list marks visible", async () => {
    const v = await mount("para\n\n1. first\n2. second");

    expect(rendered(v)).toContain("1.");
    expect(rendered(v)).toContain("2.");
  });

  it("hides quote marks and marks blockquote lines", async () => {
    const v = await mount("para\n\n> quoted line");

    expect(rendered(v)).not.toContain(">");
    expect(rendered(v)).toContain("quoted line");
    expect(find(v, ".cm-live-blockquote")).toBeTruthy();
  });

  it("replaces a horizontal rule with a rule widget", async () => {
    const v = await mount("para\n\n---\n\nafter");

    expect(rendered(v)).not.toContain("---");
    expect(find(v, ".cm-live-hr")).toBeTruthy();
  });

  it("keeps fenced-code markers visible and marks the block's lines", async () => {
    const v = await mount("para\n\n```js\ncode()\n```");

    expect(rendered(v)).toContain("```");
    expect(rendered(v)).toContain("code()");
    expect(find(v, ".cm-live-codeblock")).toBeTruthy();
  });

  it("handles nested constructs (bold inside a heading) without breaking", async () => {
    const v = await mount("para\n\n## Head **strong** end");

    expect(rendered(v)).not.toContain("##");
    expect(rendered(v)).not.toContain("**");
    expect(find(v, ".cm-live-h2")).toBeTruthy();
    expect(find(v, ".cm-live-strong")).toBeTruthy();
  });

  it("reveals every line touched by a multi-line selection", async () => {
    const doc = "## One\n\n**two**";
    const v = await mount(doc, 0, doc.length);

    expect(rendered(v)).toContain("##");
    expect(rendered(v)).toContain("**");
  });

  it("re-hides syntax when the cursor leaves the line", async () => {
    const doc = "text\n\n## Title";
    const v = await mount(doc, doc.indexOf("##"));
    expect(rendered(v)).toContain("##");

    v.dispatch({ selection: EditorSelection.single(0) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(rendered(v)).not.toContain("##");
  });
});
