// ============================================================================
// The editor.
//
// Everything the site shows lives in three arrays; this loads them, lets you
// change them, and puts them back. There is no framework and no build: the
// model is the plain JSON the server sent, edits mutate it in place, and the
// save button hands the whole thing back.
//
// Two rendering rules keep that honest. Inputs write to the model on `input`
// and do *not* re-render — otherwise the field you are typing in is replaced
// mid-word and loses the caret. A re-render happens only when the shape
// changes: something added, removed, reordered or selected.
// ============================================================================

const api = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  },
  async send(path, method, body, type = "application/json") {
    const res = await fetch(path, { method, headers: { "content-type": type }, body });
    if (!res.ok) {
      const error = new Error((await res.json().catch(() => ({}))).error || res.statusText);
      error.status = res.status; // 409 is the stale-save one, handled on its own
      throw error;
    }
    return res.json();
  },
};

const state = {
  content: null,
  // what the server last handed over, kept so the save step can say what
  // actually changed rather than just "everything"
  pristine: null,
  // a fingerprint per data file, handed back on save so the server can refuse
  // to write over an edit made somewhere else since this page loaded
  versions: null,
  tab: "feed",
  picked: { feed: null, projects: null, music: null },
  dirty: false,
};

// which array lives where, for the confirmation
const COLLECTIONS = [
  { key: "FEED", label: "feed", file: "feed-data.js", unit: "post" },
  { key: "PROJECTS", label: "projects", file: "data.js", unit: "project" },
  { key: "CONTACTS", label: "contacts", file: "data.js", unit: "link" },
  { key: "SOUNDTRACKS", label: "soundtracks", file: "music-data.js", unit: "project" },
  { key: "SIDE_PROJECTS", label: "side projects", file: "music-data.js", unit: "project" },
];

const els = {
  tabs: document.getElementById("tabs"),
  list: document.getElementById("list"),
  form: document.getElementById("form"),
  save: document.getElementById("save"),
  status: document.getElementById("status"),
  toast: document.getElementById("toast"),
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid) node.append(kid);
  return node;
}

let toastTimer = null;
function toast(message, bad = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("is-bad", bad);
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (els.toast.hidden = true), bad ? 8000 : 3000);
}

function slug(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base, taken) {
  const root = slug(base) || "item";
  if (!taken.includes(root)) return root;
  for (let n = 2; ; n++) if (!taken.includes(`${root}-${n}`)) return `${root}-${n}`;
}

function markDirty() {
  state.dirty = true;
  els.save.disabled = false;
  els.status.textContent = "unsaved changes";
  els.status.classList.add("is-dirty");
}

function markClean(note = "saved") {
  state.dirty = false;
  els.save.disabled = true;
  els.status.textContent = note;
  els.status.classList.remove("is-dirty");
}

function move(list, index, by) {
  const to = index + by;
  if (to < 0 || to >= list.length) return false;
  [list[index], list[to]] = [list[to], list[index]];
  return true;
}

