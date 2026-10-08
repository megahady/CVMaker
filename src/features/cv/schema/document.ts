import { z } from "zod";
import { fieldDefinitionSchema } from "./fields";

/**
 * Version of the `.cv` file format this build writes.
 *
 * Parsing pipeline:  raw JSON → migrate() → zod validation → CvDocument.
 * Migration runs *before* zod sees the data, so this literal is always the
 * final target version.
 */
export const CURRENT_SCHEMA_VERSION = 1;

export const cvTemplateSchema = z.enum([
  "traditional",
  "modern",
  "compact",
  "classic",
  "formal",
  "executive",
  "academic",
  "minimal",
  "sans",
  "concise",
  "elegant",
  "researcher",
  "clean",
]);
export type CvTemplate = z.infer<typeof cvTemplateSchema>;

/**
 * One section's worth of user input. Values are keyed by FieldDefinition.id.
 * Kept as a loose record so custom sections never require a schema change.
 */
export const entryDataSchema = z.record(z.string(), z.unknown());
export type EntryData = z.infer<typeof entryDataSchema>;

export const sectionTypeSchema = z.enum(["single", "collection"]);
export type SectionType = z.infer<typeof sectionTypeSchema>;

/**
 * A section as it exists in a specific CV document: whether it is enabled,
 * its position, and its entries.
 *
 * `definitionId` links to a SectionDefinition (built-in registry or a custom
 * one stored inline in `fields`), so the document stays independent of the UI.
 *
 * Single sections (e.g. Personal Information) use the same `entries` array
 * shape with at most one entry — uniform pipeline, no special case.
 */
export const sectionInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  title: z.string().min(1),
  type: sectionTypeSchema,
  enabled: z.boolean(),
  order: z.number().int(),
  fields: z.array(fieldDefinitionSchema).optional(),
  entries: z.array(entryDataSchema),
});
export type SectionInstance = z.infer<typeof sectionInstanceSchema>;

export const cvMetadataSchema = z.object({
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CvMetadata = z.infer<typeof cvMetadataSchema>;

/**
 * The whole `.cv` document. This schema validates already-migrated data,
 * which is why `schemaVersion` is a literal rather than a range.
 */
export const cvDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    metadata: cvMetadataSchema,
    template: cvTemplateSchema,
    sections: z.array(sectionInstanceSchema),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.sections.forEach((section, index) => {
      if (seen.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate section id "${section.id}"`,
          path: ["sections", index, "id"],
        });
      }
      seen.add(section.id);
    });
  });

export type CvDocument = z.infer<typeof cvDocumentSchema>;
