import { create } from "zustand";
import { createEmptyCvDocument } from "@/features/cv/schema/defaults";
import type {
  CvDocument,
  CvTemplate,
  EntryData,
  SectionInstance,
} from "@/features/cv/schema/document";
import type { SectionDefinition } from "@/features/cv/sections/definitions";
import {
  createSectionInstance,
  sortedBuiltinDefinitions,
} from "@/features/cv/sections/registry";

const HISTORY_LIMIT = 100;
/** Rapid edits inside this window collapse into one undo step (typing bursts). */
const COALESCE_MS = 600;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function resequence(sections: SectionInstance[]): SectionInstance[] {
  return sections.map((section, index) => ({ ...section, order: index }));
}

function normalize(document: CvDocument): CvDocument {
  document.sections = document.sections.map((section) =>
    section.type === "single" && section.entries.length === 0
      ? { ...section, entries: [{}] }
      : section,
  );
  return document;
}

function createInitialDocument(): CvDocument {
  const document = createEmptyCvDocument();
  document.sections = sortedBuiltinDefinitions
    .filter((definition) => definition.defaultVisible)
    .map((definition, index) => createSectionInstance(definition, index));
  return normalize(document);
}

export type SortDirection = "newest" | "oldest";

export type DocumentState = {
  document: CvDocument;
  filePath: string | null;
  isDirty: boolean;
  past: CvDocument[];
  future: CvDocument[];
  lastSnapshotAt: number;

  newDocument: () => void;
  loadDocument: (document: CvDocument, filePath: string | null) => void;
  markSaved: (filePath: string | null) => void;
  undo: () => void;
  redo: () => void;

  updateEntry: (
    sectionId: string,
    entryIndex: number,
    fieldId: string,
    value: unknown,
  ) => void;
  addEntry: (sectionId: string) => void;
  removeEntry: (sectionId: string, entryIndex: number) => void;
  moveEntry: (sectionId: string, from: number, to: number) => void;
  sortEntries: (
    sectionId: string,
    fieldId: string,
    direction: SortDirection,
  ) => void;

  setSectionEnabled: (sectionId: string, enabled: boolean) => void;
  renameSection: (sectionId: string, title: string) => void;
  reorderSections: (from: number, to: number) => void;
  addSection: (definition: SectionDefinition) => string;
  removeSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => void;
  setTemplate: (template: CvTemplate) => void;
};

function sortKey(entry: EntryData, fieldId: string): number {
  const value = entry[fieldId];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/^\d{4}/);
    if (match) return Number(match[0]);
  }
  return 0;
}

