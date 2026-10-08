import { create } from "zustand";

export type AutosaveStatus = "idle" | "saved" | "error";

/**
 * UI-only state (selection, open dialogs, status text). Kept out of the
 * document store so it never enters undo/redo history or the saved file.
 */
type UiState = {
  activeSectionId: string | null;
  addSectionOpen: boolean;
  autosaveStatus: AutosaveStatus;
  lastAutosaveAt: string | null;
  setActiveSectionId: (id: string | null) => void;
  setAddSectionOpen: (open: boolean) => void;
  setAutosaveStatus: (status: AutosaveStatus) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  activeSectionId: null,
  addSectionOpen: false,
  autosaveStatus: "idle",
  lastAutosaveAt: null,
  setActiveSectionId: (activeSectionId) => set({ activeSectionId }),
  setAddSectionOpen: (addSectionOpen) => set({ addSectionOpen }),
  setAutosaveStatus: (autosaveStatus) =>
    set({
      autosaveStatus,
      lastAutosaveAt:
        autosaveStatus === "saved" ? new Date().toISOString() : null,
    }),
}));
