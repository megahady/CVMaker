import { generateLatex } from "@/features/latex/generate";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { isTauriAvailable } from "@/tauri/api";
import type { CvRepository } from "./CvRepository";

export type ExportPdfResult =
  | { ok: true; path: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

/**
 * PDF export. Unlike .tex, this needs the desktop runtime: the browser cannot
 * run XeLaTeX. The Rust `export_pdf` command writes a temp .tex, compiles with
 * fixed arguments, and copies the result — the frontend only supplies content
 * and the destination path.
 */
export async function exportPdf(
  repository: CvRepository,
): Promise<ExportPdfResult> {
  if (!isTauriAvailable()) {
    return {
      ok: false,
      cancelled: false,
      error: "PDF export requires the desktop app (run npm run tauri dev).",
    };
  }

  const tex = generateLatex(useDocumentStore.getState().document);

  let outPath: string | null;
  try {
    outPath = await repository.pickForPdfExport();
  } catch (error) {
    return {
      ok: false,
      cancelled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (outPath === null) return { ok: false, cancelled: true };

  const result = await repository.exportPdf(tex, outPath);
  if (!result.ok) return { ok: false, cancelled: false, error: result.error };
  return { ok: true, path: outPath };
}