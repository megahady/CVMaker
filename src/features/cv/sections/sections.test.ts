import { describe, expect, it } from "vitest";
import { parseCvDocument } from "@/features/cv/schema/parse";
import { createEmptyCvDocument } from "@/features/cv/schema/defaults";
import { builtinSectionDefinitions } from "./builtins";
import { sectionDefinitionSchema, type SectionDefinition } from "./definitions";
import {
  createCustomSectionDefinition,
  createSectionInstance,
  resolveSectionDefinition,
  sortedBuiltinDefinitions,
} from "./registry";

describe("builtin section catalog", () => {
  it("every definition satisfies the SectionDefinition schema", () => {
    for (const definition of builtinSectionDefinitions) {
      const result = sectionDefinitionSchema.safeParse(definition);
      expect(result.success, `${definition.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it("ids and orders are unique", () => {
    const ids = builtinSectionDefinitions.map((d) => d.id);
    const orders = builtinSectionDefinitions.map((d) => d.order);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("covers the twelve sections required by the spec", () => {
    expect(builtinSectionDefinitions.map((d) => d.id)).toEqual([
      "profile",
      "education",
      "positions",
      "research",
      "publications",
      "teaching",
      "awards",
      "grants",
      "talks",
      "service",
      "skills",
      "languages",
    ]);
  });

  it("is sorted by order for the section manager", () => {
    const orders = sortedBuiltinDefinitions.map((d) => d.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("section instances", () => {
  const education = builtinSectionDefinitions.find((d) => d.id === "education")!;

  it("built-in instances resolve their definition without stored fields", () => {
    const instance = createSectionInstance(education, 10);
    expect(instance.fields).toBeUndefined();
    expect(resolveSectionDefinition(instance).id).toBe("education");
  });

  it("a brand-new section type works end-to-end with zero code changes", () => {
    const definition = createCustomSectionDefinition({
      title: "Patents",
      description: "My patent work",
      type: "collection",
      fields: [
        { id: "number", label: "Patent number", type: "text" },
        { id: "title", label: "Title", type: "text" },
        { id: "year", label: "Year", type: "year" },
      ],
    });

    const instance = createSectionInstance(definition, 0);
    const resolved = resolveSectionDefinition(instance);
    expect(resolved.fields.map((f) => f.id)).toEqual(["number", "title", "year"]);
    expect(resolved.renderer).toBe("generic");

    const doc = createEmptyCvDocument();
    doc.sections.push({ ...instance, entries: [{ number: "US-123" }] });
    expect(parseCvDocument(doc).ok).toBe(true);
  });

  it("unknown definitions fall back to a generic definition", () => {
    const instance = {
      ...createSectionInstance(education, 0),
      definitionId: "removed-in-a-future-version",
    };
    const resolved = resolveSectionDefinition(instance);
    expect(resolved.renderer).toBe("generic");
    expect(resolved.fields).toEqual([]);
  });
});

describe("custom section definitions", () => {
  it("are unique per creation", () => {
    const a: SectionDefinition = createCustomSectionDefinition({
      title: "Media",
      type: "collection",
      fields: [],
    });
    const b: SectionDefinition = createCustomSectionDefinition({
      title: "Media",
      type: "collection",
      fields: [],
    });
    expect(a.id).not.toBe(b.id);
  });
});
