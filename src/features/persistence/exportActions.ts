import { generateLatex } from "@/features/latex/generate";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { isTauriAvailable } from "@/tauri/api";
import type { CvRepository } from "./CvRepository";

export type ExportTexResult =
  | { ok: true; via: "dialog" | "download" }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

/** "My Academic CV" → filename-safe `My Academic CV.tex`. */
export function suggestedTexFileName(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return `${safe || "My Academic CV"}.tex`;
}

function downloadText(contents: string, fileName: string): void {
  const blob = new Blob([contents], { type: "application/x-tex" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * LaTeX export, one code path for the content and two for the destination:
 * - desktop (Tauri): native save dialog → validated Rust write
 * - browser (dev): immediate download of the same .tex text
 */
export async function exportTex(
  repository: CvRepository,
): Promise<ExportTexResult> {
  const cv = useDocumentStore.getState().document;
  const tex = generateLatex(cv);

  if (!isTauriAvailable()) {
    downloadText(tex, suggestedTexFileName(cv.metadata.title));
    return { ok: true, via: "download" };
  }

  let path: string | null;
  try {
    path = await repository.pickForTexExport();
  } catch (error) {
    return {
      ok: false,
      cancelled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (path === null) return { ok: false, cancelled: true };

  const result = await repository.writeTex(path, tex);
  if (!result.ok) return { ok: false, cancelled: false, error: result.error };
  return { ok: true, via: "dialog" };
}
