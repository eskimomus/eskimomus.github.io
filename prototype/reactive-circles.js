// ============================================================================
// Reactive circles prototype
// Standalone playground for the redesign's core interaction mechanic:
//  - a strict rectangular grid of "blob" circles that gently pulse to audio
//    frequency data, all sharing one fill color
//  - project circles (with clipped thumbnails) sit on fixed grid nodes and
//    can only be tugged a limited distance from that anchor (leash drag)
//  - dragging/colliding circles push their neighbours out of the way
//  - a separate top-right "player" cluster: a strict 7x7 grid with a
//    play/pause button in the center cell, satellites retreat from the cursor
// Nothing here is wired into the real site yet — this is only meant to
// validate the feel of the mechanic before it gets built into index.html.
// ============================================================================

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

// Six slightly different outlines (the original plus five variants) so
// circles don't all read as stamped from the exact same shape.
const BLOB_SVG_URLS = [
  "../assets/circle-blob.svg",
  "../assets/circle-blob-2.svg",
  "../assets/circle-blob-3.svg",
  "../assets/circle-blob-4.svg",
  "../assets/circle-blob-5.svg",
  "../assets/circle-blob-6.svg",
];
const PLAY_ICON_URL = "../assets/icon-play.svg";
const PAUSE_ICON_URL = "../assets/icon-pause.svg";
const PREV_ICON_URL = "../assets/icon-prev.svg";
const NEXT_ICON_URL = "../assets/icon-next.svg";
const SHUFFLE_ICON_URL = "../assets/icon-shuffle.svg";
const PLAYER_TRACK_URL = "../assets/player-rectangle.svg";
const PLAYER_THUMB_URL = "../assets/player-slider.svg";
const BLOB_RASTER_SIZE = 240; // px — largest circle we'll ever draw; smaller ones downscale from this
const ICON_UPSCALE = 3; // rasterize icons a few times bigger than their native size for crispness
const PLAYER_TRACK_RASTER_SCALE = 2; // rasterization scale used for player-rectangle.svg specifically

// ---------------------------------------------------------------------------
// Palette — every visible color drawn on the canvas traces back to GOLD or
// CREAM below, so swapping the palette later only ever means editing these
// two hex values. Everything else (rasterizeSvg's fillFrom/fillTo, tintMasked)
// just remaps toward whatever these currently are.
//
// SVG_SOURCE_GOLD/CREAM are a different thing: the placeholder fill values
// already baked into the raw asset files (circle-blob*.svg, player-rectangle.svg
// use SVG_SOURCE_GOLD; the icons and player-slider.svg use SVG_SOURCE_CREAM).
// They exist purely so rasterizeSvg has something exact to find-and-replace,
// and must always match the assets themselves — not the live palette above —
// so don't repoint them at GOLD/CREAM even if the two ever happen to match.
// ---------------------------------------------------------------------------
const SVG_SOURCE_GOLD = "#B18050";
const SVG_SOURCE_CREAM = "#FFF2E5";
const MASK_OPAQUE = "#ffffff"; // alpha-mask helper fill — any fully-opaque color works identically, not a palette color

const GOLD = "#B18050"; // circles, project track background, transport icons' resting-dot color
const CREAM = "#FFF2E5"; // play/pause/prev/next/shuffle icons, slider thumb, played-progress fill

// Shared grid metrics — field and player use the exact same spacing and cap
// on circle size so the two areas read as one consistent system.
const CELL_SPACING = 70;
const CIRCLE_MAX_R = 25;

// One shared scale, applied to each player-bar asset's own native SVG
// pixels (prev/next/shuffle icons, the progress track, the thumb) — instead
// of ad-hoc per-element fractions of cellSize/CIRCLE_MAX_R, so their sizes
// stay in the same proportion to each other as they were drawn at.
// icon-prev.svg / icon-next.svg are 69x91 — used as the reference "one grid
// cell" height in the original art.
const PLAYER_ASSET_SCALE = CELL_SPACING / 91;
const PROJECT_CIRCLE_R = CIRCLE_MAX_R * 1.25 * 1.3 * 1.25; // +25% on top of the earlier +30% and +25% over ambient dots

const PROJECT_IMAGES = [
  { title: "kletka", src: "../assets/kletka.webp" },
  { title: "a completely fictional story", src: "../assets/fictional-story.webp" },
  { title: "downsouth", src: "../assets/downsouth.webp" },
];

let dpr = Math.min(window.devicePixelRatio || 1, 2);
let width = 0;
let height = 0; // actual canvas/page content height — buildField() may grow this past viewportHeight
let viewportHeight = 0; // window.innerHeight — layout math (margins, how many rows fit) uses this instead

function applyCanvasSize() {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resize() {
  width = window.innerWidth;
  viewportHeight = window.innerHeight;
  height = viewportHeight; // provisional — buildField() grows it if the field needs more room than the window
  applyCanvasSize();
}
window.addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------------------
// Asset rasterization: SVGs (with their baked-in wobble filters) are rendered
// once onto offscreen canvases and reused as bitmaps — far cheaper than
// re-running an SVG filter per circle per frame.
// ---------------------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function parseSvgSize(svgText) {
  const w = parseFloat(svgText.match(/width="([\d.]+)"/)[1]);
  const h = parseFloat(svgText.match(/height="([\d.]+)"/)[1]);
  return { w, h };
}

// Renders an SVG (optionally recoloring its fill) to an offscreen canvas at
// `scale`x its native size. The returned canvas keeps the SVG's own aspect
// ratio, so square assets (the blob) and non-square ones (the icons) both
// just work.
async function rasterizeSvg(svgText, { fillFrom = null, fillTo = null, scale = 1, targetSize = null } = {}) {
  let text = svgText;
  if (fillFrom && fillTo) {
    text = text.replaceAll(fillFrom, fillTo);
  }
  const { w, h } = parseSvgSize(text);
  // targetSize rasterizes to that size regardless of the source's own native
  // dimensions, so variants with different viewBoxes still come out equally crisp.
  const effectiveScale = targetSize ? targetSize / Math.max(w, h) : scale;
  const targetW = Math.round(w * effectiveScale);
  const targetH = Math.round(h * effectiveScale);
  text = text.replace(`width="${w}"`, `width="${targetW}"`).replace(`height="${h}"`, `height="${targetH}"`);

  const img = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(text))));
  const off = document.createElement("canvas");
  off.width = targetW;
  off.height = targetH;
  off.getContext("2d").drawImage(img, 0, 0, targetW, targetH);
  return off;
}

function coverDraw(destCtx, img, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  destCtx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// Draws `img` centered at (cx, cy), scaled to fit inside a maxW x maxH box
// while preserving its aspect ratio (like `object-fit: contain`).
function containDraw(destCtx, img, cx, cy, maxW, maxH) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.min(maxW / iw, maxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  destCtx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

async function makeProjectBlob(maskCanvas, imgSrc, size) {
  const img = await loadImage(imgSrc);
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const c = off.getContext("2d");
  coverDraw(c, img, size, size);
  c.globalCompositeOperation = "destination-in";
  c.drawImage(maskCanvas, 0, 0, size, size);
  c.globalCompositeOperation = "source-over";
  return off;
}

// ---------------------------------------------------------------------------
// Audio: a single <audio> element run through an AnalyserNode. Each circle
// samples one FFT bin (picked from a stable hash of its index) so the field
// doesn't just pulse as one uniform blob.
// ---------------------------------------------------------------------------

const audioEl = new Audio();
audioEl.loop = true;
audioEl.volume = 0.6;

let audioCtx = null;
let analyser = null;
let freqData = null;
let sourceNode = null;

function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function sampleBand(hash01, spread = 0.08) {
  if (!analyser) return 0;
  analyser.getByteFrequencyData(freqData);
  const n = freqData.length;
  const center = Math.floor(hash01 * n * 0.6); // keep away from the empty high end
  const half = Math.max(1, Math.floor(n * spread));
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, center - half); i <= Math.min(n - 1, center + half); i++) {
    sum += freqData[i];
    count++;
  }
  return count ? sum / count / 255 : 0;
}

