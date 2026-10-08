import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportTex, suggestedTexFileName } from "./exportActions";
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
    writeTex: vi.fn(
      async (_path: string, _contents: string): Promise<WriteResult> => ({
        ok: true,
      }),
    ),
    pickForPdfExport: vi.fn(async (): Promise<string | null> => null),
    exportPdf: vi.fn(
      async (_contents: string, _outPath: string): Promise<WriteResult> => ({
        ok: true,
      }),
    ),
  } satisfies CvRepository;
}

const createObjectURL = vi.fn((_blob: Blob) => "blob:fake-url");
const revokeObjectURL = vi.fn();

describe("exportTex", () => {
  beforeEach(() => {
    useDocumentStore.getState().newDocument();
    tauriMode.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates LaTeX and writes it via the native dialog", async () => {
    const repository = fakeRepository();
    repository.pickForTexExport.mockResolvedValueOnce("C:/cv/export.tex");

    const result = await exportTex(repository);

    expect(result).toEqual({ ok: true, via: "dialog" });
    const [path, contents] = repository.writeTex.mock.calls[0] ?? [];
    expect(path).toBe("C:/cv/export.tex");
    expect(contents).toContain("\\documentclass[11pt]{article}");
  });

  it("treats a cancelled dialog as cancelled, not an error", async () => {
    const repository = fakeRepository();
    repository.pickForTexExport.mockResolvedValueOnce(null);

    const result = await exportTex(repository);

    expect(result).toEqual({ ok: false, cancelled: true });
    expect(repository.writeTex).not.toHaveBeenCalled();
  });

  it("reports write failures", async () => {
    const repository = fakeRepository();
    repository.pickForTexExport.mockResolvedValueOnce("C:/cv/export.tex");
    repository.writeTex.mockResolvedValueOnce({ ok: false, error: "Disk is full" });

    const result = await exportTex(repository);

    expect(result).toEqual({ ok: false, cancelled: false, error: "Disk is full" });
  });

  it("reports dialog failures thrown by the repository", async () => {
    const repository = fakeRepository();
    repository.pickForTexExport.mockRejectedValueOnce(new Error("dialog crashed"));

    const result = await exportTex(repository);

    expect(result).toEqual({
      ok: false,
      cancelled: false,
      error: "dialog crashed",
    });
  });

  it("downloads a .tex blob outside Tauri", async () => {
    tauriMode.mockReturnValue(false);
    const repository = fakeRepository();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const result = await exportTex(repository);

    expect(result).toEqual({ ok: true, via: "download" });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(repository.pickForTexExport).not.toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});

describe("suggestedTexFileName", () => {
  it("keeps normal titles and strips illegal path characters", () => {
    expect(suggestedTexFileName("My Academic CV")).toBe("My Academic CV.tex");
    expect(suggestedTexFileName('a/b:c*d?e"f<g>h|i')).toBe(
      "a-b-c-d-e-f-g-h-i.tex",
    );
    expect(suggestedTexFileName("   ")).toBe("My Academic CV.tex");
  });
});
