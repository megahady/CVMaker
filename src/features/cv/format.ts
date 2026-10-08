import type { EntryData } from "@/features/cv/schema/document";
import type { FieldDefinition } from "@/features/cv/schema/fields";

/** Trimmed string value of a field, or "" when absent/non-string. */
export function textValue(entry: EntryData, fieldId: string): string {
  const value = entry[fieldId];
  return typeof value === "string" ? value.trim() : "";
}

export function isEmptyEntry(entry: EntryData): boolean {
  return Object.values(entry).every((value) => {
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (value === true) return false;
    return value === undefined || value === null;
  });
}

/** "2020 – Present", "2018 – 2022", "2024" — reads startYear/endYear/isPresent. */
export function yearRange(entry: EntryData): string {
  const start = textValue(entry, "startYear");
  const end = textValue(entry, "endYear");
  const present = entry.isPresent === true;
  const stop = present ? "Present" : end;

  if (start && stop) return `${start} – ${stop}`;
  return start || stop || "";
}

export function optionLabel(field: FieldDefinition, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

export function itemsList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export type AuthorLike = { name: string; isMe: boolean };

export function toAuthorList(raw: unknown): AuthorLike[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is AuthorLike =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AuthorLike).name === "string" &&
        typeof (item as AuthorLike).isMe === "boolean",
    )
    .filter((author) => author.name.trim().length > 0);
}

/** Human-readable value for a field; null means "don't render this row". */
export function formatFieldValue(
  field: FieldDefinition,
  value: unknown,
): string | null {
  switch (field.type) {
    case "checkbox":
      return value === true ? "Yes" : null;
    case "select":
      return optionLabel(field, value) || null;
    case "multiselect": {
      if (!Array.isArray(value) || value.length === 0) return null;
      return value
        .map((item) => optionLabel(field, item))
        .filter((label) => label.length > 0)
        .join(", ");
    }
    case "authors": {
      const authors = toAuthorList(value);
      if (authors.length === 0) return null;
      const names = authors.map((author) =>
        author.isMe ? `${author.name} (me)` : author.name,
      );
      return names.length > 2
        ? `${names[0]}, et al.`
        : names.join(" & ");
    }
    case "date":
      return formatDate(value);
    default: {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
}

/** "2026-03-05" → "March 5, 2026"; anything else returned as-is. */
export function formatDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const [, year, month, day] = match;
  const monthName = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return monthName;
}
