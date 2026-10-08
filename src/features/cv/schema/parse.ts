import {
  CURRENT_SCHEMA_VERSION,
  cvDocumentSchema,
  type CvDocument,
} from "./document";
import { MigrationError, migrations, runMigrations } from "./migrations";

export type ParseCvResult =
  | { ok: true; document: CvDocument }
  | { ok: false; error: string };

function fail(error: string): ParseCvResult {
  return { ok: false, error };
}

/**
 * Turns untrusted data (a file the user opened) into a trusted CvDocument.
 * Never throws: callers show `error` directly in the UI.
 *
 * Flow: structural checks → version check → migrate → zod validation.
 */
export function parseCvDocument(raw: unknown): ParseCvResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return fail("This file does not contain a CV object.");
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.schemaVersion !== "number") {
    return fail("This file has no schemaVersion and is not a CVMaker file.");
  }

  if (record.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return fail(
      `This CV was created by a newer version of CVMaker (file version ${record.schemaVersion}, this app supports ${CURRENT_SCHEMA_VERSION}).`,
    );
  }

  let migrated: Record<string, unknown>;
  try {
    migrated = runMigrations(record, migrations, CURRENT_SCHEMA_VERSION);
  } catch (error) {
    if (error instanceof MigrationError) {
      return fail(error.message);
    }
    throw error;
  }

  const result = cvDocumentSchema.safeParse(migrated);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.length ? first.path.join(".") : "document";
    return fail(`Invalid CV data at ${path}: ${first?.message ?? "unknown error"}`);
  }

  return { ok: true, document: result.data };
}
