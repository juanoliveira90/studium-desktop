import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotesPage } from "./NotesPage";

describe("NotesPage", () => {
  it("lists every note with its last-updated date, newest first", () => {
    render(<NotesPage />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Reading SICP"),
      expect.stringContaining("Lecture: integration techniques"),
      expect.stringContaining("App ideas"),
      expect.stringContaining("Gym routine"),
    ]);
    expect(items[0]).toHaveTextContent("Jul 1");
    expect(items[3]).toHaveTextContent("Jun 15");
  });

  it("derives the filter tabs from the tags present in the notes", () => {
    render(<NotesPage />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "all",
      "book",
      "lecture",
      "idea",
      "personal",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the search field and the new-note action", () => {
    render(<NotesPage />);

    expect(screen.getByRole("textbox", { name: "search notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ new note" })).toBeInTheDocument();
  });
});
