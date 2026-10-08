import { useDocumentStore } from "@/features/cv/store/documentStore";
import type { SectionInstance } from "@/features/cv/schema/document";
import { resolveSectionDefinition } from "@/features/cv/sections/registry";
import { isEmptyEntry } from "@/features/cv/format";
import { resolveRenderer } from "./renderers";
import { getPreviewTemplate } from "./templates";

/**
 * Live preview: the same `CvDocument` the editor mutates, rendered through
 * the renderer registry. One canonical data flow — what you see here is what
 * the LaTeX export (Phase 7) will serialize.
 */
export function PreviewPane() {
  const document = useDocumentStore((state) => state.document);
  const template = getPreviewTemplate(document.template);

  const sections = document.sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      section,
      definition: resolveSectionDefinition(section),
      entries: section.entries.filter((entry) => !isEmptyEntry(entry)),
    }))
    .filter(({ entries }) => entries.length > 0);

  return (
    <aside className="overflow-y-auto bg-muted/40 p-6" aria-label="CV preview">
      <div className={`mx-auto max-w-[760px] shadow-md ${template.page}`}>
        {sections.length === 0 ? (
          <p className="text-center text-neutral-400">
            Nothing to preview yet — fill in a section on the left.
          </p>
        ) : (
          sections.map(({ section, definition, entries }) => (
            <PreviewSection
              key={section.id}
              section={section}
              rendererKey={definition.renderer}
              definition={definition}
              entries={entries}
              template={template}
            />
          ))
        )}
      </div>
    </aside>
  );
}

type PreviewSectionProps = {
  section: SectionInstance;
  rendererKey: string;
  definition: ReturnType<typeof resolveSectionDefinition>;
  entries: SectionInstance["entries"];
  template: ReturnType<typeof getPreviewTemplate>;
};

function PreviewSection({
  section,
  rendererKey,
  definition,
  entries,
  template,
}: PreviewSectionProps) {
  const Renderer = resolveRenderer(rendererKey);

  // The profile section is the document header — no heading above it.
  if (rendererKey === "profile") {
    return (
      <Renderer
        entry={entries[0] ?? {}}
        definition={definition}
        template={template}
      />
    );
  }

  return (
    <section>
      <h2 className={template.sectionTitleClass}>
        {section.title || definition.title}
      </h2>
      <div className={template.bodyClass}>
        {entries.map((entry, index) => (
          <Renderer
            key={`${section.id}-${index}`}
            entry={entry}
            definition={definition}
            template={template}
          />
        ))}
      </div>
    </section>
  );
}