function hash(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Circle field — strict rectangular grid, one shared color.
// ---------------------------------------------------------------------------

class Circle {
  constructor({ x, y, r, kind, blob, seed, title, leash = 0, row = 0, col = 0, rotation = 0 }) {
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.baseR = r;
    this.r = r;
    this.rVel = 0; // radius spring velocity — see springToward()
    this.kind = kind; // 'ambient' | 'project'
    this.blob = blob;
    this.rotation = rotation; // fixed per circle, so every dot's wobble reads a little differently
    this.seed = seed;
    this.title = title || null;
    this.leash = leash; // max distance a 'project' circle can be dragged from home
    this.row = row;
    this.col = col;
    this.dragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }
}

const field = {
  circles: [],
  dragCollide: true,
  cols: 0,
  rows: 0,
  cellW: CELL_SPACING,
  cellH: CELL_SPACING,
  marginX: 0,
  marginY: 0,
  centerRow: 0,
  centerCol: 0,
  maxDist: 1,
  maxChebyshev: 1,
};

// Project circles never sit in the outermost two rows or columns of the
// field, so they always read as embedded within the grid rather than
// clipped against an edge.
const PROJECT_EDGE_MARGIN = 2;

// ...nor closer than this many grid cells to each other (Euclidean, in grid
// units), so no two ever crowd together or read as a pair.
const PROJECT_MIN_GAP = 2;

// smallest ambient dot (at the far corner from the bottom-center anchor), as
// a fraction of CIRCLE_MAX_R — kept close to 1 so the gradient stays subtle
const FIELD_GRADIENT_MIN = 0.75;

const PLAYER_FIELD_GAP = 40; // px of breathing room between the player cluster and the field below it
const FIELD_SIDE_MARGIN = 0.06; // fraction of viewport width kept clear on each side
const FIELD_BOTTOM_MARGIN = 0.08; // fraction of the *viewport* height kept clear at the bottom (HUD etc.)
const MIN_FIELD_ROWS = 10; // the field is always at least this tall — the page scrolls if the viewport can't fit it

// Picks the [lo, hi] row/col range that stays `margin` cells clear of both
// edges, collapsing to the single center cell if the grid is too small to
// keep that clearance at all.
function innerRange(count, margin) {
  const lo = margin;
  const hi = count - 1 - margin;
  if (hi < lo) {
    const mid = Math.floor((count - 1) / 2);
    return [mid, mid];
  }
  return [lo, hi];
}

function shuffledArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Walks `cells` in order, taking the first one (unconditionally) and every
// later one whose distance to *all* already-taken cells is >= minGap, up to
// `count` total. Used both for the randomized gap-respecting attempts and,
// with minGap left at -Infinity, as the plain "just visit them in order"
// pass the farthest-point fallback below builds on.
function greedyPlacement(cells, count, minGap) {
  const chosen = [];
  for (const cell of cells) {
    if (chosen.length >= count) break;
    if (chosen.length === 0 || Math.min(...chosen.map((c) => Math.hypot(cell.row - c.row, cell.col - c.col))) >= minGap) {
      chosen.push(cell);
    }
  }
  return chosen;
}

// Best-effort fallback for a grid too small to fit `count` points with the
// full gap anywhere: greedily picks each next point to maximize its own
// distance to whatever's already chosen, so the result is at least the
// most spread-out arrangement that grid can offer.
function maximizeSpreadPlacement(cells, count) {
  const chosen = [cells[Math.floor(Math.random() * cells.length)]];
  while (chosen.length < count) {
    let best = null;
    let bestMinDist = -Infinity;
    for (const cell of cells) {
      if (chosen.includes(cell)) continue;
      const minDist = Math.min(...chosen.map((c) => Math.hypot(cell.row - c.row, cell.col - c.col)));
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        best = cell;
      }
    }
    chosen.push(best);
  }
  return chosen;
}

function buildField() {
  field.circles = [];

  const cellSize = CELL_SPACING;
  const marginTop = player.originY + player.rows * player.cellSize + PLAYER_FIELD_GAP;
  const availableWidth = width * (1 - FIELD_SIDE_MARGIN * 2);
  const bottomPad = viewportHeight * FIELD_BOTTOM_MARGIN;

  const cols = Math.max(3, Math.floor(availableWidth / cellSize) + 1);
  // How many rows would fit in the viewport on their own — but never fewer
  // than MIN_FIELD_ROWS. When that's more than the viewport can show, the
  // field just needs a taller page instead of shrinking or clipping (see
  // the height/applyCanvasSize() call below).
  const fitRows = Math.max(1, Math.floor((viewportHeight - marginTop - bottomPad) / cellSize) + 1);
  const rows = Math.max(MIN_FIELD_ROWS, fitRows);
  const marginX = (width - (cols - 1) * cellSize) / 2;
  const marginY = marginTop;

  height = Math.max(viewportHeight, marginY + (rows - 1) * cellSize + CIRCLE_MAX_R + bottomPad);
  applyCanvasSize();

  field.cols = cols;
  field.rows = rows;
  field.cellW = cellSize;
  field.cellH = cellSize;
  field.marginX = marginX;
  field.marginY = marginY;
  field.centerRow = (rows - 1) / 2;
  field.centerCol = (cols - 1) / 2;
  field.maxDist = Math.hypot(field.centerRow, field.centerCol) || 1;
  field.maxChebyshev = Math.max(field.centerRow, field.centerCol) || 1;

  // Static rest-size gradient: ambient dots are biggest right at the bottom
  // center of the field and taper off — gently, not all the way to 0 — the
  // further out (radially) from that point, so the grid reads as anchored
  // to the bottom rather than uniformly flat.
  const gradientAnchorRow = rows - 1;
  const gradientAnchorCol = field.centerCol;
  const gradientMaxDist = Math.hypot(gradientAnchorRow, gradientAnchorCol) || 1;

  // Random project placement, kept off the outermost two rows/cols and at
  // least PROJECT_MIN_GAP cells from every other project. A single greedy
  // pass (accept the next shuffled cell if it's far enough from what's
  // already placed) isn't reliable on its own: on a narrow grid, an unlucky
  // early pair can leave *no* cell satisfying both — e.g. rows 3 and 6 out
  // of an inner range of [2, 7] leave zero valid rows for a third point —
  // even though a valid triple (2, 4, 6) exists elsewhere in that same
  // range. So this reshuffles and retries the whole greedy pass several
  // times, and only once every attempt comes up short — the grid is
  // genuinely too small to fit everyone with the full gap — falls back to
  // greedily maximizing each point's distance to whatever's already placed.
  const [rowLo, rowHi] = innerRange(rows, PROJECT_EDGE_MARGIN);
  const [colLo, colHi] = innerRange(cols, PROJECT_EDGE_MARGIN);
  const innerCells = [];
  for (let r = rowLo; r <= rowHi; r++) {
    for (let c = colLo; c <= colHi; c++) innerCells.push({ row: r, col: c });
  }

  let projectCells = null;
  for (let attempt = 0; attempt < 40 && !projectCells; attempt++) {
    const candidate = greedyPlacement(shuffledArray(innerCells), PROJECT_IMAGES.length, PROJECT_MIN_GAP);
    if (candidate.length === PROJECT_IMAGES.length) projectCells = candidate;
  }
  if (!projectCells) {
    projectCells = maximizeSpreadPlacement(innerCells, PROJECT_IMAGES.length);
  }

  let seed = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      seed++;
      const projectIndex = projectCells.findIndex((c) => c.row === row && c.col === col);
      const x = marginX + col * cellSize;
      const y = marginY + row * cellSize;

      if (projectIndex !== -1) {
        const proj = blobs.projects[projectIndex];
        field.circles.push(
          new Circle({
            x,
            y,
            r: PROJECT_CIRCLE_R,
            kind: "project",
            blob: proj.canvas,
            seed: 1000 + projectIndex,
            title: proj.title,
            leash: PROJECT_CIRCLE_R * 1.6,
            row,
            col,
          }),
        );
        continue;
      }

      const gradientDist = Math.hypot(row - gradientAnchorRow, col - gradientAnchorCol);
      const gradientT = Math.min(1, gradientDist / gradientMaxDist);
      const ambientR = CIRCLE_MAX_R * (1 - gradientT * (1 - FIELD_GRADIENT_MIN));

      field.circles.push(
        new Circle({
          x,
          y,
          r: ambientR,
          kind: "ambient",
          blob: randomBlobVariant(),
          rotation: Math.random() * Math.PI * 2,
          seed,
          row,
          col,
        }),
      );
    }
  }
}

