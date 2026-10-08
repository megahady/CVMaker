import type { CvTemplate } from "@/features/cv/schema/document";

/**
 * Presentation of a CV, separate from its content.
 *
 * Each template is only a class map — the renderer components never change.
 * LaTeX generation mirrors these choices in `features/latex/generate.ts`.
 */
export type PreviewTemplate = {
  id: CvTemplate;
  name: string;
  page: string;
  nameClass: string;
  contactClass: string;
  linkClass: string;
  sectionTitleClass: string;
  entryTitleClass: string;
  bodyClass: string;
  entryClass: string;
};

const traditional: PreviewTemplate = {
  id: "traditional",
  name: "Traditional Academic",
  page: "bg-white px-10 py-12 font-serif text-[13px] leading-relaxed text-neutral-900",
  nameClass: "text-center text-2xl font-bold tracking-tight",
  contactClass: "mt-1 text-center text-[12.5px] text-neutral-600",
  linkClass: "text-neutral-700 underline decoration-neutral-300",
  sectionTitleClass:
    "mb-3 mt-7 border-b border-neutral-800 pb-1 text-[13px] font-bold uppercase tracking-widest first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-neutral-800",
  entryClass: "mb-3 last:mb-0",
};

const modern: PreviewTemplate = {
  id: "modern",
  name: "Modern",
  page: "bg-white px-10 py-11 font-sans text-[13px] leading-relaxed text-neutral-800",
  nameClass: "text-3xl font-extrabold tracking-tight text-sky-900",
  contactClass: "mt-1 text-[12.5px] text-neutral-500",
  linkClass: "text-sky-700 underline decoration-sky-300",
  sectionTitleClass:
    "mb-2.5 mt-6 border-b-2 border-sky-700 pb-1 text-sm font-bold uppercase tracking-[0.18em] text-sky-900 first:mt-0",
  entryTitleClass: "font-bold",
  bodyClass: "text-neutral-700",
  entryClass: "mb-2.5 last:mb-0",
};

const compact: PreviewTemplate = {
  id: "compact",
  name: "Compact",
  page: "bg-white px-8 py-9 font-serif text-[11.5px] leading-snug text-neutral-900",
  nameClass: "text-lg font-bold tracking-tight",
  contactClass: "mt-0.5 text-[11px] text-neutral-600",
  linkClass: "text-neutral-700 underline decoration-neutral-300",
  sectionTitleClass:
    "mb-1 mt-3.5 text-[10.5px] font-bold uppercase tracking-[0.2em] first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "",
  entryClass: "mb-1 last:mb-0",
};

const classic: PreviewTemplate = {
  id: "classic",
  name: "Classic Serif",
  page: "bg-white px-10 py-12 font-serif text-[12px] leading-relaxed text-neutral-800",
  nameClass: "text-center text-2xl font-bold uppercase tracking-[0.12em]",
  contactClass: "mt-1 text-center text-[11.5px] text-neutral-600",
  linkClass: "text-neutral-800 underline decoration-neutral-400",
  sectionTitleClass:
    "mb-2 mt-6 text-center text-[10.5px] font-bold uppercase tracking-[0.3em] text-neutral-800 first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-neutral-800",
  entryClass: "mb-3 text-justify last:mb-0",
};

const formal: PreviewTemplate = {
  id: "formal",
  name: "Formal",
  page: "bg-white px-12 py-12 font-serif text-[12.5px] leading-relaxed text-neutral-900",
  nameClass: "text-center text-[26px] font-bold tracking-[0.08em]",
  contactClass: "mt-2 text-center text-[11.5px] text-neutral-500",
  linkClass: "text-slate-700 underline decoration-slate-300",
  sectionTitleClass:
    "mb-2 mt-6 border-b border-slate-800 pb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900 first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-neutral-800",
  entryClass: "mb-3 last:mb-0",
};

const executive: PreviewTemplate = {
  id: "executive",
  name: "Executive",
  page: "bg-white px-9 py-10 font-serif text-[12px] leading-snug text-neutral-900",
  nameClass: "border-b border-neutral-400 pb-2 text-xl font-bold tracking-tight",
  contactClass: "mt-1.5 text-[11px] text-neutral-600",
  linkClass: "text-neutral-700 underline decoration-neutral-400",
  sectionTitleClass:
    "mb-1 mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-neutral-800",
  entryClass: "mb-2 last:mb-0",
};

