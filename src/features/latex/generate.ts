import type {
  CvDocument,
  CvTemplate,
  EntryData,
  SectionInstance,
} from "@/features/cv/schema/document";
import type { SectionDefinition } from "@/features/cv/sections/definitions";
import { resolveSectionDefinition } from "@/features/cv/sections/registry";
import { escapeLatex as esc, latexParagraphs } from "./escape";
import {
  formatFieldValue,
  isEmptyEntry,
  itemsList,
  optionLabel,
  textValue,
  toAuthorList,
  yearRange,
} from "@/features/cv/format";

/**
 * LaTeX generation — pure functions, no I/O, no React.
 *
 * Mirrors the preview pipeline exactly: enabled+sorted sections → renderer
 * registry keyed by `definition.renderer` → generic fallback. The preview
 * and the .tex file can never disagree about content because both consume
 * the same CvDocument and the same formatting helpers (`features/cv/format`).
 */

type EntryContext = {
  entry: EntryData;
  definition: SectionDefinition;
  layout: TexLayout;
};

type TexRenderer = (context: EntryContext) => string;

/**
 * Per-template LaTeX layout — mirrors `features/preview/templates.ts`:
 * same content, different page setup (font family, margins, header style).
 */
export type TexLayout = {
  header: "center" | "flushleft";
  preamble: string;
};