const AMBIENT_PADDING = 4;
const PROJECT_PADDING = 8; // wider clearance kept around project circles specifically

// Soft drag leash: 1:1 tracking up to this fraction of the leash, then
// diminishing returns beyond it (asymptotic toward — but never reaching —
// the full leash length).
const LEASH_FREE_ZONE = 0.6;

function softLeashDistance(dist, leash) {
  const freeZone = leash * LEASH_FREE_ZONE;
  if (dist <= freeZone) return dist;
  const softRange = leash - freeZone;
  const over = dist - freeZone;
  return freeZone + softRange * (1 - 1 / (1 + over / softRange));
}

function resolveCollisions() {
  const cs = field.circles;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const padding = a.kind === "project" || b.kind === "project" ? PROJECT_PADDING : AMBIENT_PADDING;
      const minDist = a.r + b.r + padding;
      if (dist < minDist) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Project circles are stationary anchors: they push ambient dots
        // out of the way but are never nudged themselves, whether idle or
        // being actively dragged (the leash already governs their motion then).
        const aFixed = a.dragging || a.kind === "project";
        const bFixed = b.dragging || b.kind === "project";
        if (aFixed && bFixed) continue;

        if (aFixed) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        } else if (bFixed) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        } else {
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
        }
      }
    }
  }
}

const HOME_STIFFNESS = 0.02;
const DAMPING = 0.82;

// Critically-damped spring for circle *sizes*. A fixed-fraction lerp
// (`r += (target - r) * k`) is fastest the instant the gap opens and only
// ever decelerates from there — an ease-out shape with no ease-in. A spring
// naturally accelerates into motion first, so size changes read as properly
// non-linear whether the target is a one-off goal or something continuously
// moving, like the wave dip or the audio pulse.
const SIZE_SPRING_STIFFNESS = 110;
const SIZE_SPRING_DAMPING = 21; // 2*sqrt(stiffness) — critically damped, no overshoot/ringing
const SIZE_SPRING_DT = 1 / 60;

function springToward(value, velocity, target) {
  const accel = (target - value) * SIZE_SPRING_STIFFNESS - velocity * SIZE_SPRING_DAMPING;
  const newVelocity = velocity + accel * SIZE_SPRING_DT;
  return { value: value + newVelocity * SIZE_SPRING_DT, velocity: newVelocity };
}

// ---------------------------------------------------------------------------
// Field wave animations — loop continuously for as long as music is playing.
// Each variant maps a circle's grid position to a 0..1 "sequence position";
// that position is scaled into a start delay, so circles dip one after
// another instead of all at once, tracing out a shape across the grid. The
// clock is the track's own currentTime, so the loop stays in sync even if
// you pause and resume.
// ---------------------------------------------------------------------------

// Each variant takes the item (anything with .row/.col) and the grid it
// belongs to (anything with centerRow/centerCol/maxDist/maxChebyshev/
// cols/rows) — this is how the same wave drives both the field and the
// player's 7x7 cluster.
const WAVE_VARIANTS = {
  // expanding circular ripple from the grid's center
  ripple(c, grid) {
    return Math.hypot(c.row - grid.centerRow, c.col - grid.centerCol) / grid.maxDist;
  },
  // expanding square/diamond rings from the center
  rings(c, grid) {
    return Math.max(Math.abs(c.row - grid.centerRow), Math.abs(c.col - grid.centerCol)) / grid.maxChebyshev;
  },
  // a single wall sweeping left to right
  sweepH(c, grid) {
    return grid.cols > 1 ? c.col / (grid.cols - 1) : 0;
  },
  // a wall sweeping diagonally (top-left to bottom-right)
  sweepDiag(c, grid) {
    const span = grid.rows + grid.cols - 2;
    return span > 0 ? (c.row + c.col) / span : 0;
  },
  // outward spiral — mostly distance-driven, nudged by angle around the center
  spiral(c, grid) {
    const dx = c.col - grid.centerCol;
    const dy = c.row - grid.centerRow;
    const dist = Math.hypot(dx, dy) / grid.maxDist;
    const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
    return dist * 0.7 + angle * 0.3;
  },
  // no geometry at all — a stable per-cell pseudo-random shimmer
  sparkle(c) {
    return hash(c.row * 137.31 + c.col * 911.7);
  },
};

const WAVE_TRAVEL_MS = 3600; // time for the wave's front to cross the whole grid (2x slower again)
const WAVE_POP_MS = 1680; // how long each individual circle's dip lasts (2x slower again)
// A new wave launches every WAVE_LAUNCH_INTERVAL ms — sooner than the
// previous one finishes (WAVE_TRAVEL_MS + WAVE_POP_MS), so its tail (the
// farthest circles, still mid-dip) overlaps the next wave's leading edge
// instead of ever hitting a moment where nothing on the grid is moving.
const WAVE_LAUNCH_INTERVAL = WAVE_TRAVEL_MS;
const WAVE_INTENSITY = 0.7; // peak size dip, as a fraction of the circle's base radius

const wave = {
  variant: "ripple",
  previewStart: 0,
  previewUntil: 0,
};

// The HUD "replay" button previews a variant even while audio is paused
// (covers just over one launch interval, using wall-clock time instead of
// the track's currentTime).
function previewFieldWave(variantName) {
  if (!WAVE_VARIANTS[variantName]) return;
  wave.variant = variantName;
  wave.previewStart = performance.now();
  wave.previewUntil = wave.previewStart + WAVE_LAUNCH_INTERVAL + WAVE_POP_MS;
}

// Returns the current size adjustment for an item on `grid` (field or
// player): 0 when idle, negative while a wave is passing through it
// (circles shrink, never grow). Each item is re-evaluated against its own
// repeating phase, so overlapping waves never double up on the same item.
function waveBoostFor(c, now, grid) {
  let elapsedMs;
  if (!audioEl.paused) {
    elapsedMs = audioEl.currentTime * 1000;
  } else if (now < wave.previewUntil) {
    elapsedMs = now - wave.previewStart;
  } else {
    // paused with no manual preview running: keep computing from the frozen
    // currentTime instead of cutting straight to 0 — this holds the wave's
    // last phase steady so `intensity` (in stepField) can fade it out
    // gracefully instead of snapping the circles back to rest instantly.
    elapsedMs = audioEl.currentTime * 1000;
  }

  const delay = WAVE_VARIANTS[wave.variant](c, grid) * WAVE_TRAVEL_MS;
  const raw = elapsedMs - delay;
  const localPhase = ((raw % WAVE_LAUNCH_INTERVAL) + WAVE_LAUNCH_INTERVAL) % WAVE_LAUNCH_INTERVAL;
  if (localPhase > WAVE_POP_MS) return 0;
  const localT = localPhase / WAVE_POP_MS;
  return -Math.sin(Math.PI * localT) * WAVE_INTENSITY;
}

