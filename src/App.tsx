import { useEffect } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AddSectionDialog } from "@/features/cv/editor/AddSectionDialog";
import { SectionEditorPane } from "@/features/cv/editor/SectionEditorPane";
import { SectionListPane } from "@/features/cv/editor/SectionListPane";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import type { CvTemplate } from "@/features/cv/schema/document";
import { useUiStore } from "@/features/cv/store/uiStore";
import { PreviewPane } from "@/features/preview/PreviewPane";
import { listTemplates } from "@/features/preview/templates";
import { startAutosave } from "@/features/persistence/autosave";
import {
  newCv,
  openCv,
  saveCv,
  saveCvAs,
  tryRestoreAutosave,
} from "@/features/persistence/fileActions";
import { fileRepository } from "@/features/persistence/fileRepository";
import { exportTex } from "@/features/persistence/exportActions";
import { isTauriAvailable } from "@/tauri/api";

const desktopOnly = !isTauriAvailable();
const fileFeatureHint = "Available when running npm run tauri dev";

function useUndoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useDocumentStore.getState().redo();
        } else {
          useDocumentStore.getState().undo();
        }
      } else if (key === "y") {
        event.preventDefault();
        useDocumentStore.getState().redo();
      } else if (key === "s") {
        event.preventDefault();
        void saveCv(fileRepository);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function useActiveSectionFallback(): void {
  const sections = useDocumentStore((state) => state.document.sections);
  const activeSectionId = useUiStore((state) => state.activeSectionId);
  const setActiveSectionId = useUiStore((state) => state.setActiveSectionId);

  useEffect(() => {
    if (sections.length === 0) {
      if (activeSectionId !== null) setActiveSectionId(null);
      return;
    }
    const stillExists = sections.some((section) => section.id === activeSectionId);
    if (!stillExists) setActiveSectionId(sections[0]?.id ?? null);
  }, [sections, activeSectionId, setActiveSectionId]);
}

function usePersistenceLifecycle(): void {
  useEffect(() => {
    if (desktopOnly) return;
    const stopAutosave = startAutosave(fileRepository);
    void tryRestoreAutosave(fileRepository);
    return stopAutosave;
  }, []);
}

function AutosaveStatus() {
  const status = useUiStore((state) => state.autosaveStatus);
  const savedAt = useUiStore((state) => state.lastAutosaveAt);

  if (status === "error") {
    return (
      <span className="text-destructive text-xs">Autosave failed</span>
    );
  }
  if (status === "saved" && savedAt) {
    const time = new Date(savedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <span className="text-muted-foreground text-xs">Autosaved {time}</span>
    );
  }
  return null;
}

async function handleExportTex(): Promise<void> {
  const result = await exportTex(fileRepository);
  if (result.ok) {
    toast.success(
      result.via === "dialog"
        ? "LaTeX file exported."
        : "LaTeX file downloaded.",
    );
  } else if (!result.cancelled) {
    toast.error(`Export failed: ${result.error}`);
  }
}

const templateOptions: { value: CvTemplate; label: string }[] =
  listTemplates().map(({ id, name }) => ({ value: id, label: name }));

function TemplateSelect() {
  const template = useDocumentStore((state) => state.document.template);
  const setTemplate = useDocumentStore((state) => state.setTemplate);

  return (
    <Select
      value={template}
      onValueChange={(value) => setTemplate(value as CvTemplate)}
    >
      <SelectTrigger
        className="h-8 w-[132px] text-xs"
        aria-label="Template"
        title="Layout template"
      >
        <SelectValue placeholder="Template" />
      </SelectTrigger>
      <SelectContent>
        {templateOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

async function handleExportPdf(): Promise<void> {
  const { exportPdf } = await import("@/features/persistence/pdfActions");
  const result = await exportPdf(fileRepository);
  if (result.ok) {
    toast.success("PDF saved.");
  } else if (!result.cancelled) {
    toast.error(`PDF export failed: ${result.error}`);
  }
}

export default function App() {
  const isDirty = useDocumentStore((state) => state.isDirty);
  const title = useDocumentStore((state) => state.document.metadata.title);
  const canUndo = useDocumentStore((state) => state.past.length > 0);
  const canRedo = useDocumentStore((state) => state.future.length > 0);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);

  useUndoShortcuts();
  useActiveSectionFallback();
  usePersistenceLifecycle();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-sm font-semibold tracking-wide">CVMaker</span>
        <span className="text-muted-foreground text-sm">
          {title}
          {isDirty ? " •" : ""}
        </span>
        <AutosaveStatus />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            variant="outline"
            size="sm"
            disabled={desktopOnly}
            title={desktopOnly ? fileFeatureHint : "Start a new CV"}
            onClick={() => void newCv(fileRepository)}
          >
            New
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={desktopOnly}
            title={desktopOnly ? fileFeatureHint : "Open a .cv file (Ctrl/Cmd+O)"}
            onClick={() => void openCv(fileRepository)}
          >
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={desktopOnly}
            title={desktopOnly ? fileFeatureHint : "Save (Ctrl/Cmd+S)"}
            onClick={() => void saveCv(fileRepository)}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={desktopOnly}
            title={desktopOnly ? fileFeatureHint : "Save as a new .cv file"}
            onClick={() => void saveCvAs(fileRepository)}
          >
            Save As
          </Button>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <TemplateSelect />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            variant="outline"
            size="sm"
            title="Export LaTeX source (.tex)"
            onClick={() => void handleExportTex()}
          >
            Export .tex
          </Button>
          <Button
            variant="outline"
            size="sm"
            title="Compile to PDF via XeLaTeX (desktop)"
            onClick={() => void handleExportPdf()}
          >
            Export .pdf
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1.1fr)_minmax(0,1fr)]">
        <SectionListPane />
        <SectionEditorPane />
        <PreviewPane />
      </div>

      <AddSectionDialog />
      <Toaster />
    </div>
  );
}
