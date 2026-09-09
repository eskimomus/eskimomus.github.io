// ============================================================================
// The admin server. Runs on your own machine and nowhere else — `npm run
// admin`, edit, then commit and push like any other change.
//
// That is the whole security model, and it is the reason there is no login
// here: the thing is only ever reachable from this computer, so there is no
// account to steal and no endpoint on the internet to attack. It binds to
// 127.0.0.1 for that reason; do not change that to 0.0.0.0 without putting
// authentication in front of it first.
//
// It serves three things:
//   /admin/…   the editor itself
//   /api/…     read and write the data files, take audio and image uploads
//   /…         the repo, so the site and its assets load next to the editor
// ============================================================================

import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readAll, writeAll, StaleError, ROOT } from "./store.mjs";

const run = promisify(execFile);
const PORT = Number(process.env.ADMIN_PORT) || 5174;
const HOST = "127.0.0.1";
const MAX_UPLOAD = 64 * 1024 * 1024; // an mp3 that won't fit in this isn't going on the site

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": type,
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

function readBody(req, limit = MAX_UPLOAD) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`upload is larger than ${Math.round(limit / 1024 / 1024)}MB`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Lower case, ASCII, hyphens — the same shape every file already in
// assets/audio has, so a track added today sits beside one added last year.
export function slug(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A path from the browser can only ever land inside the repo.
function resolveInRepo(...parts) {
  const full = path.resolve(ROOT, ...parts);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error("path escapes the repo");
  return full;
}

// macOS ships afinfo, which is what the existing durations were measured
// with. The browser sends its own reading too; this is the check on it.
async function probeDuration(file) {
  try {
    const { stdout } = await run("afinfo", [file]);
    const match = stdout.match(/estimated duration: ([\d.]+) sec/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function handleApi(req, res, url) {
  const route = url.pathname.slice("/api/".length);

  if (route === "content" && req.method === "GET") {
    return send(res, 200, await readAll());
  }

  if (route === "content" && req.method === "PUT") {
    const body = JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString("utf8"));
    const { content, versions, ...rest } = body;
    try {
      const written = await writeAll(content ?? rest, versions ?? null);
      return send(res, 200, { written, ...(await readAll()) });
    } catch (error) {
      // 409, not 400: this one is worth the editor handling on its own
      if (error instanceof StaleError) {
        return send(res, 409, { error: error.message, stale: error.files });
      }
      throw error;
    }
  }

  // Audio. The project id decides the folder, so uploads land in the same
  // per-project layout the library already uses.
  if (route === "upload/audio" && req.method === "POST") {
    const project = slug(url.searchParams.get("project") || "");
    const name = slug(url.searchParams.get("name") || "");
    if (!project || !name) throw new Error("upload needs both project and name");
    const dir = resolveInRepo("assets", "audio", project);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${name}.mp3`);
    const data = await readBody(req);
    if (!data.length) throw new Error("upload was empty");
    await writeFile(file, data);
    const measured = await probeDuration(file);
    const sent = Number(url.searchParams.get("duration"));
    return send(res, 200, {
      src: `./assets/audio/${project}/${name}.mp3`,
      duration: measured ?? (Number.isFinite(sent) && sent > 0 ? sent : 0),
      bytes: data.length,
      measuredBy: measured != null ? "afinfo" : "browser",
    });
  }

  // Artwork. Everything the site shows as a preview lives in previews/.
  if (route === "upload/image" && req.method === "POST") {
    const name = slug(url.searchParams.get("name") || "");
    const ext = (url.searchParams.get("ext") || "webp").replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (!name) throw new Error("upload needs a name");
    if (!["webp", "png", "jpg", "jpeg", "gif"].includes(ext)) throw new Error(`bad image type .${ext}`);
    const dir = resolveInRepo("previews");
    await mkdir(dir, { recursive: true });
    const data = await readBody(req, 16 * 1024 * 1024);
    if (!data.length) throw new Error("upload was empty");
    await writeFile(path.join(dir, `${name}.${ext}`), data);
    return send(res, 200, { src: `./previews/${name}.${ext}`, bytes: data.length });
  }

  if (route === "slug" && req.method === "GET") {
    return send(res, 200, { slug: slug(url.searchParams.get("text") || "") });
  }

  send(res, 404, { error: `no route ${req.method} ${url.pathname}` });
}

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------

async function serveFile(res, file, { range } = {}) {
  const info = await stat(file);
  if (info.isDirectory()) return serveFile(res, path.join(file, "index.html"));
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  // audio needs ranges or the browser can't scrub a track it's auditioning
  if (range && type.startsWith("audio")) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : info.size - 1;
      const buf = await readFile(file);
      res.writeHead(206, {
        "content-type": type,
        "content-range": `bytes ${start}-${end}/${info.size}`,
        "accept-ranges": "bytes",
        "content-length": end - start + 1,
      });
      return res.end(buf.subarray(start, end + 1));
    }
  }
  res.writeHead(200, {
    "content-type": type,
    "content-length": info.size,
    "accept-ranges": "bytes",
    "cache-control": "no-store",
  });
  res.end(await readFile(file));
}

// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);

    if (url.pathname === "/" || url.pathname === "/admin") {
      res.writeHead(302, { location: "/admin/" });
      return res.end();
    }
    if (url.pathname.startsWith("/admin/")) {
      const rest = url.pathname.slice("/admin/".length) || "index.html";
      const file = path.resolve(import.meta.dirname, rest);
      if (!file.startsWith(import.meta.dirname + path.sep)) throw new Error("path escapes admin");
      return await serveFile(res, file);
    }

    // anything else is the site itself, served straight out of the repo
    return await serveFile(res, resolveInRepo("." + decodeURIComponent(url.pathname)), {
      range: req.headers.range,
    });
  } catch (error) {
    const missing = error.code === "ENOENT";
    if (!missing) console.error(`${req.method} ${url.pathname}:`, error.message);
    send(res, missing ? 404 : 400, { error: error.message });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`port ${PORT} is busy — the admin is probably already running.`);
    console.error(`open http://${HOST}:${PORT}/admin/, or start this one elsewhere:`);
    console.error(`  ADMIN_PORT=5175 npm run admin`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`admin   http://${HOST}:${PORT}/admin/`);
  console.log(`site    http://${HOST}:${PORT}/index.html`);
  console.log(`editing ${ROOT}`);
});