// The field's reactivity (audio pulse + wave) doesn't snap on at full
// strength the instant playback starts — its amplitude eases in from 0 to
// 100% over FIELD_INTENSITY_TWEEN_MS (and back out on pause), using the same
// time-based easeInOutCubic tween as the player's pattern hand-off.
const FIELD_INTENSITY_TWEEN_MS = 2000;
const fieldIntensity = { from: 0, to: 0, start: 0 };

function setFieldIntensityTarget(target) {
  const now = performance.now();
  fieldIntensity.from = currentFieldIntensity(now);
  fieldIntensity.to = target;
  fieldIntensity.start = now;
}

function currentFieldIntensity(now) {
  const t = Math.max(0, Math.min(1, (now - fieldIntensity.start) / FIELD_INTENSITY_TWEEN_MS));
  return fieldIntensity.from + (fieldIntensity.to - fieldIntensity.from) * easeInOutCubic(t);
}

function stepField(mouse) {
  const now = performance.now();

  const intensity = currentFieldIntensity(now);

  for (const c of field.circles) {
    // audio-reactive radius, plus a wave dip layered on top — project
    // circles sit out the wave entirely, only ambient dots take part. Both
    // are scaled by `intensity`, which eases in from rest when play starts
    // and — just as important — eases back out to 0 on pause, so pausing
    // doesn't snap the circles back to rest instantly. Sampling always
    // (rather than gating on paused state) means there's a real, non-zero
    // value for `intensity` to fade out gracefully.
    const level = sampleBand(hash(c.seed));
    const pulse = c.kind === "project" ? 0.06 : 0.35;
    const boost = c.kind === "project" ? 0 : waveBoostFor(c, now, field);
    // never let the audio pulse grow a circle past its own 100% (baseR) —
    // only the wave's shrink can still take it below that
    const targetR = Math.min(c.baseR * (1 + (level * pulse + boost) * intensity), c.baseR);
    const spring = springToward(c.r, c.rVel, targetR);
    c.r = spring.value;
    c.rVel = spring.velocity;

    if (c.dragging) {
      // leashed drag: tracks the cursor 1:1 up to LEASH_FREE_ZONE of the
      // leash, then resists progressively harder — asymptotically
      // approaching (never quite reaching) the full leash distance. That
      // reads as "I could probably pull it a bit further" rather than
      // hitting a hard wall.
      const desiredX = mouse.x - c.dragOffsetX;
      const desiredY = mouse.y - c.dragOffsetY;
      const dx = desiredX - c.homeX;
      const dy = desiredY - c.homeY;
      const dist = Math.hypot(dx, dy);
      const effectiveDist = softLeashDistance(dist, c.leash);
      if (dist > 0.0001) {
        const scale = effectiveDist / dist;
        c.x = c.homeX + dx * scale;
        c.y = c.homeY + dy * scale;
      } else {
        c.x = desiredX;
        c.y = desiredY;
      }
      c.vx = 0;
      c.vy = 0;
      continue;
    }

    // spring toward the fixed grid position — nudged aside if the cursor is
    // close by, using the exact same influence radius/push as the player.
    // Project circles sit this out entirely: they only move when dragged.
    let targetX = c.homeX;
    let targetY = c.homeY;
    if (c.kind !== "project") {
      const hoverDx = c.homeX - mouse.x;
      const hoverDy = c.homeY - mouse.y;
      const hoverDist = Math.hypot(hoverDx, hoverDy);
      if (hoverDist < CURSOR_INFLUENCE && hoverDist > 0.001) {
        const falloff = 1 - hoverDist / CURSOR_INFLUENCE;
        targetX = c.homeX + (hoverDx / hoverDist) * CURSOR_PUSH * falloff;
        targetY = c.homeY + (hoverDy / hoverDist) * CURSOR_PUSH * falloff;
      }
    }

    const ax = (targetX - c.x) * HOME_STIFFNESS;
    const ay = (targetY - c.y) * HOME_STIFFNESS;
    c.vx = (c.vx + ax) * DAMPING;
    c.vy = (c.vy + ay) * DAMPING;
    c.x += c.vx;
    c.y += c.vy;
  }

  if (field.dragCollide) {
    resolveCollisions();
  }
}

function drawField() {
  for (const c of field.circles) {
    const size = c.r * 2;
    if (c.rotation) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.drawImage(c.blob, -c.r, -c.r, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(c.blob, c.x - c.r, c.y - c.r, size, size);
    }
  }
}

// ---------------------------------------------------------------------------
// Player cluster (top-right): strict 7x7 grid, play/pause button dead center.
// ---------------------------------------------------------------------------

const PLAYER_GRID = 7;

const player = {
  cols: PLAYER_GRID,
  rows: PLAYER_GRID,
  cellSize: 0,
  originX: 0,
  originY: 0,
  centerX: 0,
  centerY: 0,
  centerR: 0,
  satellites: [],
  // the dots at these three spots fade into transport icons once playing
  prevSat: null,
  nextSat: null,
  shuffleSat: null,
  // the whole bottom row fades into the progress bar
  bottomRowSats: [],
  trackX: 0,
  trackY: 0,
  trackWidth: 0,
  trackHeight: 0,
};

// Dots immediately beside the center (distance 1) are the biggest — capped
// at the same CIRCLE_MAX_R the field uses — and taper down toward the grid's
// corner cells, floored at PLAYER_SATELLITE_MIN rather than shrinking away to
// nothing, so even the smallest ring stays clearly visible.
const PLAYER_CENTER_INDEX = Math.floor(PLAYER_GRID / 2);
const PLAYER_CORNER_DIST = Math.hypot(PLAYER_CENTER_INDEX, PLAYER_CENTER_INDEX);
const PLAYER_SATELLITE_MIN = 0.3; // smallest ring's floor, as a fraction of CIRCLE_MAX_R — was 0

function satelliteRadius(distFromCenter) {
  const maxR = CIRCLE_MAX_R;
  const t = Math.max(0, Math.min(1, (distFromCenter - 1) / (PLAYER_CORNER_DIST - 1)));
  const eased = Math.pow(1 - t, 1.8);
  return maxR * (PLAYER_SATELLITE_MIN + (1 - PLAYER_SATELLITE_MIN) * eased);
}

