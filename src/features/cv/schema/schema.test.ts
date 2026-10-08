import { describe, expect, it } from "vitest";
import { createEmptyCvDocument } from "./defaults";
import { cvDocumentSchema, CURRENT_SCHEMA_VERSION, type CvDocument } from "./document";
import { MigrationError, runMigrations } from "./migrations";
import { parseCvDocument } from "./parse";

function docWithSection(id: string): CvDocument {
  const doc = createEmptyCvDocument();
  doc.sections.push({
    id,
    definitionId: id,
    title: "Education",
    type: "collection",
    enabled: true,
    order: 0,
    entries: [{ degree: "Ph.D." }],
  });
  return doc;
}

describe("createEmptyCvDocument", () => {
  it("produces a valid document", () => {
    expect(cvDocumentSchema.safeParse(createEmptyCvDocument()).success).toBe(true);
  });
});

describe("parseCvDocument", () => {
  it("accepts a valid document (JSON round-trip)", () => {
    const original = docWithSection("education");
    const result = parseCvDocument(JSON.parse(JSON.stringify(original)));
    expect(result).toEqual({ ok: true, document: original });
  });

  it("rejects non-object input", () => {
    expect(parseCvDocument("hello").ok).toBe(false);
    expect(parseCvDocument(null).ok).toBe(false);
    expect(parseCvDocument([1, 2]).ok).toBe(false);
  });

  it("rejects files without a schemaVersion", () => {
    const result = parseCvDocument({ metadata: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("schemaVersion");
  });

  it("rejects files from a newer app version with a clear message", () => {
    const result = parseCvDocument({ schemaVersion: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer version");
  });

  it("rejects duplicate section ids", () => {
    const doc = createEmptyCvDocument();
    doc.sections = [
      ...docWithSection("dup").sections,
      ...docWithSection("dup").sections,
    ];
    const result = parseCvDocument(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Duplicate section id");
  });

  it("reports the failing path for invalid data", () => {
    const doc = docWithSection("education");
    doc.sections[0]!.title = "";
    const result = parseCvDocument(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("sections.0.title");
  });
});

describe("runMigrations", () => {
  const upgradeOnce = (doc: Record<string, unknown>) => ({ ...doc, label: "v2" });
  const upgradeTwice = (doc: Record<string, unknown>) => ({ ...doc, label: "v3" });

  it("applies chained steps until the target version", () => {
    const out = runMigrations(
      { schemaVersion: 1 },
      [
        { from: 1, to: 2, run: upgradeOnce },
        { from: 2, to: 3, run: upgradeTwice },
      ],
      3,
    );
    expect(out).toEqual({ schemaVersion: 3, label: "v3" });
  });

  it("throws when the chain has a gap", () => {
    expect(() =>
      runMigrations({ schemaVersion: 1 }, [{ from: 2, to: 3, run: upgradeTwice }], 3),
    ).toThrow(MigrationError);
  });

  it("throws for documents newer than the target", () => {
    expect(() => runMigrations({ schemaVersion: 5 }, [], 3)).toThrow(MigrationError);
  });

  it("is a no-op when already current", () => {
    const doc = { schemaVersion: CURRENT_SCHEMA_VERSION };
    expect(runMigrations(doc, [], CURRENT_SCHEMA_VERSION)).toEqual(doc);
  });
});
