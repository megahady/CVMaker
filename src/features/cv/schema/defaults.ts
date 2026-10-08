import {
  CURRENT_SCHEMA_VERSION,
  type CvDocument,
} from "./document";

/** Creates a valid, empty CV. Sections are seeded later by the section registry (Phase 3). */
export function createEmptyCvDocument(
  title = "My Academic CV",
): CvDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: { title, createdAt: now, updatedAt: now },
    template: "traditional",
    sections: [],
  };
}