// what buildTrack in app.js falls back to when a project has no `album`
function albumDefault(title) {
  return `${title || ""} ost`.trim();
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

function field(label, control, hint) {
  return el("div", { class: "field" }, label ? el("label", { text: label }) : null, control,
    hint ? el("p", { class: "hint", text: hint }) : null);
}

function text(obj, key, { placeholder = "", onInput } = {}) {
  const input = el("input", { type: "text", value: obj[key] ?? "", placeholder });
  input.value = obj[key] ?? "";
  input.addEventListener("input", () => {
    obj[key] = input.value;
    markDirty();
    if (onInput) onInput(input.value);
  });
  return input;
}

function area(obj, key, { rows = 6, placeholder = "" } = {}) {
  const input = el("textarea", { rows, placeholder });
  input.value = obj[key] ?? "";
  input.addEventListener("input", () => {
    obj[key] = input.value;
    markDirty();
  });
  return input;
}

// A textarea whose blank-line-separated blocks are the array — how the
// project write-ups read as paragraphs.
function paragraphs(obj, key) {
  const input = el("textarea", { rows: 10, placeholder: "one paragraph per block, blank line between" });
  input.value = (obj[key] || []).join("\n\n");
  input.addEventListener("input", () => {
    obj[key] = input.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    markDirty();
  });
  return input;
}

function check(obj, key, label) {
  const input = el("input", { type: "checkbox" });
  input.checked = Boolean(obj[key]);
  input.addEventListener("change", () => {
    if (input.checked) obj[key] = true;
    else delete obj[key];
    markDirty();
  });
  return el("label", { class: "check" }, input, el("span", { text: label }));
}

// The two vocabularies a track is described with. Written down rather than
// harvested: the projects' own tag lines mix genres with moods and with game
// genres ("colony sim", "retro jrpg") that belong to the project, not to a
// track. Edit these lists here — order is as given, so a related pair can sit
// together rather than being scattered by the alphabet.
const VOCABULARY = {
  genres: ["acid techno", "acoustic", "ambient", "jazz", "chiptune", "dnb", "edm",
    "idm", "hip-hop", "orchestral", "trip hop", "boss fight"],
  vibes: ["cute", "eerie", "industrial", "melancholic", "dynamic", "beautiful",
    "funky", "calm"],
};

// The list above, plus anything already set on a track that isn't in it — a
// word typed by hand stays reachable from the picker instead of vanishing
// from it the moment you move to the next track.
function vocabulary(key) {
  const words = [...(VOCABULARY[key] || [])];
  const known = new Set(words);
  for (const project of [...state.content.SOUNDTRACKS, ...state.content.SIDE_PROJECTS]) {
    for (const category of project.categories) {
      for (const track of category.tracks || []) {
        for (const word of track[key] || []) {
          if (known.has(word)) continue;
          known.add(word);
          words.push(word);
        }
      }
    }
  }
  return words;
}

// A comma-separated line that is really an array, with a picker beside it
// holding everything already in use. Typing still works — the picker is for
// reaching for a word you know is there without spelling it again.
//
// The key is dropped when the line is emptied, so 86 tracks don't each carry
// an empty [] around.
function listField(obj, key, placeholder) {
  const input = el("input", { type: "text", placeholder });
  input.value = (obj[key] || []).join(", ");

  const read = () => input.value.split(",").map((x) => x.trim()).filter(Boolean);
  const write = (items) => {
    if (items.length) obj[key] = items;
    else delete obj[key];
    input.value = items.join(", ");
    markDirty();
  };
  input.addEventListener("input", () => {
    const items = read();
    if (items.length) obj[key] = items;
    else delete obj[key];
    markDirty();
  });

  const pick = el("select", { class: "pick", title: `${key} already in use` });
  // filled when it's opened rather than when it's built, so a word typed a
  // moment ago on another track is already in the list
  const fill = () => {
    pick.textContent = "";
    pick.append(el("option", { value: "", text: "+" }));
    const used = read();
    for (const word of vocabulary(key)) {
      if (used.includes(word)) continue;
      pick.append(el("option", { value: word, text: word }));
    }
  };
  fill();
  pick.addEventListener("mousedown", fill);
  pick.addEventListener("change", () => {
    const word = pick.value;
    pick.selectedIndex = 0;
    if (!word) return;
    const items = read();
    if (!items.includes(word)) write([...items, word]);
  });

  return el("span", { class: "picker" }, input, pick);
}

// How often the shuffle is allowed to reach for this track. Written only
// when it isn't the ordinary 1, so a track nobody has thought about stays as
// short as it was.
const PICK_OPTIONS = [
  ["0", "0 never"],
  ["1", "1 normal"],
  ["2", "2 often"],
  ["3", "3 opener"],
];

function pickField(track) {
  const select = el("select", {
    class: "pick-state",
    title:
      "0 — never comes up on shuffle\n" +
      "1 — normal odds\n" +
      "2 — comes up more often\n" +
      "3 — more often, and can be the track the main player opens with",
  });
  const current = String(track.pick ?? 1);
  for (const [value, label] of PICK_OPTIONS) {
    select.append(el("option", { value, selected: value === current, text: label }));
  }
  const flag = () => select.toggleAttribute("data-off", select.value === "0");
  flag();
  select.addEventListener("change", () => {
    const value = Number(select.value);
    if (value === 1) delete track.pick;
    else track.pick = value;
    flag();
    markDirty();
  });
  return select;
}

// Tempo, or nothing. "-" and an empty box both mean the same thing — no tempo
// to lock an animation to — and both are stored as the key simply being
// absent, so "has a bpm" is one truthiness check on the site's side.
function bpmField(track) {
  const input = el("input", { type: "text", placeholder: "—" });
  input.value = track.bpm ?? "";
  input.addEventListener("input", () => {
    const raw = input.value.trim();
    const value = Number(raw);
    if (raw && raw !== "-" && Number.isFinite(value) && value > 0) track.bpm = value;
    else delete track.bpm;
    markDirty();
  });
  return input;
}

// ---------------------------------------------------------------------------
// Dates
//
// Three forms are in play. The site sets them the way it always has —
// "08 september 2026" — and that is what goes in the data file. The editor
// shows dd.mm.yyyy, which is unambiguous at a glance. And the picker itself
// speaks ISO, because that is the only thing <input type="date"> accepts.
//
// The picker's own text is drawn by the browser in *its* locale and can't be
// restyled, so the dd.mm.yyyy reading sits beside it rather than inside it.
// ---------------------------------------------------------------------------

const MONTHS = ["january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"];

// "08 september 2026" -> "2026-09-08", or null if it isn't that shape
function dateToISO(display) {
  const m = /^\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})\s*$/i.exec(String(display || ""));
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// "2026-09-08" -> "08 september 2026", the form the site renders
function isoToDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

