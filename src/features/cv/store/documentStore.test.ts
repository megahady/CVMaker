import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyCvDocument } from "@/features/cv/schema/defaults";
import {
  createCustomSectionDefinition,
  resolveSectionDefinition,
} from "@/features/cv/sections/registry";
import { useDocumentStore } from "./documentStore";

const store = () => useDocumentStore.getState();

beforeEach(() => {
  vi.useRealTimers();
  store().newDocument();
});

describe("initial document", () => {
  it("starts with the default-visible sections", () => {
    const ids = store().document.sections.map((section) => section.definitionId);
    expect(ids).toEqual([
      "profile",
      "education",
      "positions",
      "research",
      "publications",
      "awards",
      "talks",
    ]);
  });

  it("gives single sections one entry", () => {
    const profile = store().document.sections[0];
    expect(profile?.type).toBe("single");
    expect(profile?.entries).toHaveLength(1);
  });
});

describe("entry editing", () => {
  it("updates a field and marks the document dirty", () => {
    const section = store().document.sections[0];
    store().updateEntry(section!.id, 0, "fullName", "Jane Doe");
    expect(store().document.sections[0]?.entries[0]?.fullName).toBe("Jane Doe");
    expect(store().isDirty).toBe(true);
  });

  it("adds, moves, and removes entries", () => {
    const education = store().document.sections.find((s) => s.definitionId === "education")!;
    store().addEntry(education.id);
    store().addEntry(education.id);
    store().updateEntry(education.id, 0, "degree", "First");
    store().updateEntry(education.id, 1, "degree", "Second");
    store().moveEntry(education.id, 1, 0);
    expect(store().document.sections.find((s) => s.id === education.id)?.entries.map((e) => e.degree)).toEqual([
      "Second",
      "First",
    ]);
    store().removeEntry(education.id, 0);
    expect(store().document.sections.find((s) => s.id === education.id)?.entries.map((e) => e.degree)).toEqual(["First"]);
  });

  it("sorts entries newest and oldest by year", () => {
    const education = store().document.sections.find((s) => s.definitionId === "education")!;
    store().addEntry(education.id);
    store().addEntry(education.id);
    store().updateEntry(education.id, 0, "endYear", "2019");
    store().updateEntry(education.id, 1, "endYear", "2024");
    store().sortEntries(education.id, "endYear", "newest");
    expect(store().document.sections.find((s) => s.id === education.id)?.entries.map((e) => e.endYear)).toEqual(["2024", "2019"]);
    store().sortEntries(education.id, "endYear", "oldest");
    expect(store().document.sections.find((s) => s.id === education.id)?.entries.map((e) => e.endYear)).toEqual(["2019", "2024"]);
  });
});

describe("undo / redo", () => {
  it("restores the previous document", () => {
    const section = store().document.sections[0];
    store().updateEntry(section!.id, 0, "fullName", "Typed value");
    expect(store().document.sections[0]?.entries[0]?.fullName).toBe("Typed value");
    store().undo();
    expect(store().document.sections[0]?.entries[0]?.fullName).toBeUndefined();
    store().redo();
    expect(store().document.sections[0]?.entries[0]?.fullName).toBe("Typed value");
  });

  it("coalesces typing bursts into one undo step but separates pauses", () => {
    const section = store().document.sections[0];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));

    store().updateEntry(section!.id, 0, "fullName", "A");
    vi.setSystemTime(new Date("2026-01-01T10:00:00.3Z"));
    store().updateEntry(section!.id, 0, "fullName", "AB");
    expect(store().past).toHaveLength(1);

    vi.setSystemTime(new Date("2026-01-01T10:00:05Z"));
    store().updateEntry(section!.id, 0, "fullName", "ABC");
    expect(store().past).toHaveLength(2);

    vi.useRealTimers();
  });

  it("clears redo history after a new edit", () => {
    const section = store().document.sections[0];
    store().updateEntry(section!.id, 0, "fullName", "One");
    store().undo();
    expect(store().future).toHaveLength(1);
    store().updateEntry(section!.id, 0, "fullName", "Two");
    expect(store().future).toHaveLength(0);
  });
});

describe("section management", () => {
  it("reorders sections and keeps order fields in sync", () => {
    const before = store().document.sections.map((s) => s.id);
    store().reorderSections(0, 2);
    const after = store().document.sections;
    expect(after[0]?.id).toBe(before[1]);
    expect(after[2]?.id).toBe(before[0]);
    expect(after.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("adds and removes custom sections without code", () => {
    const definition = createCustomSectionDefinition({
      title: "Patents",
      type: "collection",
      fields: [{ id: "number", label: "Patent number", type: "text" }],
    });
    const id = store().addSection(definition);
    const added = store().document.sections.find((s) => s.id === id);
    expect(added).toBeDefined();
    expect(resolveSectionDefinition(added!).fields).toHaveLength(1);

    store().removeSection(id);
    expect(store().document.sections.find((s) => s.id === id)).toBeUndefined();
  });

  it("duplicates a section with fresh id and entries", () => {
    const education = store().document.sections.find((s) => s.definitionId === "education")!;
    store().addEntry(education.id);
    store().duplicateSection(education.id);
    const copies = store().document.sections.filter((s) => s.definitionId === "education");
    expect(copies).toHaveLength(2);
    expect(copies[0]!.id).not.toBe(copies[1]!.id);
    expect(copies[1]!.entries).toHaveLength(1);
  });

  it("renaming is undoable and never empties the title", () => {
    const section = store().document.sections[1];
    store().renameSection(section.id, "Education History");
    expect(store().document.sections[1]?.title).toBe("Education History");
    store().renameSection(section.id, "   ");
    expect(store().document.sections[1]?.title).toBe("Education History");
  });

  it("loadDocument resets history and dirty state", () => {
    store().updateEntry(store().document.sections[0]!.id, 0, "fullName", "X");
    const fresh = createEmptyCvDocument();
    store().loadDocument(fresh, "C:/cv/test.cv");
    expect(store().past).toHaveLength(0);
    expect(store().isDirty).toBe(false);
    expect(store().filePath).toBe("C:/cv/test.cv");
  });
});
