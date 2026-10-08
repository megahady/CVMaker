import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PreviewPane } from "./PreviewPane";
import { cvTemplateSchema } from "@/features/cv/schema/document";
import { listTemplates } from "./templates";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import {
  createCustomSectionDefinition,
  getBuiltinDefinition,
} from "@/features/cv/sections/registry";

const store = () => useDocumentStore.getState();

function sectionId(definitionId: string): string {
  const found = store().document.sections.find(
    (section) => section.definitionId === definitionId,
  );
  if (!found) throw new Error(`missing section ${definitionId}`);
  return found.id;
}

function headingTexts(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll("h2")].map(
    (heading) => heading.textContent,
  );
}

describe("PreviewPane", () => {
  beforeEach(() => {
    store().newDocument();
  });

  it("shows a placeholder when no section has content", () => {
    const { container } = render(<PreviewPane />);
    expect(container.textContent).toContain("Nothing to preview yet");
  });

  it("renders the profile as a header without a section heading", () => {
    const id = sectionId("profile");
    store().updateEntry(id, 0, "fullName", "Jane Doe");
    store().updateEntry(id, 0, "email", "jane@uni.edu");

    const { container } = render(<PreviewPane />);

    expect(container.querySelector("h1")?.textContent).toBe("Jane Doe");
    expect(container.textContent).toContain("jane@uni.edu");
    expect(headingTexts(container)).not.toContain("Personal Information");
  });

  it("formats education entries as a credential block", () => {
    const id = sectionId("education");
    store().addEntry(id);
    store().updateEntry(id, 0, "degree", "Ph.D.");
    store().updateEntry(id, 0, "fieldOfStudy", "Computer Science");
    store().updateEntry(id, 0, "institution", "Minia University");
    store().updateEntry(id, 0, "startYear", "2022");
    store().updateEntry(id, 0, "endYear", "2026");

    const { container } = render(<PreviewPane />);

    expect(headingTexts(container)).toContain("Education");
    expect(container.textContent).toContain("Ph.D. in Computer Science");
    expect(container.textContent).toContain("Minia University");
    expect(container.textContent).toContain("2022 – 2026");
  });

  it("hides sections that are disabled or empty", () => {
    const id = sectionId("education");
    store().addEntry(id);
    store().updateEntry(id, 0, "degree", "B.Sc.");
    store().setSectionEnabled(id, false);

    const { container } = render(<PreviewPane />);

    expect(container.textContent).not.toContain("B.Sc.");
    expect(headingTexts(container)).not.toContain("Education");
    // never-enabled sections (e.g. teaching) have no entries at all
    expect(headingTexts(container)).not.toContain("Teaching Experience");
  });

  it("renders custom sections through the generic fallback", () => {
    const definition = createCustomSectionDefinition({
      title: "Editorial Work",
      type: "collection",
      fields: [
        { id: "role", label: "Role", type: "text" },
        { id: "journal", label: "Journal", type: "text" },
        { id: "notes", label: "Notes", type: "textarea" },
      ],
    });
    const id = store().addSection(definition);
    store().addEntry(id);
    store().updateEntry(id, 0, "role", "Reviewer");
    store().updateEntry(id, 0, "journal", "Nature");

    const { container } = render(<PreviewPane />);

    expect(headingTexts(container)).toContain("Editorial Work");
    expect(container.textContent).toContain("Role: Reviewer");
    expect(container.textContent).toContain("Journal: Nature");
    expect(container.textContent).not.toContain("Notes:");
  });

  it("renders publications with the owning author emphasized", () => {
    const id = sectionId("publications");
    store().addEntry(id);
    store().updateEntry(id, 0, "title", "Deep Learning for CVs");
    store().updateEntry(id, 0, "year", "2024");
    store().updateEntry(id, 0, "venue", "Journal of Examples");
    store().updateEntry(id, 0, "status", "published");
    store().updateEntry(id, 0, "authors", [
      { name: "Bob Roe", isMe: false },
      { name: "Jane Doe", isMe: true },
    ]);

    const { container } = render(<PreviewPane />);

    const emphasized = [...container.querySelectorAll("strong")].map(
      (node) => node.textContent,
    );
    expect(emphasized).toContain("Jane Doe");
    expect(emphasized).not.toContain("Bob Roe");
    expect(container.textContent).toContain("(2024)");
    expect(container.textContent).toContain("Deep Learning for CVs");
    expect(container.textContent).toContain("Journal of Examples");
    expect(container.textContent).not.toContain("[Published]");
  });

  it("switches preview styling per template", () => {
    const id = sectionId("profile");
    store().updateEntry(id, 0, "fullName", "Jane Doe");

    const traditional = render(<PreviewPane />);
    const page = traditional.container.querySelector("aside > div");
    expect(page?.className).toContain("font-serif");
    expect(
      traditional.container.querySelector("h1")?.className,
    ).toContain("text-center");
    traditional.unmount();

    store().setTemplate("modern");
    const modern = render(<PreviewPane />);
    expect(modern.container.querySelector("aside > div")?.className).toContain(
      "font-sans",
    );
    expect(modern.container.querySelector("h1")?.className).not.toContain(
      "text-center",
    );
    modern.unmount();

    store().setTemplate("compact");
    const compact = render(<PreviewPane />);
    expect(compact.container.querySelector("aside > div")?.className).toContain(
      "leading-snug",
    );
  });

  it("registers a preview style for every CV template", () => {
    const styles = listTemplates();
    expect(styles).toHaveLength(cvTemplateSchema.options.length);

    const uniqueIds = new Set(styles.map((entry) => entry.id));
    expect(uniqueIds.size).toBe(styles.length);

    for (const style of styles) {
      expect(style.page).toContain("bg-white");
      expect(style.name.length).toBeGreaterThan(0);
      expect(style.sectionTitleClass.length).toBeGreaterThan(0);
    }
  });

  it("renders skills categories from list text", () => {
    const definition = getBuiltinDefinition("skills");
    if (!definition) throw new Error("missing skills definition");
    const id = store().addSection(definition);
    store().setSectionEnabled(id, true);
    store().addEntry(id);
    store().updateEntry(id, 0, "category", "Programming");
    store().updateEntry(id, 0, "items", "Python,\nR, SQL");

    const { container } = render(<PreviewPane />);

    expect(container.textContent).toContain("Programming:");
    expect(container.textContent).toContain("Python, R, SQL");
  });
});