// "08 september 2026" -> "08.09.2026"; anything unparseable comes back as it is
function dateDotted(display) {
  const iso = dateToISO(display);
  if (!iso) return display || "";
  const [y, mo, d] = iso.split("-");
  return `${d}.${mo}.${y}`;
}

function today() {
  const now = new Date();
  return isoToDate(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  );
}

// The id is what the selection is keyed on, so typing in it would orphan the
// item being edited — the list would still show it, the form would go blank
// on the first keystroke. The pointer follows the value.
//
// The button beside it slugs the title into the id, for the common case where
// they should match; the field stays free to say something else.
function idField(item, tabKey, hint) {
  const input = text(item, "id", { onInput: (value) => { state.picked[tabKey] = value; } });
  const fromTitle = mini("↤ title", () => {
    const made = slug(item.title);
    if (!made) return toast("give it a title first", true);
    item.id = made;
    input.value = made;
    state.picked[tabKey] = made;
    markDirty();
  }, { title: "use the title, slugged the way file names are" });
  return field("id", el("div", { class: "row" }, input, el("span", { class: "shrink" }, fromTitle)), hint);
}

// A date picked from the calendar, never typed. Starts out as today's.
function dateField(post) {
  const iso = dateToISO(post.date);
  const input = el("input", { type: "date" });
  input.value = iso || "";

  const refresh = () => {
    const chip = els.list.querySelector(".item.is-active .badge");
    if (chip) chip.textContent = dateDotted(post.date);
  };

  const set = (value) => {
    post.date = value;
    input.value = dateToISO(value) || "";
    markDirty();
    refresh();
  };

  input.addEventListener("input", () => {
    if (!input.value) return; // the field cleared itself; leave the date alone
    set(isoToDate(input.value));
  });
  refresh();

  return el("div", { class: "field" },
    el("label", { text: "date" }),
    el("div", { class: "row" }, input, el("span", { class: "shrink" }, mini("today", () => set(today())))),
    // kept: a warning that a value is about to be replaced is not the same
    // thing as a caption explaining how a field works
    post.date && !iso
      ? el("p", { class: "hint danger", text: `“${post.date}” isn't a date the calendar can show — picking one replaces it` })
      : null);
}

// Typing must not re-render, but a list still showing the old name while you
// retitle something reads as a bug. The label alone is updated in place.
function titleField(item, label = "title", also) {
  const input = text(item, "title", {
    onInput: (value) => {
      const active = els.list.querySelector(".item.is-active .name");
      if (active) active.textContent = value || item.id || "(untitled)";
      if (also) also(value);
    },
  });
  input.classList.add("display"); // the face the site sets titles in
  return field(label, input);
}