function buildPlayer() {
  const cellSize = CELL_SPACING;
  const totalSize = cellSize * player.cols;
  player.cellSize = cellSize;
  player.originX = width - totalSize - 44;
  player.originY = 44;

  const centerRow = Math.floor(player.rows / 2);
  const centerCol = Math.floor(player.cols / 2);
  player.centerX = player.originX + centerCol * cellSize + cellSize / 2;
  player.centerY = player.originY + centerRow * cellSize + cellSize / 2;
  player.centerR = CIRCLE_MAX_R * 1.3; // click-target radius; no visible disc is drawn

  player.satellites = [];
  const lastRow = player.rows - 1;
  const lastCol = player.cols - 1;
  for (let row = 0; row < player.rows; row++) {
    for (let col = 0; col < player.cols; col++) {
      if (row === centerRow && col === centerCol) continue;
      const isCorner = (row === 0 || row === lastRow) && (col === 0 || col === lastCol);
      if (isCorner) continue; // corners are removed entirely, not just sized to 0
      const hx = player.originX + col * cellSize + cellSize / 2;
      const hy = player.originY + row * cellSize + cellSize / 2;
      const distFromCenter = Math.hypot(col - centerCol, row - centerRow);
      const restR = satelliteRadius(distFromCenter);
      player.satellites.push({
        row,
        col,
        homeX: hx,
        homeY: hy,
        x: hx,
        y: hy,
        r: restR, // rest-state radius — the fixed gradient shape, unrelated to the random pattern
        baseR: restR, // current "pattern size", tweening between baseFrom/baseTo
        drawR: restR, // final rendered radius — fast-tracks baseR with the wave/pulse riding on top
        drawVel: 0, // drawR spring velocity — see springToward()
        baseFrom: restR, // tween start value
        baseTo: restR, // tween end value (the current goal)
        baseTweenStart: 0,
        blob: randomBlobVariant(),
        rotation: Math.random() * Math.PI * 2,
        seed: row * 31 + col * 7, // stable per-dot FFT sampling point, like field circles' `seed`
      });
    }
  }

  // Locate the specific dots that fade into transport controls once
  // playing: left/right of the play button become prev/next, and the one
  // diagonally up-right of "next" becomes shuffle.
  const findAt = (r, c) => player.satellites.find((s) => s.row === r && s.col === c) || null;
  player.prevSat = findAt(centerRow, centerCol - 1);
  player.nextSat = findAt(centerRow, centerCol + 1);
  player.shuffleSat = findAt(centerRow - 1, centerCol + 1);
  player.bottomRowSats = player.satellites.filter((s) => s.row === lastRow);
  player.bottomRowFirstCol = Math.min(...player.bottomRowSats.map((s) => s.col));
  player.bottomRowLastCol = Math.max(...player.bottomRowSats.map((s) => s.col));

  // Every dot that morphs into fixed-position UI (progress bar, transport
  // icons) keeps dodging the cursor at rest, same as any other dot — it only
  // locks to home via a short settle tween right when playback starts, and
  // stays there for as long as it's actively part of the UI (see
  // specialSettle / specialLocked below). Without this, cursor repulsion
  // would offset a dot mid-morph and its center would drift from the fixed
  // element it's becoming.
  player.iconDots = [player.prevSat, player.nextSat, player.shuffleSat].filter(Boolean);
  player.specialSats = new Set([...player.iconDots, ...player.bottomRowSats]);

  // Track size comes straight from the SVG's own proportions (see
  // PLAYER_ASSET_SCALE), not an arbitrary fraction of the cell — only its
  // horizontal position is centered on the bottom row it replaces.
  player.trackWidth = (playerBar.trackGold.width / PLAYER_TRACK_RASTER_SCALE) * PLAYER_ASSET_SCALE;
  player.trackHeight = (playerBar.trackGold.height / PLAYER_TRACK_RASTER_SCALE) * PLAYER_ASSET_SCALE;
  player.trackX = player.centerX - player.trackWidth / 2;
  player.trackY = player.originY + lastRow * cellSize + cellSize / 2;
}

const CURSOR_INFLUENCE = CELL_SPACING * 6; // pushes circles up to 6 grid-steps away
const CURSOR_PUSH = 6; // small nudge only — every circle stays hoverable

const SATELLITE_RANDOM_MIN = 0.1; // random floor, as a fraction of CIRCLE_MAX_R (the same ceiling every dot shares)
const PLAYER_AUDIO_PULSE = 0.35; // same strength as the field's ambient audio pulse

// drawR itself is now tracked with the shared springToward() (see above),
// which keeps up with the wave/audio-pulse's sine shape without lagging or
// blunting the peaks, while still reading as non-linear.

// The pattern hand-off (a fresh random roll, or falling back to rest) is a
// straight time-based tween over exactly this long — not an exponential
// ease, which visually "arrives" within its first second or two and makes
// the nominal duration feel like a lie. easeInOutCubic keeps the motion
// spread evenly across the whole 6s instead of front-loaded.
const SATELLITE_BASE_TWEEN_MS = 2000;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function startBaseTween(s, to, now) {
  s.baseFrom = s.baseR;
  s.baseTo = to;
  s.baseTweenStart = now;
}

// Called once per "play" press: every dot — including ones that are 0 at
// rest, like the corners — rolls an independent size from 10% to 100% of
// CIRCLE_MAX_R. The result ignores each dot's position entirely, so the
// pattern can come out as anything across the 7x7 grid, ungoverned by the
// resting gradient shape. baseR then tweens toward it over exactly
// SATELLITE_BASE_TWEEN_MS instead of snapping.
function randomizeSatelliteScales() {
  const now = performance.now();
  for (const s of player.satellites) {
    const to = (SATELLITE_RANDOM_MIN + Math.random() * (1 - SATELLITE_RANDOM_MIN)) * CIRCLE_MAX_R;
    startBaseTween(s, to, now);
  }
}

// Called on pause: gently tween back to the plain static gradient pattern.
function resetSatelliteScales() {
  const now = performance.now();
  for (const s of player.satellites) {
    startBaseTween(s, s.r, now);
  }
}

// Tracks the transport-UI reveal: 0 = plain dot grid, 1 = prev/next/shuffle
// icons + progress bar fully shown. Cross-fades between the two on play/pause
// over the same kind of time-based ease-in-out-cubic tween used everywhere
// else, rather than swapping instantly.
const PLAYER_ACTIVE_TWEEN_MS = 2000;
const playerActive = { from: 0, to: 0, start: 0 };

// Two takes on the bottom-row -> progress-bar reveal, switchable from the
// HUD so they're easy to compare side by side.
let bottomRevealStyle = "wave"; // 'wave' | 'squash'
const BOTTOM_REVEAL_SPREAD = 0.55; // fraction of the 2s window spent staggering column start times ('wave' only)

// On play, every dot that's about to morph into fixed UI (bottom row ->
// bar, prev/next/shuffle -> icons) glides home (ignoring the cursor) before
// that UI starts revealing, instead of jumping straight into the morph from
// wherever the cursor had pushed it. Stays locked home for as long as it's
// actively part of the UI, and resumes dodging the cursor the moment
// everything has fully retracted back to plain dots on pause.
const SPECIAL_SETTLE_MS = 450;
let specialLocked = false;
let specialSettle = null; // { start, map: Map<sat, {x, y}> } while gliding home

// A one-shot launch ripple across the bottom row on play — same dip shape as
// the field's audio wave (see WAVE_VARIANTS.sweepH / waveBoostFor), but a
// single left-to-right pass rather than a repeating loop, timed to run
// alongside the settle-home glide above.
const BOTTOM_WAVE_SWEEP_MS = 350; // time for the ripple's front to cross the row, left to right
const BOTTOM_WAVE_POP_MS = 220; // how long each individual dot's dip lasts as the ripple passes it
const BOTTOM_WAVE_INTENSITY = 0.5; // peak size dip, as a fraction of the dot's base radius
let bottomWaveStart = null; // performance.now() when the last launch ripple began

function bottomWaveBoost(s, now) {
  if (bottomWaveStart == null) return 0;
  const span = player.bottomRowLastCol - player.bottomRowFirstCol;
  const colFrac = span > 0 ? (s.col - player.bottomRowFirstCol) / span : 0;
  const localPhase = now - bottomWaveStart - colFrac * BOTTOM_WAVE_SWEEP_MS;
  if (localPhase < 0 || localPhase > BOTTOM_WAVE_POP_MS) return 0;
  const localT = localPhase / BOTTOM_WAVE_POP_MS;
  return -Math.sin(Math.PI * localT) * BOTTOM_WAVE_INTENSITY;
}

