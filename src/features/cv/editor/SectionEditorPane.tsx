import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isBuiltinDefinition, resolveSectionDefinition } from "@/features/cv/sections/registry";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";
import { EntryFields, EntryList } from "./EntryList";

type SortMode = "manual" | "newest" | "oldest";

export function SectionEditorPane() {
  const activeSectionId = useUiStore((state) => state.activeSectionId);
  const section = useDocumentStore((state) =>
    state.document.sections.find((candidate) => candidate.id === activeSectionId),
  );
  const renameSection = useDocumentStore((state) => state.renameSection);
  const duplicateSection = useDocumentStore((state) => state.duplicateSection);
  const removeSection = useDocumentStore((state) => state.removeSection);
  const addEntry = useDocumentStore((state) => state.addEntry);
  const sortEntries = useDocumentStore((state) => state.sortEntries);
  const [sortMode, setSortMode] = useState<SortMode>("manual");

  if (!section) {
    return (
      <section className="flex flex-col overflow-y-auto p-6">
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-sm">
          Select a section on the left to edit its entries.
        </div>
      </section>
    );
  }

  const definition = resolveSectionDefinition(section);
  // Deletable if custom, or a duplicate of a built-in (instance id diverged
  // from its definitionId). Original built-ins can only be disabled.
  const deletable =
    !isBuiltinDefinition(section.definitionId) ||
    section.id !== section.definitionId;
  const sortField =
    definition.fields.find((field) => field.type === "year") ??
    definition.fields.find((field) => field.type === "date");

  const applySort = (mode: string): void => {
    setSortMode(mode as SortMode);
    if (mode !== "manual" && sortField) {
      sortEntries(section.id, sortField.id, mode as "newest" | "oldest");
    }
  };

  return (
    <section className="flex flex-col overflow-y-auto p-6">
      <div className="mb-1 flex items-start gap-2">
        <Input
          value={section.title}
          aria-label="Section title"
          className="h-auto shrink-0 border-transparent bg-transparent px-1 text-base font-semibold hover:border-input focus:border-input"
          onChange={(event) => renameSection(section.id, event.target.value)}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => duplicateSection(section.id)}
          >
            <Copy /> Duplicate
          </Button>
          {deletable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => removeSection(section.id)}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>

      {definition.description && (
        <p className="text-muted-foreground mb-4 text-sm">{definition.description}</p>
      )}

      {definition.type === "single" ? (
        <div className="max-w-xl rounded-lg border bg-card p-4">
          <EntryFields
            sectionId={section.id}
            entryIndex={0}
            entry={section.entries[0] ?? {}}
            fields={definition.fields}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {sortField && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Sort:</span>
                <Select value={sortMode} onValueChange={applySort}>
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              className="ml-auto"
              onClick={() => addEntry(section.id)}
            >
              <Plus /> Add Entry
            </Button>
          </div>

          {section.entries.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
              No entries yet.
            </div>
          ) : (
            <EntryList section={section} definition={definition} />
          )}
        </div>
      )}
    </section>
  );
}