function mini(label, onClick, { danger = false, title = "" } = {}) {
  return el("button", {
    class: "mini" + (danger ? " danger" : ""),
    type: "button",
    title,
    text: label,
    onclick: onClick,
  });
}

// --- links -----------------------------------------------------------------

function linksEditor(owner, { max = Infinity, label = "links" } = {}) {
  owner.links = owner.links || [];
  const box = el("fieldset", {}, el("legend", { text: label }));
  owner.links.forEach((link, i) => {
    box.append(
      el("div", { class: "row", style: "margin-bottom:8px" },
        text(link, "label", { placeholder: "label" }),
        text(link, "href", { placeholder: "https://…  or  #all-music/…" }),
        el("span", { class: "shrink" },
          mini("↑", () => move(owner.links, i, -1) && (markDirty(), renderForm())),
          mini("↓", () => move(owner.links, i, 1) && (markDirty(), renderForm())),
          mini("✕", () => { owner.links.splice(i, 1); markDirty(); renderForm(); }, { danger: true }))),
    );
  });
  if (owner.links.length < max) {
    box.append(el("button", {
      class: "add", type: "button", text: "+ link",
      onclick: () => { owner.links.push({ label: "", href: "" }); markDirty(); renderForm(); },
    }));
  }
  if (owner.links.length >= max) {
  }
  return box;
}

// --- artwork ---------------------------------------------------------------

