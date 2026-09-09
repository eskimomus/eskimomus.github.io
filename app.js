// ============================================================================
// Page shell: the design's scale factor, the projects list, the list/field
// view switch, and the now-playing block. The circles themselves live in
// field.js — this file only tells it where things are and what to show.
// ============================================================================

const PAGE_DESIGN_WIDTH = 1920;

// The widest the page is ever drawn. Past it the scale stops and `.page`
// (192rem, already margin: 0 auto) sits centred with background to either
// side. Set below the narrowest desktop window anyone actually uses, so the
// margins are there on every desktop rather than only on the wide ones —
// 1200 is the usual floor for that, and it leaves 40px a side at 1280, 120
// at 1440, 360 at 1920. The pre-paint script in index.html applies the same
// cap and has to be changed with it.
const PAGE_MAX_WIDTH = 1200;

// Everything is then drawn at this fraction of the size the width alone
// would give — one knob for "the whole page, a bit smaller", independent of
// where the cap sits. index.html's pre-paint script carries the same number.
//
// It only applies to screens that are wider than they are tall. A portrait
// one has no width to spare in the first place: shrinking it there would
// just waste the little it has, so those keep the full scale.
const PAGE_ZOOM = 0.7;

function pageZoom() {
  const root = document.documentElement;
  return root.clientHeight > root.clientWidth ? 1 : PAGE_ZOOM;
}

// The old site did this too: the layout is built by script, so a scroll
// position restored from the last visit lands somewhere that doesn't exist yet.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// One number drives the whole layout: every size in styles.css is expressed
// in design pixels and multiplied by this, so the page looks identical at
// any width instead of reflowing. clientWidth (not innerWidth) so a visible
// scrollbar doesn't push the design wider than the space it actually has.
// A rescale changes the computed size of everything at once. Anything with a
// size transition (the logo) would animate its way there, so transitions are
// muted for the frame the new scale lands on. The very first scale is set by
// an inline script in the document head, before the first paint.
function applyPageScale() {
  const root = document.documentElement;
  const scale = (Math.min(root.clientWidth, PAGE_MAX_WIDTH) / PAGE_DESIGN_WIDTH) * pageZoom();
  if (root.style.getPropertyValue("--scale") === String(scale)) return;

  root.classList.add("is-rescaling");
  root.style.setProperty("--scale", String(scale));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("is-rescaling"));
  });
}

// What --scale actually holds. Everything that converts measured pixels back
// into design pixels reads it rather than recomputing from clientWidth: past
// the cap those two stop agreeing.
function pageScale() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
}

applyPageScale();

// The halo of gold dots around each artwork, straight off the Figma frame:
// a 3x3 lattice on the same 98px step the canvas field uses, center cell
// left empty for the artwork itself. Offsets and radii are design pixels.
const HALO_DOTS = [
  { dx: -98, dy: -98, r: 12.02 },
  { dx: 0, dy: -98, r: 29.7 },
  { dx: 98, dy: -98, r: 25.99 },
  { dx: -98, dy: 0, r: 29.7 },
  { dx: 98, dy: 0, r: 29.7 },
  { dx: -98, dy: 98, r: 25.99 },
  { dx: 0, dy: 98, r: 29.7 },
  { dx: 98, dy: 98, r: 13.27 },
];

// Each halo is its own 3x3 grid with the artwork in the middle cell, which
// is the shape the field's wave variants are sampled against. Declared here
// because buildHalo() below needs them while the list is being built.
const HALO_LATTICE_STEP = 98; // design px between dots, matching HALO_DOTS
const HALO_GRID = {
  rows: 3,
  cols: 3,
  centerRow: 1,
  centerCol: 1,
  maxDist: Math.hypot(1, 1),
  maxChebyshev: 1,
};

const BLOB_COUNT = 6; // ./assets/circle-blob.svg + circle-blob-2..6.svg

// A shape is addressed by the stylesheet token that holds it, never by file
// path — buildMasks() below swaps the tokens for high-resolution bitmaps.
function blobToken(n) {
  return `--blob-${Math.max(1, Math.min(BLOB_COUNT, n))}`;
}

function blobUrl(n) {
  return `var(${blobToken(n)})`;
}

// The board's drop shadow on the artwork circles, as a layer of its own that
// sits behind the artwork wearing the same outline. See --art-shadow-* in the
// stylesheet for why it isn't a drop-shadow() filter on a wrapper.
function artShadowLayer(token) {
  const shadow = document.createElement("span");
  shadow.className = "art-shadow";
  shadow.setAttribute("aria-hidden", "true");
  shadow.style.maskImage = `var(${token})`;
  shadow.style.webkitMaskImage = `var(${token})`;
  return shadow;
}

// --------------------------------------------------------------------------
// Masks
// --------------------------------------------------------------------------

// Every one of these shapes owes its ragged edge to Figma's
// feTurbulence/feDisplacementMap filter, and Chrome runs that filter at
// whatever size the mask is painted. At the sizes on this page that leaves
// the edge quantised to a handful of alpha levels — measured on a 89px
// circle: 3 distinct levels along the edge, i.e. a staircase, and on the
// 14px-tall progress bar the wobble disappears into a plain rectangle.
//
// So we do here what the canvas layer already does with the same art:
// rasterise each shape once at a large size and hand the browser a bitmap to
// downscale (same circle, supersampled: 65 levels). Target widths are ~2-3x
// the largest the shape is ever painted at, in device pixels.
const MASK_SOURCES = [
  ["--blob-1", "./assets/circle-blob.svg", 512],
  ["--blob-2", "./assets/circle-blob-2.svg", 512],
  ["--blob-3", "./assets/circle-blob-3.svg", 512],
  ["--blob-4", "./assets/circle-blob-4.svg", 512],
  ["--blob-5", "./assets/circle-blob-5.svg", 512],
  ["--blob-6", "./assets/circle-blob-6.svg", 512],
  ["--mask-bar", "./assets/track-bar.svg", 4803], // 3x its 1601 design width
  ["--mask-play", "./assets/icon-play.svg", 198], // 3x, as the canvas does
  ["--mask-stop", "./assets/icon-pause.svg", 201],
  ["--mask-thumb", "./assets/player-slider.svg", 105],
  ["--mask-view-list", "./assets/view-list.svg", 150],
  ["--mask-view-field", "./assets/view-field.svg", 645],
  ["--mask-view-smile", "./assets/view-smile.svg", 213], // 3x its 71 box
];

// the rasterised bitmaps, kept by token — bakeArtwork below needs the pixels,
// not just the URL
const maskBitmaps = {};

// The SVG is re-sized *inside the file* before it's drawn, rather than being
// scaled up by drawImage. WebKit rasterises an SVG image at its own intrinsic
// size and then stretches that bitmap, so asking it for a 512px draw of a
// 66px file returned a 66px render blown up 8x — a staircase, and every mask
// and every baked artwork inherited it. (Blink re-renders the vector at the
// destination size, which is why this only showed up in Safari.) field.js has
// always done it this way for the canvas art; this is the same trick.
async function rasterMask(url, targetWidth) {
  const text = await fetch(url).then((response) => response.text());
  const width = parseFloat(text.match(/width="([\d.]+)"/)[1]);
  const height = parseFloat(text.match(/height="([\d.]+)"/)[1]);
  const factor = targetWidth / width;
  const w = Math.round(width * factor);
  const h = Math.round(height * factor);
  const sized = text
    .replace(`width="${width}"`, `width="${w}"`)
    .replace(`height="${height}"`, `height="${h}"`);

  const img = new Image();
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(sized)));
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas;
}

// What each step managed, so a browser that refuses one of them can be told
// apart from a bug. diag.html reads this.
const maskReport = { rasterised: 0, exported: 0, failed: [], baked: 0, bakeFailed: [] };

async function buildMasks() {
  const results = await Promise.all(
    MASK_SOURCES.map(([, url, width]) =>
      rasterMask(url, width).catch((error) => {
        maskReport.failed.push(`raster ${url}: ${error && error.name}`);
        return null;
      }),
    ),
  );
  MASK_SOURCES.forEach(([token], i) => {
    if (!results[i]) return;
    maskReport.rasterised++;
    maskBitmaps[token] = results[i];
    // Exporting is its own risk: drawing an SVG into a canvas is enough for
    // some browsers to treat it as tainted, and then this throws. One failing
    // shape mustn't take the rest of the upgrade — or the artwork baking —
    // down with it, which is what a bare loop here did.
    try {
      document.documentElement.style.setProperty(
        token,
        `url("${results[i].toDataURL("image/png")}")`,
      );
      maskReport.exported++;
    } catch (error) {
      maskReport.failed.push(`export ${token}: ${error && error.name}`);
    }
  });
  bakeArtworks();
}

window.maskReport = maskReport;

// --------------------------------------------------------------------------
// Artwork
// --------------------------------------------------------------------------

// The artwork circles start out as a square image plus a CSS mask, which is
// what the first paint can do synchronously. Once the mask bitmaps exist the
// outline is baked into the image itself and the mask is dropped: a plain
// <img> carrying its own alpha is the one thing every browser resamples
// properly. Safari's mask compositing is what made these edges staircase.
const BAKED_ART_SIZE = 400; // 2x the artwork's 190 design px, so retina has pixels to use

// Figma inner shadow on the preview circles: X 0, Y 0, blur 13.5, spread 0,
// #000000 at 50%. Figma states a blur radius of 2 sigma, the same convention
// as CSS drop-shadow(), so the Gaussian itself is half of it.
const ART_INNER_SHADOW = { blur: 13.5 / 2, alpha: 0.5, color: "#000000" };

// Paints that shadow into `ctx`, which already holds the artwork clipped to
// `mask`. An inset box-shadow can't do this job: it is cast from the
// element's border box, so under a blob mask you get a rectangle's shadow
// with the blob stamped out of it rather than the blob's own. The shape's
// shadow is the blurred *complement* of the shape clipped back to it — three
// composite steps rather than a filter, which is why it happens here, in the
// same bake that applies the mask.
//
// `blur` is in this canvas's pixels: the caller scales the design figure by
// however much the artwork was baked at. The work is done on a padded canvas
// because blurring at the frame's edge samples the transparency beyond it,
// which would thin the shadow exactly where the blob runs out to meet it.
function drawInnerShadow(ctx, mask, size, blur) {
  const pad = Math.ceil(blur * 3);
  const full = size + pad * 2;

  const cut = document.createElement("canvas");
  cut.width = full;
  cut.height = full;
  const cutCtx = cut.getContext("2d");
  cutCtx.fillStyle = ART_INNER_SHADOW.color;
  cutCtx.fillRect(0, 0, full, full);
  cutCtx.globalCompositeOperation = "destination-out";
  cutCtx.drawImage(mask, pad, pad, size, size);

  const shade = document.createElement("canvas");
  shade.width = full;
  shade.height = full;
  const shadeCtx = shade.getContext("2d");
  shadeCtx.filter = `blur(${blur}px)`;
  shadeCtx.drawImage(cut, 0, 0);
  shadeCtx.filter = "none";
  shadeCtx.globalCompositeOperation = "destination-in";
  shadeCtx.drawImage(mask, pad, pad, size, size);

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = ART_INNER_SHADOW.alpha;
  ctx.drawImage(shade, -pad, -pad);
  ctx.globalAlpha = 1;
}
const bakedArt = new Map(); // src + mask token -> object URL, so 15 rows share the work

async function bakeArtwork(img) {
  const token = img.dataset.maskToken;
  const mask = maskBitmaps[token];
  if (!mask || !img.getAttribute("src")) return;

  // the blur is a fixed number of *design* pixels, so how many baked pixels
  // that is depends on how large the circle is drawn — part of the key,
  // since two circles of different sizes can share an image
  const drawn = Number(img.dataset.maskSize) || 190;
  const key = `${img.getAttribute("src")}|${token}|${drawn}`;
  if (!bakedArt.has(key)) {
    bakedArt.set(
      key,
      (async () => {
        const source = new Image();
        source.src = img.getAttribute("src");
        await source.decode();
        const size = BAKED_ART_SIZE;
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const c = off.getContext("2d");
        // object-fit: cover, then the outline as an alpha mask
        const cover = Math.max(size / source.naturalWidth, size / source.naturalHeight);
        const dw = source.naturalWidth * cover;
        const dh = source.naturalHeight * cover;
        c.drawImage(source, (size - dw) / 2, (size - dh) / 2, dw, dh);
        c.globalCompositeOperation = "destination-in";
        c.drawImage(mask, 0, 0, size, size);
        drawInnerShadow(c, mask, size, ART_INNER_SHADOW.blur * (size / drawn));
        const blob = await new Promise((resolve) => off.toBlob(resolve, "image/png"));
        // an object URL rather than a data URL: no base64 to carry around
        return blob ? URL.createObjectURL(blob) : null;
      })(),
    );
  }

  const url = await bakedArt.get(key);
  if (!url) return;
  img.src = url;
  img.style.maskImage = "";
  img.style.webkitMaskImage = "";
  maskReport.baked++;
}

function bakeArtworks() {
  for (const img of document.querySelectorAll("img[data-mask-token]")) {
    bakeArtwork(img).catch((error) => {
      // the CSS mask stays in place, so the artwork still has its outline
      maskReport.bakeFailed.push(`${img.getAttribute("alt")}: ${error && error.name}`);
    });
  }
}

buildMasks();

// --------------------------------------------------------------------------
// Palette
// --------------------------------------------------------------------------

// One call recolours the page. The tokens are registered <color> properties
// (see the @property block in styles.css), so setting them on :root
// interpolates rather than jumping, and everything that reads them through
// var() — text, rings, the masked buttons, the logo's traced paths — comes
// along. The canvas layer isn't styled by CSS, so it samples the same two
// tokens every other frame and re-tints its bitmaps from their masks.
//
//   setPalette({ bg: "#101014", gold: "#d4a05a", cream: "#fffaf2" })
//   setPalette({ gold: "#7f9f6a" }, { duration: 0 })   // instant
//
// Pass any subset; anything left out keeps its current value.
//
// `dots` is the exception to that: a list of up to five colours for the
// circles and the track bars, each of which was dealt one of the five when
// it was built (see tintOf). Leave it out and all five slots take the
// accent, which is what every single-colour project wants — so a palette
// only mentions it when it actually wants the circles to differ.
// --muted is deliberately not among these: it is derived from the accent in
// the stylesheet (see --muted-chroma), so writing it here would freeze it at
// one palette's value and break every other one.
const PALETTE_KEYS = ["bg", "gold", "cream"];
const READABLE_KEYS = [...PALETTE_KEYS, "muted"];
const DOT_SLOTS = 5;

function getPalette() {
  const style = getComputedStyle(document.documentElement);
  const palette = Object.fromEntries(
    READABLE_KEYS.map((key) => [key, style.getPropertyValue(`--${key}`).trim()]),
  );
  palette.dots = Array.from({ length: DOT_SLOTS }, (_, i) =>
    style.getPropertyValue(`--dot-${i + 1}`).trim(),
  );
  return palette;
}

