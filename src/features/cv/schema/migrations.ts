/**
 * Migration chain: every step upgrades a document exactly one version.
 *
 * When schemaVersion goes from 1 to 2, append:
 *   { from: 1, to: 2, run: (doc) => ({ ...doc, /* transform *\/ }) }
 *
 * Old `.cv` files then keep opening forever without special-case code in the
 * app. Steps must be pure — no I/O, no React, no randomness.
 */

export type CvMigration = {
  from: number;
  to: number;
  run: (document: Record<string, unknown>) => Record<string, unknown>;
};

export const migrations: CvMigration[] = [];

export class MigrationError extends Error {}

/**
 * Applies migrations in order until the document reaches `targetVersion`.
 * Throws MigrationError for gaps in the chain (a programming mistake).
 */
export function runMigrations(
  document: Record<string, unknown>,
  chain: CvMigration[],
  targetVersion: number,
): Record<string, unknown> {
  let current = document.schemaVersion as number;

  while (current < targetVersion) {
    const step = chain.find((m) => m.from === current);
    if (!step) {
      throw new MigrationError(
        `No migration registered from version ${current} to ${current + 1}`,
      );
    }
    document = step.run(document);
    current = step.to;
  }

  if (current > targetVersion) {
    throw new MigrationError(
      `Document version ${current} is newer than supported version ${targetVersion}`,
    );
  }

  return { ...document, schemaVersion: current };
}