const academic: PreviewTemplate = {
  id: "academic",
  name: "Academic",
  page: "bg-white px-10 py-12 font-serif text-[12.5px] leading-relaxed text-stone-800",
  nameClass: "text-2xl font-bold tracking-tight text-stone-900",
  contactClass: "mt-1 text-[11.5px] text-stone-500",
  linkClass: "text-emerald-900 underline decoration-emerald-600/50",
  sectionTitleClass:
    "mb-1.5 mt-6 text-[10.5px] font-bold uppercase tracking-[0.24em] text-emerald-900 first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-stone-700",
  entryClass: "mb-2.5 last:mb-0",
};

const minimal: PreviewTemplate = {
  id: "minimal",
  name: "Minimalist",
  page: "bg-white px-14 py-14 font-sans text-[12px] leading-relaxed text-slate-700",
  nameClass: "text-2xl font-light tracking-wide text-slate-900",
  contactClass: "mt-2 text-[11px] text-slate-500",
  linkClass: "text-slate-600 underline decoration-slate-300",
  sectionTitleClass:
    "mb-2 mt-8 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-600 first:mt-0",
  entryTitleClass: "font-medium",
  bodyClass: "text-slate-700",
  entryClass: "mb-3 last:mb-0",
};

const sans: PreviewTemplate = {
  id: "sans",
  name: "Minimal Sans",
  page: "bg-white px-10 py-11 font-sans text-[11.5px] leading-relaxed text-neutral-800",
  nameClass: "text-2xl font-bold tracking-tight",
  contactClass: "mt-1 text-[11px] text-neutral-500",
  linkClass: "text-neutral-700 underline decoration-neutral-300",
  sectionTitleClass:
    "mb-1 mt-5 text-[10.5px] font-bold uppercase tracking-[0.2em] first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "",
  entryClass: "mb-1.5 last:mb-0",
};

const concise: PreviewTemplate = {
  id: "concise",
  name: "Concise Academic",
  page: "bg-white px-8 py-8 font-serif text-[10.5px] leading-snug text-neutral-900",
  nameClass: "text-lg font-bold tracking-tight",
  contactClass: "text-[10px] text-neutral-500",
  linkClass: "text-neutral-700 underline decoration-neutral-300",
  sectionTitleClass:
    "mb-0.5 mt-3 text-[9.5px] font-bold uppercase tracking-[0.22em] first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "",
  entryClass: "mb-1 last:mb-0",
};

const elegant: PreviewTemplate = {
  id: "elegant",
  name: "Elegant",
  page: "bg-white px-11 py-12 font-serif text-[12px] leading-relaxed text-amber-950/90",
  nameClass: "text-3xl font-normal tracking-wide text-amber-950",
  contactClass: "mt-1.5 text-[11px] text-amber-900/70",
  linkClass: "text-amber-900 underline decoration-amber-400/60",
  sectionTitleClass:
    "mb-2 mt-7 text-[11px] font-bold uppercase tracking-[0.26em] text-amber-900 first:mt-0",
  entryTitleClass: "font-semibold",
  bodyClass: "text-amber-950/80",
  entryClass: "mb-3 last:mb-0",
};

const researcher: PreviewTemplate = {
  id: "researcher",
  name: "Researcher",
  page: "bg-white px-10 py-11 font-serif text-[12px] leading-relaxed text-neutral-800",
  nameClass: "text-2xl font-bold text-teal-900",
  contactClass: "mt-1 text-[11.5px] text-neutral-500",
  linkClass: "text-teal-800 underline decoration-teal-300",
  sectionTitleClass:
    "mb-1.5 mt-6 border-b-2 border-teal-700/70 pb-0.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-teal-900 first:mt-0",
  entryTitleClass: "font-bold",
  bodyClass: "text-neutral-800",
  entryClass: "mb-2.5 last:mb-0",
};

const clean: PreviewTemplate = {
  id: "clean",
  name: "Clean",
  page: "bg-white px-12 py-12 font-serif text-[12px] leading-loose text-neutral-800",
  nameClass: "text-2xl font-bold tracking-wide",
  contactClass: "mt-1 text-[11px] text-neutral-500",
  linkClass: "text-neutral-700 underline underline-offset-2 decoration-neutral-300",
  sectionTitleClass:
    "mb-2.5 mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400 first:mt-0",
  entryTitleClass: "font-bold",
  bodyClass: "text-neutral-700",
  entryClass: "mb-3 last:mb-0",
};

const extendedTemplates: Record<CvTemplate, PreviewTemplate> = {
  traditional,
  modern,
  compact,
  classic,
  formal,
  executive,
  academic,
  minimal,
  sans,
  concise,
  elegant,
  researcher,
  clean,
};

export function getPreviewTemplate(id: CvTemplate): PreviewTemplate {
  return extendedTemplates[id] ?? traditional;
}

export function listTemplates(): PreviewTemplate[] {
  return Object.values(extendedTemplates);
}