let repaintTimer = null;

function setPalette(next, { duration } = {}) {
  const root = document.documentElement;
  if (duration !== undefined) root.style.setProperty("--palette-fade", `${duration}ms`);
  for (const key of PALETTE_KEYS) {
    if (next && next[key]) root.style.setProperty(`--${key}`, next[key]);
  }

  // The dot slots are always written as a set: a palette with one accent
  // fills all five with it, so nothing is left holding the previous
  // project's colours, and everything that reads a slot comes out looking
  // exactly as it did before any of this existed.
  const dots = (next && next.dots) || [];
  const fallback = (next && next.gold) || getPalette().gold;
  for (let i = 0; i < DOT_SLOTS; i++) {
    root.style.setProperty(`--dot-${i + 1}`, dots.length ? dots[i % dots.length] : fallback);
  }

  // hold the elements' own colour transitions for the length of the fade, so
  // the page recolours as one rather than trailing the tokens
  root.classList.add("is-repainting");
  clearTimeout(repaintTimer);
  repaintTimer = setTimeout(
    () => root.classList.remove("is-repainting"),
    cssMs("--palette-fade", 600) + 60,
  );

  return getPalette();
}

window.setPalette = setPalette;
window.getPalette = getPalette;

// Deals the next dot slot. Shuffled in bags of five rather than picked at
// random each time, for the same reason the wave variants are: independent
// picks clump, and a run of one colour beside a gap in another reads as a
// mistake rather than as scatter. Every element keeps the number it's dealt
// for the life of the page — a palette change recolours the slots underneath
// it, so nothing ever reshuffles on screen.
const tintBag = [];

function nextTint() {
  if (!tintBag.length) {
    for (let i = 1; i <= DOT_SLOTS; i++) tintBag.push(i);
    for (let i = tintBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tintBag[i], tintBag[j]] = [tintBag[j], tintBag[i]];
    }
  }
  return tintBag.shift();
}

function tint(el) {
  el.dataset.tint = String(nextTint());
  return el;
}

// The menu is four buttons at the top of the page and they're read together,
// so they're dealt from a shuffle of their own instead of the running bag —
// four links, four different colours, every time.
// Only the open one wears its colour — the rest stay cream — so what this
// buys is that whichever section you open next comes up a different colour
// from the one you just left.
function tintDistinct(elements) {
  const slots = Array.from({ length: DOT_SLOTS }, (_, i) => i + 1);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  elements.forEach((el, i) => {
    el.dataset.tint = String(slots[i % slots.length]);
  });
}

const projectsList = document.getElementById("projectsList");
const projectsField = document.getElementById("projectsField");
const viewListBtn = document.getElementById("viewListBtn");
const viewFieldBtn = document.getElementById("viewFieldBtn");

// --------------------------------------------------------------------------
// List view
// --------------------------------------------------------------------------

// Every halo dot and every halo box on the page: the loop below pulses the
// dots with the field's wave and retreats them from the cursor, and needs
// each halo's centre to know where its dots actually are.
const haloDots = [];
const haloBoxes = [];

// The genre and vibe rings. Declared up here with the other halo state
// because the loop below runs before the all-music section is built — and
// the player announces its state to renderPlayState during boot, which is
// earlier still.
const tagRings = [];
let visibleTagPanel = null; // whichever half of the tag view is on screen
let activeTagRing = null; // the one whose selection is sounding
let tagQueueRing = null; // and the one whose queue is loaded, playing or not

function shuffleValues(values) {
  const a = values.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The board's eight dots, randomised per project. The lattice itself doesn't
// move — the genre tags and the submenu are aligned against those rows, and
// the wave is sampled on that 3x3 grid — but which slot gets which radius,
// and which of the six outlines it's stamped from, is drawn fresh for every
// halo. Same set of sizes as Figma, ~840 distinct arrangements of them.
function buildHalo() {
  const halo = document.createElement("span");
  halo.className = "halo";
  halo.setAttribute("aria-hidden", "true");

  const radii = shuffleValues(HALO_DOTS.map((dot) => dot.r));
  const masks = shuffleValues([1, 2, 3, 4, 5, 6]);
  const box = { el: halo, rect: null, live: true };
  haloBoxes.push(box);

  let topRadius = 0;
  let bottomRadius = 0;

  HALO_DOTS.forEach((dot, i) => {
    const r = radii[i];
    if (dot.dy < 0) topRadius = Math.max(topRadius, r);
    if (dot.dy > 0) bottomRadius = Math.max(bottomRadius, r);

    const el = tint(document.createElement("span"));
    el.className = "halo-dot";
    el.style.setProperty("--dx", String(dot.dx / 10));
    el.style.setProperty("--dy", String(dot.dy / 10));
    el.style.setProperty("--r", String(r / 10));
    el.style.setProperty("--blob", blobUrl(masks[i % masks.length]));
    halo.appendChild(el);

    haloDots.push({
      el,
      box,
      dx: dot.dx,
      dy: dot.dy,
      r, // resting radius, so the pulse can be re-expressed through --r

      // cell on this halo's own 3x3 grid, which is what the wave is sampled at
      row: dot.dy / HALO_LATTICE_STEP + 1,
      col: dot.dx / HALO_LATTICE_STEP + 1,
      scale: 1,
      ox: 0,
      oy: 0,
    });
  });

  // what the captions align to, now that the rows differ per project
  halo.dataset.topRadius = String(topRadius);
  halo.dataset.bottomRadius = String(bottomRadius);
  return halo;
}

function buildRow(project, projectIndex) {
  const row = document.createElement("article");
  row.className = "row";
  row.dataset.project = project.id;

  const head = document.createElement("button");
  head.className = "row-head";
  head.type = "button";
  head.setAttribute("aria-expanded", "false");

  const art = document.createElement("span");
  art.className = "row-art";
  art.appendChild(buildHalo());

  const artToken = blobToken(project.mask);
  const img = document.createElement("img");
  img.src = project.image;
  img.alt = project.title;
  img.dataset.maskToken = artToken;
  img.dataset.maskSize = "190"; // design px, for the inner shadow
  img.style.maskImage = `var(${artToken})`;
  img.style.webkitMaskImage = `var(${artToken})`;
  art.append(artShadowLayer(artToken), img);

  const title = document.createElement("span");
  title.className = "row-title";
  title.textContent = project.title;

  head.append(art, title);

  const body = document.createElement("div");
  body.className = "row-body";
  body.hidden = true;

  const text = document.createElement("div");
  text.className = "row-text";
  for (const paragraph of project.paragraphs) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    text.appendChild(p);
  }

  const links = document.createElement("div");
  links.className = "row-links";
  for (const link of project.links) {
    const a = document.createElement("a");
    a.textContent = link.label;
    // An anchor with an empty href points at the page itself, so untorra's
    // two — neither has a destination yet — reloaded the site when clicked.
    // Left without one it still styles as a link but does nothing.
    if (link.href) {
      a.href = link.href;
      if (link.href.startsWith("http")) {
        a.target = "_blank";
        a.rel = "noreferrer";
      }
    } else {
      a.setAttribute("aria-disabled", "true");
    }
    links.appendChild(a);
  }

  body.append(text, links);
  row.append(head, body);

  head.addEventListener("click", () => toggleRow(project.id));

  return row;
}

// --------------------------------------------------------------------------
// Scrolling
// --------------------------------------------------------------------------

// Ported from the old site's scroll behaviour, which had two rules:
//
//   1. Opening an accordion brings its header to the top of the screen
//      (scrollToSoundtrackHeader: the toggle's top less a small margin,
//      eased over ~950ms).
//   2. When the page is about to get shorter than the current scroll allows
//      — switching from a long section to a short one — it eases the scroll
//      up to where the new page ends *first*, and only then swaps the
//      content (setStageMinHeight's smoothScroll clamp). Otherwise the
//      browser clamps the scroll itself, in one jump.
//
// Both run on --accordion here, so a scroll and the height change it belongs
// to are one movement rather than two.
const SCROLL_HEADER_OFFSET = 100; // design px left above the row you opened

let scrollFrame = null;

function stopSmoothScroll() {
  if (scrollFrame === null) return;
  cancelAnimationFrame(scrollFrame);
  scrollFrame = null;
}

// The page's own height changes while this runs (an accordion is opening, a
// panel is being swapped), so the limit is recomputed every frame rather
// than clamped once at the start.
function smoothScrollTo(target, duration) {
  stopSmoothScroll();
  const from = window.scrollY;
  const ms = duration === undefined ? cssMs("--accordion", 900) : duration;
  // Compared against the raw target, not the target clamped to the page's
  // current height: sitting at the bottom of the page with a project open,
  // that clamp made the target equal the current position and the scroll
  // decided it had nowhere to go — even though the page was about to grow by
  // the height of the project being opened.
  if (Math.abs(target - from) < 1) return;


  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / ms, 1);
    // easeInOutCubic, the curve the old site scrolled on: it holds back at
    // both ends and passes through the middle at 3x the average rate, where
    // sine's 1.57x read as nearly linear
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    // Eased toward the target itself, not toward the target clamped to the
    // page's *current* height: while an accordion is still opening the page
    // is shorter than it will be, and clamping per frame left the scroll
    // stranded wherever the page happened to end at that moment. The browser
    // clamps what it can't honour, and follows as the page grows.
    window.scrollTo(0, Math.max(0, from + (target - from) * eased));
    scrollFrame = t < 1 ? requestAnimationFrame(tick) : null;
  };
  scrollFrame = requestAnimationFrame(tick);
}

// a deliberate scroll of the user's own always wins
window.addEventListener("wheel", stopSmoothScroll, { passive: true });
window.addEventListener("touchmove", stopSmoothScroll, { passive: true });

// Puts a row in the middle of the screen, measured against the height it is
// on its way to rather than the one it has — both directions are animating
// while this runs. Opening passes the header plus the panel about to unfold,
// closing passes the header it is collapsing back to. Either way the page's
// own limits are left to the browser, which clamps while this eases toward
// the raw target.
function scrollRowToCentre(row, targetHeight) {
  if (!row) return;
  const rect = row.getBoundingClientRect();
  const height = targetHeight === undefined ? rect.height : targetHeight;
  // A row taller than the screen cannot be centred without pushing its own
  // header off the top, and a heading you can't see is worse than one sitting
  // high — so those fall back to the header near the top instead.
  const top =
    height > window.innerHeight
      ? rect.top + window.scrollY - SCROLL_HEADER_OFFSET * pageScale()
      : rect.top + window.scrollY + height / 2 - window.innerHeight / 2;
  smoothScrollTo(Math.max(0, top), cssMs("--accordion", 900) + 150);
}

// What a panel would measure if it were shown — read off-flow, so nothing on
// the page moves to find out. Needed before a swap, while the incoming panel
// is still display:none and would otherwise report zero.
function panelHeight(panel) {
  if (!panel) return 0;
  if (!panel.hidden) return panel.getBoundingClientRect().height;
  const position = panel.style.position;
  const visibility = panel.style.visibility;
  panel.style.position = "absolute";
  panel.style.visibility = "hidden";
  panel.hidden = false;
  const height = panel.getBoundingClientRect().height;
  panel.hidden = true;
  panel.style.position = position;
  panel.style.visibility = visibility;
  return height;
}

// Rule 2 above: how far up the page has to travel before the swap, if at all.
function scrollClampFor(outgoing, incoming) {
  if (!outgoing || outgoing.hidden) return 0;
  const next = panelHeight(incoming);
  // A panel whose contents are all absolutely positioned measures as nothing
  // — the tag field is one, its rings being placed by --x/--y — and taking
  // that at face value read as the page being about to collapse, so switching
  // to genres scrolled straight to the top. An unmeasurable panel is left
  // alone instead: the page is not necessarily getting shorter (that one is
  // in fact taller than the list it replaces), and if it were, the browser
  // would clamp the scroll itself.
  if (next === 0 && incoming && incoming.children.length) return -1;
  const nextHeight =
    document.documentElement.scrollHeight - outgoing.getBoundingClientRect().height + next;
  const nextMax = Math.max(0, nextHeight - window.innerHeight);
  return window.scrollY > nextMax + 1 ? nextMax : -1;
}

// --------------------------------------------------------------------------
// Crossfading one panel for another
// --------------------------------------------------------------------------

// Used by all three switches on the page — the main menu's sections, the
// music sub-nav, and the list/field view. The panel on screen goes to zero
// opacity, and only once it's gone does the next one appear and fade up:
// they can't overlap, because both sit in the same document flow and showing
// the next one early would shove the page around while the old one is still
// visible.
//
// `group` keeps the switches' timers apart, so a section change mid-way
// through a sub-tab change doesn't leave the other one stuck half-faded.
const fadeTimers = {};

function fadeSwap(group, { panels, incoming, onShow }) {
  clearTimeout(fadeTimers[group]);
  const outgoing = panels.find((panel) => panel !== incoming && !panel.hidden);

  const show = () => {
    for (const panel of panels) {
      if (panel === incoming) continue;
      panel.hidden = true;
      panel.classList.remove("is-leaving", "is-entering");
    }
    if (!incoming) return;
    incoming.hidden = false;
    incoming.classList.remove("is-leaving");
    // start transparent, then let the browser resolve that before clearing
    // it — a transition needs a value to animate from, and an element just
    // taken out of display:none hasn't got one yet
    incoming.classList.add("is-entering");
    if (onShow) onShow();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.classList.remove("is-entering");
        // the fade-in still has --tab-fade to run before the dots may move
        setTimeout(() => {
          fadeBusyUntil = 0;
          invalidateHalos();
        }, cssMs("--tab-fade", 260) + 40);
      });
    });
  };

  if (!outgoing) {
    show();
    return;
  }

  // If the incoming panel is shorter than the current scroll allows, ease up
  // to where the new page ends before swapping — otherwise the browser
  // clamps the scroll itself, in one jump, the moment the swap lands.
  const clampTo = scrollClampFor(outgoing, incoming);
  const scrollMs = clampTo >= 0 ? cssMs("--accordion", 900) : 0;
  if (clampTo >= 0) smoothScrollTo(clampTo, scrollMs);

  // see stepHalo above — the dots go on moving through the fade, they just
  // stop doing it with a transform, which is what Safari's group opacity
  // cannot cope with
  const fade = cssMs("--tab-fade", 260);
  fadeBusyUntil = performance.now() + Math.max(fade, scrollMs) + fade + 80;
  freezeHalos();
  startHalo();

  outgoing.classList.add("is-leaving");
  fadeTimers[group] = setTimeout(show, Math.max(cssMs("--tab-fade", 260), scrollMs));
}

