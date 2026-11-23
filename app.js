import { DATA } from "./data.js";
import { TYPES, parseGroups, parseList, problems, toMarkdown } from "./core.js";

const $ = (id) => document.getElementById(id);
const STORE = "medra-anotar:";
const files = DATA.files;
let file = null; // entry of DATA.files
let trace = null;
let state = null; // {tags, concepts, topics, annotator, status}

// ------------------------------------------------------------ state

function original(f) {
  return { tags: { ...f.tags }, concepts: [...f.concepts], topics: f.topics.map((g) => [...g]),
           annotator: f.annotator, status: f.status };
}

function load(f) {
  const saved = localStorage.getItem(STORE + f.file);
  return saved ? JSON.parse(saved) : original(f);
}

function persist() {
  localStorage.setItem(STORE + file.file, JSON.stringify(state));
}

// ------------------------------------------------------------ pickers

function fillWho() {
  const names = [...new Set(files.map((f) => f.annotator))].sort();
  $("who").innerHTML = "";
  $("who").append(new Option("Everyone", ""), ...names.map((n) => new Option(n, n)));
  $("who").value = localStorage.getItem(STORE + "who") ?? "";
}

function fillFiles() {
  const who = $("who").value;
  const mine = files.filter((f) => !who || f.annotator === who || load(f).annotator === who);
  $("file").innerHTML = "";
  for (const f of mine) {
    const kind = f.scratch ? "from scratch" : "correct draft";
    $("file").append(new Option(`${f.file}  (${kind}${who ? "" : ", " + f.annotator})`, f.file));
  }
  const last = localStorage.getItem(STORE + "file");
  if (mine.some((f) => f.file === last)) $("file").value = last;
}

