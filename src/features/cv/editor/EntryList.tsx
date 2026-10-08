import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionInstance } from "@/features/cv/schema/document";
import type { SectionDefinition } from "@/features/cv/sections/definitions";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { FieldRenderer } from "./FieldRenderer";
import type { FieldDefinition } from "@/features/cv/schema/fields";

export function entryTitle(
  entry: Record<string, unknown>,
  fields: FieldDefinition[],
  index: number,
): string {
  for (const field of fields) {
    const value = entry[field.id];
    if (
      (field.type === "text" || field.type === "select" || field.type === "date") &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value;
    }
    if (field.type === "authors" && Array.isArray(value)) {
      const names = value
        .map((item) => (item as { name?: unknown }).name)
        .filter((name): name is string => typeof name === "string" && name.length > 0);
      if (names.length > 0) {
        return names.length > 2 ? `${names[0]} et al.` : names.join(" & ");
      }
    }
  }
  return `Entry ${index + 1}`;
}

function EntryFields({
  sectionId,
  entryIndex,
  entry,
  fields,
}: {
  sectionId: string;
  entryIndex: number;
  entry: Record<string, unknown>;
  fields: FieldDefinition[];
}) {
  const updateEntry = useDocumentStore((state) => state.updateEntry);

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1.5">
          {field.type !== "checkbox" && <FieldLabel field={field} />}
          <FieldRenderer
            field={field}
            value={entry[field.id]}
            onChange={(value) => updateEntry(sectionId, entryIndex, field.id, value)}
          />
          {field.helpText && (
            <p className="text-muted-foreground text-xs">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ field }: { field: FieldDefinition }) {
  return (
    <span className="text-sm leading-none font-medium">
      {field.label}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
    </span>
  );
}

export function EntryList({
  section,
  definition,
}: {
  section: SectionInstance;
  definition: SectionDefinition;
}) {
  const removeEntry = useDocumentStore((state) => state.removeEntry);
  const moveEntry = useDocumentStore((state) => state.moveEntry);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {section.entries.map((entry, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragEnd={() => setDragIndex(null)}
          onDragOver={(event) => {
            if (dragIndex === null || dragIndex === index) return;
            event.preventDefault();
            moveEntry(section.id, dragIndex, index);
            setDragIndex(index);
          }}
          className="rounded-lg border bg-card p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {entryTitle(entry, definition.fields, index)}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => moveEntry(section.id, index, index - 1)}
              >
                <ChevronUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move down"
                disabled={index === section.entries.length - 1}
                onClick={() => moveEntry(section.id, index, index + 1)}
              >
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete entry"
                onClick={() => removeEntry(section.id, index)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          <EntryFields
            sectionId={section.id}
            entryIndex={index}
            entry={entry}
            fields={definition.fields}
          />
        </div>
      ))}
    </div>
  );
}

export { EntryFields };
