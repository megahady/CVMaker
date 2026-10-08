/**
 * Writes one .tex file per CV template into a target directory, using the
 * populated MohamedAbdelhady-CV.cv so every layout is exercised with real
 * content. Used to compile-check all templates with XeLaTeX.
 *
 * Run: npx vite-node scripts/export-templates.ts [outDir] [cvFile]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCvDocument } from "@/features/cv/schema/parse";
import { cvTemplateSchema } from "@/features/cv/schema/document";
import { generateLatex } from "@/features/latex/generate";
import type { CvDocument } from "@/features/cv/schema/document";

const outDir = process.argv[2] ?? "template-tex";
const cvFile = process.argv[3] ?? "MohamedAbdelhady-CV.cv";
const raw = JSON.parse(readFileSync(cvFile, "utf8")) as unknown;
const result = parseCvDocument(raw);
if (!result.ok) {
  console.error(`INVALID: ${result.error}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const template of cvTemplateSchema.options) {
  const doc: CvDocument = { ...result.document, template };
  const output = generateLatex(doc);
  const file = join(outDir, `${template}.tex`);
  writeFileSync(file, output, "utf8");
  console.log(`wrote ${file}`);
}
console.log(`done: ${cvTemplateSchema.options.length} templates`);