// Both the slider thumb (scale 0 <-> 1) and the white progress fill (alpha
// 0 <-> 1) reveal only once the gold backing has fully appeared — never
// mid-reveal — sharing this one tween so they pop/fade in and out together,
// over the same duration, as smoothly out as in.
const POST_REVEAL_MS = 400;
const postReveal = { from: 0, to: 0, start: 0 };

function setPostRevealTarget(target, now) {
  postReveal.from = currentPostReveal(now);
  postReveal.to = target;
  postReveal.start = now;
}

function currentPostReveal(now) {
  const t = Math.max(0, Math.min(1, (now - postReveal.start) / POST_REVEAL_MS));
  return postReveal.from + (postReveal.to - postReveal.from) * easeInOutCubic(t);
}

function setPlayerActiveTarget(target) {
  const now = performance.now();
  playerActive.from = currentPlayerActive(now);
  playerActive.to = target;
  playerActive.start = now;
}

function currentPlayerActive(now) {
  const t = Math.max(0, Math.min(1, (now - playerActive.start) / PLAYER_ACTIVE_TWEEN_MS));
  return playerActive.from + (playerActive.to - playerActive.from) * easeInOutCubic(t);
}

function stepPlayer(mouse) {
  const now = performance.now();
  const audioOn = !audioEl.paused;

  if (specialSettle) {
    const t = Math.min(1, (now - specialSettle.start) / SPECIAL_SETTLE_MS);
    const eased = easeInOutCubic(t);
    for (const [s, from] of specialSettle.map) {
      s.x = from.x + (s.homeX - from.x) * eased;
      s.y = from.y + (s.homeY - from.y) * eased;
    }
    if (t >= 1) {
      specialSettle = null;
      setPlayerActiveTarget(1); // everything's home now — safe to start the reveal
    }
  } else if (specialLocked && audioEl.paused && currentPlayerActive(now) <= 0) {
    specialLocked = false; // fully retracted — let these dots dodge the cursor again
  }

  for (const s of player.satellites) {
    const tweenT = Math.max(0, Math.min(1, (now - s.baseTweenStart) / SATELLITE_BASE_TWEEN_MS));
    s.baseR = s.baseFrom + (s.baseTo - s.baseFrom) * easeInOutCubic(tweenT);

    // audio-reactive, plus a one-shot launch ripple across the bottom row
    // right when play is pressed (see bottomWaveBoost) — everything else
    // stays out of the field's own continuous wave.
    const level = audioOn ? sampleBand(hash(s.seed)) : 0;
    let boost = level * PLAYER_AUDIO_PULSE;
    if (s.row === player.rows - 1) {
      boost += bottomWaveBoost(s, now);
    }

    // never let the pulse push a dot past its own 100% (CIRCLE_MAX_R)
    const drawTarget = Math.min(s.baseR * (1 + boost), CIRCLE_MAX_R);
    const drawSpring = springToward(s.drawR, s.drawVel, drawTarget);
    s.drawR = drawSpring.value;
    s.drawVel = drawSpring.velocity;

    if (specialSettle && specialSettle.map.has(s)) continue; // position already driven by the settle tween above

    // position: retreats a little from a nearby cursor, same as the field —
    // except dots currently locked as fixed UI (bar/icons), which stay
    // pinned to homeX/homeY so their center never drifts from what they've
    // become
    let targetX = s.homeX;
    let targetY = s.homeY;
    const locked = specialLocked && player.specialSats.has(s);

    if (!locked) {
      const dx = s.homeX - mouse.x;
      const dy = s.homeY - mouse.y;
      const dist = Math.hypot(dx, dy);

      if (dist < CURSOR_INFLUENCE && dist > 0.001) {
        const falloff = 1 - dist / CURSOR_INFLUENCE;
        const nx = dx / dist;
        const ny = dy / dist;
        targetX = s.homeX + nx * CURSOR_PUSH * falloff;
        targetY = s.homeY + ny * CURSOR_PUSH * falloff;
      }
    }

    s.x += (targetX - s.x) * 0.18;
    s.y += (targetY - s.y) * 0.18;
  }
}

function drawSatelliteDot(s, scaleMul = 1) {
  const r = s.drawR * scaleMul;
  if (r < 0.05) return;
  const size = r * 2;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);
  ctx.drawImage(s.blob, -r, -r, size, size);
  ctx.restore();
}

// "squash" bottom-row reveal: instead of shrinking uniformly, the dot
// widens a touch and flattens toward a horizontal sliver — reads as
// melting into the bar it's about to become, rather than just fading out.
const SQUASH_WIDEN = 0.6;

function drawSatelliteDotSquashed(s, t) {
  const r = s.drawR;
  if (r < 0.05) return;
  const scaleX = 1 + t * SQUASH_WIDEN;
  const scaleY = Math.max(0.02, 1 - t);
  const size = r * 2;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(s.blob, -r, -r, size, size);
  ctx.restore();
}

// Draws `img` at its own native size (accounting for how much it was
// upscaled during rasterization) times PLAYER_ASSET_SCALE, centered on
// (cx, cy) — no bounding-box fitting, just the SVG's real proportions.
// `scaleMul` additionally grows/shrinks it from that same center point, for
// the reveal animation.
function drawAtNativeScale(img, rasterScale, cx, cy, scaleMul = 1) {
  const w = (img.width / rasterScale) * PLAYER_ASSET_SCALE * scaleMul;
  const h = (img.height / rasterScale) * PLAYER_ASSET_SCALE * scaleMul;
  if (w < 0.5 || h < 0.5) return;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawTransportIcons(scaleMul) {
  if (player.prevSat) drawAtNativeScale(icons.prev, ICON_UPSCALE, player.prevSat.homeX, player.prevSat.homeY, scaleMul);
  if (player.nextSat) drawAtNativeScale(icons.next, ICON_UPSCALE, player.nextSat.homeX, player.nextSat.homeY, scaleMul);
  if (player.shuffleSat) {
    drawAtNativeScale(icons.shuffle, ICON_UPSCALE, player.shuffleSat.homeX, player.shuffleSat.homeY, scaleMul);
  }
}

// Draws just the gold backing (no cream, no thumb) and returns the playback
// progress, so callers can clip *this* to the reveal wipe while still
// drawing the cream fill and thumb unclipped afterwards — both stick out
// past (or need to fade independently of) the backing's own reveal.
function drawProgressBarBacking() {
  const { trackX, trackY, trackWidth, trackHeight } = player;
  const destY = trackY - trackHeight / 2;
  const duration = audioEl.duration;
  const progress = duration && isFinite(duration) ? Math.max(0, Math.min(1, audioEl.currentTime / duration)) : 0;

  ctx.drawImage(playerBar.trackGold, trackX, destY, trackWidth, trackHeight);

  return progress;
}

// White progress fill: crop the *source* to the played fraction so the
// visible edge keeps the mask's own wobbly silhouette instead of a plain
// rectangular cut. Fades in via opacity — see postReveal — only once the
// gold backing itself has fully appeared.
function drawProgressFill(progress, alpha) {
  if (alpha <= 0) return;
  const { trackX, trackY, trackWidth, trackHeight } = player;
  const destY = trackY - trackHeight / 2;
  const srcW = playerBar.trackCream.width * progress;
  if (srcW <= 0.5) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    playerBar.trackCream,
    0,
    0,
    srcW,
    playerBar.trackCream.height,
    trackX,
    destY,
    trackWidth * progress,
    trackHeight,
  );
  ctx.globalAlpha = 1;
}