const layouts: Record<CvTemplate, TexLayout> = {
  traditional: {
    header: "center",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=blue!50!black,linkcolor=black}`,
  },
  modern: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\renewcommand{\\familydefault}{\\sfdefault}
\\definecolor{cvaccent}{HTML}{075985}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  compact: {
    header: "center",
    preamble: `\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\setlength{\\parskip}{2pt plus 1pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=blue!50!black,linkcolor=black}`,
  },
  classic: {
    header: "center",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{newtxtext}
\\usepackage{titlesec}
\\titleformat{\\section}{\\centering\\scshape\\large\\bfseries}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{14pt}{6pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=black!55,linkcolor=black}`,
  },
  formal: {
    header: "center",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=0.95in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{newtxtext}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{1E293B}
\\newcommand{\\cvcolrule}{\\par\\noindent\\color{cvaccent}\\rule{\\linewidth}{0.6pt}}
\\titleformat{\\section}{\\raggedright\\scshape\\large\\bfseries\\color{cvaccent}}{}{0pt}{}[\\vspace{-0.7ex}\\cvcolrule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  executive: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{newtxtext}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{374151}
\\titleformat{\\section}{\\raggedright\\normalsize\\scshape\\bfseries\\color{cvaccent}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{12pt}{5pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  academic: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{libertine}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{4D5D22}
\\titleformat{\\section}{\\raggedright\\scshape\\large\\bfseries\\color{cvaccent}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{13pt}{6pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  minimal: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1.1in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Heros}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{475569}
\\titleformat{\\section}{\\raggedright\\large\\bfseries\\color{cvaccent}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{18pt}{8pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  sans: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=0.9in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Heros}
\\usepackage{titlesec}
\\titleformat{\\section}{\\raggedright\\normalsize\\bfseries}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{12pt}{5pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=black!55,linkcolor=black}`,
  },
  concise: {
    header: "flushleft",
    preamble: `\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{newtxtext}
\\usepackage{titlesec}
\\titleformat{\\section}{\\raggedright\\scshape\\small\\bfseries}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{8pt}{3pt}
\\setlength{\\parskip}{2pt plus 1pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=black!55,linkcolor=black}`,
  },
  elegant: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1.05in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Pagella}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{8C5A2B}
\\titleformat{\\section}{\\raggedright\\large\\bfseries\\color{cvaccent}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{15pt}{6pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  researcher: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=0.9in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Schola}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{0F766E}
\\newcommand{\\cvcolrule}{\\par\\noindent\\color{cvaccent}\\rule{\\linewidth}{0.6pt}}
\\titleformat{\\section}{\\raggedright\\scshape\\large\\bfseries\\color{cvaccent}}{}{0pt}{}[\\cvcolrule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
  clean: {
    header: "flushleft",
    preamble: `\\documentclass[11pt]{article}
\\usepackage[margin=1.05in]{geometry}
\\usepackage{xcolor}
\\usepackage{parskip}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{fontspec}
\\setmainfont{TeX Gyre Schola}
\\usepackage{titlesec}
\\definecolor{cvaccent}{HTML}{44403C}
\\titleformat{\\section}{\\raggedright\\scshape\\color{cvaccent}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{18pt}{8pt}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\hypersetup{colorlinks=true,urlcolor=cvaccent,linkcolor=black}`,
  },
};

const LINE_BREAK = " \\\\\n";

function ProfileTex({ entry, layout }: EntryContext): string {
  const name =
    textValue(entry, "fullName") || textValue(entry, "preferredName");
  const contactParts = [
    textValue(entry, "email"),
    textValue(entry, "phone"),
    textValue(entry, "address"),
    [textValue(entry, "city"), textValue(entry, "state"), textValue(entry, "country")]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
  const links = [
    textValue(entry, "website"),
    textValue(entry, "googleScholar"),
    textValue(entry, "orcid"),
    textValue(entry, "linkedin"),
    textValue(entry, "github"),
    ...itemsList(entry.otherUrls),
  ].filter(Boolean);

  const lines: string[] = [];
  if (name) {
    lines.push(`{\\LARGE\\bfseries ${esc(name)}}${LINE_BREAK.trimEnd()}`);
  }
  if (contactParts.length > 0) {
    lines.push(contactParts.map(esc).join(" \\textbullet\\ "));
  }
  if (links.length > 0) {
    lines.push(
      links
        .map((link) => {
          const href = /^https?:\/\//i.test(link) ? link : `https://${link}`;
          return `\\href{${esc(href)}}{${esc(link)}}`;
        })
        .join(" \\textbullet\\ "),
    );
  }
  if (lines.length === 0) return "";

  return `\\begin{${layout.header}}\n${lines.join("\n")}\n\\end{${layout.header}}`;
}

function CredentialTex({ entry }: EntryContext): string {
  const degree = textValue(entry, "degree");
  const field = textValue(entry, "fieldOfStudy");
  const headline =
    degree && field ? `${degree} in ${field}` : degree || field;
  const position = textValue(entry, "position");
  const dates = yearRange(entry);
  const advisor = textValue(entry, "advisor");
  const project = textValue(entry, "project");
  const thesis = textValue(entry, "thesisTitle");
  const description = textValue(entry, "description");

  const title = headline || position;
  if (!title) return "";

  const institutionParts = [
    textValue(entry, "institution"),
    textValue(entry, "department"),
    textValue(entry, "location"),
  ]
    .filter(Boolean)
    .map(esc);

  const metaParts = [
    advisor && `Advisor: ${esc(advisor)}`,
    project && `Project: ${esc(project)}`,
  ].filter(Boolean);

  const lines: string[] = [];
  lines.push(
    dates
      ? `\\textbf{${esc(title)}} \\hfill ${esc(dates)}`
      : `\\textbf{${esc(title)}}`,
  );
  if (institutionParts.length > 0) {
    lines.push(institutionParts.join(" \\textbullet\\ "));
  }
  if (metaParts.length > 0) {
    lines.push(metaParts.join(" \\textbullet\\ "));
  }

  let out = lines.join(LINE_BREAK);
  if (thesis) {
    out += `\n\n\\textit{Thesis: \`\`${esc(thesis)}''}`;
  }
  if (description) {
    out += `\n\n${latexParagraphs(description)}`;
  }
  return out;
}

function PublicationTex({ entry, definition }: EntryContext): string {
  const title = textValue(entry, "title");
  const authors = toAuthorList(entry.authors);
  const year = textValue(entry, "year");
  const venue = textValue(entry, "venue");
  const volume = textValue(entry, "volume");
  const issue = textValue(entry, "issue");
  const pages = textValue(entry, "pages");
  const doi = textValue(entry, "doi");
  const statusField = definition.fields.find((field) => field.id === "status");
  const statusLabel =
    statusField && statusField.type === "select"
      ? optionLabel(statusField, entry.status)
      : "";

  let out = "";
  if (authors.length > 0) {
    out += authors
      .map((author) =>
        author.isMe
          ? `\\textbf{${esc(author.name)}}`
          : esc(author.name),
      )
      .join(authors.length === 2 ? " \\& " : ", ");
  }
  if (year) out += ` (${esc(year)})`;

  const numberPart = [volume, issue && `(${issue})`]
    .filter(Boolean)
    .join("");
  const venuePart = [venue, numberPart, pages].filter(Boolean).join(", ");

  if (title) out += `${out ? ". " : ""}\\emph{${esc(title)}}.`;
  if (venuePart) out += ` ${esc(venuePart)}.`;
  if (doi) {
    out += ` \\href{${esc(`https://doi.org/${doi}`)}}{doi:${esc(doi)}}`;
  }
  if (statusLabel && statusLabel !== "Published") {
    out += ` [${esc(statusLabel)}]`;
  }
  return out.trim();
}

function CategoryListTex({ entry }: EntryContext): string {
  const category = textValue(entry, "category");
  const skills = itemsList(entry.items);
  if (!category || skills.length === 0) return "";
  return `\\textbf{${esc(category)}:} ${esc(skills.join(", "))}`;
}

/** Fallback for built-in and custom sections alike. */
function GenericTex({ entry, definition }: EntryContext): string {
  const rows: string[] = [];
  for (const field of definition.fields) {
    const value = formatFieldValue(field, entry[field.id]);
    if (value === null) continue;
    const [first, ...rest] = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(esc);
    if (first === undefined) continue;
    const continuation = rest.map((line) => `${LINE_BREAK}${line}`).join("");
    rows.push(`\\textbf{${esc(field.label)}:} ${first}${continuation}`);
  }
  return rows.join(LINE_BREAK);
}

const texRenderers: Record<string, TexRenderer> = {
  profile: ProfileTex,
  education: CredentialTex,
  position: CredentialTex,
  publication: PublicationTex,
  categoryList: CategoryListTex,
};

function resolveTexRenderer(rendererKey: string): TexRenderer {
  return texRenderers[rendererKey] ?? GenericTex;
}

function renderSection(section: SectionInstance, layout: TexLayout): string {
  if (!section.enabled) return "";
  const definition = resolveSectionDefinition(section);
  const renderer = resolveTexRenderer(definition.renderer);

  const entries = section.entries.filter((entry) => !isEmptyEntry(entry));
  if (entries.length === 0) return "";

  const rendered = entries
    .map((entry) => renderer({ entry, definition, layout }))
    .filter((text) => text.length > 0);
  if (rendered.length === 0) return "";

  if (definition.renderer === "profile") {
    return rendered[0] ?? "";
  }

  const heading = `\\section*{${esc(section.title || definition.title)}}`;
  return `${heading}\n\n${rendered.join("\n\n")}`;
}

export function generateLatex(document: CvDocument): string {
  const layout = layouts[document.template] ?? layouts.traditional;

  const body = [...document.sections]
    .sort((a, b) => a.order - b.order)
    .map((section) => renderSection(section, layout))
    .filter((text) => text.length > 0)
    .join("\n\n");

  const sections = [
    `% Generated by CVMaker (${document.template} template). Compile with: xelatex file.tex`,
    layout.preamble,
    "\\begin{document}",
    body,
    "\\end{document}",
  ];

  return `${sections.filter((part) => part.length > 0).join("\n\n")}\n`;
}