// Reads the shared timing straight off the stylesheet, so the panel keeps to
// the same clock as everything else even though it's animated in script.
function cssMs(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (!value) return fallback;
  return raw.endsWith("ms") ? value : value * 1000;
}

// The panel's own height with nothing driving it — the number an open row
// settles at once the animation hands the height back to the stylesheet.
//
// Not scrollHeight: that's an integer, and it counts overflowing content, so
// it reached past the last track's play button. Animating to it and then
// releasing made every row below jump up by the difference.
function autoHeight(el) {
  const previous = el.style.height;
  el.style.height = "auto";
  const height = el.getBoundingClientRect().height;
  el.style.height = previous;
  return height;
}

// Takes an element from one height to another and then hands the height back
// to the stylesheet, so it goes on sizing to its content afterwards. Clips
// only while it runs — the play buttons and the slider hang out of the
// track rows' boxes and mustn't be cut once it's settled.
function animateHeight(el, from, to, duration) {
  if (Math.abs(to - from) < 0.5) return null;
  for (const running of el.getAnimations()) {
    if (running.transitionProperty === undefined) running.cancel();
  }
  el.style.overflow = "hidden";
  const ms = duration === undefined ? cssMs("--accordion", 900) : duration;
  layoutBusyFor(ms);
  const anim = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: ms,
    easing:
      getComputedStyle(document.documentElement).getPropertyValue("--accordion-ease").trim() ||
      "cubic-bezier(0.37, 0, 0.63, 1)",
    // "both", not "forwards": a WAAPI animation only gets its start time on
    // the next frame, and with a forwards-only fill the element spends that
    // frame at its natural height — everything below teleported there and
    // straight back, which is what read as the move being abrupt.
    fill: "both",
  });
  anim.onfinish = () => {
    anim.cancel();
    el.style.overflow = "";
    invalidateHalos();
    relayoutField();
  };
  return anim;
}

// One clock for both accordions (the projects list and all music).
function accordionTiming() {
  return {
    duration: cssMs("--accordion", 900),
    easing:
      getComputedStyle(document.documentElement).getPropertyValue("--accordion-ease").trim() ||
      "cubic-bezier(0.37, 0, 0.63, 1)",
    fill: "both", // see animateHeight: forwards-only flashes the natural height
  };
}

// Clicking a project's name or its artwork opens its description.
//
// Driven by the Web Animations API rather than a CSS transition on `height`:
// the panel starts out `display: none` (so it's out of the layout when shut),
// and a transition on an element that was just un-hidden doesn't reliably
// start from the value you set — the height would sit still and then snap to
// its full size in one frame, which is what made the rows below jump.
// Explicit keyframes don't depend on the previous computed style at all.
function toggleRow(id, force) {
  const row = projectsList.querySelector(`[data-project="${id}"]`);
  if (!row) return;
  const head = row.querySelector(".row-head");
  const body = row.querySelector(".row-body");
  const open = force === undefined ? !row.classList.contains("is-open") : force;
  if (force !== undefined && open === row.classList.contains("is-open")) return;

  row.classList.toggle("is-open", open);
  head.setAttribute("aria-expanded", String(open));

  // A second click mid-flight: drop the animation in progress, but keep the
  // height it had reached so the new one carries on from there.
  const running = body.getAnimations().find((a) => a.transitionProperty === undefined);
  const currentHeight = body.getBoundingClientRect().height;
  if (running) running.cancel();

  if (open) body.hidden = false;
  const full = autoHeight(body);
  const from = running ? `${currentHeight}px` : open ? "0px" : `${full}px`;
  const to = open ? `${full}px` : "0px";

  const timing = accordionTiming();
  layoutBusyFor(timing.duration);
  const anim = body.animate([{ height: from }, { height: to }], timing);
  anim.onfinish = () => {
    // Hand the height back to the stylesheet: open rows then size to their
    // content again (so a rescale or a late-loading font reflows cleanly),
    // and closed ones leave the layout entirely.
    anim.cancel();
    if (!row.classList.contains("is-open")) body.hidden = true;
    relayoutField();
  };

  // Either way the row ends up centred — opened, on the header plus the
  // write-up about to unfold under it; closed, on the header alone.
  const headHeight = head.getBoundingClientRect().height;
  scrollRowToCentre(row, open ? headHeight + full : headHeight);

  // the page is changing height, so the circles need re-laying out
  relayoutField();
}

PROJECTS.forEach((project, i) => {
  projectsList.appendChild(buildRow(project, i));
});

// --------------------------------------------------------------------------
// Halo dots: the field's wave, and retreating from the cursor
// --------------------------------------------------------------------------

// The dots run the field's own travelling wave — the same variants, the same
// clock — rather than reacting to the spectrum: each halo is a 3x3 grid (its
// centre cell taken by the artwork), so the wave passes through it exactly
// like it passes through a patch of the canvas field.
// The design sizes are the dots' resting maximum: the wave only dips them
// inwards, same as in the field, so a still page is exactly the board.
const HALO_SMOOTHING = 0.22; // per-frame approach rate, keeps the motion from stepping
const HALO_REST_EPSILON = 0.002; // close enough to 1 to stop the loop
const HALO_REST_OFFSET = 0.05; // px from home that counts as settled

let haloFrame = null;
// set by fadeSwap: no dot may hold a transform until this passes
let fadeBusyUntil = 0;

// Each halo is a zero-size point at its artwork's centre, so one rect per
// halo plus each dot's own lattice offset gives every dot's home. Kept in
// document coordinates: that's the frame field.js keeps the pointer in, and
// it survives scrolling untouched.
let haloMeasureDirty = true;
let layoutBusyUntil = 0;

// While a height animation runs the halos move every frame, so they have to
// be re-measured every frame. A deadline instead of a counter: an animation
// that gets cancelled mid-flight never reports finishing, and a counter left
// standing would keep this measuring for the rest of the session.
function layoutBusyFor(ms) {
  layoutBusyUntil = Math.max(layoutBusyUntil, performance.now() + ms + 60);
}

function measureHalos() {
  haloMeasureDirty = false;
  const scale = pageScale();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  for (const box of haloBoxes) {
    box.live = box.el.offsetParent !== null;
    if (!box.live) continue;
    const rect = box.el.getBoundingClientRect();
    box.docX = rect.left + scrollX;
    box.docY = rect.top + scrollY;
  }
  for (const dot of haloDots) {
    if (!dot.box.live) continue;
    dot.homeX = dot.box.docX + dot.dx * scale;
    dot.homeY = dot.box.docY + dot.dy * scale;
  }
}

// anything that can move a halo: a rescale, a view or tab switch, a project
// opening or closing, a category swapping
function invalidateHalos() {
  haloMeasureDirty = true;
  startHalo();
}

function clearHalos() {
  for (const dot of haloDots) {
    dot.scale = 1;
    dot.ox = 0;
    dot.oy = 0;
    dot.orbitX = 0;
    dot.orbitY = 0;
    dot.el.style.transform = "";
    dot.frozen = false;
    dot.el.style.setProperty("--dx", String(dot.dx / 10));
    dot.el.style.setProperty("--dy", String(dot.dy / 10));
    dot.el.style.setProperty("--r", String(dot.r / 10));
  }
}

// A dot carrying a transform is promoted to its own layer, and Safari then
// paints it outside the ancestor's group opacity — so during a fade it stayed
// fully lit while everything around it went. Clearing the transform fixes
// that, but a ring caught mid-turn snapped back to its resting shape in plain
// view, which is worse.
//
// So the offset is moved instead of dropped: it goes into --dx/--dy, which
// place the dot through `left`/`top` rather than a transform. Nothing on
// screen moves, and there is no layer left to escape the fade.
function freezeHalos() {
  for (const dot of haloDots) {
    if (dot.frozen) continue;
    dot.frozen = true;
    const scale = pageScale() || 1;
    const dx = dot.dx + (dot.orbitX || 0) + dot.ox / scale;
    const dy = dot.dy + (dot.orbitY || 0) + dot.oy / scale;
    dot.el.style.setProperty("--dx", String(dx / 10));
    dot.el.style.setProperty("--dy", String(dy / 10));
    dot.el.style.setProperty("--r", String((dot.r * dot.scale) / 10));
    dot.el.style.transform = "";
  }
}

// Back to being placed by their own lattice offsets, with the loop free to
// transform them again.
function thawHalos() {
  for (const dot of haloDots) {
    if (!dot.frozen) continue;
    dot.frozen = false;
    dot.el.style.setProperty("--dx", String(dot.dx / 10));
    dot.el.style.setProperty("--dy", String(dot.dy / 10));
    dot.el.style.setProperty("--r", String(dot.r / 10));
  }
}

let lastHaloFrame = 0;

function stepHalo(now = performance.now()) {
  const field = window.reactiveField;
  // capped: coming back to a backgrounded tab must not teleport a ring across
  // the page in one step
  const dt = Math.min(0.05, lastHaloFrame ? (now - lastHaloFrame) / 1000 : 1 / 60);
  lastHaloFrame = now;

  // Nothing may carry a transform of its own while a panel is fading: that
  // promotes the dot to a layer, and Safari then renders it outside the
  // ancestor's group opacity — the dots stayed fully lit while everything
  // around them faded away.
  //
  // That is a rule about *transforms*, not about movement, but this used to
  // stop the loop outright — so every tag ring froze mid-drift and mid-spin
  // for the length of any fade on the page, including fades they had nothing
  // to do with. Now the frame runs as usual and only the way a dot is placed
  // changes: through --dx/--dy and --r, which move it by `left`/`top`/size
  // and promote nothing. Everything keeps moving, and there is no jump on the
  // way out because nothing was ever held back.
  const placeByProperty = performance.now() < fadeBusyUntil;
  if (!placeByProperty) thawHalos();

  // Nothing to do when none of the halos are on screen — the projects list
  // swapped for its field, and no tag rings up either. (It used to test the
  // projects list alone, which stopped every halo on the site whenever that
  // one panel was put away.)
  const rings = visibleTagRings();
  if (projectsList.hidden && !rings.length) {
    clearHalos();
    haloFrame = null;
    lastHaloFrame = 0;
    return;
  }

  const scale = pageScale();
  const drifting = stepTagRings(dt);
  stepTagSpin(dt);
  for (const ring of tagRings) {
    const s = ring.__ring;
    if (s.x === undefined) continue;
    ring.style.setProperty("--x", String(s.x / 10));
    ring.style.setProperty("--y", String(s.y / 10));
  }

  const intensity = field.audioIntensity();
  // the same influence radius, the same nudge and the same per-frame
  // approach the canvas circles use — read off field.js rather than copied
  const { influence, push, approach } = field.cursorParams();
  const pointer = field.pointer();

  // The homes are cached in document coordinates, so scrolling doesn't
  // invalidate them and this loop touches no layout at all while the page is
  // just being scrolled — the canvas layer needs that main-thread budget to
  // keep its own drawing in step with the scroll. They're re-measured when
  // the layout can actually have moved (see measureHalos).
  if (haloMeasureDirty || performance.now() < layoutBusyUntil) measureHalos();

  let moving = false;
  for (const dot of haloDots) {
    // negative boost = dipped below resting size, exactly as stepField applies it
    const boost = intensity > 0 ? field.waveBoostAt(dot, dot.grid || HALO_GRID) : 0;
    const target = Math.min(1, 1 + boost * intensity);
    dot.scale += (target - dot.scale) * HALO_SMOOTHING;
    if (Math.abs(dot.scale - 1) > HALO_REST_EPSILON) moving = true;

    // .halo is a zero-size point at the artwork's centre, so its rect plus
    // the dot's own lattice offset is the dot's home — in document
    // coordinates, to match where field.js keeps the pointer.
    let tx = 0;
    let ty = 0;
    if (dot.box.live) {
      const dx = dot.homeX - pointer.x;
      const dy = dot.homeY - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < influence && dist > 0.001) {
        const falloff = 1 - dist / influence;
        tx = (dx / dist) * push * falloff;
        ty = (dy / dist) * push * falloff;
      }
    }
    dot.ox += (tx - dot.ox) * approach;
    dot.oy += (ty - dot.oy) * approach;
    if (Math.abs(dot.ox - tx) > HALO_REST_OFFSET || Math.abs(dot.oy - ty) > HALO_REST_OFFSET) {
      moving = true;
    }
    if (Math.abs(dot.ox) > HALO_REST_OFFSET || Math.abs(dot.oy) > HALO_REST_OFFSET) moving = true;

    // translate before scale, so the retreat isn't scaled with the dot. The
    // orbit rides along with it: same units, same transform, one write.
    const px = dot.ox + (dot.orbitX || 0) * scale;
    const py = dot.oy + (dot.orbitY || 0) * scale;
    if (placeByProperty) {
      // the same placement, expressed in design units through the properties
      // the stylesheet already lays the dot out with — see .halo-dot
      dot.frozen = true;
      dot.el.style.transform = "";
      dot.el.style.setProperty("--dx", String((dot.dx + (dot.orbitX || 0) + dot.ox / scale) / 10));
      dot.el.style.setProperty("--dy", String((dot.dy + (dot.orbitY || 0) + dot.oy / scale) / 10));
      dot.el.style.setProperty("--r", String((dot.r * dot.scale) / 10));
      continue;
    }
    dot.el.style.transform =
      `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) scale(${dot.scale.toFixed(4)})`;
  }

  // Keep going while there's sound or the cursor is still displacing
  // something, and for as long afterwards as it takes the dots to settle —
  // and for as long as any ring is drifting, which is the whole time the tag
  // view is up.
  if (intensity > 0 || moving || drifting) {
    haloFrame = requestAnimationFrame(stepHalo);
  } else {
    clearHalos();
    lastHaloFrame = 0;
    haloFrame = null;
  }
}

function startHalo() {
  // A fade no longer stops the loop — it only changes how a dot is placed —
  // so there is nothing to hold off for here any more.
  if (haloFrame === null && window.reactiveField) haloFrame = requestAnimationFrame(stepHalo);
}

// the cursor moving is reason enough to run the loop, whether or not
// anything is playing
window.addEventListener("mousemove", startHalo, { passive: true });
window.addEventListener("scroll", startHalo, { passive: true });

// --------------------------------------------------------------------------
// View switch
// --------------------------------------------------------------------------

let currentView = "list";

function setView(view, then) {
  if (view === currentView) {
    if (then) then();
    return;
  }
  currentView = view;

  viewListBtn.classList.toggle("is-active", view === "list");
  viewFieldBtn.classList.toggle("is-active", view === "field");

  // The field's visible half is the canvas, not this div, so its fade has to
  // be told to start: on the way out, now (it leaves with the list's own
  // fade-out); on the way in, once the list has gone (see onShow).
  if (view === "list" && window.reactiveField) window.reactiveField.setView("list");

  fadeSwap("view", {
    panels: [projectsList, projectsField],
    incoming: view === "list" ? projectsList : projectsField,
    onShow: () => {
      if (view === "field" && window.reactiveField) window.reactiveField.setView("field");
      // coming back to the list mid-track: the pulse loop stopped itself
      // while the list was hidden, so start it again
      if (view === "list" && window.reactiveField && window.reactiveField.isPlaying()) startHalo();
      relayoutField();
      if (view === "field") scrollToField();
      if (then) then();
    },
  });
}

