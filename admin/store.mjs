// ============================================================================
// The data files, read and written in place.
//
// The site loads its content from three plain scripts — no build step, no
// fetch, the arrays are just there when app.js runs. That is worth keeping,
// so the admin edits those same files rather than moving the site onto an
// API it would then depend on.
//
// Reading evaluates the file and takes the arrays out of it. Writing puts the
// new JSON back *in place of the old array only*: the files carry a lot of
// commentary, including blocks that sit between two consts, and regenerating
// them wholesale would throw all of it away. Everything outside the brackets
// comes through untouched, byte for byte.
// ============================================================================

import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
const BACKUPS = path.join(import.meta.dirname, ".backups");
const KEEP_BACKUPS = 40;

// which file holds what, and the order the site expects to find them in
export const FILES = {
  feed: { file: "redesign/feed-data.js", consts: ["FEED"] },
  site: { file: "redesign/data.js", consts: ["PROJECTS", "CONTACTS"] },
  music: { file: "redesign/music-data.js", consts: ["SOUNDTRACKS", "SIDE_PROJECTS"] },
};

const CONST_FILE = new Map();
for (const [, spec] of Object.entries(FILES)) {
  for (const name of spec.consts) CONST_FILE.set(name, spec.file);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

async function evaluate(file, names) {
  const source = await readFile(path.join(ROOT, file), "utf8");
  const body = `${source}\n; return { ${names.join(", ")} };`;
  try {
    // eslint-disable-next-line no-new-func
    return { source, values: new Function(body)() };
  } catch (error) {
    throw new Error(`${file} did not evaluate: ${error.message}`);
  }
}

// What the file said when it was read. The editor sends these back with a
// save so the server can tell whether it is writing on top of the same text
// it handed out — two tabs open, or one left over from before an edit made
// somewhere else, would otherwise silently overwrite each other's work.
// Content, not mtime: a hash can't be fooled by two writes inside the same
// clock tick.
function stamp(source) {
  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export async function readAll() {
  const content = {};
  const versions = {};
  for (const spec of Object.values(FILES)) {
    const { source, values } = await evaluate(spec.file, spec.consts);
    Object.assign(content, values);
    versions[spec.file] = stamp(source);
  }
  return { content, versions };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// Walks forward from the first bracket of a literal to the character just
// past its match. Counting brackets alone is not enough: the data carries
// them in prose, and the arrays have comments in among the entries — one of
// which reads "every circle's wobble", whose apostrophe would open a string
// that never closes and swallow the rest of the file. So strings and
// comments are both stepped over rather than read.
function endOfLiteral(source, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2);
      if (i === -1) break;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[" || ch === "{" || ch === "(") depth++;
    else if (ch === "]" || ch === "}" || ch === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error("unterminated literal");
}

function replaceConst(source, name, value) {
  const marker = `const ${name} = `;
  const at = source.indexOf(marker);
  if (at === -1) throw new Error(`const ${name} not found`);
  const open = at + marker.length;
  const close = endOfLiteral(source, open);
  return source.slice(0, open) + JSON.stringify(value, null, 2) + source.slice(close);
}

async function backup(file, source) {
  await mkdir(BACKUPS, { recursive: true });
  const when = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${path.basename(file)}.${when}.bak`;
  await writeFile(path.join(BACKUPS, name), source);

  // keep the folder from growing without bound
  const kept = (await readdir(BACKUPS)).filter((f) => f.endsWith(".bak")).sort();
  for (const old of kept.slice(0, Math.max(0, kept.length - KEEP_BACKUPS))) {
    await unlink(path.join(BACKUPS, old));
  }
}

// `changes` is { CONST_NAME: value, ... } for any of the consts above, in any
// combination; files nobody touched are not rewritten at all.
//
// `expected` is the versions map from the read these changes were made
// against. Any file that has moved on since is reported instead of written,
// and nothing at all is written in that case — a save is all or none, so a
// stale editor can't land half its work.
export class StaleError extends Error {
  constructor(files) {
    super(
      `${files.join(" and ")} changed on disk since this was loaded. ` +
        `Reload the admin to pick up the current version — anything unsaved here will be lost.`,
    );
    this.name = "StaleError";
    this.files = files;
  }
}

export async function writeAll(changes, expected = null) {
  const byFile = new Map();
  for (const [name, value] of Object.entries(changes)) {
    const file = CONST_FILE.get(name);
    if (!file) throw new Error(`unknown collection ${name}`);
    if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
    if (!byFile.has(file)) byFile.set(file, {});
    byFile.get(file)[name] = value;
  }

  // check every file first: a stale one must stop the whole save, not just
  // its own share of it
  if (expected) {
    const stale = [];
    for (const file of byFile.keys()) {
      const known = expected[file];
      if (!known) continue;
      if (stamp(await readFile(path.join(ROOT, file), "utf8")) !== known) stale.push(file);
    }
    if (stale.length) throw new StaleError(stale);
  }

  const written = [];
  for (const [file, values] of byFile) {
    const full = path.join(ROOT, file);
    const source = await readFile(full, "utf8");
    let next = source;
    for (const [name, value] of Object.entries(values)) next = replaceConst(next, name, value);
    if (next === source) continue; // nothing actually changed

    // The site's data files are the only copy of this content, so every
    // rewrite leaves the previous version behind before it lands.
    await backup(file, source);

    // A file that no longer evaluates would take the whole site down, and it
    // would do it silently — app.js just stops at the ReferenceError. Cheaper
    // to find out here, while the old text is still in hand.
    const names = FILES[Object.keys(FILES).find((k) => FILES[k].file === file)].consts;
    try {
      // eslint-disable-next-line no-new-func
      new Function(`${next}\n; return { ${names.join(", ")} };`)();
    } catch (error) {
      throw new Error(`refusing to write ${file}: the result does not parse (${error.message})`);
    }

    await writeFile(full, next);
    await bumpCacheBuster(path.basename(file));
    written.push(file);
  }
  return written;
}

// redesign/index.html loads each script with a ?v= on it. Editing a data file
// without moving that number leaves anyone who has the old one cached — a
// returning visitor, a CDN edge — reading yesterday's content off a page that
// has already shipped. So the number follows the file it belongs to.
async function bumpCacheBuster(basename) {
  const page = path.join(ROOT, "redesign/index.html");
  const html = await readFile(page, "utf8");
  const pattern = new RegExp(`(${basename.replace(/\./g, "\\.")}\\?v=)(\\d+)`);
  if (!pattern.test(html)) return;
  await writeFile(page, html.replace(pattern, (_, head, n) => head + (Number(n) + 1)));
}
