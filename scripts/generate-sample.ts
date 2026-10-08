/**
 * Generates sample.tex — a populated demo CV — and is also the fixture for
 * checking that the output really compiles with XeLaTeX.
 *
 * Run: npx vite-node scripts/generate-sample.ts
 */
import { writeFileSync } from "node:fs";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { createCustomSectionDefinition } from "@/features/cv/sections/registry";
import { generateLatex } from "@/features/latex/generate";

const store = useDocumentStore.getState();
store.newDocument();

const profile = store.document.sections.find((s) => s.definitionId === "profile")!;
store.updateEntry(profile.id, 0, "fullName", "Jane O'Connor & Co_50%");
store.updateEntry(profile.id, 0, "email", "jane@example.org");
store.updateEntry(profile.id, 0, "city", "Minia");
store.updateEntry(profile.id, 0, "country", "Egypt");
store.updateEntry(profile.id, 0, "website", "jane.example.org");

const education = store.document.sections.find((s) => s.definitionId === "education")!;
store.addEntry(education.id);
store.updateEntry(education.id, 0, "degree", "Ph.D.");
store.updateEntry(education.id, 0, "fieldOfStudy", "Computer Science");
store.updateEntry(education.id, 0, "institution", "Example University");
store.updateEntry(education.id, 0, "advisor", "Prof. Hassan");
store.updateEntry(education.id, 0, "startYear", "2022");
store.updateEntry(education.id, 0, "endYear", "2026");
store.updateEntry(education.id, 0, "thesisTitle", "Efficient Academic Documents & 100% Automation");

const publications = store.document.sections.find((s) => s.definitionId === "publications")!;
store.addEntry(publications.id);
store.updateEntry(publications.id, 0, "title", "Deep Learning & Friends");
store.updateEntry(publications.id, 0, "year", "2024");
store.updateEntry(publications.id, 0, "venue", "Journal of Examples");
store.updateEntry(publications.id, 0, "volume", "12");
store.updateEntry(publications.id, 0, "issue", "3");
store.updateEntry(publications.id, 0, "pages", "45-67");
store.updateEntry(publications.id, 0, "doi", "10.1234/ex.56");
store.updateEntry(publications.id, 0, "status", "underReview");
store.updateEntry(publications.id, 0, "authors", [
  { name: "Bob Roe", isMe: false },
  { name: "Jane O'Connor", isMe: true },
]);

const customId = store.addSection(
  createCustomSectionDefinition({
    title: "Editorial Work",
    type: "collection",
    fields: [
      { id: "role", label: "Role", type: "text" },
      { id: "journal", label: "Journal", type: "text" },
    ],
  }),
);
store.addEntry(customId);
store.updateEntry(customId, 0, "role", "Reviewer");
store.updateEntry(customId, 0, "journal", "Nature");

writeFileSync(
  "sample.tex",
  generateLatex(useDocumentStore.getState().document),
  "utf8",
);
console.log("wrote sample.tex");
