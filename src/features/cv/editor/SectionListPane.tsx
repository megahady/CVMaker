import { useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";

export function SectionListPane() {
  const sections = useDocumentStore((state) => state.document.sections);
  const setSectionEnabled = useDocumentStore((state) => state.setSectionEnabled);
  const reorderSections = useDocumentStore((state) => state.reorderSections);
  const activeSectionId = useUiStore((state) => state.activeSectionId);
  const setActiveSectionId = useUiStore((state) => state.setActiveSectionId);
  const setAddSectionOpen = useUiStore((state) => state.setAddSectionOpen);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <aside className="flex flex-col overflow-y-auto border-r p-3">
      <div className="text-muted-foreground px-2 pb-2 text-xs font-medium uppercase tracking-wide">
        Sections
      </div>

      <nav className="flex flex-col gap-0.5">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => {
              if (dragIndex === null || dragIndex === index) return;
              event.preventDefault();
              reorderSections(dragIndex, index);
              setDragIndex(index);
            }}
            onClick={() => setActiveSectionId(section.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              section.id === activeSectionId
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted",
              !section.enabled && "text-muted-foreground/60",
            )}
          >
            <span
              onClick={(event) => event.stopPropagation()}
              className="flex shrink-0 items-center"
            >
              <Checkbox
                checked={section.enabled}
                aria-label={`Show ${section.title} on CV`}
                onCheckedChange={(checked) =>
                  setSectionEnabled(section.id, checked === true)
                }
              />
            </span>
            <span className="min-w-0 flex-1 truncate">{section.title}</span>
            <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab" />
          </div>
        ))}
      </nav>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 justify-start"
        onClick={() => setAddSectionOpen(true)}
      >
        <Plus /> Add Section
      </Button>
    </aside>
  );
}
