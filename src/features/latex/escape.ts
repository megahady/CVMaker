/**
 * LaTeX escaping for plain text.
 *
 * Must be applied to *every* user-provided string before it enters the .tex
 * output — an unescaped `&` or `%` is a compile error, `_`/`#` a macro error,
 * and `{`/`}` can break grouping. Applied at the last moment (generation),
 * never stored, so the document model stays plain text.
 */
const SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
};

export function escapeLatex(text: string): string {
  let out = "";
  for (const char of text) {
    out += SPECIALS[char] ?? char;
  }
  return out;
}

/**
 * User text as LaTeX paragraphs: blank-line separated, everything escaped.
 * Single newlines become paragraph breaks too — the textarea stores visual
 * line breaks, and LaTeX re-wraps lines anyway.
 */
export function latexParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(escapeLatex);
  return paragraphs.join("\n\n");
}
