import type { CvDocument } from "@/features/cv/schema/document";
import { parseCvDocument } from "@/features/cv/schema/parse";

export type ReadResult =
  | { ok: true; document: CvDocument }
  | { ok: false; error: string };

export type WriteResult = { ok: true } | { ok: false; error: string };

/**
 * Persistence port (hexagonal style): the app depends on this interface, not
 * on Tauri. A future SQLite backend implements the same five methods.
 */
export interface CvRepository {
  pickForOpen(): Promise<string | null>;
  pickForSave(): Promise<string | null>;
  read(path: string): Promise<ReadResult>;
  write(path: string, document: CvDocument): Promise<WriteResult>;
  /** null when no recovery file exists. */
  readAutosave(): Promise<ReadResult | null>;
  writeAutosave(document: CvDocument): Promise<WriteResult>;
  clearAutosave(): Promise<void>;
  /** Native save dialog for an exported .tex file. */
  pickForTexExport(): Promise<string | null>;
  writeTex(path: string, contents: string): Promise<WriteResult>;
  /** Native save dialog for an exported PDF. */
  pickForPdfExport(): Promise<string | null>;
  /** Compile .tex contents to a PDF at the chosen path (Rust runs XeLaTeX). */
  exportPdf(contents: string, outPath: string): Promise<WriteResult>;
}

export function serializeCv(document: CvDocument): string {
  return JSON.stringify(document, null, 2);
}

/** Parses untrusted file content through the schema layer (never trusts JSON). */
export function deserializeCv(json: string): ReadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  return parseCvDocument(raw);
}
