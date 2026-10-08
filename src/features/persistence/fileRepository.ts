import {
  clearAutosave,
  errorMessage,
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
import type { CvDocument } from "@/features/cv/schema/document";
import {
  deserializeCv,
  serializeCv,
  type CvRepository,
  type ReadResult,
  type WriteResult,
} from "./CvRepository";

/** CvRepository backed by Tauri IPC (dialogs + validated Rust file commands). */
export const fileRepository: CvRepository = {
  async pickForOpen(): Promise<string | null> {
    try {
      return await pickCvFile("open");
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async pickForSave(): Promise<string | null> {
    try {
      return await pickCvFile("save");
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async read(path: string): Promise<ReadResult> {
    try {
      const contents = await readCvFile(path);
      return deserializeCv(contents);
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  async write(path: string, document: CvDocument): Promise<WriteResult> {
    try {
      await writeCvFile(path, serializeCv(document));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  async readAutosave(): Promise<ReadResult | null> {
    try {
      const contents = await readAutosave();
      if (contents === null) return null;
      return deserializeCv(contents);
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  async writeAutosave(document: CvDocument): Promise<WriteResult> {
    try {
      await writeAutosave(serializeCv(document));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  async clearAutosave(): Promise<void> {
    try {
      await clearAutosave();
    } catch {
      // Clearing is best-effort; a stale recovery file is only a prompt.
    }
  },

  async pickForTexExport(): Promise<string | null> {
    try {
      return await pickTexFile("save");
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async writeTex(path: string, contents: string): Promise<WriteResult> {
    try {
      await writeTexFile(path, contents);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  async pickForPdfExport(): Promise<string | null> {
    try {
      return await pickPdfFile();
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async exportPdf(contents: string, outPath: string): Promise<WriteResult> {
    try {
      await exportPdfFile(contents, outPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },
};