function open(name) {
  file = files.find((f) => f.file === name);
  trace = DATA.traces[file.trace];
  state = load(file);
  localStorage.setItem(STORE + "file", name);
  $("title").textContent = `${file.trace}: ${trace.title}`;
  $("prompt").textContent = trace.prompt;
  $("mode").textContent = file.scratch
    ? "Annotate from scratch: don't look at anyone else's version of this trace first."
    : "Correct the AI draft: don't trust it, change anything you disagree with.";
  $("annotator").value = state.annotator;
  $("concepts").value = state.concepts.join(", ");
  $("topics").value = state.topics.map((g) => g.join(", ")).join("\n");
  $("corrected").checked = state.status === "corrected";
  $("saved-note").textContent = "";
  renderText();
  refreshSide();
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------ text

function segmentTypes() {
  // Type of the step each sentence belongs to.
  const out = [];
  let current = null;
  for (let i = 0; i < trace.spans.length; i++) {
    if (state.tags[i]) current = state.tags[i];
    out.push(current);
  }
  return out;
}

function renderText() {
  const box = $("text");
  box.textContent = "";
  const types = segmentTypes();
  let last = 0;
  trace.spans.forEach(([a, b], i) => {
    box.append(trace.text.slice(last, a)); // whitespace and line breaks between sentences
    const slot = document.createElement("button");
    slot.className = "slot";
    slot.dataset.i = i;
    const tag = state.tags[i];
    if (tag) {
      slot.innerHTML = `<span class="tag bg-${tag}">${tag}</span>`;
      slot.title = `Step starts here: ${tag}. Click to change.`;
    } else {
      slot.classList.add("empty");
      slot.title = "Start a new step here";
    }
    slot.setAttribute("aria-label", tag ? `Sentence ${i}: ${tag} step starts here` : `Sentence ${i}: start a step`);
    slot.addEventListener("click", (e) => openMenu(i, e.currentTarget));
    const sent = document.createElement("span");
    sent.className = "sent" + (types[i] ? ` t-${types[i]}` : "");
    sent.textContent = trace.text.slice(a, b);
    box.append(slot, sent);
    last = b;
  });
  box.append(trace.text.slice(last));
}

// ------------------------------------------------------------ menu

let menuFor = null;

function openMenu(i, anchor) {
  menuFor = i;
  const menu = $("menu");
  menu.innerHTML = "";
  TYPES.forEach(([type, help], k) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="swatch bg-${type}"></span>${type}<kbd>${k + 1}</kbd>`;
    b.title = help;
    if (state.tags[i] === type) b.classList.add("current");
    b.addEventListener("click", () => setTag(i, type));
    menu.append(b);
  });
  if (state.tags[i] && i !== 0) {
    menu.append(document.createElement("hr"));
    const rm = document.createElement("button");
    rm.innerHTML = "No step starts here<kbd>⌫</kbd>";
    rm.addEventListener("click", () => setTag(i, null));
    menu.append(rm);
  }
  const r = anchor.getBoundingClientRect();
  menu.style.left = `${r.left + window.scrollX}px`;
  menu.style.top = `${r.bottom + window.scrollY + 4}px`;
  menu.hidden = false;
  menu.querySelector("button").focus();
}

function closeMenu() {
  $("menu").hidden = true;
  menuFor = null;
}

function setTag(i, type) {
  if (type) state.tags[i] = type;
  else if (i !== 0) delete state.tags[i];
  closeMenu();
  persist();
  const y = window.scrollY;
  renderText();
  window.scrollTo(0, y);
  refreshSide();
  document.querySelector(`.slot[data-i="${i}"]`)?.focus({ preventScroll: true });
}

document.addEventListener("keydown", (e) => {
  if (menuFor === null) return;
  if (e.key === "Escape") closeMenu();
  else if (e.key >= "1" && e.key <= "6") setTag(menuFor, TYPES[Number(e.key) - 1][0]);
  else if ((e.key === "Backspace" || e.key === "Delete") && menuFor !== 0) setTag(menuFor, null);
  else return;
  e.preventDefault();
});
document.addEventListener("click", (e) => {
  if (menuFor !== null && !e.target.closest("#menu") && !e.target.closest(".slot")) closeMenu();
});

// ------------------------------------------------------------ side panel

function readSide() {
  state.annotator = $("annotator").value.trim();
  state.concepts = parseList($("concepts").value);
  state.topics = parseGroups($("topics").value);
  state.status = $("corrected").checked ? "corrected" : "draft";
  persist();
  refreshSide();
}

function refreshSide() {
  const steps = Object.keys(state.tags).length;
  $("concepts-count").textContent = `${state.concepts.length} concepts`;
  $("topics-count").textContent = `${state.topics.length} groups: ${state.topics.map((g) => g.length).join(", ") || "none"} terms`;
  const { errors, warnings } = problems(state);
  const list = $("problems");
  list.innerHTML = "";
  for (const e of errors) list.append(Object.assign(document.createElement("li"), { className: "error", textContent: e }));
  for (const w of warnings) list.append(Object.assign(document.createElement("li"), { className: "warning", textContent: w }));
  list.append(Object.assign(document.createElement("li"), { className: "warning",
    textContent: `${steps} steps in ${trace.spans.length} sentences.` }));
  $("save").disabled = errors.length > 0;
}

function save() {
  readSide();
  const blob = new Blob([toMarkdown(file.trace, trace, file, state)], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.file;
  a.click();
  URL.revokeObjectURL(a.href);
  $("saved-note").textContent = `Downloaded ${file.file}${state.status === "corrected" ? "" : " (still marked draft)"}: send it to Joe.`;
}

function reset() {
  if (!confirm(`Discard your changes to ${file.file} and go back to the original?`)) return;
  localStorage.removeItem(STORE + file.file);
  open(file.file);
}

// ------------------------------------------------------------ start

$("legend").append(...TYPES.map(([type, help], k) => {
  const li = document.createElement("li");
  li.innerHTML = `<span class="swatch bg-${type}"></span><span><strong>${type}</strong> <kbd>${k + 1}</kbd>: ${help}</span>`;
  return li;
}));
for (const id of ["annotator", "concepts", "topics"]) $(id).addEventListener("input", readSide);
$("corrected").addEventListener("change", readSide);
$("save").addEventListener("click", save);
$("reset").addEventListener("click", reset);
$("who").addEventListener("change", () => {
  localStorage.setItem(STORE + "who", $("who").value);
  fillFiles();
  open($("file").value);
});
$("file").addEventListener("change", () => open($("file").value));

fillWho();
fillFiles();
open($("file").value || files[0].file);
