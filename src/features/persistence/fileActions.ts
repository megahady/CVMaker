import { toast } from "sonner";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { isTauriAvailable } from "@/tauri/api";
import type { CvRepository } from "./CvRepository";

/**
 * User-facing file operations (toolbar / shortcuts).
 *
 * React form → Zustand document → CvRepository → Tauri command → Rust → disk
 *
 * Every function is a plain async function: easy to call from event handlers
 * and easy to test with a fake repository.
 */

function confirmDiscard(): boolean {
  const { isDirty, document } = useDocumentStore.getState();
  if (!isDirty) return true;
  return window.confirm(
    `Discard unsaved changes to "${document.metadata.title}"?`,
  );
}

export async function newCv(repository: CvRepository): Promise<void> {
  if (!confirmDiscard()) return;
  useDocumentStore.getState().newDocument();
  await repository.clearAutosave();
}

export async function openCv(repository: CvRepository): Promise<void> {
  if (!isTauriAvailable()) return;
  if (!confirmDiscard()) return;

  let path: string | null;
  try {
    path = await repository.pickForOpen();
  } catch (error) {
    toast.error((error as Error).message);
    return;
  }
  if (path === null) return; // user cancelled the dialog

  const result = await repository.read(path);
  if (!result.ok) {
    toast.error(result.error);
    return;
  }

  useDocumentStore.getState().loadDocument(result.document, path);
  await repository.clearAutosave();
  toast.success(`Opened ${basename(path)}`);
}

export async function saveCv(repository: CvRepository): Promise<void> {
  if (!isTauriAvailable()) return;
  const { filePath } = useDocumentStore.getState();
  if (filePath === null) {
    await saveCvAs(repository);
    return;
  }
  await writeTo(repository, filePath);
}

export async function saveCvAs(repository: CvRepository): Promise<void> {
  if (!isTauriAvailable()) return;

  let path: string | null;
  try {
    path = await repository.pickForSave();
  } catch (error) {
    toast.error((error as Error).message);
    return;
  }
  if (path === null) return;

  const normalized = path.toLowerCase().endsWith(".cv") ? path : `${path}.cv`;
  await writeTo(repository, normalized);
}

async function writeTo(repository: CvRepository, path: string): Promise<void> {
  const { document } = useDocumentStore.getState();
  const result = await repository.write(path, document);
  if (!result.ok) {
    toast.error(result.error);
    return;
  }
  useDocumentStore.getState().markSaved(path);
  await repository.clearAutosave();
  toast.success(`Saved ${basename(path)}`);
}

/**
 * Startup recovery: if a crash left an autosave behind, offer to restore it.
 * Declining clears the file so the prompt never nags again.
 */
export async function tryRestoreAutosave(repository: CvRepository): Promise<void> {
  if (!isTauriAvailable()) return;

  const recovery = await repository.readAutosave();
  if (recovery === null) return;

  if (!recovery.ok) {
    // Corrupt recovery file: surface it once, then discard.
    toast.error(`Recovery file is unusable: ${recovery.error}`);
    await repository.clearAutosave();
    return;
  }

  const confirmed = window.confirm(
    "CVMaker found unsaved changes from a previous session. Restore them?",
  );
  if (!confirmed) {
    await repository.clearAutosave();
    return;
  }

  useDocumentStore.getState().loadDocument(recovery.document, null);
  toast.success("Recovered unsaved changes — use Save As to store them.");
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