function drawThumb(progress, thumbScale) {
  if (thumbScale <= 0) return;
  const { trackX, trackY, trackWidth } = player;
  drawAtNativeScale(playerBar.thumb, ICON_UPSCALE, trackX + trackWidth * progress, trackY, thumbScale);
}

function drawProgressBar(pop = 1) {
  const progress = drawProgressBarBacking();
  drawProgressFill(progress, pop);
  drawThumb(progress, pop);
}

// "wave" bottom-row reveal: the bar wipes in left-to-right instead of
// fading in as one flat block, timed to follow the same sweep the dots
// vanish in (see BOTTOM_REVEAL_SPREAD in drawPlayer).
function drawProgressBarWipe(revealFrac, pop) {
  if (revealFrac <= 0) return;
  const { trackX, trackY, trackWidth, trackHeight } = player;
  ctx.save();
  ctx.beginPath();
  ctx.rect(trackX - 2, trackY - trackHeight, trackWidth * revealFrac + 4, trackHeight * 2);
  ctx.clip();
  const progress = drawProgressBarBacking();
  ctx.restore();
  // outside the clip — the fill fades in on its own timing, and the thumb
  // sticks out past the track's own edges at either extreme
  drawProgressFill(progress, pop);
  drawThumb(progress, pop);
}

function drawPlayer() {
  const now = performance.now();
  const activeT = currentPlayerActive(now);
  const iconDots = player.iconDots;

  // the white fill and the slider thumb both reveal (fill via opacity,
  // thumb via scale) only once the gold backing has fully appeared, and
  // retreat the same way — same eased tween, reversed — the instant it
  // starts retracting
  const wantPop = activeT >= 1 ? 1 : 0;
  if (wantPop !== postReveal.to) setPostRevealTarget(wantPop, now);
  const pop = currentPostReveal(now);

  for (const s of player.satellites) {
    if (player.specialSats.has(s)) continue;
    drawSatelliteDot(s);
  }

  // bottom row <-> progress bar — two selectable takes, see revealStyle in the HUD
  if (bottomRevealStyle === "squash") {
    if (activeT < 1) {
      ctx.globalAlpha = 1 - activeT;
      for (const s of player.bottomRowSats) drawSatelliteDotSquashed(s, activeT);
      ctx.globalAlpha = 1;
    }
    if (activeT > 0) {
      ctx.globalAlpha = activeT;
      drawProgressBar(pop);
      ctx.globalAlpha = 1;
    }
  } else {
    // "wave": dots vanish left-to-right in sequence instead of all at once,
    // and the bar wipes in from that same side in sync — each dot gets a
    // BOTTOM_REVEAL_SPREAD-sized slice of the 2s window, staggered by its
    // column, so the sweep finishes exactly as activeT reaches 1.
    const span = Math.max(1, player.bottomRowLastCol - player.bottomRowFirstCol);
    for (const s of player.bottomRowSats) {
      const colFrac = (s.col - player.bottomRowFirstCol) / span;
      const localT = Math.max(0, Math.min(1, (activeT - colFrac * BOTTOM_REVEAL_SPREAD) / (1 - BOTTOM_REVEAL_SPREAD)));
      if (localT < 1) drawSatelliteDot(s, 1 - localT);
    }
    drawProgressBarWipe(activeT, pop);
  }

  // prev/next/shuffle dots <-> their icons: the dot shrinks to nothing and
  // the icon grows from nothing, both anchored on the exact same center
  // point (the dot's home position), using the same eased 2s curve as
  // everything else (activeT is already easeInOutCubic-shaped). The dot
  // layers *above* its icon, not below, so it reads as melting away to
  // reveal the icon rather than the icon simply overtaking it.
  if (activeT > 0) {
    drawTransportIcons(activeT);
  }
  if (activeT < 1) {
    ctx.globalAlpha = 1 - activeT;
    for (const s of iconDots) drawSatelliteDot(s, 1 - activeT);
    ctx.globalAlpha = 1;
  }

  // center play/pause button — just the icon, no backing disc, always shown
  const icon = audioEl.paused ? icons.play : icons.pause;
  const iconBox = CIRCLE_MAX_R * 2.3; // just a touch bigger than the largest dot's diameter
  containDraw(ctx, icon, player.centerX, player.centerY, iconBox, iconBox);
}

function hitPlayerButton(x, y) {
  return Math.hypot(x - player.centerX, y - player.centerY) <= player.centerR;
}

function hitTransportIcon(sat, x, y) {
  if (!sat) return false;
  return Math.hypot(x - sat.homeX, y - sat.homeY) <= CIRCLE_MAX_R * 1.1;
}

function hitProgressBar(x, y) {
  const { trackX, trackY, trackWidth, trackHeight } = player;
  const halfH = Math.max(trackHeight, CELL_SPACING * 0.3); // generous vertical grab area
  return x >= trackX && x <= trackX + trackWidth && Math.abs(y - trackY) <= halfH;
}

function seekProgressBarTo(x) {
  const duration = audioEl.duration;
  if (!duration || !isFinite(duration)) return;
  const t = Math.max(0, Math.min(1, (x - player.trackX) / player.trackWidth));
  audioEl.currentTime = t * duration;
}

// ---------------------------------------------------------------------------
// Mouse / drag handling
// ---------------------------------------------------------------------------

const mouse = { x: -9999, y: -9999 };
let draggedCircle = null;
let draggingProgress = false;

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function onPointerDown(e) {
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;

  if (hitPlayerButton(p.x, p.y)) {
    toggleAudio();
    return;
  }

  // transport controls only accept clicks once they're mostly faded in —
  // otherwise a click meant for the dot underneath could misfire on them
  if (currentPlayerActive(performance.now()) > 0.5) {
    if (hitTransportIcon(player.prevSat, p.x, p.y)) {
      playAdjacentTrack(-1);
      return;
    }
    if (hitTransportIcon(player.nextSat, p.x, p.y)) {
      playAdjacentTrack(1);
      return;
    }
    if (hitTransportIcon(player.shuffleSat, p.x, p.y)) {
      toggleShuffle();
      return;
    }
    if (hitProgressBar(p.x, p.y)) {
      draggingProgress = true;
      seekProgressBarTo(p.x);
      return;
    }
  }

  // topmost project circle under the cursor wins
  for (let i = field.circles.length - 1; i >= 0; i--) {
    const c = field.circles[i];
    if (c.kind !== "project") continue;
    if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r) {
      draggedCircle = c;
      c.dragging = true;
      c.dragOffsetX = p.x - c.x;
      c.dragOffsetY = p.y - c.y;
      break;
    }
  }
}

function onPointerMove(e) {
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  if (draggingProgress) seekProgressBarTo(p.x);
}

function onPointerUp() {
  draggingProgress = false;
  if (draggedCircle) {
    draggedCircle.dragging = false;
    draggedCircle = null;
  }
}

canvas.addEventListener("mousedown", onPointerDown);
window.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);
canvas.addEventListener("touchstart", onPointerDown, { passive: true });
window.addEventListener("touchmove", onPointerMove, { passive: true });
window.addEventListener("touchend", onPointerUp);

// ---------------------------------------------------------------------------
// Audio controls
// ---------------------------------------------------------------------------

const hud = document.getElementById("hud");
const hudCollapseBtn = document.getElementById("hudCollapse");
const audioToggle = document.getElementById("audioToggle");
const trackSelect = document.getElementById("trackSelect");
const dragCollideCheckbox = document.getElementById("dragCollide");
const waveVariantSelect = document.getElementById("waveVariant");
const waveReplayBtn = document.getElementById("waveReplay");
const revealStyleSelect = document.getElementById("revealStyle");
revealStyleSelect.value = bottomRevealStyle;
revealStyleSelect.addEventListener("change", () => {
  bottomRevealStyle = revealStyleSelect.value;
});