viewListBtn.addEventListener("click", () => setView("list"));
viewFieldBtn.addEventListener("click", () => setView("field"));

// A field reaches well below the fold, and the page ends exactly at its last
// row of circles (see .page.is-field-view), so easing down to the bottom puts
// the whole grid on screen. Two frames of grace first: the field's height is
// only settled once relayoutField's own frame has run and field.js has sized
// the mount to the lattice it needs.
function scrollToField() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (bottom > 0) smoothScrollTo(bottom);
    }),
  );
}

// --------------------------------------------------------------------------
// Talking to the canvas layer
// --------------------------------------------------------------------------

// A field ends at its own last row of circles; the lists want room under
// them. The page's bottom padding follows whichever is up.
function syncPageChrome() {
  const showingField =
    (currentSection === "projects" && currentView === "field") || currentSection === "contacts";
  document.querySelector(".page").classList.toggle("is-field-view", showingField);
}

function relayoutField() {
  haloMeasureDirty = true;
  syncPageChrome();
  if (!window.reactiveField) return;
  // let the browser settle the new layout first, otherwise the mounts are
  // measured at their old positions
  requestAnimationFrame(() => window.reactiveField.relayout());
}

function wireField() {
  if (!window.reactiveField) return;

  // the same set FIELD_SETS.projects hands over later, so boot and a swap
  // put the same circles in the grid
  window.reactiveField.setProjects(
    [...SOUNDTRACKS, ...SIDE_PROJECTS].map((p) => ({ id: p.id, title: p.title, src: p.image })),
  );
  window.reactiveField.setPlaylist(buildPlaylist());
  window.reactiveField.setView(currentView);

  // clicking a project circle in field view opens that project in the list
  window.reactiveField.onProjectOpen((id) => {
    const contact = CONTACTS.find((c) => c.id === id);
    if (contact) {
      if (contact.href) window.open(contact.href, "_blank", "noopener");
      return;
    }
    if (PROJECTS.some((p) => p.id === id)) {
      // the list has to be on screen before the row can open and be scrolled to
      setView("list", () => toggleRow(id, true));
      return;
    }
    // no write-up of its own: take it to its accordion in all music, in
    // whichever half of that tab it lives
    const side = SIDE_PROJECTS.some((p) => p.id === id);
    setSection("all-music", () => {
      setMusicTab(side ? "side-projects" : "soundtracks", () => toggleMusicRow(id, true));
    });
  });

  window.reactiveField.onTrackChange(renderNowPlaying);
  window.reactiveField.onPlayStateChange(renderPlayState);

  // The logo/cover transition runs to the same clock as the canvas's
  // progress-bar reveal, so the two read as one move rather than two.
  document.documentElement.style.setProperty(
    "--reveal",
    `${window.reactiveField.revealDurationMs()}ms`,
  );
  document.documentElement.style.setProperty(
    "--post-reveal",
    `${window.reactiveField.postRevealDurationMs()}ms`,
  );

  // The contacts icons were the one set still fetched and cut to shape on the
  // way in, so opening contacts had them appear a beat late. Warmed here
  // instead — six small SVGs, and the field they belong to is then instant.
  // CONTACTS rather than FIELD_SETS: this runs long before that one is
  // declared, and reaching for it aborted the rest of the file.
  window.reactiveField.warmFieldItems(CONTACTS);
}

// --------------------------------------------------------------------------
// Now playing
// --------------------------------------------------------------------------

// What the top player cycles through: every track in the library that has a
// file behind it. It used to be four entries typed into data.js by hand,
// which meant the player and the lists could — and did — drift apart. Built
// from the same arrays the lists are built from, they can't.
// How often a track is allowed to come up when the player is picking at
// random. It's stored per track as `pick`:
//
//   0  never — it stays in the list and plays if you press it, but the
//      shuffle passes it over and it isn't in the queue at all
//   1  the default, and what a track with nothing set is treated as
//   2  more often
//   3  more often, and it may be the one the main player opens with
//
// "More often" is three times as likely as a 1. One number, stated here.
const PICK_WEIGHT = { 0: 0, 1: 1, 2: 3, 3: 3 };
const PICK_DEFAULT = 1;
const PICK_OPENER = 3;

function pickOf(track) {
  const value = Number(track.pick);
  return Number.isFinite(value) && value >= 0 && value <= 3 ? value : PICK_DEFAULT;
}

// The player's second line. Falls back to the project's name plus "ost" —
// unless the name already ends in one, which is how "untitled ost" was coming
// out as "untitled ost ost".
function albumOf(project) {
  if (project.album) return project.album;
  return /\bost$/i.test(project.title) ? project.title : `${project.title} ost`;
}

function entryFor(project, track) {
  const pick = pickOf(track);
  return {
    track: track.title,
    album: albumOf(project),
    src: track.src,
    // carried through so the deck knows the length before it has decoded the
    // whole file — see expectedDuration
    duration: track.duration ?? null,
    art: project.image,
    project: project.id,
    bpm: track.bpm ?? null,
    pick,
    weight: PICK_WEIGHT[pick],
  };
}

// A shuffle that respects the weights: heavier tracks are more likely to come
// out near the front, and a weight of zero never comes out at all.
function weightedShuffle(entries) {
  const pool = entries.filter((entry) => entry.weight > 0);
  const out = [];
  let total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  while (pool.length) {
    let roll = Math.random() * total;
    let i = 0;
    while (i < pool.length - 1 && (roll -= pool[i].weight) > 0) i++;
    total -= pool[i].weight;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function buildPlaylist() {
  const out = [];
  for (const project of [...SOUNDTRACKS, ...SIDE_PROJECTS]) {
    for (const category of project.categories) {
      for (const track of category.tracks || []) {
        if (!track.src) continue; // a row with no file yet
        const entry = entryFor(project, track);
        if (!entry.weight) continue; // a 0 is never in the queue
        out.push(entry);
      }
    }
  }

  // The player opens on whatever is first in the queue. Anything marked 3 is
  // allowed to be that, chosen afresh each load; with none marked, the queue
  // opens where it always did.
  const openers = out.filter((entry) => entry.pick === PICK_OPENER);
  if (openers.length) {
    const opener = openers[Math.floor(Math.random() * openers.length)];
    out.splice(out.indexOf(opener), 1);
    out.unshift(opener);
  }
  return out;
}

const brand = document.getElementById("brand");
const brandLogo = document.getElementById("brandLogo");
const npArt = document.getElementById("npArt");
const npTrack = document.getElementById("npTrack");
const npAlbum = document.getElementById("npAlbum");

// how long either of the two lines may be before it is allowed a second one
const NP_ONE_LINE = 28;

// Holds the now-playing text centred on the cover's centreline whatever
// height it has grown to. .np-meta sits *on* that line, so the block has to be
// pulled back by half of itself — written as a pixel value rather than left to
// translateY(-50%), because a percentage resolves against the new height with
// no old value to move from, and the block would jump between one name and the
// next instead of rising or settling into place.
function centreNowPlaying() {
  const meta = document.querySelector(".np-meta");
  if (!meta) return;
  meta.style.setProperty("--np-shift", `${-meta.getBoundingClientRect().height / 2}px`);
}

// the height depends on where the lines break, which a rescale can change
window.addEventListener("resize", centreNowPlaying);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(centreNowPlaying);

// The logo is injected rather than used as an <img> so its paths stay in the
// document and the page's palette (--bg / --gold) can drive its colors. The
// loading screen's badge takes the same markup, so both recolour together and
// the file is fetched once.
async function mountLogo() {
  try {
    const svg = await fetch("./assets/logo.svg").then((r) => r.text());
    brandLogo.innerHTML = svg;
    const mark = document.getElementById("preloaderMark");
    if (mark) mark.innerHTML = svg;
  } catch {
    // leaving the badge empty is better than blocking the rest of the page
  }
}

// --------------------------------------------------------------------------
// Per-project palettes
// --------------------------------------------------------------------------
// Each soundtrack and side project carries its own accent/background pair in
// music-data.js. Whichever one is sounding, the page wears its colours: the
// tokens are animatable (see setPalette), so starting a track anywhere —
// the top player, a track row, either half of all music — cross-fades the
// whole page, canvas included, rather than cutting.
//
// It's *starting* a track that recolours the page, not merely cueing one —
// so the boot-time announce (which loads the first playlist entry without
// sounding it) leaves the default palette alone. Pausing keeps the colours
// of the track that's still loaded; they change again when the next one
// starts.

const DEFAULT_PALETTE = getPalette();

// id -> { accent, bg }, plus a src -> id index so a track can be traced back
// to its project even when whoever plays it didn't say which one it is.
const PROJECT_COLORS = new Map();
const TRACK_PROJECT = new Map();
const TRACK_BPM = new Map();

for (const project of [...SOUNDTRACKS, ...SIDE_PROJECTS]) {
  if (project.colors) PROJECT_COLORS.set(project.id, project.colors);
  for (const category of project.categories) {
    for (const track of category.tracks || []) {
      if (!track.src) continue;
      TRACK_PROJECT.set(track.src, project.id);
      if (track.bpm) TRACK_BPM.set(track.src, track.bpm);
    }
  }
}

function trackBpm(src) {
  return TRACK_BPM.get(src) || null;
}

function paletteForEntry(entry) {
  const id = (entry && entry.project) || (entry && TRACK_PROJECT.get(entry.src));
  const colors = id && PROJECT_COLORS.get(id);
  if (!colors) return DEFAULT_PALETTE;
  return { gold: colors.accent, bg: colors.bg, dots: colors.dots };
}

let currentPaletteKey = null;
let cuedEntry = null;
// the tempo the rings turn to, alongside the one the field's wave beats to
let currentBpm = null;

// The palette waits for the track the way the record does. A press only says
// what is *meant* to be playing; a track still on its way would otherwise
// recolour the whole page seconds before a note of it is heard. Held here and
// released by renderTrackProgress the moment the sound is genuinely running.
let pendingPalette = null;

function queueTrackPalette(entry, soundingNow) {
  if (!entry) return;
  if (soundingNow) {
    pendingPalette = null;
    applyTrackPalette(entry);
    return;
  }
  pendingPalette = entry;
}

function applyTrackPalette(entry) {
  const palette = paletteForEntry(entry);
  const key = `${palette.gold}|${palette.bg}|${(palette.dots || []).join()}`;
  if (key === currentPaletteKey) return;
  currentPaletteKey = key;
  setPalette(palette);
}

// past this either line takes a second one rather than running out under the
// player's dots — see .np-track.is-wrapped
function wrapLong(el, text) {
  el.classList.toggle("is-wrapped", text.length > NP_ONE_LINE);
}

// The title, with how much of the track has arrived after it while it is still
// arriving. The suffix counts toward the wrap: a title at the one-line limit
// plus "(loading: 45%)" would otherwise run out from under the logo and across
// the player's dots.
let npTitle = "";
let npLoadingPct = null;

function renderTrackLine() {
  npTrack.textContent = npTitle;
  if (npLoadingPct !== null) {
    const tag = document.createElement("span");
    tag.className = "np-loading";
    tag.textContent = ` (loading: ${npLoadingPct}%)`;
    npTrack.appendChild(tag);
  }
  wrapLong(npTrack, npLoadingPct === null ? npTitle : `${npTitle} (loading: ${npLoadingPct}%)`);
  centreNowPlaying();
}

// Called every frame; only touches the DOM when the whole number changes.
function renderLoadProgress(fraction) {
  const pct = fraction === null || fraction === undefined ? null : Math.round(fraction * 100);
  if (pct === npLoadingPct) return;
  npLoadingPct = pct;
  renderTrackLine();
}

function renderNowPlaying(entry) {
  if (!entry) return;
  npArt.src = entry.art;
  npTitle = entry.track;
  renderTrackLine();
  npAlbum.textContent = entry.album;
  wrapLong(npAlbum, entry.album);
  centreNowPlaying();
  cuedEntry = entry;
  // The wave locks to the new track's tempo straight away — unlike the
  // palette it has nothing to flash, and a wave already mid-flight simply
  // finishes on the new grid.
  currentBpm = entry.bpm ?? trackBpm(entry.src);
  if (window.reactiveField) window.reactiveField.setTempo(currentBpm);
  // Skipping to another track mid-playback recolours as soon as that track is
  // actually sounding; when nothing is playing this only remembers what would,
  // and the palette waits either way.
  const field = window.reactiveField;
  if (field && field.isPlaying()) queueTrackPalette(entry, field.isSounding());
}

// idle -> round badge over the spinning cover, and back
function renderPlayState(playing) {
  brand.classList.toggle("is-playing", playing);
  if (playing) queueTrackPalette(cuedEntry, window.reactiveField.isSounding());
  else pendingPalette = null; // stopped before it ever arrived
  // the ring turns for as long as its own selection is sounding, however the
  // sound was started or stopped — the tag, the top player, or the track
  // simply running out
  if (tagRings.length) markActiveTag(playing ? tagQueueRing : null);
  // on pause the loop keeps running until the dots have eased back to rest,
  // so it only needs waking up here
  if (playing) startHalo();
}

// --------------------------------------------------------------------------

window.addEventListener("resize", () => {
  applyPageScale();
  relayoutField();
});

// A resize event isn't a reliable trigger on its own — the viewport also
// changes when a scrollbar appears or disappears (which expanding a project
// does), and observing the root element catches every one of those.
if (typeof ResizeObserver !== "undefined") {
  let lastWidth = document.documentElement.clientWidth;
  new ResizeObserver(() => {
    const width = document.documentElement.clientWidth;
    if (width === lastWidth) return;
    lastWidth = width;
    applyPageScale();
    relayoutField();
  }).observe(document.documentElement);
}

mountLogo();
wireField();

// ==========================================================================
// all music
// ==========================================================================

const musicList = document.getElementById("musicList");
const musicTagField = document.getElementById("musicTagField");

// All music has two levels of switching. The toggle on the right picks how
// the tracks are grouped — every project listed out, or gathered under the
// genres and vibes they were tagged with — and the sub-nav below the menu
// picks which half of that grouping is on screen. The sub-nav is the same
// pair of buttons either way; only the words in them change, which is why
// they're addressed by slot rather than by name.
const MUSIC_VIEWS = {
  all: {
    host: musicList,
    labels: ["soundtracks", "side projects"],
    panels: {
      soundtracks: document.getElementById("musicSoundtracks"),
      "side-projects": document.getElementById("musicSideProjects"),
    },
  },
  tags: {
    host: musicTagField,
    labels: ["genres", "vibes"],
    panels: {
      genres: document.getElementById("musicGenres"),
      vibes: document.getElementById("musicVibes"),
    },
  },
};

let musicView = "all";

const musicPanels = MUSIC_VIEWS.all.panels;

function musicViewOf(name) {
  return Object.keys(MUSIC_VIEWS).find((view) => MUSIC_VIEWS[view].panels[name]);
}

function panelsOf(view) {
  return MUSIC_VIEWS[view].panels;
}

// which panel each sub-nav slot points at, in the view that's up
function slotNames(view) {
  return Object.keys(MUSIC_VIEWS[view].panels);
}
const musicTabs = [...document.querySelectorAll(".music-tab")];
const tabSections = [...document.querySelectorAll(".tab")];
const navLinks = [...document.querySelectorAll(".nav-link")];
tintDistinct(navLinks);

// The halo's dot rows are what the captions line up against — same lattice
// step and dot radius the halo itself is built from.
const CAPTION_ROW_OFFSET = HALO_LATTICE_STEP; // 98: the dot row above/below the artwork

// The bar asset (assets/track-bar.svg) is 1601x14 around a painted 1598x11
// rect inset by 1.3 — the noise filter's bleed. Progress runs along the
// painted rect, not the box, so both are needed as fractions of the box.
const BAR_ASSET_W = 1601;
const BAR_INSET = 1.3;
const BAR_PAINT_W = 1598;

// where a 0..1 playback position lands, as a fraction of the element's width
function barBoxFraction(played) {
  return (BAR_INSET + BAR_PAINT_W * played) / BAR_ASSET_W;
}

// and back, for seeking: a click at some fraction of the element's width
function barPlayedFraction(boxFraction) {
  const played = (boxFraction * BAR_ASSET_W - BAR_INSET) / BAR_PAINT_W;
  return Math.max(0, Math.min(1, played));
}

function fmtTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --------------------------------------------------------------------------
// Building a row
// --------------------------------------------------------------------------

function buildTrack(track, project) {
  const row = tint(document.createElement("div"));
  // a placeholder is a track whose file isn't in yet: it shows the shape of
  // the list, but there's nothing to play, seek or light up
  const pending = !track.src;
  row.className = "music-track" + (pending ? " is-pending" : "");
  if (!pending) row.dataset.src = track.src;

  const line = document.createElement("div");
  line.className = "music-track-line";
  const name = document.createElement("span");
  name.append(document.createTextNode(track.title + " "));
  if (track.detail) {
    const detail = document.createElement("span");
    detail.className = "music-track-detail";
    detail.textContent = `(${track.detail})`;
    name.appendChild(detail);
  }
  const time = document.createElement("span");
  time.className = "music-track-time";
  time.textContent = `00:00 / ${fmtTime(track.duration)}`;
  line.append(name, time);

  const play = document.createElement("button");
  play.className = "music-track-play";
  play.type = "button";
  play.setAttribute("aria-label", `play ${track.title}`);

  const bar = document.createElement("div");
  bar.className = "music-track-bar";
  const fill = document.createElement("div");
  fill.className = "music-track-fill";
  bar.appendChild(fill);

  const thumb = document.createElement("div");
  thumb.className = "music-track-thumb";

  row.append(line, play, bar, thumb);

  const entry = {
    track: track.title,
    album: albumOf(project),
    art: project.image || "./previews/kletka.webp",
    src: track.src,
    duration: track.duration ?? null, // so the bar is right before the file is
    project: project.id, // which palette the page wears while this is playing
    bpm: track.bpm ?? null, // and what the field's wave beats against
    weight: PICK_WEIGHT[pickOf(track)],
  };

  play.addEventListener("click", () => {
    const field = window.reactiveField;
    if (!field || pending) return;
    if (row.classList.contains("is-playing") && field.isPlaying()) field.pause();
    else field.playEntry(entry);
  });

  // dragging or clicking the bar seeks, but only for the track that's loaded
  const seekFromEvent = (event) => {
    if (pending || !row.classList.contains("is-playing")) return;
    const r = bar.getBoundingClientRect();
    window.reactiveField.seek(barPlayedFraction((event.clientX - r.left) / r.width));
  };
  bar.addEventListener("mousedown", (event) => {
    seekFromEvent(event);
    const move = (e) => seekFromEvent(e);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });

  return row;
}

function buildCategoryBody(project, category) {
  const wrap = document.createElement("div");
  wrap.className = "music-tracks";

  if (category.tracks.length) {
    for (const track of category.tracks) wrap.appendChild(buildTrack(track, project));
    return wrap;
  }

  // categories with no tracks carry a blurb and a link instead
  const note = document.createElement("p");
  note.className = "music-note";
  note.append(document.createTextNode((category.content?.text || "") + " "));
  if (category.content?.linkHref) {
    const a = document.createElement("a");
    a.href = category.content.linkHref;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = category.content.linkText || "take a listen";
    note.appendChild(a);
  }
  wrap.appendChild(note);
  return wrap;
}

// The artwork circle, masked by one of the six blob outlines — picked off the
// row's index so no two neighbours are stamped from the same shape, the same
// way the halo dots and the field circles vary.
function buildArt(project, index) {
  const art = document.createElement("span");
  art.className = "music-art";
  art.appendChild(buildHalo());
  const token = blobToken((index % BLOB_COUNT) + 1);
  art.appendChild(artShadowLayer(token));
  if (project.image) {
    const img = document.createElement("img");
    img.src = project.image;
    img.alt = project.title;
    img.dataset.maskToken = token;
    img.dataset.maskSize = "190"; // design px, for the inner shadow
    img.style.maskImage = `var(${token})`;
    img.style.webkitMaskImage = `var(${token})`;
    // Wrapped so the cover can turn while one of this project's tracks is
    // sounding, the way the logo's does. The outline goes round with it
    // either way — before the bake it's this image's own CSS mask, after it
    // it's in the pixels — so the shape turns with the picture instead of the
    // picture sliding about inside a fixed hole.
    const spin = document.createElement("span");
    spin.className = "music-art-spin";
    spin.appendChild(img);
    art.appendChild(spin);
  } else {
    // a project with no cover of its own falls back to a plain gold blob
    const fill = document.createElement("span");
    fill.className = "music-art-fill";
    fill.style.maskImage = `var(${token})`;
    fill.style.webkitMaskImage = `var(${token})`;
    art.appendChild(fill);
  }
  return art;
}

function buildMusicRow(project, index) {
  const row = document.createElement("article");
  row.className = "music-row music-row--accordion";
  row.dataset.music = project.id;

  const head = document.createElement("button");
  head.className = "music-head";
  head.type = "button";
  head.setAttribute("aria-expanded", "false");

  const art = buildArt(project, index);

  const titleRow = document.createElement("span");
  titleRow.className = "music-title-row";
  const title = document.createElement("span");
  title.className = "music-title";
  title.append(document.createTextNode(project.title));
  // what the old site marked "work in progress"
  if (project.wip) {
    const wip = document.createElement("span");
    wip.className = "music-wip";
    wip.textContent = " (wip)";
    title.appendChild(wip);
  }
  // a credit set after the title in the same muted tone, linked when the
  // project gives it somewhere to go — kylskap's nod to taburett
  if (project.note) {
    const note = document.createElement(project.note.href ? "a" : "span");
    note.className = "music-credit";
    note.textContent = ` (${project.note.text})`;
    if (project.note.href) {
      note.href = project.note.href;
      note.target = "_blank";
      note.rel = "noreferrer";
      // the row underneath opens on click; this link is its own destination
      note.addEventListener("click", (event) => event.stopPropagation());
    }
    title.appendChild(note);
  }
  titleRow.appendChild(title);

  head.append(art, titleRow);

  const tags = document.createElement("p");
  tags.className = "music-tags";
  fillTags(tags, project.tags);
  tags.hidden = !project.tags;

  const submenu = document.createElement("div");
  submenu.className = "music-submenu";

  const bodies = document.createElement("div");

  project.categories.forEach((category, i) => {
    const cat = document.createElement("button");
    cat.className = "music-cat" + (i === 0 ? " is-active" : "");
    cat.type = "button";
    cat.textContent = category.title;
    cat.dataset.cat = category.id;
    submenu.appendChild(cat);

    const body = buildCategoryBody(project, category);
    body.dataset.cat = category.id;
    body.hidden = i !== 0;
    bodies.appendChild(body);

    cat.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!body.hidden) return;
      for (const other of submenu.querySelectorAll(".music-cat")) {
        other.classList.toggle("is-active", other === cat);
      }

      // Categories are different lengths, so the swap moves everything below
      // as well. Captured before the fade starts: while the outgoing body is
      // fading it's still in the layout, so this is the height to animate
      // away from once the new one takes its place.
      const fromHeight = bodies.getBoundingClientRect().height;

      fadeSwap(`category-${project.id}`, {
        panels: [...bodies.children],
        incoming: body,
        onShow: () => {
          animateHeight(bodies, fromHeight, autoHeight(bodies));
          placeCaptions();
          relayoutField();
        },
      });
    });
  });

  // every row starts closed
  head.setAttribute("aria-expanded", "false");
  submenu.setAttribute("aria-hidden", "true");
  bodies.hidden = true;
  row.append(head, tags, submenu, bodies);

  head.addEventListener("click", () => toggleMusicRow(project.id));

  return row;
}

