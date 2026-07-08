import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotesPage } from "./NotesPage";
import * as ipc from "../vault/ipc";
import type { DocPayload } from "../vault/ipc";

vi.mock("../vault/ipc");

// The real CodeMirror editor has its own tests; a textarea keeps the page's
// open/edit/save plumbing drivable with userEvent.
vi.mock("../notes/Editor", () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      aria-label="note editor"
      autoFocus // the real editor focuses itself on mount
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const DOCS: Record<string, DocPayload> = {
  "notes/app-ideas.md": {
    path: "notes/app-ideas.md",
    frontmatter: { created: "2026-05-20", updated: "2026-06-28", tags: ["idea", "personal"] },
    frontmatter_error: null,
    body: "# App ideas\n\n- flashcard deck generated from note headings\n",
  },
  "notes/gym-routine.md": {
    path: "notes/gym-routine.md",
    frontmatter: { created: "2026-04-02", updated: "2026-06-15", tags: ["personal"] },
    frontmatter_error: null,
    body: "# Gym routine\n\nMon/Thu upper, Tue/Fri lower.\n",
  },
  "notes/lecture-integrals.md": {
    path: "notes/lecture-integrals.md",
    frontmatter: { created: "2026-06-30", updated: "2026-06-30", tags: ["lecture"] },
    frontmatter_error: null,
    body: "# Lecture: integration techniques\n\nu-substitution is the chain rule backwards.\n",
  },
  "notes/reading-sicp.md": {
    path: "notes/reading-sicp.md",
    frontmatter: { created: "2026-06-12", updated: "2026-07-01", tags: ["book"] },
    frontmatter_error: null,
    body: "# Reading SICP\n\nChapter 1 wraps procedures and processes.\n",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vault");
  vi.mocked(ipc.vaultOpen).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.vaultCreate).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.docList).mockResolvedValue(Object.keys(DOCS).sort());
  vi.mocked(ipc.docRead).mockImplementation(async (path) => {
    const doc = DOCS[path];
    if (!doc) throw new Error(`no such doc: ${path}`);
    return doc;
  });
  vi.mocked(ipc.docWrite).mockResolvedValue(undefined);
  vi.mocked(ipc.docDelete).mockResolvedValue(undefined);
  vi.mocked(ipc.onVaultChanged).mockReturnValue(() => {});
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <NotesPage />
    </QueryClientProvider>,
  );
}

describe("NotesPage", () => {
  it("lists the vault's notes newest first with their dates", async () => {
    renderPage();

    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Reading SICP"),
      expect.stringContaining("Lecture: integration techniques"),
      expect.stringContaining("App ideas"),
      expect.stringContaining("Gym routine"),
    ]);
    expect(items[0]).toHaveTextContent("Jul 1");
    expect(items[3]).toHaveTextContent("Jun 15");
  });

  it("derives the filter tabs from the notes' tags and filters on click", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByRole("listitem");
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "all",
      "book",
      "lecture",
      "idea",
      "personal",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "personal" }));

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("App ideas"),
      expect.stringContaining("Gym routine"),
    ]);
  });

  it("fuzzy-filters the list from the search field", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByRole("listitem");
    await user.type(screen.getByRole("textbox", { name: "search notes" }), "rsicp");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Reading SICP");
  });

  it("opens the best match with Enter in the search field", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByRole("listitem");
    await user.type(screen.getByRole("textbox", { name: "search notes" }), "gym{Enter}");

    expect(await screen.findByLabelText("note editor")).toHaveValue(
      DOCS["notes/gym-routine.md"].body,
    );
  });

  it("moves the highlight with arrow keys before opening", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByRole("listitem");
    await user.click(screen.getByRole("textbox", { name: "search notes" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(await screen.findByLabelText("note editor")).toHaveValue(
      DOCS["notes/lecture-integrals.md"].body,
    );
  });

  it("opens a note by clicking it and returns to the list with Escape", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Reading SICP/ }));
    expect(await screen.findByLabelText("note editor")).toHaveValue(
      DOCS["notes/reading-sicp.md"].body,
    );

    await user.keyboard("{Escape}");
    expect(await screen.findAllByRole("listitem")).toHaveLength(4);
  });

  it("saves edits with the frontmatter preserved and `updated` bumped", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Gym routine/ }));
    const editor = await screen.findByLabelText("note editor");
    await user.type(editor, "extra line");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(ipc.docWrite).toHaveBeenCalled());
    const [path, frontmatter, body] = vi.mocked(ipc.docWrite).mock.calls[0];
    expect(path).toBe("notes/gym-routine.md");
    expect(frontmatter).toMatchObject({
      created: "2026-04-02",
      tags: ["personal"],
      updated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(frontmatter.updated).not.toBe("2026-06-15");
    expect(body).toContain("extra line");
  });

  it("autosaves shortly after typing, without leaving the editor", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Gym routine/ }));
    await user.type(await screen.findByLabelText("note editor"), "x");

    await waitFor(() => expect(ipc.docWrite).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("creates a new note and opens it in the editor", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.docWrite).mockImplementation(async (path, frontmatter, body) => {
      DOCS[path] = { path, frontmatter, frontmatter_error: null, body };
      vi.mocked(ipc.docList).mockResolvedValue(Object.keys(DOCS).sort());
    });
    renderPage();

    await screen.findAllByRole("listitem");
    await user.click(screen.getByRole("button", { name: "+ new note" }));
    await user.type(
      screen.getByRole("textbox", { name: "new note title" }),
      "Scratch pad{Enter}",
    );

    expect(await screen.findByLabelText("note editor")).toHaveValue("# Scratch pad\n\n");
    expect(ipc.docWrite).toHaveBeenCalledWith(
      "notes/scratch-pad.md",
      expect.objectContaining({ tags: [] }),
      "# Scratch pad\n\n",
    );
    delete DOCS["notes/scratch-pad.md"];
  });

  it("deletes a note from a right-click, after confirming", async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole("button", { name: /Gym routine/ });
    await user.pointer({ keys: "[MouseRight]", target: row });
    // first click arms, does not delete
    await user.click(screen.getByRole("menuitem", { name: "delete note" }));
    expect(ipc.docDelete).not.toHaveBeenCalled();
    // second click confirms
    await user.click(screen.getByRole("menuitem", { name: "really delete?" }));

    expect(ipc.docDelete).toHaveBeenCalledWith("notes/gym-routine.md");
  });

  it("shows the vault gate when no vault is remembered, and opens one", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.vaultDefaultPath).mockResolvedValue(null);
    renderPage();

    vi.mocked(ipc.pickFolder).mockResolvedValue("/home/juan/vault");
    await user.click(await screen.findByRole("button", { name: /open vault/ }));

    expect(await screen.findAllByRole("listitem")).toHaveLength(4);
    expect(ipc.vaultOpen).toHaveBeenCalledWith("/home/juan/vault");
  });

  it("flags notes whose frontmatter failed to parse", async () => {
    vi.mocked(ipc.docRead).mockImplementation(async (path) => ({
      ...DOCS[path],
      frontmatter: {},
      frontmatter_error: "invalid YAML",
    }));
    renderPage();

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("⚠");
  });

  it("never writes back a note whose frontmatter failed to parse", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.docRead).mockImplementation(async (path) => ({
      ...DOCS[path],
      frontmatter: {},
      frontmatter_error: "invalid YAML",
    }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Gym routine/ }));
    await user.type(await screen.findByLabelText("note editor"), "x");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("textbox", { name: "search notes" })).toBeInTheDocument();
    expect(ipc.docWrite).not.toHaveBeenCalled();
  });
});