hudCollapseBtn.addEventListener("click", () => {
  const collapsed = hud.classList.toggle("is-collapsed");
  hudCollapseBtn.textContent = collapsed ? "☰ меню" : "свернуть ✕";
  hudCollapseBtn.setAttribute("aria-expanded", String(!collapsed));
});

function toggleAudio() {
  ensureAudioGraph();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (audioEl.paused) {
    if (!audioEl.src) audioEl.src = trackSelect.value;
    audioEl.play();
  } else {
    audioEl.pause();
  }
}

let shuffleOn = false;

function switchToTrackIndex(index) {
  const n = trackSelect.options.length;
  trackSelect.selectedIndex = ((index % n) + n) % n;
  const wasPlaying = !audioEl.paused;
  audioEl.src = trackSelect.value;
  if (wasPlaying) audioEl.play();
}

function playAdjacentTrack(direction) {
  const n = trackSelect.options.length;
  if (shuffleOn && n > 1) {
    let next = Math.floor(Math.random() * n);
    if (next === trackSelect.selectedIndex) next = (next + 1) % n;
    switchToTrackIndex(next);
  } else {
    switchToTrackIndex(trackSelect.selectedIndex + direction);
  }
}

function toggleShuffle() {
  shuffleOn = !shuffleOn;
}

audioToggle.addEventListener("click", toggleAudio);
trackSelect.addEventListener("change", () => {
  const wasPlaying = !audioEl.paused;
  audioEl.src = trackSelect.value;
  if (wasPlaying) audioEl.play();
});
dragCollideCheckbox.addEventListener("change", () => {
  field.dragCollide = dragCollideCheckbox.checked;
});
waveVariantSelect.addEventListener("change", () => {
  wave.variant = waveVariantSelect.value;
});
waveReplayBtn.addEventListener("click", () => previewFieldWave(waveVariantSelect.value));

audioEl.addEventListener("play", () => audioToggle.classList.add("is-on"));
audioEl.addEventListener("pause", () => audioToggle.classList.remove("is-on"));
audioEl.addEventListener("play", () => (audioToggle.textContent = "⏸ аудио включено"));
audioEl.addEventListener("pause", () => (audioToggle.textContent = "▶ включить аудио"));
audioEl.addEventListener("play", randomizeSatelliteScales);
audioEl.addEventListener("pause", resetSatelliteScales);
audioEl.addEventListener("play", () => setFieldIntensityTarget(1));
audioEl.addEventListener("pause", () => setFieldIntensityTarget(0));
audioEl.addEventListener("play", () => {
  specialLocked = true;
  specialSettle = {
    start: performance.now(),
    map: new Map([...player.specialSats].map((s) => [s, { x: s.x, y: s.y }])),
  };
  bottomWaveStart = performance.now();
  // setPlayerActiveTarget(1) fires once the settle tween lands everything home — see stepPlayer
});
audioEl.addEventListener("pause", () => {
  specialSettle = null; // no settle-out needed — these dots just unlock once the bar fully retracts
  setPlayerActiveTarget(0);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const blobs = { goldVariants: [], maskVariants: [], projects: [] };
const icons = { play: null, pause: null, prev: null, next: null, shuffle: null };
const playerBar = { trackGold: null, trackMask: null, trackCream: null, thumb: null };

// Flat-fills `maskCanvas`'s alpha shape with `color` — used to derive the
// progress bar's lighter fill from the exact same wobbly silhouette as its
// gold background, instead of a plain rectangle.
function tintMasked(maskCanvas, color) {
  const off = document.createElement("canvas");
  off.width = maskCanvas.width;
  off.height = maskCanvas.height;
  const c = off.getContext("2d");
  c.fillStyle = color;
  c.fillRect(0, 0, off.width, off.height);
  c.globalCompositeOperation = "destination-in";
  c.drawImage(maskCanvas, 0, 0);
  return off;
}

function randomBlobVariant() {
  return blobs.goldVariants[Math.floor(Math.random() * blobs.goldVariants.length)];
}

// Fisher-Yates shuffle of [0, n) — used to hand out mask variants to project
// circles without repeats, the way independent random picks can't guarantee.
function shuffledIndices(n) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

async function boot() {
  const [blobSvgs, playSvg, pauseSvg, prevSvg, nextSvg, shuffleSvg, trackSvg, thumbSvg] = await Promise.all([
    Promise.all(BLOB_SVG_URLS.map((url) => fetch(url).then((r) => r.text()))),
    fetch(PLAY_ICON_URL).then((r) => r.text()),
    fetch(PAUSE_ICON_URL).then((r) => r.text()),
    fetch(PREV_ICON_URL).then((r) => r.text()),
    fetch(NEXT_ICON_URL).then((r) => r.text()),
    fetch(SHUFFLE_ICON_URL).then((r) => r.text()),
    fetch(PLAYER_TRACK_URL).then((r) => r.text()),
    fetch(PLAYER_THUMB_URL).then((r) => r.text()),
  ]);

  const [goldVariants, maskVariants, play, pause, prev, next, shuffle, trackGold, trackMask, thumb] = await Promise.all([
    Promise.all(blobSvgs.map((svg) => rasterizeSvg(svg, { fillFrom: SVG_SOURCE_GOLD, fillTo: GOLD, targetSize: BLOB_RASTER_SIZE }))),
    Promise.all(blobSvgs.map((svg) => rasterizeSvg(svg, { fillFrom: SVG_SOURCE_GOLD, fillTo: MASK_OPAQUE, targetSize: BLOB_RASTER_SIZE }))),
    rasterizeSvg(playSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
    rasterizeSvg(pauseSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
    rasterizeSvg(prevSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
    rasterizeSvg(nextSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
    rasterizeSvg(shuffleSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
    rasterizeSvg(trackSvg, { fillFrom: SVG_SOURCE_GOLD, fillTo: GOLD, scale: 2 }),
    rasterizeSvg(trackSvg, { fillFrom: SVG_SOURCE_GOLD, fillTo: MASK_OPAQUE, scale: 2 }),
    rasterizeSvg(thumbSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: CREAM, scale: ICON_UPSCALE }),
  ]);
  blobs.goldVariants = goldVariants;
  blobs.maskVariants = maskVariants;
  icons.play = play;
  icons.pause = pause;
  icons.prev = prev;
  icons.next = next;
  icons.shuffle = shuffle;
  playerBar.trackGold = trackGold;
  playerBar.trackMask = trackMask;
  playerBar.trackCream = tintMasked(trackMask, CREAM);
  playerBar.thumb = thumb;

  // Each project gets its own distinct mask variant — a shuffle-and-take
  // rather than independent random picks, so two projects never happen to
  // land on the same shape the way independent Math.random() calls could.
  const projectMaskOrder = shuffledIndices(maskVariants.length);
  blobs.projects = await Promise.all(
    PROJECT_IMAGES.map(async (p, i) => ({
      title: p.title,
      canvas: await makeProjectBlob(maskVariants[projectMaskOrder[i % projectMaskOrder.length]], p.src, BLOB_RASTER_SIZE),
    })),
  );

  resize(); // window size can settle after this script first ran — read it fresh
  buildPlayer();
  buildField();
  requestAnimationFrame(loop);
}

function loop() {
  stepField(mouse);
  stepPlayer(mouse);

  ctx.clearRect(0, 0, width, height);
  drawField();
  drawPlayer();

  requestAnimationFrame(loop);
}

window.addEventListener("resize", () => {
  if (!blobs.goldVariants.length) return; // assets not ready yet, boot() will lay things out once they are
  buildPlayer();
  buildField();
});

boot();
