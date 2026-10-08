import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportPdf } from "./pdfActions";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import type { CvRepository, ReadResult, WriteResult } from "./CvRepository";
import { isTauriAvailable } from "@/tauri/api";

vi.mock("@/tauri/api", () => ({
  isTauriAvailable: vi.fn(() => true),
}));

const tauriMode = vi.mocked(isTauriAvailable);

const noopResult: ReadResult = { ok: false, error: "unused" };

function fakeRepository() {
  return {
    pickForOpen: vi.fn(async (): Promise<string | null> => null),
    pickForSave: vi.fn(async (): Promise<string | null> => null),
    read: vi.fn(async (): Promise<ReadResult> => noopResult),
    write: vi.fn(async (): Promise<WriteResult> => ({ ok: true })),
    readAutosave: vi.fn(async (): Promise<ReadResult | null> => null),
    writeAutosave: vi.fn(async (): Promise<WriteResult> => ({ ok: true })),
    clearAutosave: vi.fn(async (): Promise<void> => undefined),
    pickForTexExport: vi.fn(async (): Promise<string | null> => null),
    writeTex: vi.fn(async (): Promise<WriteResult> => ({ ok: true })),
    pickForPdfExport: vi.fn(async (): Promise<string | null> => null),
    exportPdf: vi.fn(
      async (_contents: string, _outPath: string): Promise<WriteResult> => ({
        ok: true,
      }),
    ),
  } satisfies CvRepository;
}

describe("exportPdf", () => {
  beforeEach(() => {
    useDocumentStore.getState().newDocument();
    tauriMode.mockReturnValue(true);
  });

  it("requires the desktop runtime", async () => {
    tauriMode.mockReturnValue(false);
    const repository = fakeRepository();

    const result = await exportPdf(repository);

    expect(result).toEqual({
      ok: false,
      cancelled: false,
      error: expect.stringContaining("desktop app"),
    });
    expect(repository.pickForPdfExport).not.toHaveBeenCalled();
  });

  it("passes generated LaTeX and the chosen path to the compile command", async () => {
    const repository = fakeRepository();
    repository.pickForPdfExport.mockResolvedValueOnce("C:/cv/out.pdf");

    const result = await exportPdf(repository);

    expect(result).toEqual({ ok: true, path: "C:/cv/out.pdf" });
    const [contents, outPath] = repository.exportPdf.mock.calls[0] ?? [];
    expect(outPath).toBe("C:/cv/out.pdf");
    expect(contents).toContain("\\documentclass[11pt]{article}");
  });

  it("treats a cancelled dialog as cancelled", async () => {
    const repository = fakeRepository();
    repository.pickForPdfExport.mockResolvedValueOnce(null);

    const result = await exportPdf(repository);

    expect(result).toEqual({ ok: false, cancelled: true });
    expect(repository.exportPdf).not.toHaveBeenCalled();
  });

  it("propagates XeLaTeX failures reported by the repository", async () => {
    const repository = fakeRepository();
    repository.pickForPdfExport.mockResolvedValueOnce("C:/cv/out.pdf");
    repository.exportPdf.mockResolvedValueOnce({
      ok: false,
      error: "XeLaTeX failed: ! Undefined control sequence",
    });

    const result = await exportPdf(repository);

    expect(result).toEqual({
      ok: false,
      cancelled: false,
      error: "XeLaTeX failed: ! Undefined control sequence",
    });
  });

  it("reports dialog throws", async () => {
    const repository = fakeRepository();
    repository.pickForPdfExport.mockRejectedValueOnce(
      new Error("dialog crashed"),
    );

    const result = await exportPdf(repository);

    expect(result).toEqual({
      ok: false,
      cancelled: false,
      error: "dialog crashed",
    });
  });
});