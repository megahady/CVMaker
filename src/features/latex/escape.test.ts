import { describe, expect, it } from "vitest";
import { escapeLatex, latexParagraphs } from "./escape";

describe("latex escape", () => {
  it("escapes all special characters and backslash", () => {
    expect(escapeLatex("100% & 50$")).toBe("100\\% \\& 50\\$");
    expect(escapeLatex("x_{i} #1")).toBe("x\\_\\{i\\} \\#1");
    expect(escapeLatex("a\\b")).toBe("a\\textbackslash{}b");
    expect(escapeLatex("A~B")).toBe("A\\textasciitilde{}B");
    expect(escapeLatex("C^D")).toBe("C\\textasciicircum{}D");
  });

  it("converts multi-line text to LaTeX paragraphs", () => {
    const result = latexParagraphs("First line\nSecond & third");
    expect(result).toBe("First line\n\nSecond \\& third");
  });
});
