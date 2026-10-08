import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatFieldValue,
  isEmptyEntry,
  itemsList,
  optionLabel,
  textValue,
  toAuthorList,
  yearRange,
} from "./format";
import type { FieldDefinition } from "@/features/cv/schema/fields";

const selectField: FieldDefinition = {
  id: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "published", label: "Published" },
    { value: "underReview", label: "Under Review" },
  ],
};

describe("format helpers", () => {
  it("trims text values and ignores non-strings", () => {
    expect(textValue({ name: "  Jane  " }, "name")).toBe("Jane");
    expect(textValue({}, "name")).toBe("");
    expect(textValue({ name: 42 }, "name")).toBe("");
  });

  it("detects empty entries", () => {
    expect(isEmptyEntry({})).toBe(true);
    expect(isEmptyEntry({ name: "   " })).toBe(true);
    expect(isEmptyEntry({ name: "Jane" })).toBe(false);
    expect(isEmptyEntry({ ongoing: true })).toBe(false);
    expect(isEmptyEntry({ tags: ["a"] })).toBe(false);
    expect(isEmptyEntry({ tags: [] })).toBe(true);
  });

  it("formats year ranges", () => {
    expect(yearRange({ startYear: "2020", endYear: "2024" })).toBe(
      "2020 – 2024",
    );
    expect(yearRange({ startYear: "2022", isPresent: true })).toBe(
      "2022 – Present",
    );
    expect(yearRange({ endYear: "2019" })).toBe("2019");
    expect(yearRange({})).toBe("");
  });

  it("resolves select options to labels", () => {
    expect(optionLabel(selectField, "underReview")).toBe("Under Review");
    expect(optionLabel(selectField, "mystery")).toBe("mystery");
    expect(optionLabel(selectField, undefined)).toBe("");
  });

  it("splits list text on commas and newlines", () => {
    expect(itemsList("Python,\nR,  SQL")).toEqual(["Python", "R", "SQL"]);
    expect(itemsList(undefined)).toEqual([]);
  });

  it("parses authors and flags the CV owner", () => {
    expect(
      toAuthorList([
        { name: "Jane Doe", isMe: true },
        { name: "Bob Roe", isMe: false },
        { name: "", isMe: false },
        "not-an-author",
      ]),
    ).toEqual([
      { name: "Jane Doe", isMe: true },
      { name: "Bob Roe", isMe: false },
    ]);
  });

  it("formats field values per type", () => {
    expect(formatFieldValue(selectField, "published")).toBe("Published");
    expect(formatFieldValue(selectField, "unknown")).toBe("unknown");
    expect(
      formatFieldValue(
        {
          id: "langs",
          label: "Languages",
          type: "multiselect",
          options: [{ value: "en", label: "English" }],
        },
        ["en", "fr"],
      ),
    ).toBe("English, fr");
    expect(
      formatFieldValue(
        { id: "ok", label: "OK", type: "checkbox" },
        true,
      ),
    ).toBe("Yes");
    expect(
      formatFieldValue({ id: "x", label: "X", type: "checkbox" }, false),
    ).toBeNull();
    expect(
      formatFieldValue(
        { id: "a", label: "Authors", type: "authors" },
        [
          { name: "Jane Doe", isMe: true },
          { name: "Bob Roe", isMe: false },
          { name: "Ann Lee", isMe: false },
        ],
      ),
    ).toBe("Jane Doe (me), et al.");
    expect(
      formatFieldValue({ id: "t", label: "T", type: "text" }, "  "),
    ).toBeNull();
  });

  it("formats dates without timezone drift", () => {
    expect(formatDate("2026-03-05")).toBe("March 5, 2026");
    expect(formatDate("soon")).toBe("soon");
    expect(formatDate("")).toBeNull();
  });
});