// --------------------------------------------------------------------------
// Tag lists
// --------------------------------------------------------------------------

// The genre list is one string, but it has to be built out of parts: when it
// runs to two lines the separator before the break is left hanging off the
// end of the first line, and only the browser knows where that break lands.
//
// Each separator carries a non-breaking space before its bullet, gluing it to
// the word it follows. That rules out the other half of the problem — a
// bullet can never start a line — so the only case left to catch is the
// trailing one, and trimStrandedSeparators hides those after layout.
function fillTags(el, text) {
  el.textContent = "";
  const parts = String(text || "")
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);
  parts.forEach((part, i) => {
    if (i) {
      const sep = document.createElement("span");
      sep.className = "tag-sep";
      sep.textContent = "\u00a0\u2022 ";
      el.appendChild(sep);
    }
    const word = document.createElement("span");
    word.className = "tag-word";
    word.textContent = part;
    el.appendChild(word);
  });
}

// Hidden rather than removed: taking a separator out of the flow would let
// the next word up onto the line it just left, moving the break and
// stranding a different bullet — round and round. Hiding leaves the line
// exactly where it is, and a blank at the end of a line takes no visible
// space anyway.
function trimStrandedSeparators(root) {
  for (const el of root.querySelectorAll(".music-tags")) {
    if (el.hidden || el.offsetParent === null) continue;
    const seps = [...el.querySelectorAll(".tag-sep")];
    for (const sep of seps) sep.classList.remove("is-stranded");
    for (const sep of seps) {
      const next = sep.nextElementSibling;
      if (!next) continue;
      // a separator whose word has moved to the next line is the last thing
      // on its own — that's the one hanging off the end
      if (next.getBoundingClientRect().top - sep.getBoundingClientRect().top > 1) {
        sep.classList.add("is-stranded");
      }
    }
  }
}

// --------------------------------------------------------------------------
// Genres and vibes
// --------------------------------------------------------------------------

// Every word the tracks were tagged with, most-used first, with how many
// tracks wear it — the ordering only decides who gets placed first, and the
// placement is shuffled after that.
function tagWords(key) {
  const counts = new Map();
  for (const project of [...SOUNDTRACKS, ...SIDE_PROJECTS]) {
    for (const category of project.categories) {
      for (const track of category.tracks || []) {
        for (const word of track[key] || []) counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word, n]) => ({ word, n }));
}

// The arrangement off the board (Figma 51:19), measured from the eleven
// clusters it places. It isn't a grid: rings come in a pair out at the sides,
// then a single one down the middle between them, then another pair — and the
// pair's width alternates, wide then narrow, so the sides breathe in and out
// down the page rather than lining up.
//
//   pair (wide)     y +0        x 292.5 / 1531.5
//   mid             y +208      x 914.5
//   pair (narrow)   y +428      x 370.5 / 1489.5
//   mid             y +721      x 914.5
//   ... and so on
const TAG_MID_X = 914.5;
const TAG_PAIR_X = [
  [292.5, 1531.5], // wide
  [370.5, 1489.5], // narrow
];
// the board's own row positions, and the rhythm they settle into once it runs
// out — pair to mid, mid to pair
const TAG_ROW_OFFSETS = [0, 208, 428, 721, 948, 1233, 1453];
const TAG_ROW_STEP = [222, 285];
const TAG_FIRST_ROW = 326; // 1675.5 on the board, and the panel starts at 1349
const TAG_JITTER = 22; // the board's own hand-nudge, no more than that
const TAG_BOTTOM_PAD = 300;

// --- drifting ------------------------------------------------------------
// Slow enough that you notice it has moved rather than watching it move.
const TAG_DRIFT_MIN = 5; // design px per second
const TAG_DRIFT_MAX = 13;
// The walls: the page's own margins on the sides, the panel's top and bottom
// above and below. Nothing is drawn there — a ring simply turns around.
const TAG_WALL_TOP = 40;

// --- spinning ------------------------------------------------------------
// Hovering sends the dots round the word. They don't snap up to speed and
// they don't stop dead: the rate eases toward its target, and it eases in
// faster than it eases out, so letting go reads as coasting.
const TAG_SPIN_RATE = 1.5; // radians per second when there's no tempo to follow
const TAG_SPIN_UP = 1.9; // 1/s — the bigger, the quicker it gathers speed
const TAG_SPIN_DOWN = 0.55; // slower, so it freewheels down
const TAG_ROUND_UP = 2.6; // how fast it stretches out to the circle
const TAG_ROUND_DOWN = 1.1; // and eases back onto its own outline
// Spinning also pulls the ring out into a circle, so the dots run a proper
// orbit rather than tracing the word-parted shape. It is the *radius* that
// is blended, never the position — a straight line from a dot's resting
// place to a point on the far side of the orbit passes through the middle,
// which is what used to gather them all into the centre first.

// How far past the word's own edge the dots beside it sit. The ring keeps
// the halo's lattice step when the word is short enough to fit inside it.
const TAG_WORD_CLEARANCE = 46;

// the band a ring has to stay inside: the nav's left edge to the vertical the
// track bars end on
const TAG_LEFT_EDGE = 139;
const TAG_RIGHT_EDGE = 1778;