export const useDocumentStore = create<DocumentState>()((set) => {
  /** All mutations flow through here: clone → mutate → history bookkeeping. */
  function commit(
    mutate: (draft: CvDocument) => void,
    options: { coalesce?: boolean } = {},
  ): void {
    set((state) => {
      const now = Date.now();
      const pushHistory = !(
        options.coalesce && now - state.lastSnapshotAt < COALESCE_MS
      );

      const draft = clone(state.document);
      mutate(draft);
      draft.metadata.updatedAt = new Date().toISOString();

      return {
        document: draft,
        isDirty: true,
        past: pushHistory
          ? [...state.past, state.document].slice(-HISTORY_LIMIT)
          : state.past,
        future: pushHistory ? [] : state.future,
        lastSnapshotAt: now,
      };
    });
  }

  function editSection(
    sectionId: string,
    edit: (section: SectionInstance, draft: CvDocument) => void,
    options: { coalesce?: boolean } = {},
  ): void {
    commit((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (section) edit(section, draft);
    }, options);
  }

  function replaceDocument(document: CvDocument, filePath: string | null) {
    set({
      document: normalize(document),
      filePath,
      isDirty: false,
      past: [],
      future: [],
      lastSnapshotAt: 0,
    });
  }

  return {
    document: createInitialDocument(),
    filePath: null,
    isDirty: false,
    past: [],
    future: [],
    lastSnapshotAt: 0,

    newDocument: () => replaceDocument(createInitialDocument(), null),

    loadDocument: (document, filePath) => replaceDocument(document, filePath),

    markSaved: (filePath) => set({ isDirty: false, filePath }),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          document: previous,
          past: state.past.slice(0, -1),
          future: [state.document, ...state.future],
          isDirty: true,
          lastSnapshotAt: 0,
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return state;
        const [next, ...rest] = state.future;
        return {
          document: next,
          past: [...state.past, state.document].slice(-HISTORY_LIMIT),
          future: rest,
          isDirty: true,
          lastSnapshotAt: 0,
        };
      }),

    updateEntry: (sectionId, entryIndex, fieldId, value) =>
      editSection(
        sectionId,
        (section) => {
          const entry = section.entries[entryIndex];
          if (entry) entry[fieldId] = value;
        },
        { coalesce: true },
      ),

    addEntry: (sectionId) =>
      editSection(sectionId, (section) => {
        section.entries.push({});
      }),

    removeEntry: (sectionId, entryIndex) =>
      editSection(sectionId, (section) => {
        section.entries.splice(entryIndex, 1);
      }),

    moveEntry: (sectionId, from, to) =>
      editSection(sectionId, (section) => {
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= section.entries.length ||
          to >= section.entries.length
        ) {
          return;
        }
        const [entry] = section.entries.splice(from, 1);
        if (entry) section.entries.splice(to, 0, entry);
      }),

    sortEntries: (sectionId, fieldId, direction) =>
      editSection(sectionId, (section) => {
        section.entries = section.entries
          .map((entry, index) => ({ entry, index }))
          .sort((a, b) => {
            const delta = sortKey(a.entry, fieldId) - sortKey(b.entry, fieldId);
            if (delta !== 0) return direction === "newest" ? -delta : delta;
            return a.index - b.index;
          })
          .map(({ entry }) => entry);
      }),

    setSectionEnabled: (sectionId, enabled) =>
      editSection(
        sectionId,
        (section) => {
          section.enabled = enabled;
        },
        { coalesce: false },
      ),

    renameSection: (sectionId, title) =>
      editSection(
        sectionId,
        (section) => {
          if (title.trim().length > 0) section.title = title;
        },
        { coalesce: true },
      ),

    reorderSections: (from, to) =>
      set((state) => {
        if (from === to || from < 0 || to < 0) return state;
        const sections = [...state.document.sections];
        if (from >= sections.length || to >= sections.length) return state;
        const [section] = sections.splice(from, 1);
        if (!section) return state;
        sections.splice(to, 0, section);

        const document = clone(state.document);
        document.sections = resequence(sections);
        document.metadata.updatedAt = new Date().toISOString();

        return {
          document,
          isDirty: true,
          past: [...state.past, state.document].slice(-HISTORY_LIMIT),
          future: [],
          lastSnapshotAt: Date.now(),
        };
      }),

    addSection: (definition) => {
      const instance = createSectionInstance(
        definition,
        Math.max(0, useDocumentStore.getState().document.sections.length),
      );
      commit((draft) => {
        draft.sections.push(
          instance.type === "single" && instance.entries.length === 0
            ? { ...instance, entries: [{}] }
            : instance,
        );
      });
      return instance.id;
    },

    removeSection: (sectionId) =>
      commit((draft) => {
        draft.sections = resequence(
          draft.sections.filter((section) => section.id !== sectionId),
        );
      }),

    duplicateSection: (sectionId) =>
      commit((draft) => {
        const index = draft.sections.findIndex((s) => s.id === sectionId);
        const source = draft.sections[index];
        if (!source) return;
        const duplicate: SectionInstance = {
          ...clone(source),
          id: `custom-${crypto.randomUUID()}`,
          title: `${source.title} (copy)`,
        };
        draft.sections.splice(index + 1, 0, duplicate);
        draft.sections = resequence(draft.sections);
      }),

    setTemplate: (template) =>
      commit((draft) => {
        draft.template = template;
      }),
  };
});
