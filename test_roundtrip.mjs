// Write every annotation file back out with toMarkdown, unchanged, into the folder given.
import { mkdirSync, writeFileSync } from "node:fs";
import { DATA } from "./data.js";
import { toMarkdown } from "./core.js";
const out = process.argv[2];
mkdirSync(out, { recursive: true });
for (const f of DATA.files) {
  const state = { tags: f.tags, concepts: f.concepts, topics: f.topics, annotator: f.annotator, status: f.status };
  writeFileSync(`${out}/${f.file}`, toMarkdown(f.trace, DATA.traces[f.trace], f, state));
}
console.log(`wrote ${DATA.files.length} files to ${out}`);
