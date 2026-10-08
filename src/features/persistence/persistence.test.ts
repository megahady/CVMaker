import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyCvDocument } from "@/features/cv/schema/defaults";
import { deserializeCv, serializeCv } from "./CvRepository";
import { fileRepository } from "./fileRepository";
import {
  exportPdfFile,
  pickCvFile,
  pickPdfFile,
  pickTexFile,
  readAutosave,
  readCvFile,
  writeAutosave,
  writeCvFile,
  writeTexFile,
} from "@/tauri/api";

vi.mock("@/tauri/api", () => ({
  isTauriAvailable: () => true,
  pickCvFile: vi.fn(),
  readCvFile: vi.fn(),
  writeCvFile: vi.fn(),
  pickTexFile: vi.fn(),
  writeTexFile: vi.fn(),
  pickPdfFile: vi.fn(),
  exportPdfFile: vi.fn(),
  readAutosave: vi.fn(),
  writeAutosave: vi.fn(),
  clearAutosave: vi.fn(),
  errorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
}));

const mockedPick = vi.mocked(pickCvFile);
const mockedRead = vi.mocked(readCvFile);
const mockedWrite = vi.mocked(writeCvFile);
const mockedPickTex = vi.mocked(pickTexFile);
const mockedWriteTex = vi.mocked(writeTexFile);
const mockedPickPdf = vi.mocked(pickPdfFile);
const mockedExportPdf = vi.mocked(exportPdfFile);
const mockedReadAutosave = vi.mocked(readAutosave);
const mockedWriteAutosave = vi.mocked(writeAutosave);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("serializeCv / deserializeCv", () => {
  it("round-trips a valid document", () => {
    const document = createEmptyCvDocument();
    const result = deserializeCv(serializeCv(document));
    expect(result).toEqual({ ok: true, document });
  });

  it("rejects non-JSON content", () => {
    const result = deserializeCv("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not valid JSON");
  });

  it("rejects JSON that is not a CVMaker file", () => {
    const result = deserializeCv(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("schemaVersion");
  });
});

describe("fileRepository", () => {
  it("reads and validates file contents", async () => {
    const document = createEmptyCvDocument();
    mockedRead.mockResolvedValueOnce(serializeCv(document));
    const result = await fileRepository.read("C:/cv/test.cv");
    expect(result).toEqual({ ok: true, document });
    expect(mockedRead).toHaveBeenCalledWith("C:/cv/test.cv");
  });

  it("turns Rust rejections into readable errors", async () => {
    mockedRead.mockRejectedValueOnce(
      "Could not read C:/cv/missing.cv: file not found",
    );
    const result = await fileRepository.read("C:/cv/missing.cv");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("file not found");
  });

  it("writes pretty-printed JSON", async () => {
    const document = createEmptyCvDocument();
    mockedWrite.mockResolvedValueOnce(undefined);
    const result = await fileRepository.write("C:/cv/test.cv", document);
    expect(result).toEqual({ ok: true });
    expect(mockedWrite).toHaveBeenCalledWith(
      "C:/cv/test.cv",
      serializeCv(document),
    );
  });

  it("reports write failures without throwing", async () => {
    mockedWrite.mockRejectedValueOnce("Access is denied");
    const result = await fileRepository.write("C:/cv/test.cv", createEmptyCvDocument());
    expect(result).toEqual({ ok: false, error: "Access is denied" });
  });

  it("returns null when no autosave exists", async () => {
    mockedReadAutosave.mockResolvedValueOnce(null);
    expect(await fileRepository.readAutosave()).toBeNull();
  });

  it("propagates dialog errors as exceptions", async () => {
    mockedPick.mockRejectedValueOnce("dialog crashed");
    await expect(fileRepository.pickForOpen()).rejects.toThrow("dialog crashed");
  });

  it("returns null when the user cancels the dialog", async () => {
    mockedPick.mockResolvedValueOnce(null);
    expect(await fileRepository.pickForSave()).toBeNull();
  });

  it("passes autosave contents to the write command", async () => {
    mockedWriteAutosave.mockResolvedValueOnce(undefined);
    const document = createEmptyCvDocument();
    await fileRepository.writeAutosave(document);
    expect(mockedWriteAutosave).toHaveBeenCalledWith(serializeCv(document));
  });

  it("exports .tex through dialog and write commands", async () => {
    mockedPickTex.mockResolvedValueOnce("C:/cv/export.tex");
    expect(await fileRepository.pickForTexExport()).toBe("C:/cv/export.tex");
    expect(mockedPickTex).toHaveBeenCalledWith("save");

    mockedWriteTex.mockResolvedValueOnce(undefined);
    const result = await fileRepository.writeTex(
      "C:/cv/export.tex",
      "\\documentclass{}",
    );
    expect(result).toEqual({ ok: true });
    expect(mockedWriteTex).toHaveBeenCalledWith(
      "C:/cv/export.tex",
      "\\documentclass{}",
    );
  });

  it("reports .tex write failures without throwing", async () => {
    mockedWriteTex.mockRejectedValueOnce("Disk is full");
    const result = await fileRepository.writeTex("C:/cv/export.tex", "x");
    expect(result).toEqual({ ok: false, error: "Disk is full" });
  });

  it("picks a PDF destination through the dialog", async () => {
    mockedPickPdf.mockResolvedValueOnce("C:/cv/out.pdf");
    expect(await fileRepository.pickForPdfExport()).toBe("C:/cv/out.pdf");
  });

  it("passes LaTeX contents to the compile command", async () => {
    mockedExportPdf.mockResolvedValueOnce(undefined);
    const result = await fileRepository.exportPdf(
      "\\documentclass{}",
      "C:/cv/out.pdf",
    );
    expect(result).toEqual({ ok: true });
    expect(mockedExportPdf).toHaveBeenCalledWith(
      "\\documentclass{}",
      "C:/cv/out.pdf",
    );
  });

  it("reports compile failures", async () => {
    mockedExportPdf.mockRejectedValueOnce("! Undefined control sequence.");
    const result = await fileRepository.exportPdf("\\bad", "C:/cv/out.pdf");
    expect(result).toEqual({
      ok: false,
      error: "! Undefined control sequence.",
    });
  });
});
