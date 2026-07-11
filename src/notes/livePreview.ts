/*
 * Obsidian-style Live Preview as a CodeMirror extension: markdown renders in
 * place (headings large, bold/links styled) and syntax markers are hidden —
 * except on lines touched by the cursor/selection, where the raw source is
 * revealed for editing. The document itself is never transformed; everything
 * here is decorations over the unchanged text.
 */

import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

/*
 * Character styling: Lezer tags → stable classes. Colors/sizes live in
 * app.css on the token layer, per the theming convention.
 */
const liveHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, class: "cm-live-h1" },
  { tag: tags.heading2, class: "cm-live-h2" },
  { tag: tags.heading3, class: "cm-live-h3" },
  { tag: tags.heading4, class: "cm-live-h4" },
  { tag: tags.heading5, class: "cm-live-h5" },
  { tag: tags.heading6, class: "cm-live-h6" },
  { tag: tags.strong, class: "cm-live-strong" },
  { tag: tags.emphasis, class: "cm-live-em" },
  { tag: tags.strikethrough, class: "cm-live-strike" },
  { tag: tags.monospace, class: "cm-live-code" },
  { tag: tags.link, class: "cm-live-link" },
  { tag: tags.quote, class: "cm-live-quote" },
]);

/** Fixed replacement glyph (bullet, checkbox, horizontal rule). */
class GlyphWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly className: string,
  ) {
    super();
  }

  override eq(other: GlyphWidget): boolean {
    return other.text === this.text && other.className === this.className;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.className;
    span.textContent = this.text;
    return span;
  }

  // Let the editor handle clicks so they place the cursor on the line,
  // which reveals the source (widgets are non-interactive in v1).
  override ignoreEvent(): boolean {
    return false;
  }
}

const bulletWidget = new GlyphWidget("•", "cm-live-bullet");
const uncheckedWidget = new GlyphWidget("☐", "cm-live-task");
const checkedWidget = new GlyphWidget("☑", "cm-live-task");
const ruleWidget = new GlyphWidget("", "cm-live-hr");

const ATX_HEADING = /^ATXHeading(\d)$/;
const BULLET_MARK = /^[-*+]$/;

function buildDecorations(view: EditorView): DecorationSet {
  const state = view.state;

  // Lines touched by the cursor/selection show their raw syntax.
  const revealedLines = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let line = first; line <= last; line++) revealedLines.add(line);
  }
  const lineIsRevealed = (pos: number) =>
    revealedLines.has(state.doc.lineAt(pos).number);

  const decorations: Range<Decoration>[] = [];

  const hide = (from: number, to: number) => {
    if (from < to && !lineIsRevealed(from)) {
      decorations.push(Decoration.replace({}).range(from, to));
    }
  };
  const replaceWithGlyph = (from: number, to: number, widget: GlyphWidget) => {
    if (!lineIsRevealed(from)) {
      decorations.push(Decoration.replace({ widget }).range(from, to));
    }
  };
  // Line classes are styling, not hiding: emitted regardless of reveal.
  const classLines = (from: number, to: number, className: string) => {
    const first = state.doc.lineAt(from).number;
    const last = state.doc.lineAt(to).number;
    for (let n = first; n <= last; n++) {
      const line = state.doc.line(n);
      decorations.push(Decoration.line({ class: className }).range(line.from));
    }
  };
  // "## " / "> " — the space after the mark goes with it.
  const spanWithTrailingSpace = (to: number) => {
    const next = state.doc.sliceString(to, to + 1);
    return next === " " ? to + 1 : to;
  };

  // jsdom has no layout, so visibleRanges can be empty — fall back to the doc.
  let ranges: readonly { from: number; to: number }[] = view.visibleRanges;
  if (ranges.length === 0) ranges = [{ from: 0, to: state.doc.length }];

  for (const { from, to } of ranges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const heading = ATX_HEADING.exec(node.name);
        if (heading) {
          classLines(node.from, node.from, `cm-live-hline${heading[1]}`);
          return;
        }
        switch (node.name) {
          case "HeaderMark": {
            const parent = node.node.parent;
            if (parent && ATX_HEADING.test(parent.name)) {
              hide(node.from, spanWithTrailingSpace(node.to));
            }
            return;
          }
          case "EmphasisMark":
          case "CodeMark":
          case "StrikethroughMark":
            hide(node.from, node.to);
            return;
          case "LinkMark":
          case "URL":
            if (node.node.parent?.name === "Link") hide(node.from, node.to);
            return;
          case "ListMark": {
            const mark = state.doc.sliceString(node.from, node.to);
            const isBullet = BULLET_MARK.test(mark);
            if (isBullet) replaceWithGlyph(node.from, node.to, bulletWidget);
            return;
          }
          case "TaskMarker": {
            const marker = state.doc.sliceString(node.from, node.to);
            const done = /x/i.test(marker);
            const widget = done ? checkedWidget : uncheckedWidget;
            replaceWithGlyph(node.from, node.to, widget);
            return;
          }
          case "Blockquote":
            classLines(node.from, node.to, "cm-live-blockquote");
            return;
          case "QuoteMark":
            hide(node.from, spanWithTrailingSpace(node.to));
            return;
          case "HorizontalRule":
            replaceWithGlyph(node.from, node.to, ruleWidget);
            return;
          case "FencedCode":
            // Syntax stays visible; just tint the block. Don't descend, so
            // its CodeMarks are never hidden.
            classLines(node.from, node.to, "cm-live-codeblock");
            return false;
        }
      },
    });
  }

  // Mixed line/inline decorations collected out of order → sorted emission.
  return Decoration.set(decorations, true);
}

/*
 * ViewPlugin, not StateField: the decorations are a pure function of
 * doc + selection + viewport (+ parse progress), so viewport-only recompute
 * is free. Only inline replace/widget and Decoration.line are used — all
 * legal from a plugin. No atomicRanges: a cursor adjacent to a hidden range
 * is by definition on its line, and decorations recompute on selectionSet
 * before paint, so moving onto a line un-collapses it first.
 */
const livePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      // The tree-identity check catches parse-progress updates, which set
      // none of the other flags (first paint on a huge note self-heals).
      const treeChanged =
        syntaxTree(update.state) !== syntaxTree(update.startState);
      const stale =
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        treeChanged;
      if (stale) this.decorations = buildDecorations(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export function livePreview(): Extension {
  return [syntaxHighlighting(liveHighlightStyle), livePlugin];
}
