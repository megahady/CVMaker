import type { ComponentType } from "react";
import type { EntryData } from "@/features/cv/schema/document";
import type { SectionDefinition } from "@/features/cv/sections/definitions";
import {
  formatFieldValue,
  itemsList,
  optionLabel,
  textValue,
  toAuthorList,
  yearRange,
} from "@/features/cv/format";
import type { PreviewTemplate } from "./templates";

export type RendererProps = {
  entry: EntryData;
  definition: SectionDefinition;
  template: PreviewTemplate;
};

function line(...parts: (string | false | null | undefined)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(" · ") : null;
}

function ProfileRenderer({ entry, template }: RendererProps) {
  const name =
    textValue(entry, "fullName") || textValue(entry, "preferredName");
  const contact = line(
    textValue(entry, "email"),
    textValue(entry, "phone"),
    textValue(entry, "address"),
    line(
      textValue(entry, "city"),
      textValue(entry, "state"),
      textValue(entry, "country"),
    ),
  );
  const links = [
    textValue(entry, "website"),
    textValue(entry, "googleScholar"),
    textValue(entry, "orcid"),
    textValue(entry, "linkedin"),
    textValue(entry, "github"),
    ...itemsList(entry.otherUrls),
  ].filter((link) => link.length > 0);

  if (!name && !contact && links.length === 0) return null;

  return (
    <header className="mb-6">
      {name && <h1 className={template.nameClass}>{name}</h1>}
      {contact && <p className={template.contactClass}>{contact}</p>}
      {links.length > 0 && (
        <p className={`${template.contactClass} break-all`}>
          {links.map((link, index) => (
            <span key={link}>
              {index > 0 && <span className="mx-1.5 text-neutral-400">·</span>}
              <a
                className={template.linkClass}
                href={normalizeUrl(link)}
                target="_blank"
                rel="noreferrer"
              >
                {link}
              </a>
            </span>
          ))}
        </p>
      )}
    </header>
  );
}

function normalizeUrl(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

/** Shared layout for Education / Academic Positions. */
function CredentialRenderer({ entry, template }: RendererProps) {
  const degree = textValue(entry, "degree");
  const field = textValue(entry, "fieldOfStudy");
  const title =
    degree && field ? `${degree} in ${field}` : degree || field;

  const position = textValue(entry, "position");
  const institution = line(
    textValue(entry, "institution"),
    textValue(entry, "department"),
    textValue(entry, "location"),
  );
  const dates = yearRange(entry);
  const advisor = textValue(entry, "advisor");
  const project = textValue(entry, "project");
  const thesis = textValue(entry, "thesisTitle");
  const description = textValue(entry, "description");

  const meta = line(
    dates,
    advisor && `Advisor: ${advisor}`,
    project && `Project: ${project}`,
  );

  return (
    <div className={template.entryClass}>
      {(title || position) && (
        <div className={template.entryTitleClass}>{title || position}</div>
      )}
      {institution && <div>{institution}</div>}
      {meta && <div className="text-neutral-600">{meta}</div>}
      {thesis && (
        <div className="italic">
          Thesis: &ldquo;{thesis}&rdquo;
        </div>
      )}
      {description && (
        <div className="mt-0.5 whitespace-pre-line text-neutral-700">
          {description}
        </div>
      )}
    </div>
  );
}

function PublicationRenderer({ entry, definition, template }: RendererProps) {
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

  const numberPart = [
    volume && volume,
    issue && `(${issue})`,
  ]
    .filter(Boolean)
    .join("");
  const venuePart = [venue, numberPart, pages]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={template.entryClass}>
      {authors.length > 0 && (
        <span>
          {authors.map((author, index) => (
            <span key={`${author.name}-${index}`}>
              {index > 0 && (index === authors.length - 1 ? " & " : ", ")}
              {author.isMe ? (
                <strong className="font-semibold">{author.name}</strong>
              ) : (
                author.name
              )}
            </span>
          ))}
        </span>
      )}
      {year && <span> ({year})</span>}
      {title && (
        <>
          {authors.length > 0 || year ? ". " : ""}
          <span className="italic">{title}</span>.
        </>
      )}
      {venuePart && <> {venuePart}.</>}
      {doi && (
        <span className="text-neutral-600"> doi:{doi}</span>
      )}
      {statusLabel && statusLabel !== "Published" && (
        <span className="text-neutral-600"> [{statusLabel}]</span>
      )}
    </div>
  );
}

function CategoryListRenderer({ entry, template }: RendererProps) {
  const category = textValue(entry, "category");
  const items = itemsList(entry.items);
  if (!category || items.length === 0) return null;

  return (
    <div className={template.entryClass}>
      <span className={template.entryTitleClass}>{category}: </span>
      <span>{items.join(", ")}</span>
    </div>
  );
}

/**
 * Fallback for every renderer without a dedicated component — including all
 * custom sections. Shows non-empty fields as `Label: value` rows.
 */
function GenericRenderer({ entry, definition, template }: RendererProps) {
  const rows = definition.fields
    .map((field) => ({ field, value: formatFieldValue(field, entry[field.id]) }))
    .filter((row): row is { field: typeof row.field; value: string } =>
      row.value !== null,
    );

  if (rows.length === 0) return null;

  return (
    <div className={template.entryClass}>
      {rows.map(({ field, value }) => (
        <div key={field.id}>
          <span className="text-neutral-600">{field.label}: </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

const entryRenderers: Record<string, ComponentType<RendererProps>> = {
  profile: ProfileRenderer,
  education: CredentialRenderer,
  position: CredentialRenderer,
  publication: PublicationRenderer,
  categoryList: CategoryListRenderer,
};

export function resolveRenderer(
  rendererKey: string,
): ComponentType<RendererProps> {
  return entryRenderers[rendererKey] ?? GenericRenderer;
}
