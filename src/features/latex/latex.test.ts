import { beforeEach, describe, expect, it } from "vitest";
import { generateLatex } from "./generate";
import { cvTemplateSchema } from "@/features/cv/schema/document";
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

function tex(): string {
  return generateLatex(store().document);
}

describe("generateLatex", () => {
  beforeEach(() => {
    store().newDocument();
  });

  it("produces a compilable skeleton for an empty document", () => {
    const output = tex();
    expect(output).toContain("\\documentclass[11pt]{article}");
    expect(output).toContain("\\begin{document}");
    expect(output).toContain("\\end{document}");
    expect(output).not.toContain("\\section*");
  });

  it("escapes user content everywhere it appears", () => {
    const id = sectionId("profile");
    store().updateEntry(id, 0, "fullName", "Jane O'Connor & Sons_50%");
    store().updateEntry(id, 0, "email", "jane@example.org");

    const output = tex();

    expect(output).toContain("Jane O'Connor \\& Sons\\_50\\%");
    expect(output).not.toMatch(/Sons_50%/);
  });

  it("renders the profile as a centered header, not a section", () => {
    const id = sectionId("profile");
    store().updateEntry(id, 0, "fullName", "Jane Doe");
    store().updateEntry(id, 0, "email", "jane@uni.edu");
    store().updateEntry(id, 0, "city", "Minia");

    const output = tex();

    expect(output).toContain("\\begin{center}");
    expect(output).toContain("{\\LARGE\\bfseries Jane Doe}");
    expect(output).toContain("jane@uni.edu \\textbullet\\ Minia");
    expect(output).not.toContain("\\section*{Personal Information}");
  });

  it("renders education as a credential block with years on the right", () => {
    const id = sectionId("education");
    store().addEntry(id);
    store().updateEntry(id, 0, "degree", "Ph.D.");
    store().updateEntry(id, 0, "fieldOfStudy", "Computer Science");
    store().updateEntry(id, 0, "institution", "Minia University");
    store().updateEntry(id, 0, "advisor", "Prof. Hassan");
    store().updateEntry(id, 0, "startYear", "2022");
    store().updateEntry(id, 0, "endYear", "2026");

    const output = tex();

    expect(output).toContain("\\section*{Education}");
    expect(output).toContain(
      "\\textbf{Ph.D. in Computer Science} \\hfill 2022 – 2026",
    );
    expect(output).toContain("Minia University");
    expect(output).toContain("Advisor: Prof. Hassan");
  });

  it("bolds the owning author in publications and brackets status", () => {
    const id = sectionId("publications");
    store().addEntry(id);
    store().updateEntry(id, 0, "title", "Deep Learning & Friends");
    store().updateEntry(id, 0, "year", "2024");
    store().updateEntry(id, 0, "venue", "Journal of Examples");
    store().updateEntry(id, 0, "doi", "10.1234/ex.56");
    store().updateEntry(id, 0, "status", "underReview");
    store().updateEntry(id, 0, "authors", [
      { name: "Bob Roe", isMe: false },
      { name: "Jane Doe", isMe: true },
    ]);

    const output = tex();

    expect(output).toContain("\\textbf{Jane Doe}");
    expect(output).not.toContain("\\textbf{Bob Roe}");
    // a bare & is a LaTeX alignment tab — two authors must join with \&
    expect(output).toContain("Bob Roe \\& \\textbf{Jane Doe}");
    expect(output).not.toMatch(/Bob Roe &/);
    expect(output).toContain("\\emph{Deep Learning \\& Friends}");
    expect(output).toContain("Journal of Examples");
    expect(output).toContain("doi:10.1234/ex.56");
    expect(output).toContain("[Under Review]");
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

    const output = tex();

    expect(output).toContain("\\section*{Editorial Work}");
    expect(output).toContain("\\textbf{Role:} Reviewer");
    expect(output).toContain("\\textbf{Journal:} Nature");
    expect(output).not.toContain("Notes:");
  });

  it("skips disabled and empty sections", () => {
    const education = sectionId("education");
    store().addEntry(education);
    store().updateEntry(education, 0, "degree", "B.Sc.");
    store().setSectionEnabled(education, false);

    const output = tex();

    expect(output).not.toContain("B.Sc.");
    expect(output).not.toContain("\\section*{Education}");
    expect(output).not.toContain("\\section*{Teaching Experience}");
  });

  it("renders skills categories", () => {
    const definition = getBuiltinDefinition("skills");
    if (!definition) throw new Error("missing skills definition");
    const id = store().addSection(definition);
    store().setSectionEnabled(id, true);
    store().addEntry(id);
    store().updateEntry(id, 0, "category", "Programming");
    store().updateEntry(id, 0, "items", "Python, R");

    expect(tex()).toContain("\\textbf{Programming:} Python, R");
  });

  it("registers a LaTeX layout for every CV template", () => {
    const ids = cvTemplateSchema.options;
    expect(ids.length).toBeGreaterThanOrEqual(13);
    const signatures = new Set<string>();
    for (const template of ids) {
      store().setTemplate(template);
      const output = tex();
      expect(output).toContain(
        `% Generated by CVMaker (${template} template)`,
      );
      expect(output).toContain("\\documentclass");
      expect(output).toContain("\\begin{document}");
      expect(output).toContain("\\end{document}");
      signatures.add(output.split("\\begin{document}")[0]);
    }
    // every template must differ in at least its page geometry
    expect(signatures.size).toBe(ids.length);
  });

  it("switches LaTeX layout per template", () => {
    const profile = sectionId("profile");
    store().updateEntry(profile, 0, "fullName", "Jane Doe");

    store().setTemplate("modern");
    const modern = tex();
    expect(modern).toContain("% Generated by CVMaker (modern template)");
    expect(modern).toContain("\\renewcommand{\\familydefault}{\\sfdefault}");
    expect(modern).toContain("\\begin{flushleft}");
    expect(modern).not.toContain("\\begin{center}");

    store().setTemplate("compact");
    const compact = tex();
    expect(compact).toContain("\\documentclass[10pt]{article}");
    expect(compact).toContain("[margin=0.7in]");

    store().setTemplate("traditional");
    const traditional = tex();
    expect(traditional).toContain("\\documentclass[11pt]{article}");
    expect(traditional).toContain("\\begin{center}");
    expect(traditional).not.toContain("\\sfdefault");
  });
});
