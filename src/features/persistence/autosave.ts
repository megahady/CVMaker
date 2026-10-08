import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";
import type { CvDocument } from "@/features/cv/schema/document";
import type { CvRepository } from "./CvRepository";

const DEFAULT_DELAY_MS = 2000;

/**
 * Comparison key that ignores volatile metadata (`updatedAt` changes on every
 * edit even when the user retyped the same value).
 */
function contentJson(document: CvDocument): string {
  return JSON.stringify({
    template: document.template,
    title: document.metadata.title,
    sections: document.sections,
  });
}

/**
 * Debounced autosave.
 *
 * documentStore change → (debounce 2s, reset on every edit) → repository.writeAutosave
 *
 * Never writes on every keystroke; coalesces bursts. Returns a stop function.
 */
export function startAutosave(
  repository: CvRepository,
  delayMs: number = DEFAULT_DELAY_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWrittenJson: string | null = null;
  let generation = 0;

  const flush = async (
    gen: number,
    json: string,
    document: Parameters<CvRepository["writeAutosave"]>[0],
  ) => {
    if (gen !== generation) return; // a newer edit is already scheduled
    const result = await repository.writeAutosave(document);
    const status = useUiStore.getState().setAutosaveStatus;
    if (result.ok) {
      lastWrittenJson = json;
      status("saved");
    } else {
      status("error");
      console.error("Autosave failed:", result.error);
    }
  };

  const unsubscribe = useDocumentStore.subscribe((state) => {
    if (!state.isDirty) return;
    const json = contentJson(state.document);
    if (json === lastWrittenJson) return;

    const gen = ++generation;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush(gen, json, state.document);
    }, delayMs);
  });

  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}