function artEditor(owner, key, nameFor) {
  const src = owner[key];
  // the admin serves the repo, and the site sits at its root, so the site's
  // own relative path is the served path once the leading dot is dropped
  const shown = src ? src.replace(/^\.\//, "/") : null;

  const file = el("input", { type: "file", accept: "image/*", style: "display:none" });
  file.addEventListener("change", async () => {
    const chosen = file.files[0];
    if (!chosen) return;
    try {
      const ext = (chosen.name.split(".").pop() || "webp").toLowerCase();
      const name = slug(nameFor() || "artwork");
      const out = await api.send(
        `/api/upload/image?name=${encodeURIComponent(name)}&ext=${encodeURIComponent(ext)}`,
        "POST", chosen, chosen.type || "application/octet-stream");
      owner[key] = out.src;
      markDirty();
      renderForm();
      toast(`artwork saved as ${out.src}`);
    } catch (error) {
      toast(error.message, true);
    }
    file.value = "";
  });

  return field("artwork",
    el("div", { class: "art" },
      shown ? el("img", { src: shown, alt: "" }) : el("div", { class: "none", text: "none" }),
      el("div", {},
        el("div", { class: "row" },
          mini("upload…", () => file.click()),
          src ? mini("clear", () => { owner[key] = null; markDirty(); renderForm(); }, { danger: true }) : null),
        el("p", { class: "hint", text: src || "—" }),
        file)));
}

// ---------------------------------------------------------------------------
// Tab: feed
// ---------------------------------------------------------------------------

const feedTab = {
  items: () => state.content.FEED,
  label: (post) => post.title || "(untitled)",
  badge: (post) => dateDotted(post.date),
  create() {
    const taken = state.content.FEED.map((p) => p.id);
    return {
      id: uniqueId(`post-${state.content.FEED.length + 1}`, taken),
      title: `post #${state.content.FEED.length + 1}`,
      date: today(),
      body: "",
      image: null,
      links: [],
    };
  },
  form(post) {
    return [
      el("div", { class: "row" }, titleField(post), dateField(post)),
      idField(post, "feed"),
      field("body", area(post, "body", { rows: 8 })),
      artEditor(post, "image", () => post.id),
      linksEditor(post, { max: 2 }),
    ];
  },
};

// ---------------------------------------------------------------------------
// Tab: projects
// ---------------------------------------------------------------------------

const projectsTab = {
  items: () => state.content.PROJECTS,
  label: (p) => p.title || "(untitled)",
  badge: () => "",
  create() {
    const taken = state.content.PROJECTS.map((p) => p.id);
    return { id: uniqueId("new-project", taken), title: "new project", image: null, mask: 1, paragraphs: [], links: [] };
  },
  form(project) {
    const mask = el("select", {});
    for (let i = 1; i <= 6; i++) {
      mask.append(el("option", { value: i, selected: Number(project.mask) === i, text: `outline ${i}` }));
    }
    mask.addEventListener("change", () => { project.mask = Number(mask.value); markDirty(); });

    return [
      titleField(project),
      el("div", { class: "row" },
        idField(project, "projects"),
        field("outline", mask)),
      artEditor(project, "image", () => project.id),
      field("write-up", paragraphs(project, "paragraphs")),
      linksEditor(project),
    ];
  },
};

// ---------------------------------------------------------------------------
// Tab: all music
// ---------------------------------------------------------------------------

function colorsEditor(project) {
  const box = el("fieldset", {}, el("legend", { text: "palette" }));
  const has = Boolean(project.colors);

  box.append(el("div", { class: "row", style: "margin-bottom:12px" },
    el("span", { class: "shrink" },
      has
        ? mini("remove palette", () => { delete project.colors; markDirty(); renderForm(); }, { danger: true })
        : mini("+ give it a palette", () => {
            project.colors = { accent: "#b18050", bg: "#242228" };
            markDirty();
            renderForm();
          }))));

  if (!has) {
    return box;
  }

  const swatch = (owner, key) => {
    const hex = el("input", { type: "color", value: owner[key] || "#000000" });
    const raw = el("input", { type: "text", value: owner[key] || "" });
    const set = (v) => { owner[key] = v; hex.value = v; raw.value = v; markDirty(); };
    hex.addEventListener("input", () => set(hex.value));
    raw.addEventListener("input", () => {
      const v = raw.value.trim();
      owner[key] = v;
      if (/^#[0-9a-f]{6}$/i.test(v)) hex.value = v;
      markDirty();
    });
    return el("span", { class: "swatch" }, hex, raw);
  };

  box.append(
    el("div", { class: "row" },
      field("accent", swatch(project.colors, "accent")),
      field("background", swatch(project.colors, "bg"))),
  );

  const dots = project.colors.dots || [];
  const dotBox = el("div", { class: "field" },
    el("label", { text: "circle colours" }),
    el("div", { class: "swatches" },
      dots.map((_, i) => el("span", { class: "swatch" },
        swatch(project.colors.dots, i),
        mini("✕", () => { project.colors.dots.splice(i, 1); if (!project.colors.dots.length) delete project.colors.dots; markDirty(); renderForm(); }, { danger: true }))),
      dots.length < 5
        ? mini("+ colour", () => {
            project.colors.dots = project.colors.dots || [];
            project.colors.dots.push(project.colors.accent || "#b18050");
            markDirty();
            renderForm();
          })
        : null),
    );
  box.append(dotBox);
  return box;
}

function tracksEditor(project, category) {
  category.tracks = category.tracks || [];
  const box = el("div", { class: "tracks" }); // numbers the cards inside it

  category.tracks.forEach((track, i) => {
    const row = el("div", { class: "track" + (track.src ? "" : " is-missing") },
      text(track, "title", { placeholder: "title" }),
      text(track, "detail", { placeholder: "detail (optional)" }),
      el("span", { class: "dim", text: fmtTime(track.duration) }),
      el("span", {},
        mini("↑", () => move(category.tracks, i, -1) && (markDirty(), renderForm())),
        mini("↓", () => move(category.tracks, i, 1) && (markDirty(), renderForm())),
        mini("✕", () => { category.tracks.splice(i, 1); markDirty(); renderForm(); }, { danger: true })),
      el("span", { class: "src", text: track.src || "— no file —" }),
      el("span", { class: "meta" },
        listField(track, "genres", "genres"),
        listField(track, "vibes", "vibes"),
        bpmField(track),
        pickField(track)));
    box.append(row);
  });

  const file = el("input", { type: "file", accept: "audio/*", multiple: true, style: "display:none" });
  file.addEventListener("change", async () => {
    const chosen = [...file.files].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    file.value = "";
    if (!chosen.length) return;
    let added = 0;
    for (const item of chosen) {
      try {
        const title = item.name.replace(/\.[^.]+$/, "").replace(/^\d+\s*[-.]\s*/, "").trim();
        const duration = await readDuration(item);
        const out = await api.send(
          `/api/upload/audio?project=${encodeURIComponent(project.id)}` +
            `&name=${encodeURIComponent(slug(title))}&duration=${duration}`,
          "POST", item, item.type || "application/octet-stream");
        category.tracks.push({ title, detail: "", src: out.src, duration: out.duration });
        added++;
      } catch (error) {
        toast(`${item.name}: ${error.message}`, true);
        break;
      }
    }
    if (added) {
      markDirty();
      renderForm();
      toast(`${added} track${added > 1 ? "s" : ""} uploaded — save to publish`);
    }
  });

  box.append(el("div", { class: "row", style: "margin-top:10px" },
    el("span", { class: "shrink" },
      mini("+ upload mp3…", () => file.click(), { title: "several at once is fine — they go in file-name order" }),
      mini("+ empty row", () => {
        category.tracks.push({ title: "new track", detail: "", src: null, duration: 0 });
        markDirty();
        renderForm();
      })),
    file));
  return box;
}

function categoriesEditor(project) {
  project.categories = project.categories || [];
  const box = el("div", {});

  project.categories.forEach((category, i) => {
    // a category either lists tracks or carries a blurb with a link; which
    // one it is is simply whether `content` is filled in
    const isBlurb = Boolean(category.content);

    const heading = el("span", { class: "title", text: category.title || category.id || "(category)" });
    const sub = el("div", { class: "sub" },
      el("div", { class: "sub-head" }, heading,
        mini("↑", () => move(project.categories, i, -1) && (markDirty(), renderForm())),
        mini("↓", () => move(project.categories, i, 1) && (markDirty(), renderForm())),
        mini("✕", () => { project.categories.splice(i, 1); markDirty(); renderForm(); }, { danger: true })),
      el("div", { class: "row" },
        field("shown as", text(category, "title", { onInput: (v) => (heading.textContent = v || category.id) })),
        field("id", text(category, "id"))));

    if (isBlurb) {
      sub.append(
        field("blurb", area(category.content, "text", { rows: 3 })),
        el("div", { class: "row" },
          field("link text", text(category.content, "linkText")),
          field("link", text(category.content, "linkHref"))),
        el("div", { class: "field" }, mini("turn into a track list", () => {
          delete category.content;
          category.tracks = [];
          markDirty();
          renderForm();
        })));
    } else {
      sub.append(tracksEditor(project, category));
      if (!category.tracks.length) {
        sub.append(el("div", { class: "field" },
          mini("turn into a note + link", () => {
            category.content = { text: "", linkText: "-> take a listen here", linkHref: "" };
            category.tracks = [];
            markDirty();
            renderForm();
          })));
      }
    }
    box.append(sub);
  });

  box.append(el("button", {
    class: "add", type: "button", text: "+ category",
    onclick: () => {
      project.categories.push({ id: uniqueId("tracks", project.categories.map((c) => c.id)), title: "tracks", tracks: [], content: null });
      markDirty();
      renderForm();
    },
  }));
  return box;
}

const musicTab = {
  groups: () => [
    { key: "SOUNDTRACKS", label: "soundtracks" },
    { key: "SIDE_PROJECTS", label: "side projects" },
  ],
  find(id) {
    for (const g of musicTab.groups()) {
      const list = state.content[g.key];
      const item = list.find((p) => p.id === id);
      if (item) return { item, list };
    }
    return {};
  },
  create(key) {
    const taken = [...state.content.SOUNDTRACKS, ...state.content.SIDE_PROJECTS].map((p) => p.id);
    return {
      id: uniqueId("new-project", taken),
      title: "new project",
      tags: "",
      image: null,
      categories: [{ id: "tracks", title: "tracks", tracks: [], content: null }],
    };
  },
  form(project) {
    // The player's second line falls back to "<title> ost" when this is
    // blank, so the placeholder is that actual string rather than a
    // description of it — greyed out, and following the title as it is typed.
    const album = text(project, "album", { placeholder: albumDefault(project.title) });

    // `note` is only written when it exists — an empty one would end up in
    // the data file as dead weight
    const noteBox = project.note
      ? el("fieldset", {}, el("legend", { text: "credit after the title" }),
          el("div", { class: "row" },
            field("text", text(project.note, "text")),
            field("link (optional)", text(project.note, "href")),
            el("span", { class: "shrink" }, mini("remove", () => { delete project.note; markDirty(); renderForm(); }, { danger: true }))),
          )
      : el("div", { class: "field" }, mini("+ credit after the title", () => {
          project.note = { text: "", href: "" };
          markDirty();
          renderForm();
        }));

    return [
      titleField(project, "title", (value) => (album.placeholder = albumDefault(value))),
      el("div", { class: "row" },
        idField(project, "music"),
        field("album (for the player's second line)", album)),
      field("tags", text(project, "tags")),
      el("div", { class: "field" }, check(project, "wip", "mark as (wip)")),
      noteBox,
      artEditor(project, "image", () => project.id),
      colorsEditor(project),
      el("h3", { class: "legend", text: "categories" }),
      categoriesEditor(project),
    ];
  },
};

// ---------------------------------------------------------------------------
// Duration, read in the browser before the file goes up
// ---------------------------------------------------------------------------

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value) => { URL.revokeObjectURL(url); resolve(value); };
    audio.addEventListener("loadedmetadata", () => done(Number.isFinite(audio.duration) ? audio.duration : 0));
    audio.addEventListener("error", () => done(0));
    audio.src = url;
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function itemButton(label, badge, active, onPick, actions) {
  return el("button", { class: "item" + (active ? " is-active" : ""), type: "button", onclick: onPick },
    el("span", { class: "name", text: label }),
    badge ? el("span", { class: "badge", text: badge }) : null,
    el("span", { class: "item-actions" }, actions));
}

function renderList() {
  els.list.textContent = "";
  const stop = (fn) => (event) => { event.stopPropagation(); fn(); };

  if (state.tab === "music") {
    for (const group of musicTab.groups()) {
      const list = state.content[group.key];
      els.list.append(el("p", { class: "group-label", text: group.label }));
      list.forEach((project, i) => {
        els.list.append(itemButton(
          project.title || project.id,
          "",
          state.picked.music === project.id,
          () => { state.picked.music = project.id; render(); },
          [
            mini("↑", stop(() => move(list, i, -1) && (markDirty(), render()))),
            mini("↓", stop(() => move(list, i, 1) && (markDirty(), render()))),
            mini("✕", stop(() => removeItem(list, i, project.title)), { danger: true }),
          ]));
      });
      els.list.append(el("button", {
        class: "add", type: "button", text: `+ ${group.label.replace(/s$/, "")}`,
        onclick: () => {
          const made = musicTab.create(group.key);
          list.push(made);
          state.picked.music = made.id;
          markDirty();
          render();
        },
      }));
    }
    return;
  }

  const tab = state.tab === "feed" ? feedTab : projectsTab;
  const list = tab.items();
  list.forEach((item, i) => {
    els.list.append(itemButton(
      tab.label(item), tab.badge(item), state.picked[state.tab] === item.id,
      () => { state.picked[state.tab] = item.id; render(); },
      [
        mini("↑", stop(() => move(list, i, -1) && (markDirty(), render()))),
        mini("↓", stop(() => move(list, i, 1) && (markDirty(), render()))),
        mini("✕", stop(() => removeItem(list, i, tab.label(item))), { danger: true }),
      ]));
  });
  els.list.append(el("button", {
    class: "add", type: "button", text: state.tab === "feed" ? "+ post" : "+ project",
    onclick: () => {
      const made = tab.create();
      list.unshift(made);
      state.picked[state.tab] = made.id;
      markDirty();
      render();
    },
  }));
}

function removeItem(list, index, label) {
  if (!confirm(`delete “${label}”?\n\nnothing is written until you save, so this can still be undone by reloading.`)) return;
  list.splice(index, 1);
  markDirty();
  render();
}

function renderForm() {
  els.form.textContent = "";
  let item = null;
  let tab = null;

  if (state.tab === "music") {
    item = musicTab.find(state.picked.music).item;
    tab = musicTab;
  } else {
    tab = state.tab === "feed" ? feedTab : projectsTab;
    item = tab.items().find((x) => x.id === state.picked[state.tab]);
  }

  if (!item) {
    els.form.append(el("p", { class: "empty", text: "pick something on the left, or start a new one" }));
    return;
  }
  for (const node of tab.form(item)) els.form.append(node);
}

function render() {
  renderList();
  renderForm();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

els.tabs.addEventListener("click", (event) => {
  const button = event.target.closest(".tab");
  if (!button) return;
  state.tab = button.dataset.tab;
  for (const t of els.tabs.children) t.classList.toggle("is-active", t === button);
  render();
});

// Everything that differs from what was loaded, described in a line each.
function pendingChanges() {
  const out = [];
  for (const c of COLLECTIONS) {
    const now = state.content[c.key];
    const was = state.pristine[c.key];
    if (JSON.stringify(now) === JSON.stringify(was)) continue;
    const delta = now.length - was.length;
    const count = delta === 0
      ? "edited"
      : `${delta > 0 ? "+" : ""}${delta} ${c.unit}${Math.abs(delta) > 1 ? "s" : ""}`;
    out.push({ ...c, count });
  }
  return out;
}

els.save.addEventListener("click", async () => {
  const changes = pendingChanges();
  if (!changes.length) {
    markClean("nothing to save");
    return toast("nothing had changed");
  }

  // This rewrites the site's only copy of its content, so it asks first and
  // says exactly what it is about to touch.
  const files = [...new Set(changes.map((c) => c.file))];
  const lines = changes.map((c) => `   ${c.label} — ${c.count}`).join("\n");
  const ok = confirm(
    `save these changes?\n\n${lines}\n\n` +
      `writes ${files.join(", ")}\n` +
      `the previous version is kept in admin/.backups/\n\n` +
      `nothing goes live until you commit and push.`,
  );
  if (!ok) return;

  els.save.disabled = true;
  els.status.textContent = "saving…";
  try {
    const body = JSON.stringify({
      versions: state.versions,
      content: {
        FEED: state.content.FEED,
        PROJECTS: state.content.PROJECTS,
        CONTACTS: state.content.CONTACTS,
        SOUNDTRACKS: state.content.SOUNDTRACKS,
        SIDE_PROJECTS: state.content.SIDE_PROJECTS,
      },
    });
    const out = await api.send("/api/content", "PUT", body);
    state.content = out.content;
    state.versions = out.versions;
    state.pristine = JSON.parse(JSON.stringify(out.content));
    markClean(out.written.length ? `saved ${out.written.length} file${out.written.length > 1 ? "s" : ""}` : "nothing to save");
    render();
    toast(out.written.length ? `wrote ${out.written.join(", ")}` : "nothing had changed");
  } catch (error) {
    els.save.disabled = false;
    els.status.textContent = "save failed";
    if (error.status === 409) {
      // somebody — another tab, or this one left open through an edit made
      // elsewhere — has moved the file on. Overwriting blind is exactly what
      // the check exists to stop, so the only way forward is to reload.
      els.status.textContent = "out of date";
      if (confirm(`${error.message}\n\nReload now?`)) location.reload();
      return;
    }
    toast(error.message, true);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

(async function boot() {
  try {
    const loaded = await api.get("/api/content");
    state.content = loaded.content;
    state.versions = loaded.versions;
    state.pristine = JSON.parse(JSON.stringify(state.content));
    state.picked.feed = state.content.FEED[0]?.id ?? null;
    state.picked.projects = state.content.PROJECTS[0]?.id ?? null;
    state.picked.music = state.content.SOUNDTRACKS[0]?.id ?? null;
    markClean("loaded");
    render();
  } catch (error) {
    els.form.append(el("p", { class: "empty", text: `could not load content: ${error.message}` }));
  }
})();