function buildTagRing(word) {
  const ring = document.createElement("span");
  ring.className = "tag-ring";

  const halo = document.createElement("span");
  halo.className = "halo";
  halo.setAttribute("aria-hidden", "true");
  // live:false — these rings drift, so a cached rect would be wrong within a
  // frame. They answer to the spin and to each other instead of the cursor.
  const box = { el: halo, rect: null, live: false };
  haloBoxes.push(box);

  const radii = shuffleValues(HALO_DOTS.map((dot) => dot.r));
  const masks = shuffleValues([1, 2, 3, 4, 5, 6]);
  const sides = [];
  const dots = [];

  HALO_DOTS.forEach((dot, i) => {
    const el = tint(document.createElement("span"));
    el.className = "halo-dot";
    el.style.setProperty("--dx", String(dot.dx / 10));
    el.style.setProperty("--dy", String(dot.dy / 10));
    el.style.setProperty("--r", String(radii[i] / 10));
    el.style.setProperty("--blob", blobUrl(masks[i % masks.length]));
    halo.appendChild(el);

    const entry = {
      el,
      box,
      dx: dot.dx,
      dy: dot.dy,
      r: radii[i], // resting radius, so the pulse can be re-expressed through --r
      row: dot.dy / HALO_LATTICE_STEP + 1,
      col: dot.dx / HALO_LATTICE_STEP + 1,
      scale: 1,
      ox: 0,
      oy: 0,
      // where this dot has been carried to by the ring's own spin
      orbitX: 0,
      orbitY: 0,
    };
    haloDots.push(entry);
    dots.push({ entry, r: radii[i] });
    // the two on the word's own line are the ones it has to part
    if (dot.dy === 0) sides.push({ entry, r: radii[i], sign: Math.sign(dot.dx) });
  });

  const name = document.createElement("button");
  name.type = "button";
  name.className = "tag-name";
  name.textContent = word;

  ring.append(halo, name);
  ring.__ring = { name, sides, dots, word };
  return ring;
}

// Where row `i` sits, carrying the board's arrangement on past the rows it
// actually draws.
function tagRowY(row) {
  if (row < TAG_ROW_OFFSETS.length) return TAG_ROW_OFFSETS[row];
  let y = TAG_ROW_OFFSETS[TAG_ROW_OFFSETS.length - 1];
  for (let i = TAG_ROW_OFFSETS.length; i <= row; i++) y += TAG_ROW_STEP[i % 2];
  return y;
}

// Even rows carry a pair out at the sides, odd rows a single one in the
// middle — so three rings for every two rows.
function tagSlots(count) {
  const slots = [];
  for (let row = 0; slots.length < count; row++) {
    const y = tagRowY(row);
    if (row % 2 === 0) {
      const [left, right] = TAG_PAIR_X[(row / 2) % TAG_PAIR_X.length];
      slots.push({ x: left, y }, { x: right, y });
    } else {
      slots.push({ x: TAG_MID_X, y });
    }
  }
  return slots.slice(0, count);
}

// Every playable track carrying this word, shuffled — the queue a tag hands
// to the player when it's picked.
function tracksTagged(key, word) {
  const picked = [];
  for (const project of [...SOUNDTRACKS, ...SIDE_PROJECTS]) {
    for (const category of project.categories) {
      for (const track of category.tracks || []) {
        if (!track.src || !(track[key] || []).includes(word)) continue;
        picked.push(entryFor(project, track));
      }
    }
  }
  return weightedShuffle(picked);
}

function markActiveTag(ring) {
  activeTagRing = ring;
  for (const other of tagRings) other.classList.toggle("is-playing", other === ring);
  startHalo();
}

// A tag is a toggle. Press it and its tracks play, shuffled; press the one
// that's sounding and it stops, and the ring goes back to being one of the
// others.
function playTag(ring) {
  const field = window.reactiveField;
  if (ring === activeTagRing && field.isPlaying()) {
    field.pause();
    return;
  }
  // paused on this very tag: pick it up where it left off
  if (ring === tagQueueRing && !field.isPlaying()) {
    field.play();
    return;
  }
  const { key, word } = ring.__ring;
  const queue = tracksTagged(key, word);
  if (!queue.length) return;
  tagQueueRing = ring;
  field.playPlaylist(queue);
  // Handing over from one tag to another, the transport never changes state —
  // it was playing before the press and it is playing after — so nothing
  // announces it and renderPlayState, which is what normally moves the
  // highlight, is never called. The old ring would go on burning and turning
  // and the new one stay dark. Switching is the one case the press has to
  // mark itself; starting and stopping still come back through the transport.
  markActiveTag(ring);
}

// Genres asked for by name rather than left to the shuffle. `top` takes the
// highest slots in this order; `below` is placed on the first row under all of
// them, rather than in the next slot along — the slots run as a pair at the
// sides, one down the middle, then the next pair, so simply continuing the
// list would have put boss fight level with lo-fi instead of beneath it.
const TAG_PINNED = {
  genres: { top: ["ambient", "jazz", "acoustic", "lo-fi"], below: ["boss fight"] },
};

// Words paired with the slot each one is to occupy: the named genres first,
// then everything else shuffled into whatever is left, in slot order.
function tagPlacement(words, key) {
  const slots = tagSlots(words.length);
  const pinned = TAG_PINNED[key];
  if (!pinned) return shuffleValues(words).map((entry, i) => [entry, slots[i]]);

  const byWord = new Map(words.map((entry) => [entry.word, entry]));
  const take = (list) => list.map((word) => byWord.get(word)).filter(Boolean);
  const top = take(pinned.top);
  const below = take(pinned.below);
  const spoken = new Set([...pinned.top, ...pinned.below]);

  const placed = top.map((entry, i) => [entry, slots[i]]);
  const free = slots.slice(top.length);
  const floor = Math.max(...placed.map(([, slot]) => slot.y));
  for (const entry of below) {
    const at = free.findIndex((slot) => slot.y > floor);
    placed.push([entry, free.splice(at === -1 ? 0 : at, 1)[0]]);
  }

  const rest = shuffleValues(words.filter((entry) => !spoken.has(entry.word)));
  rest.forEach((entry, i) => placed.push([entry, free[i]]));
  return placed;
}

function buildTagPanel(panel, key) {
  panel.textContent = "";
  const order = tagPlacement(tagWords(key), key);
  const nudge = () => (Math.random() * 2 - 1) * TAG_JITTER;

  order.forEach(([entry, slot]) => {
    const ring = buildTagRing(entry.word);
    const x = slot.x + nudge();
    const y = TAG_FIRST_ROW + slot.y + nudge();
    ring.style.setProperty("--x", String(x / 10));
    ring.style.setProperty("--y", String(y / 10));
    ring.dataset.count = String(entry.n);
    // where it starts, and the direction it wanders off in
    const heading = Math.random() * Math.PI * 2;
    const speed = TAG_DRIFT_MIN + Math.random() * (TAG_DRIFT_MAX - TAG_DRIFT_MIN);
    Object.assign(ring.__ring, {
      key,
      panel,
      homeX: x,
      homeY: y,
      x,
      y,
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed,
      reach: HALO_LATTICE_STEP * 1.6, // replaced by the measured one
      spin: 0,
      rate: 0,
      round: 0,
      hovered: false,
      held: false,
    });
    const { name } = ring.__ring;
    name.addEventListener("pointerenter", () => {
      ring.__ring.hovered = true;
      startHalo();
    });
    name.addEventListener("pointerleave", () => {
      ring.__ring.hovered = false;
      startHalo();
    });
    name.addEventListener("focus", () => {
      ring.__ring.hovered = true;
      startHalo();
    });
    name.addEventListener("blur", () => {
      ring.__ring.hovered = false;
    });
    name.addEventListener("click", () => playTag(ring));

    panel.appendChild(ring);
    tagRings.push(ring);
  });

  const last = order.reduce((max, slot) => Math.max(max, slot.y), 0);
  panel.style.height = `${(TAG_FIRST_ROW + last + TAG_BOTTOM_PAD) / 10}rem`;
  panel.__bottom = TAG_FIRST_ROW + last + TAG_BOTTOM_PAD;
}

// The word parts the ring rather than lying over it: the two dots on its own
// line are pushed out to clear its ends. Only those two move — the rows above
// and below don't meet the word, so they keep the lattice they were drawn on,
// which is what the board shows.
//
// It has to happen after layout, because only the browser knows how wide a
// word came out; and it has to update the dot's own dx as well as the style,
// since that is what the wave and the cursor are measured from.
function placeTagRings() {
  if (!tagRings.length) return;
  const scale = pageScale();
  let moved = false;

  for (const ring of tagRings) {
    if (ring.offsetParent === null) continue;
    const state = ring.__ring;
    const { name, sides, dots } = state;
    const half = name.getBoundingClientRect().width / scale / 2;

    let reach = 0;
    for (const side of sides) {
      const dx = side.sign * Math.max(HALO_LATTICE_STEP, half + TAG_WORD_CLEARANCE + side.r);
      if (Math.abs(dx - side.entry.dx) > 0.5) {
        side.entry.dx = dx;
        side.entry.el.style.setProperty("--dx", String(dx / 10));
        moved = true;
      }
    }
    // how far the ring reaches from its centre — what it is walled and
    // knocked about by
    for (const dot of dots) {
      reach = Math.max(reach, Math.hypot(dot.entry.dx, dot.entry.dy) + dot.r);
    }
    state.reach = reach;

    // The path the dots run along when the ring turns: its own resting
    // outline, sampled at the eight places a dot sits and joined up between
    // them. Turning slides the dots around a shape that doesn't itself move —
    // the ring reads the same spinning or still, the word is never crossed,
    // and at a standstill every dot is exactly where it was drawn.
    state.outline = dots
      .map(({ entry }) => ({
        angle: Math.atan2(entry.dy, entry.dx),
        radius: Math.hypot(entry.dx, entry.dy),
      }))
      .sort((a, b) => a.angle - b.angle);
    // the circle it stretches out to while it turns — the outline's own
    // furthest point, so nothing has to grow past the ring's reach
    state.orbit = Math.max(...state.outline.map((point) => point.radius));

    // A long word reaches further than the cell it was dealt, so the ring is
    // slid back inside the page's own margins — only ever inward, so the
    // scatter is kept and nothing hangs off an edge.
    state.x = Math.min(Math.max(state.x, TAG_LEFT_EDGE + reach), TAG_RIGHT_EDGE - reach);

    // and written back now rather than on the loop's next frame: this runs
    // while the panel is still transparent, so the corrected position is the
    // first one ever painted. Left to the loop, the ring would appear where
    // it was dealt and hop across on the frame after.
    ring.style.setProperty("--x", String(state.x / 10));
    ring.style.setProperty("--y", String(state.y / 10));
  }
  if (moved) invalidateHalos();
}

// --------------------------------------------------------------------------
// The rings in motion
// --------------------------------------------------------------------------

// Eases a value toward a target at a rate per second, framerate-independent:
// the same journey takes the same time whether the frames are 60 or 120 a
// second, which a plain `v += (target - v) * k` does not give you. Named for
// itself rather than `approach`, which stepHalo already takes from
// cursorParams as a plain number.
function easeTo(value, target, rate, dt) {
  return target + (value - target) * Math.exp(-rate * dt);
}

function visibleTagRings() {
  if (!visibleTagPanel) return [];
  return tagRings.filter((ring) => ring.__ring.panel === visibleTagPanel);
}

// One frame of drift: everything moves, then anything overlapping is pushed
// apart, then the walls turn back whatever reached them.
function stepTagRings(dt) {
  const rings = visibleTagRings();
  if (!rings.length) return false;

  for (const ring of rings) {
    const s = ring.__ring;
    // Held only by the pointer. The ring whose selection is playing keeps
    // its own course — it goes on turning, but nothing is holding it.
    s.held = s.hovered;
    if (s.held) continue;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }

  // Rings are treated as discs of their own reach. A pair that meets is
  // separated along the line between them and each takes the other's push,
  // so they leave in opposite directions.
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const a = rings[i].__ring;
      const b = rings[j].__ring;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const min = a.reach + b.reach;
      if (dist >= min) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      // a held ring doesn't budge — the other one takes the whole push
      const overlap = min - dist;
      const aShare = a.held ? 0 : b.held ? 1 : 0.5;
      a.x -= nx * overlap * aShare;
      a.y -= ny * overlap * aShare;
      b.x += nx * overlap * (1 - aShare);
      b.y += ny * overlap * (1 - aShare);

      // only the part of the motion along the line between them is swapped,
      // so a glancing meeting stays glancing
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (closing < 0) {
        if (!a.held) {
          a.vx += nx * closing;
          a.vy += ny * closing;
        }
        if (!b.held) {
          b.vx -= nx * closing;
          b.vy -= ny * closing;
        }
      }
    }
  }

  const floor = rings[0].__ring.panel.__bottom || 3000;
  for (const ring of rings) {
    const s = ring.__ring;
    // the walls hold the ring's whole extent, not just its centre, so no dot
    // ever crosses one
    const left = TAG_LEFT_EDGE + s.reach;
    const right = TAG_RIGHT_EDGE - s.reach;
    const top = TAG_WALL_TOP + s.reach;
    const bottom = floor - s.reach;
    if (s.x < left) { s.x = left; if (!s.held) s.vx = Math.abs(s.vx); }
    if (s.x > right) { s.x = right; if (!s.held) s.vx = -Math.abs(s.vx); }
    if (s.y < top) { s.y = top; if (!s.held) s.vy = Math.abs(s.vy); }
    if (s.y > bottom) { s.y = bottom; if (!s.held) s.vy = -Math.abs(s.vy); }
  }
  return true;
}

// How far the outline reaches at some angle round the ring: the two sampled
// points either side of it, joined straight. Wrapping, so the last point
// joins back to the first.
function outlineRadius(outline, angle) {
  const turn = Math.PI * 2;
  const a = ((angle + Math.PI) % turn + turn) % turn - Math.PI;
  for (let i = 0; i < outline.length; i++) {
    const from = outline[i];
    const to = outline[(i + 1) % outline.length];
    const start = from.angle;
    let span = to.angle - start;
    if (span <= 0) span += turn;
    let along = a - start;
    if (along < 0) along += turn;
    if (along > span) continue;
    return from.radius + (to.radius - from.radius) * (along / span);
  }
  return outline[0].radius;
}

// The spin, and the stretch into a circle that goes with it.
//
// Each dot's angle is simply its resting angle plus however far the ring has
// turned; only its distance from the centre is blended, from the outline out
// to the circle. Because both ends of that blend are positive distances, a
// dot can never end up in the middle however the two are mixed — which is
// what went wrong when the two *positions* were blended instead.
// One turn of the ring, in beats of whatever is playing. Rounded to a whole
// number the same way the field's wave is, and from the same starting point:
// the hand-set speed. So a revolution lands on a beat and keeps landing on
// one, and with nothing playing — or a track with no tempo — the ring turns
// at the speed it was tuned to.
function tagSpinRate() {
  const beat = currentBpm ? 60000 / currentBpm : 0;
  if (!beat) return TAG_SPIN_RATE;
  const perTurn = (Math.PI * 2) / TAG_SPIN_RATE; // seconds a turn takes now
  const beats = Math.max(1, Math.round((perTurn * 1000) / beat));
  return (Math.PI * 2) / ((beats * beat) / 1000);
}

