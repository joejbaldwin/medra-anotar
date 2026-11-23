// Pure functions shared by the page and the round-trip test.

export const TYPES = [
  ["planning", "Understanding the problem or deciding how to approach it"],
  ["development", "Doing the work: calculating, deducing, writing code"],
  ["verification", "Checking a result it already has (incl. re-solving another way to confirm)"],
  ["backtrack", "Noticing a mistake and correcting it"],
  ["alternative", "Trying a different approach, case or interpretation to make progress"],
  ["conclusion", "Stating the result or deciding what to answer"],
];

/** "a, b\nc" -> ["a", "b", "c"] */
export function parseList(text) {
  return text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

/** One group per line, terms separated by commas. */
export function parseGroups(text) {
  return text.split("\n").map((line) => parseList(line)).filter((g) => g.length);
}

const q = (s) => JSON.stringify(s); // a JSON string is a valid YAML double-quoted scalar

/**
 * The annotation file, in the format eval/annotations.py checks:
 * YAML front matter, then the trace text unchanged with [[type]] before each tagged sentence.
 * state: {tags: {sentenceIndex: type}, concepts: [], topics: [[]], annotator, status}
 */
export function toMarkdown(traceId, trace, file, state) {
  const lines = ["---", `trace: ${traceId}`, `annotator: ${q(state.annotator)}`];
  if (file.drafted_by) lines.push(`drafted_by: ${q(file.drafted_by)}`);
  lines.push(`status: ${state.status}`);
  lines.push(`concepts: [${state.concepts.map(q).join(", ")}]`);
  if (state.topics.length) {
    lines.push("topics:");
    for (const g of state.topics) lines.push(`- [${g.map(q).join(", ")}]`);
  } else {
    lines.push("topics: []");
  }
  lines.push("---");
  let body = "";
  let last = 0;
  const indexes = Object.keys(state.tags).map(Number).sort((a, b) => a - b);
  for (const i of indexes) {
    const start = trace.spans[i][0];
    body += trace.text.slice(last, start) + `[[${state.tags[i]}]]`;
    last = start;
  }
  body += trace.text.slice(last);
  return lines.join("\n") + "\n" + body + "\n";
}

/** Problems that make the file fail the checker (blocking) or break the guide (warnings). */
export function problems(state) {
  const errors = [];
  const warnings = [];
  if (!state.tags[0]) errors.push("The first sentence must have a tag.");
  if (!state.annotator.trim()) errors.push("Annotator name is empty.");
  const n = state.concepts.length;
  if (n < 5 || n > 10) warnings.push(`Concepts: ${n} (guide: 5-10).`);
  const t = state.topics.length;
  if (t < 2 || t > 5) warnings.push(`Topics: ${t} groups (guide: 2-5).`);
  if (state.topics.some((g) => g.length < 3 || g.length > 8)) warnings.push("Each topic group should have 3-8 terms.");
  const seen = new Set();
  for (const term of state.topics.flat()) {
    if (seen.has(term)) warnings.push(`"${term}" is in more than one topic group.`);
    seen.add(term);
  }
  return { errors, warnings };
}
