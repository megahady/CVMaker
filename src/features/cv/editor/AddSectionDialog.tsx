import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { FieldType } from "@/features/cv/schema/fields";
import type { SectionType } from "@/features/cv/schema/document";
import {
  createCustomSectionDefinition,
  sortedBuiltinDefinitions,
} from "@/features/cv/sections/registry";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";

/** Field types a user can pick without needing an options editor. */
const CUSTOM_FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "year", label: "Year" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
];

type DraftField = { key: number; label: string; type: FieldType };

function toFieldId(label: string, index: number, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `field_${index + 1}`;
  let id = base;
  let suffix = 2;
  while (taken.has(id)) id = `${base}_${suffix++}`;
  taken.add(id);
  return id;
}

export function AddSectionDialog() {
  const open = useUiStore((state) => state.addSectionOpen);
  const setOpen = useUiStore((state) => state.setAddSectionOpen);
  const setActiveSectionId = useUiStore((state) => state.setActiveSectionId);
  const sections = useDocumentStore((state) => state.document.sections);
  const addSection = useDocumentStore((state) => state.addSection);

  const existingDefinitionIds = new Set(
    sections.map((section) => section.definitionId),
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SectionType>("collection");
  const [fields, setFields] = useState<DraftField[]>([]);

  const available = sortedBuiltinDefinitions.filter(
    (definition) => !existingDefinitionIds.has(definition.id),
  );

  const close = (): void => {
    setOpen(false);
    setTitle("");
    setDescription("");
    setType("collection");
    setFields([]);
  };

  const selectNewest = (sectionId: string): void => {
    setActiveSectionId(sectionId);
    close();
  };

  const createCustom = (): void => {
    if (title.trim().length === 0 || fields.length === 0) return;
    const taken = new Set<string>();
    const definition = createCustomSectionDefinition({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      fields: fields.map((field, index) => ({
        id: toFieldId(field.label, index, taken),
        label: field.label.trim() || `Field ${index + 1}`,
        type: field.type,
      })),
    });
    selectNewest(addSection(definition));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Add an existing section type or design your own — no code required.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="builtin">
          <TabsList className="w-full">
            <TabsTrigger value="builtin" className="flex-1">
              Built-in
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builtin" className="flex flex-col gap-2">
            {available.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All built-in sections are already in your CV. You can disable
                them with the checkboxes on the left.
              </p>
            ) : (
              available.map((definition) => (
                <div
                  key={definition.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{definition.title}</div>
                    {definition.description && (
                      <div className="text-muted-foreground truncate text-xs">
                        {definition.description}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => selectNewest(addSection(definition))}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="custom" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-title">Section title</Label>
              <Input
                id="custom-title"
                placeholder="Patents"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-description">Description (optional)</Label>
              <Textarea
                id="custom-description"
                rows={2}
                placeholder="My patent work"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Section type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as SectionType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Multiple Entries</SelectItem>
                  <SelectItem value="single">Single Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Fields</Label>
              {fields.map((field, index) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Input
                    placeholder="Field name"
                    value={field.label}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      setFields((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, type: value as FieldType } : item,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_FIELD_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove field"
                    onClick={() =>
                      setFields((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setFields((current) => [
                    ...current,
                    { key: Date.now(), label: "", type: "text" },
                  ])
                }
              >
                + Add Field
              </Button>
            </div>

            <Button
              type="button"
              disabled={title.trim().length === 0 || fields.length === 0}
              onClick={createCustom}
            >
              Create Section
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