function stepTagSpin(dt) {
  const rate = tagSpinRate();
  for (const ring of tagRings) {
    const s = ring.__ring;
    if (!s.outline) continue;
    const wanted = s.hovered || ring === activeTagRing;
    s.rate = easeTo(s.rate, wanted ? rate : 0, wanted ? TAG_SPIN_UP : TAG_SPIN_DOWN, dt);
    s.round = easeTo(s.round, wanted ? 1 : 0, wanted ? TAG_ROUND_UP : TAG_ROUND_DOWN, dt);
    if (Math.abs(s.rate) < 0.0008) s.rate = 0;
    if (s.round < 0.0015 && !wanted) s.round = 0;
    // clockwise: y grows downward, so a rising angle turns that way
    s.spin += s.rate * dt;

    for (const { entry } of s.dots) {
      if (!s.spin && !s.round) {
        entry.orbitX = 0;
        entry.orbitY = 0;
        continue;
      }
      const angle = Math.atan2(entry.dy, entry.dx) + s.spin;
      const rest = outlineRadius(s.outline, angle);
      const radius = rest + (s.orbit - rest) * s.round;
      entry.orbitX = Math.cos(angle) * radius - entry.dx;
      entry.orbitY = Math.sin(angle) * radius - entry.dy;
    }
  }
}

// --------------------------------------------------------------------------
// Caption placement (the rule the board only approximates)
// --------------------------------------------------------------------------

// One line -> centred on the row of circles beside it. Two or more -> the
// tags align to those circles' top edge, the submenu to their bottom edge.
function placeCaptions() {
  const scale = pageScale();
  const u = (v) => v * scale;

  // where the lines break is what decides this, and that is settled by the
  // same events that bring us here — a rescale, a panel coming back
  trimStrandedSeparators(musicList);

  for (const row of musicList.querySelectorAll(".music-row")) {
    const art = row.querySelector(".music-art");
    // a row in the sub-tab that's put away measures as zero; it gets placed
    // when that panel comes back
    if (!art || row.offsetParent === null) continue;
    // rects, not offsetTop/offsetHeight: those round to whole device pixels,
    // which at a narrow viewport is half a design pixel of drift
    const rowTop = row.getBoundingClientRect().top;
    const artRect = art.getBoundingClientRect();
    const artCentre = artRect.top - rowTop + artRect.height / 2;

    // the biggest dot in the row this caption aligns to — drawn at random
    // per project, so it has to come off the halo rather than a constant
    const halo = row.querySelector(".halo");
    const place = (el, which) => {
      if (!el || el.hidden) return;
      const rowCentre = artCentre + (which === "tags" ? -u(CAPTION_ROW_OFFSET) : u(CAPTION_ROW_OFFSET));
      const dotRadius = Number(
        (which === "tags" ? halo?.dataset.topRadius : halo?.dataset.bottomRadius) || 29.7,
      );
      const h = el.getBoundingClientRect().height;
      const lines = Math.max(1, Math.round(h / u(40)));
      let top;
      if (lines <= 1) {
        top = rowCentre - h / 2;
      } else if (which === "tags") {
        top = rowCentre - u(dotRadius);
      } else {
        top = rowCentre + u(dotRadius) - h;
      }
      el.style.top = `${top}px`;
    };

    place(row.querySelector(".music-tags"), "tags");
    place(row.querySelector(".music-submenu"), "submenu");
  }
}

// --------------------------------------------------------------------------
// Expanding a row
// --------------------------------------------------------------------------

function toggleMusicRow(id, force) {
  const row = musicList.querySelector(`[data-music="${id}"]`);
  if (!row) return;
  const head = row.querySelector(".music-head");
  const submenu = row.querySelector(".music-submenu");
  const bodies = row.lastElementChild;
  const open = force === undefined ? !row.classList.contains("is-open") : force;
  if (force !== undefined && open === row.classList.contains("is-open")) return;

  row.classList.toggle("is-open", open);
  head.setAttribute("aria-expanded", String(open));
  // the submenu stays in the DOM and fades — see .music-row--accordion in the
  // stylesheet — so it can't blink in and out
  submenu.setAttribute("aria-hidden", String(!open));

  // same measured-height animation the projects list uses
  const running = bodies.getAnimations().find((a) => a.transitionProperty === undefined);
  const currentHeight = bodies.getBoundingClientRect().height;
  if (running) running.cancel();

  if (open) bodies.hidden = false;
  const full = autoHeight(bodies);
  const from = running ? `${currentHeight}px` : open ? "0px" : `${full}px`;
  const to = open ? `${full}px` : "0px";
  bodies.style.overflow = "hidden";

  const bodyTiming = accordionTiming();
  layoutBusyFor(bodyTiming.duration);
  const anim = bodies.animate([{ height: from }, { height: to }], bodyTiming);
  anim.onfinish = () => {
    anim.cancel();
    if (row.classList.contains("is-open")) {
      // Stop clipping now that the height is settled: the play button and
      // the slider are taller than the last track's box and were being cut
      // off at the bottom of the panel.
      bodies.style.overflow = "";
    } else {
      bodies.hidden = true;
    }
    placeCaptions();
    relayoutField();
  };

  const headHeight = head.getBoundingClientRect().height;
  scrollRowToCentre(row, open ? headHeight + full : headHeight);

  placeCaptions();
  relayoutField();
}


// --------------------------------------------------------------------------
// Feed
// --------------------------------------------------------------------------

// Measured off the board's render (see the stylesheet's feed section). The
// column beside a post is the first N of one fixed sequence of radii — five
// of them for a short post, seven for a long one, on the same 97.85 lattice
// everything else uses.
const FEED_LATTICE = 97.85;
const FEED_COLUMN_RADII = [5.9, 9.8, 11.1, 9.8, 5.2, 3.9, 3];
const FEED_SHORT_DOTS = 5;
const FEED_LONG_DOTS = 7;
const FEED_LONG_LINES = 3; // more than this many lines of body and it's long

// The cluster around the image circle, row by row from the board. 0 is a cell
// the circle covers. The circle is 5 cells across on the centre cell (row 3,
// col 3) — so the four cells diagonally out from it are 2.83 cells away
// (277) against the circle's 244.6 radius, which is why they show.
const FEED_CLUSTER = [
  [0, 6.5, 9.8, 12.4, 10.4, 7.2, 0],
  [6.5, 13.7, 0, 0, 0, 12.4, 5.9],
  [9.8, 0, 0, 0, 0, 0, 10.4],
  [11.7, 0, 0, 0, 0, 0, 11.7],
  [9.8, 0, 0, 0, 0, 0, 9.8],
  [5.9, 13.7, 0, 0, 0, 13, 6.5],
  [0, 5.9, 9.1, 10.4, 9.1, 5.9, 0],
];
const FEED_CLUSTER_CENTER = { row: 3, col: 3 };
// one knob for how big the cluster reads against the picture
const FEED_CLUSTER_SCALE = 1.6;

function feedGrid(rows, cols, centerRow, centerCol) {
  return {
    rows,
    cols,
    centerRow,
    centerCol,
    maxDist: Math.hypot(Math.max(centerRow, rows - 1 - centerRow), Math.max(centerCol, cols - 1 - centerCol)) || 1,
    maxChebyshev: Math.max(centerRow, rows - 1 - centerRow, centerCol, cols - 1 - centerCol) || 1,
  };
}

// One dot: placed from its lattice offset, registered so the wave and the
// cursor reach it exactly as they do the project halos.
function feedDot(parent, box, grid, dx, dy, r, index, row, col) {
  const el = tint(document.createElement("span"));
  el.className = "feed-dot";
  el.style.setProperty("--dx", String(dx / 10));
  el.style.setProperty("--dy", String(dy / 10));
  el.style.setProperty("--r", String(r / 10));
  el.style.setProperty("--blob", blobUrl((index % BLOB_COUNT) + 1));
  parent.appendChild(el);
  // r is the resting radius, so the pulse can be re-expressed through --r
  haloDots.push({ el, box, grid, dx, dy, r, row, col, scale: 1, ox: 0, oy: 0 });
}

// The column beside the post — five dots or seven, centred on the post.
function buildFeedColumn(count) {
  const column = document.createElement("span");
  column.className = "feed-dots";
  column.setAttribute("aria-hidden", "true");
  const box = { el: column, rect: null, live: true, docX: 0, docY: 0 };
  haloBoxes.push(box);
  column.__box = box;
  column.__grid = feedGrid(count, 1, (count - 1) / 2, 0);

  // Measured from the post's top edge: the first dot's top edge sits on it,
  // and the last dot's bottom edge on the post's bottom. That rectangle is
  // the post — the title starts on its top line, the last link ends on its
  // bottom one.
  const top = -feedPostHeight(count) / 2 + feedColumnRadius(0);
  for (let i = 0; i < count; i++) {
    const r = feedColumnRadius(i);
    feedDot(column, box, column.__grid, 0, top + i * FEED_LATTICE, r, i, i, 0);
  }
  return column;
}

function feedColumnRadius(i) {
  return FEED_COLUMN_RADII[i] || FEED_COLUMN_RADII[FEED_COLUMN_RADII.length - 1];
}

// the height that column takes, top edge of the first dot to bottom edge of
// the last — the rectangle the copy is set into
function feedPostHeight(count) {
  return feedColumnRadius(0) + (count - 1) * FEED_LATTICE + feedColumnRadius(count - 1);
}

// The cluster on the right is a fixed seven rows whatever the post says, and
// at 623.6 it is taller than either column — so it, not the copy, is what
// sets the rhythm. The board spaces posts on a constant pitch measured
// between those clusters: their frames sit 819 and 820 apart, which is this
// height plus two lattice cells. Its *titles* are 697 and 837 apart, so the
// even spacing was never the text's to keep. Every post is therefore this
// tall, with the column and the copy centred inside it.
function feedClusterHeight() {
  const rowMax = (row) => Math.max(...row) * FEED_CLUSTER_SCALE;
  return (
    (FEED_CLUSTER.length - 1) * FEED_LATTICE +
    rowMax(FEED_CLUSTER[0]) +
    rowMax(FEED_CLUSTER[FEED_CLUSTER.length - 1])
  );
}

// Sets the box to the pitch height and the copy to the column's, so the two
// stay centred on each other however long the post runs.
function layoutFeedPost(article, count) {
  const inner = feedPostHeight(count);
  article.style.minHeight = `${Math.max(inner, feedClusterHeight()) / 10}rem`;
  const body = article.querySelector(".feed-body");
  if (body) body.style.height = `${inner / 10}rem`;
}

// The cluster on the right, with the image slot in the middle of it.
function buildFeedArt(post) {
  const art = document.createElement("span");
  art.className = "feed-art";
  art.setAttribute("aria-hidden", "true");
  const box = { el: art, rect: null, live: true, docX: 0, docY: 0 };
  haloBoxes.push(box);
  art.__box = box;
  art.__grid = feedGrid(FEED_CLUSTER.length, FEED_CLUSTER[0].length, FEED_CLUSTER_CENTER.row, FEED_CLUSTER_CENTER.col);

  let index = 0;
  FEED_CLUSTER.forEach((cells, row) => {
    cells.forEach((r, col) => {
      if (!r) return;
      feedDot(
        art,
        box,
        art.__grid,
        (col - FEED_CLUSTER_CENTER.col) * FEED_LATTICE,
        (row - FEED_CLUSTER_CENTER.row) * FEED_LATTICE,
        r * FEED_CLUSTER_SCALE,
        index++,
        row,
        col,
      );
    });
  });

  const slot = document.createElement("span");
  slot.className = "feed-image";
  const token = blobToken((FEED.findIndex((p) => p.id === post.id) % BLOB_COUNT) + 1);
  slot.appendChild(artShadowLayer(token));
  if (post.image) {
    const img = document.createElement("img");
    img.src = post.image;
    img.alt = "";
    img.dataset.maskToken = token;
    img.dataset.maskSize = "489.25"; // design px, for the inner shadow
    img.style.maskImage = `var(${token})`;
    img.style.webkitMaskImage = `var(${token})`;
    slot.appendChild(img);
  } else {
    // nothing uploaded yet — the board's plain circle
    const empty = document.createElement("span");
    empty.className = "feed-image-empty";
    empty.style.maskImage = `var(${token})`;
    empty.style.webkitMaskImage = `var(${token})`;
    slot.appendChild(empty);
  }
  art.appendChild(slot);
  return art;
}

function buildFeedPost(post) {
  const article = document.createElement("article");
  article.className = "feed-post";
  article.dataset.post = post.id;

  const title = document.createElement("h2");
  title.className = "feed-title";
  title.textContent = post.title;

  const date = document.createElement("p");
  date.className = "feed-date";
  date.textContent = post.date;

  const text = document.createElement("p");
  text.className = "feed-text";
  text.textContent = post.body;

  const links = document.createElement("div");
  links.className = "feed-links";
  // two at most, as the board has it
  for (const link of (post.links || []).slice(0, 2)) {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (link.href && link.href.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noreferrer";
    }
    links.appendChild(a);
  }

  const middle = document.createElement("div");
  middle.className = "feed-middle";
  middle.appendChild(text);

  const body = document.createElement("div");
  body.className = "feed-body";
  body.append(title, date, middle);
  if (links.children.length) body.appendChild(links);

  // the column starts short and is rebuilt once the text has been measured
  const column = buildFeedColumn(FEED_SHORT_DOTS);
  column.dataset.count = String(FEED_SHORT_DOTS);
  article.append(column, body, buildFeedArt(post));
  layoutFeedPost(article, FEED_SHORT_DOTS);
  return article;
}

// Short or long is a question about the rendered text, not the stored string,
// so it can only be answered after layout — and again after a rescale or a
// late-arriving font changes how many lines it takes.
function measureFeed() {
  const scale = pageScale();
  for (const article of feedList.querySelectorAll(".feed-post")) {
    const text = article.querySelector(".feed-text");
    if (!text || article.offsetParent === null) continue;
    const lines = Math.max(1, Math.round(text.getBoundingClientRect().height / (51 * scale)));
    const wanted = lines > FEED_LONG_LINES ? FEED_LONG_DOTS : FEED_SHORT_DOTS;
    const column = article.querySelector(".feed-dots");
    if (column && Number(column.dataset.count) === wanted) continue;

    const replacement = buildFeedColumn(wanted);
    replacement.dataset.count = String(wanted);
    layoutFeedPost(article, wanted);
    if (column) {
      // drop the old column's dots from the animation lists
      for (let i = haloDots.length - 1; i >= 0; i--) {
        if (column.contains(haloDots[i].el)) haloDots.splice(i, 1);
      }
      const boxIndex = haloBoxes.indexOf(column.__box);
      if (boxIndex !== -1) haloBoxes.splice(boxIndex, 1);
      column.replaceWith(replacement);
    } else {
      article.prepend(replacement);
    }
  }
  invalidateHalos();
}

