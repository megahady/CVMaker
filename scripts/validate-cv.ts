import fs from "node:fs";
import { parseCvDocument } from "@/features/cv/schema/parse";

const file = process.argv[2] ?? "MohamedAbdelhady-CV.cv";
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const result = parseCvDocument(raw);

if (!result.ok) {
  console.error(`INVALID: ${result.error}`);
  process.exit(1);
}

const doc = result.document;
let totalEntries = 0;
for (const section of doc.sections) {
  totalEntries += section.entries.length;
}
console.log(`VALID: ${doc.sections.length} sections, ${totalEntries} entries`);
for (const section of doc.sections) {
  const filled = section.entries.map((entry) =>
    Object.values(entry).some((v) => {
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return v === true;
    }),
  ).filter(Boolean).length;
  console.log(`  [${section.enabled ? "on" : "off"}] ${section.title} (${section.type}) — ${filled}/${section.entries.length} filled`);
}