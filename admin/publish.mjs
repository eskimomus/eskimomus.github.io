// ============================================================================
// npm run publish — send whatever the admin has written to matt-swan.art.
//
// The admin only edits files; git is left alone, so nothing is live until
// this runs. It stages everything, writes a commit describing what changed
// (or the message you pass), and pushes.
//
// Usage:
//   npm run publish                      a generated message
//   npm run publish -- "new polagik ep"  your own
//   npm run publish -- --dry-run         say what would happen, change nothing
//
// The push is retried: a big upload over a flaky link drops often enough
// that one attempt is not an answer, and a half-sent push leaves the site
// exactly as it was, so trying again is always safe.
// ============================================================================

import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = "https://matt-swan.art";
const PUSH_TRIES = 5;
const PUSH_PAUSE_MS = 10_000;
// Nothing stops you going over this — it is a nudge, not a gate. But every
// byte committed here stays in the repo's history for good, so a slip is
// worth noticing before it is published rather than after.
const BIG_ADD_MB = 60;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const message = args.filter((a) => !a.startsWith("--")).join(" ").trim();

function git(...argv) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", argv, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    // Only the trailing newline goes. `git status --porcelain` puts the state
    // in the first two columns, so a leading space is data: trimming the whole
    // output shifts every path two characters left and the first line's status
    // becomes part of its filename.
    child.on("close", (code) => resolve({ code, out: out.replace(/\s+$/, ""), err: err.trim() }));
  });
}

async function gitOrDie(...argv) {
  const r = await git(...argv);
  if (r.code !== 0) {
    console.error(`git ${argv.join(" ")} failed:\n${r.err || r.out}`);
    process.exit(1);
  }
  return r;
}

// `git status --porcelain` in the shape the summary wants: one entry per path,
// with renames reduced to where the file ended up.
function parseStatus(porcelain) {
  const entries = [];
  for (const line of porcelain.split("\n")) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    let file = line.slice(3);
    const arrow = file.indexOf(" -> ");
    if (arrow !== -1) file = file.slice(arrow + 4);
    file = file.replace(/^"|"$/g, "");
    entries.push({ code, file, added: code.includes("?") || code.includes("A") });
  }
  return entries;
}

// An untracked directory shows up as one entry with a trailing slash, so the
// files inside it have to be asked for separately.
async function expand(entries) {
  const out = [];
  for (const e of entries) {
    if (!e.file.endsWith("/")) {
      out.push(e);
      continue;
    }
    const listed = await git("ls-files", "--others", "--exclude-standard", "--", e.file);
    for (const f of listed.out.split("\n").map((s) => s.trim()).filter(Boolean)) out.push({ ...e, file: f });
  }
  return out;
}

function describe(entries) {
  const audio = entries.filter((e) => e.added && /^assets\/audio\/.+\.mp3$/.test(e.file));
  const art = entries.filter((e) => e.added && /^(previews|assets)\/.+\.(webp|png|jpe?g|gif|svg)$/.test(e.file));
  const data = entries
    .filter((e) => /^(music-data|feed-data|data)\.js$/.test(e.file))
    .map((e) => e.file.replace(/\.js$/, "").replace(/-data$/, ""));
  const other = entries.filter(
    (e) => !audio.includes(e) && !art.includes(e) && !/^(music-data|feed-data|data)\.js$/.test(e.file),
  );

  const parts = [];
  if (data.length) parts.push(data.join(", "));
  if (audio.length) parts.push(`${audio.length} new track${audio.length > 1 ? "s" : ""}`);
  if (art.length) parts.push(`${art.length} new image${art.length > 1 ? "s" : ""}`);
  if (!parts.length && other.length) parts.push(`${other.length} file${other.length > 1 ? "s" : ""}`);

  // The album an upload landed in names the commit better than a count does.
  const albums = [...new Set(audio.map((e) => e.file.split("/")[2]))];
  const head = albums.length === 1 ? albums[0] : "content";
  return { subject: `${head}: ${parts.join(", ")}`, audio, art, other };
}

async function addedBytes(entries) {
  let total = 0;
  const { statSync } = await import("node:fs");
  for (const e of entries) {
    if (!e.added) continue;
    try {
      total += statSync(path.join(ROOT, e.file)).size;
    } catch {}
  }
  return total;
}

const status = await gitOrDie("status", "--porcelain");
if (!status.out) {
  console.log("nothing to publish — the working tree matches what is already live.");
  process.exit(0);
}

const entries = await expand(parseStatus(status.out));
const { subject, audio, art } = describe(entries);
const bytes = await addedBytes(entries);
const subjectToUse = message || subject;

console.log(`publishing ${entries.length} changed file${entries.length > 1 ? "s" : ""}`);
if (audio.length) console.log(`  audio    ${audio.length} file${audio.length > 1 ? "s" : ""}`);
if (art.length) console.log(`  artwork  ${art.length} file${art.length > 1 ? "s" : ""}`);
console.log(`  added    ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`  message  ${subjectToUse}`);

if (bytes / 1048576 > BIG_ADD_MB) {
  console.log("");
  console.log(`  note: that is over ${BIG_ADD_MB}MB, and everything committed stays in`);
  console.log("        the repo's history for good. Worth a look before it goes.");
}

if (dryRun) {
  console.log("\n--dry-run: stopping here, nothing staged, committed or pushed.");
  process.exit(0);
}

await gitOrDie("add", "-A");
const staged = await git("diff", "--cached", "--quiet");
if (staged.code === 0) {
  console.log("nothing staged after all — ignored files only.");
  process.exit(0);
}
await gitOrDie("commit", "-m", subjectToUse);
const head = (await gitOrDie("rev-parse", "HEAD")).out.trim();
console.log(`\ncommitted ${head.slice(0, 7)}`);

for (let attempt = 1; attempt <= PUSH_TRIES; attempt++) {
  process.stdout.write(`pushing (attempt ${attempt}/${PUSH_TRIES})… `);
  const push = await git("push", "origin", "HEAD:main");
  const remote = await git("ls-remote", "--heads", "origin", "main");
  if (remote.out.trim().startsWith(head)) {
    console.log("done.");
    console.log(`\n${SITE} will show it once GitHub Pages rebuilds, usually within a minute.`);
    process.exit(0);
  }
  console.log("dropped.");
  if (push.err) console.log(`  ${push.err.split("\n").pop()}`);
  if (attempt < PUSH_TRIES) await new Promise((r) => setTimeout(r, PUSH_PAUSE_MS));
}

console.error(`\nthe commit is made but not pushed. Nothing is live yet, and the site is`);
console.error(`untouched. Run "npm run publish" again — it will pick up where this left off.`);
process.exit(1);