const feedList = document.getElementById("feed");
if (feedList) {
  for (const post of FEED) feedList.appendChild(buildFeedPost(post));
}

// --------------------------------------------------------------------------
// Tabs
// --------------------------------------------------------------------------

let currentSection = "projects";

// The field grid serves two sections: the projects and the contacts. Each
// has its own mount and its own circles; everything else about it — the
// lattice, the wave, the cursor, the placement rules — is the same.
const FIELD_SETS = {
  projects: {
    mount: "fieldMount",
    // everything in all music — soundtracks and side projects both. Only
    // three of them have a write-up in the list; clicking any of the others
    // opens its accordion over there instead.
    items: () =>
      [...SOUNDTRACKS, ...SIDE_PROJECTS].map((p) => ({
        id: p.id,
        title: p.title,
        src: p.image,
      })),
  },
  contacts: {
    mount: "contactsMount",
    items: () => CONTACTS.map((c) => ({ id: c.id, title: c.title, icon: c.icon })),
  },
};

let fieldSet = "projects";

function useFieldSet(section) {
  const set = FIELD_SETS[section];
  if (!set || !window.reactiveField) return Promise.resolve();
  if (fieldSet === section) return Promise.resolve();
  fieldSet = section;
  return window.reactiveField.setFieldItems(set.items(), set.mount);
}

function setSection(section, then) {
  if (section === currentSection) {
    if (then) then();
    return;
  }
  currentSection = section;
  for (const link of navLinks) link.classList.toggle("is-active", link.dataset.section === section);

  // The field's visible half is the canvas, so a section that hasn't got one
  // has to start it fading out now, in step with the section's own fade.
  if (!FIELD_SETS[section] && window.reactiveField) window.reactiveField.setView("list");
  // ...and swapping which circles are in it happens behind that fade
  if (FIELD_SETS[section] && section !== fieldSet && window.reactiveField) {
    window.reactiveField.setView("list");
  }

  fadeSwap("section", {
    panels: tabSections,
    incoming: tabSections.find((tab) => tab.dataset.tab === section),
    onShow: () => {
      if (section === "all-music") placeCaptions();
      if (section === "feed") measureFeed();
      if (then) then();
      if (FIELD_SETS[section] && window.reactiveField) {
        // contacts is the field and nothing else; projects keeps whichever
        // view its toggle was left on
        useFieldSet(section).then(() => {
          window.reactiveField.setView(section === "contacts" ? "field" : currentView);
          relayoutField();
          // contacts is nothing but the field, and projects only when its
          // toggle is on the field — otherwise the list stays where it is
          if (section === "contacts" || currentView === "field") scrollToField();
        });
      }
      relayoutField();
    },
  });
}

for (const link of navLinks) {
  link.addEventListener("click", () => setSection(link.dataset.section));
}

// --------------------------------------------------------------------------
// Internal links
// --------------------------------------------------------------------------

// Links in the copy point at places on this page rather than at other sites:
// "#all-music/soundtracks/fictional-story" names a section, the sub-tab
// inside it and the accordion to open. A bare hash means nothing to the
// browser here — there are no anchors with those ids, so every one of them
// was a dead click — so they are routed by hand, each step waiting on the
// fade before it for the one after.
function followInternalLink(href) {
  const [section, sub, id] = href.replace(/^#/, "").split("/").filter(Boolean);
  if (!section) return;

  if (section === "all-music") {
    setSection("all-music", () => {
      setMusicTab(sub || "soundtracks", () => {
        if (id) toggleMusicRow(id, true);
      });
    });
    return;
  }

  if (section === "projects") {
    setSection("projects", () => {
      // an accordion can only be opened in the list, never in the field
      if (id) setView("list", () => toggleRow(id, true));
    });
    return;
  }

  setSection(section);
}

document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor) return;
  const href = anchor.getAttribute("href") || "";
  if (!href.startsWith("#")) return;
  event.preventDefault();
  followInternalLink(href);
});

// --------------------------------------------------------------------------
// Sub-tabs
// --------------------------------------------------------------------------

// Puts the sub-nav's words, and what each button selects, in step with the
// view that's up.
function labelMusicTabs(view) {
  const { labels } = MUSIC_VIEWS[view];
  const names = slotNames(view);
  musicTabs.forEach((tab, i) => {
    tab.textContent = labels[i];
    tab.dataset.musicTab = names[i];
    tab.classList.toggle("is-active", !panelsOf(view)[names[i]].hidden);
  });
}

function setMusicTab(name, then) {
  const view = musicViewOf(name);
  if (!view) return;
  // a jump straight to a panel of the other grouping brings that grouping up
  // with it — this is how "open this project" works from the field
  if (view !== musicView) {
    setMusicView(view, () => setMusicTab(name, then));
    return;
  }

  const panels = panelsOf(view);
  // already up: nothing to swap, but whatever was waiting on it still runs
  if (!panels[name].hidden) {
    if (then) then();
    return;
  }
  for (const tab of musicTabs) tab.classList.toggle("is-active", tab.dataset.musicTab === name);

  if (view === "tags") visibleTagPanel = panels[name];

  fadeSwap("music", {
    panels: Object.values(panels),
    incoming: panels[name],
    onShow: () => {
      placeCaptions();
      placeTagRings();
      relayoutField();
      if (then) then();
    },
  });
}

// The toggle on the right, working exactly like the projects one: the two
// halves cross-fade, and the sub-nav relabels itself on the way.
function setMusicView(view, then) {
  if (view === musicView) {
    if (then) then();
    return;
  }
  musicView = view;
  musicViewAllBtn.classList.toggle("is-active", view === "all");
  musicViewTagsBtn.classList.toggle("is-active", view === "tags");
  // the words change with the view, so they go out and come back rather than
  // cutting — the same fade the panels underneath them use
  for (const tab of musicTabs) tab.classList.add("is-relabelling");
  setTimeout(() => {
    labelMusicTabs(view);
    for (const tab of musicTabs) tab.classList.remove("is-relabelling");
  }, cssMs("--tab-fade", 260));

  // nothing drifts while the lists are up
  visibleTagPanel =
    view === "tags" ? Object.values(MUSIC_VIEWS.tags.panels).find((p) => !p.hidden) : null;

  fadeSwap("musicView", {
    panels: [musicList, musicTagField],
    incoming: MUSIC_VIEWS[view].host,
    onShow: () => {
      placeCaptions();
      placeTagRings();
      if (window.reactiveField && window.reactiveField.isPlaying()) startHalo();
      if (then) then();
    },
  });
}

for (const tab of musicTabs) {
  tab.addEventListener("click", () => setMusicTab(tab.dataset.musicTab));
}

const musicViewAllBtn = document.getElementById("musicViewAllBtn");
const musicViewTagsBtn = document.getElementById("musicViewTagsBtn");
musicViewAllBtn.addEventListener("click", () => setMusicView("all"));
musicViewTagsBtn.addEventListener("click", () => setMusicView("tags"));

labelMusicTabs("all");
buildTagPanel(MUSIC_VIEWS.tags.panels.genres, "genres");
buildTagPanel(MUSIC_VIEWS.tags.panels.vibes, "vibes");

SOUNDTRACKS.forEach((project, i) =>
  musicPanels.soundtracks.appendChild(buildMusicRow(project, i)),
);
SIDE_PROJECTS.forEach((item, i) =>
  musicPanels["side-projects"].appendChild(buildMusicRow(item, i)),
);
placeCaptions();

// --------------------------------------------------------------------------
// Per-track playback state
// --------------------------------------------------------------------------

function renderTrackProgress(state) {
  if (!musicList) return;
  const current = state.src;
  // Whichever project owns the track that's sounding — its cover spins. This
  // one follows the record rather than the button: a wind-down is still
  // playing, and its cover has to stay on screen to be slowed down.
  const sounding = new Set();
  for (const track of musicList.querySelectorAll(".music-track")) {
    const src = new URL(track.dataset.src, location.href).href;
    const isCurrent = current === src;
    track.classList.toggle("is-playing", isCurrent && state.playing);
    if (isCurrent && state.sounding) sounding.add(track.closest(".music-row"));

    const fill = track.querySelector(".music-track-fill");
    const thumb = track.querySelector(".music-track-thumb");
    const time = track.querySelector(".music-track-time");
    if (!isCurrent) {
      if (fill.style.width !== "0px") fill.style.width = "0px";
      continue;
    }
    const fraction = state.duration ? Math.min(1, state.currentTime / state.duration) : 0;
    // measured along the bar's painted rect, so 0% sits on its rounded left
    // end and 100% on its right one rather than on the asset's noise margin
    const along = barBoxFraction(fraction);
    fill.style.width = `${along * 100}%`;
    // rects rather than offsetLeft/offsetWidth: those round to whole CSS
    // pixels, which put the thumb a pixel and a half off the bar's end
    const bar = track.querySelector(".music-track-bar");
    const barRect = bar.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    thumb.style.left = `${barRect.left - trackRect.left + barRect.width * along}px`;
    time.textContent = `${fmtTime(state.currentTime)} / ${fmtTime(state.duration || 0)}`;
  }

  for (const row of musicList.querySelectorAll(".music-row")) {
    row.classList.toggle("is-sounding", sounding.has(row));
  }

  syncPlatter(state.rate);
  renderRecordSwap(state.swapping);
  renderLoadProgress(state.loadProgress);
  if (pendingPalette && state.sounding) queueTrackPalette(pendingPalette, true);
}

// The cover comes off and goes back on with the sound. The timing is field.js's
// — it is the same lift and drop the pitch makes — and read from it rather than
// repeated here. The two halves get their own durations instead of one shared
// transition: a record is taken off briskly and set down more gently, and
// .brand-art's own 2s reveal is far too slow for either.
let recordSwapping = false;

// Asked for at the moment it is needed rather than cached at startup: this
// runs long after boot, and reaching for it during wireField put it in front
// of its own declaration.
function swapDurations() {
  const field = window.reactiveField;
  return field && field.swapDurationsMs ? field.swapDurationsMs() : { lift: 300, drop: 450 };
}

// The brisk lift and drop belong to the record change alone. Left on the
// element they became the timing for everything: after one press of prev or
// next, stopping the music snatched the cover away in 450ms instead of the
// two seconds the reveal is supposed to take, because the inline duration
// outlives the swap that set it. So it is cleared once the record is back
// down, which hands .brand-art's own --reveal back to play and pause.
let swapDurationReset = 0;

function renderRecordSwap(swapping) {
  if (!brand || swapping === recordSwapping) return;
  recordSwapping = swapping;
  const { lift, drop } = swapDurations();
  const art = brand.querySelector(".brand-art");
  clearTimeout(swapDurationReset);
  if (art) {
    art.style.transitionDuration = `${swapping ? lift : drop}ms`;
    if (!swapping) {
      swapDurationReset = setTimeout(() => {
        art.style.transitionDuration = "";
      }, drop);
    }
  }
  brand.classList.toggle("is-swapping", Boolean(swapping));
}

// The covers are the record, so they turn on the same curve the sound does:
// up to speed as it spins up, dragging as it winds down, and stopped dead
// once it has. CSS animations have no rate of their own, but the animation
// objects behind them do — and setting it re-bases the start time rather than
// jumping, so the picture never skips. Written only when the number actually
// changes; this runs every frame.
// Scoped to what is actually turning — the logo's cover, and the one row
// whose track is sounding — so this stays three elements rather than every
// cover on the page.
const SPINNING =
  ".brand-art-spin, .music-row.is-sounding .music-art-spin, .music-row.is-sounding .art-shadow";
let platterRate = null;
let platterCount = -1;

function syncPlatter(rate) {
  if (typeof rate !== "number") return;
  const spinning = document.querySelectorAll(SPINNING);
  // the count too: a cover that starts turning mid-track arrives with a rate
  // of its own and has to be brought into line even though nothing moved
  if (rate === platterRate && spinning.length === platterCount) return;
  platterRate = rate;
  platterCount = spinning.length;
  for (const el of spinning) {
    for (const animation of el.getAnimations()) animation.playbackRate = rate;
  }
}

if (window.reactiveField) window.reactiveField.onProgress(renderTrackProgress);

window.addEventListener("resize", () => {
  placeCaptions();
  measureFeed();
});

// the line count depends on the font that's actually loaded
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureFeed);
measureFeed();

// --------------------------------------------------------------------------
// Preloader
// --------------------------------------------------------------------------

// Longest the screen will wait before showing the site anyway — one stalled
// asset must not leave a visitor looking at a flat field forever. It is a
// backstop and not a schedule: the screen says the site is downloading and
// asks for patience, so cutting it short at the old six seconds was the very
// thing being complained about. Measured on a cold load of the live site, the
// canvas layer alone was still assembling a minute in, and the page had been
// uncovered forty seconds before that.
const PRELOADER_MAX_MS = 30000;

// Everything that would otherwise arrive in view, one piece after another:
// the fonts the whole page is set in, the canvas layer's own boot (the blob
// outlines, the transport icons, the player cluster, the field), the track
// the play button would start, and every image *decoded* rather than merely
// fetched — a fetched image still pops as it is decoded on first paint.
//
// The images are asked for last, in their own turn. Read alongside the rest
// they were only the images that existed at that instant, and anything the
// field's own boot went on to add was never waited for at all.
async function whenPageReady() {
  const field = window.reactiveField;
  const first = [];
  if (document.fonts && document.fonts.ready) first.push(document.fonts.ready);
  if (field && field.ready) first.push(field.ready());
  if (field && field.firstTrackReady) first.push(field.firstTrackReady());
  await Promise.all(first);
  await Promise.all(
    [...document.images].map((img) => (img.decode ? img.decode().catch(() => {}) : null)),
  );
}

// The loading screen leaves in two movements: the cover fades away, badge and
// copy with it, and the site fades up from nothing behind it.
function bootMs(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

const pagePreloader = document.getElementById("pagePreloader");
const bootRoot = document.documentElement;

function leaveLoadingScreen() {
  const fade = bootMs("--boot-fade", 500);
  const reveal = bootMs("--boot-reveal", 700);

  if (pagePreloader) pagePreloader.classList.add("is-dropping");

  setTimeout(() => {
    if (pagePreloader) pagePreloader.classList.add("is-hidden");
    // One frame, both: the transition is armed before the value it carries
    // changes, or the page simply appears.
    bootRoot.classList.add("is-revealing");
    bootRoot.classList.remove("is-booting");
    setTimeout(() => bootRoot.classList.remove("is-revealing"), reveal + 80);
  }, fade);
}

Promise.race([
  whenPageReady(),
  new Promise((resolve) => setTimeout(resolve, PRELOADER_MAX_MS)),
]).then(leaveLoadingScreen);
