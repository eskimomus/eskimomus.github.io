// ============================================================================
// Reactive circles — canvas layer for the site
// Ported from prototype/reactive-circles.js, with the playground's HUD swapped
// for a real integration:
//  - the canvas is fixed to the viewport, but everything is positioned in
//    *document* coordinates and drawn shifted by the scroll offset, so the
//    circles scroll with the page like ordinary content
//  - the player cluster and the project field are anchored to DOM mounts
//    (#playerMount / #fieldMount), so CSS owns the layout and this file only
//    fills whatever box it's given
//  - the field only exists in "field" view; the player is always on
// See window.reactiveField at the bottom for what the page can drive.
// ============================================================================

// Two surfaces. #stage is pinned to the viewport and draws the field, which
// is as tall as the page and so can't have a bitmap of its own — it's drawn
// through the scroll offset instead. #stagePlayer sits in the document's flow
// over the player's band, so the browser scrolls it with the rest of the page
// and the player never trails behind (Safari hands JS a stale scroll offset
// during an async scroll, and drags fixed elements during an overscroll).
const canvas = document.getElementById("stage");
const fieldCtx = canvas.getContext("2d");
// The page's own box — the field canvas is a sibling of it, so this is how
// far the document actually reaches; see applyFieldBox.
const pageEl = document.querySelector(".page");
const playerCanvas = document.getElementById("stagePlayer");
const playerCtx = playerCanvas ? playerCanvas.getContext("2d") : fieldCtx;
// Whichever surface the draw helpers below are currently painting on.
let ctx = fieldCtx;

// Set by the page (see reactiveField.setProjects) before boot: one entry per
// project circle, in the order they should appear.
let PROJECT_SOURCE = [];
let projectOpenHandler = null;

// 'field' draws the whole project grid; 'list' keeps only the player cluster.
let viewMode = "list";
// The field's own fade. Its visible half is drawn here, not in the DOM, so
// switching views has to ramp this rather than just stopping the draw — that
// way the canvas leaves and arrives on the same clock as the page's panels
// (--tab-fade). 0 = list, 1 = field.
let viewFade = 0;
let viewFadeAt = 0;
let viewFadeMs = 260; // refreshed from --tab-fade when the view changes

// How far the document is scrolled — everything is laid out in document space
// and drawn through this offset (see loop()).
// The box the field's canvas covers, in document coordinates. The canvas is
// positioned there rather than pinned to the viewport — see #stage in the
// stylesheet and applyFieldBox below.
const fieldBox = { left: 0, top: 0, width: 0, height: 0 };

// Six slightly different outlines (the original plus five variants) so
// circles don't all read as stamped from the exact same shape.
const BLOB_SVG_URLS = [
  "./assets/circle-blob.svg",
  "./assets/circle-blob-2.svg",
  "./assets/circle-blob-3.svg",
  "./assets/circle-blob-4.svg",
  "./assets/circle-blob-5.svg",
  "./assets/circle-blob-6.svg",
];
// These four are fetched at runtime rather than linked from the page, so
// they miss the ?v= that index.html puts on everything else and a visitor
// who has been here before keeps the outlines they cached. Move the number
// whenever the artwork changes.
const ICON_V = "?v=2";
const PLAY_ICON_URL = "./assets/icon-play.svg" + ICON_V;
const PAUSE_ICON_URL = "./assets/icon-pause.svg" + ICON_V;
const PREV_ICON_URL = "./assets/icon-prev.svg" + ICON_V;
const NEXT_ICON_URL = "./assets/icon-next.svg" + ICON_V;
const SHUFFLE_ICON_URL = "./assets/icon-shuffle.svg";
const LOADING_ICON_URL = "./assets/icon-loading.svg";
const PLAYER_TRACK_URL = "./assets/player-bar.svg";
const PLAYER_THUMB_URL = "./assets/player-slider.svg";
const BLOB_RASTER_SIZE = 240; // px — largest circle we'll ever draw; smaller ones downscale from this
const ICON_UPSCALE = 3; // rasterize icons a few times bigger than their native size for crispness
// Kept size for the progress bar's mask. 2x its native width is 808px, just
// over the widest the bar is ever drawn (734 device px, at the largest page
// scale on a 3x screen), so it's never upscaled and the on-screen reduction
// stays small.
const PLAYER_TRACK_RASTER_SCALE = 2;
// Clear space added above and below the bar before it's rasterized — see
// padSvgBox for why only the height grows.
const PLAYER_TRACK_PAD_Y = 6;

// ---------------------------------------------------------------------------
// Palette — every visible color drawn on the canvas traces back to GOLD or
// CREAM below, so swapping the palette later only ever means editing these
// two hex values. Everything else (rasterizeSvg's fillFrom/fillTo, tintMasked)
// just remaps toward whatever these currently are.
//
// SVG_SOURCE_GOLD/CREAM are a different thing: the placeholder fill values
// already baked into the raw asset files (circle-blob*.svg, player-bar.svg
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
const MUTED = "#9C8979"; // shuffle while it's off — the same "not selected" tone the music tabs use

// ---------------------------------------------------------------------------
// Grid metrics, in *design pixels* measured off the Figma frame (1920 wide):
// the player cluster is a 7x7 lattice at a 97.85px step with a 29.65px
// largest dot. The page scales the whole design by viewportWidth / 1920 (up
// to a cap — see PAGE_MAX_WIDTH in app.js), and this file follows the same
// number rather than deriving its own, which is why nothing here reflows.
// ---------------------------------------------------------------------------

const DESIGN_CELL_SPACING = 97.85;
const DESIGN_CIRCLE_MAX_R = 29.65;
// Every player asset (prev/next/shuffle icons, the progress track, the thumb)
// is drawn at its own native SVG size in design space — the art was authored
// at exactly the size the design uses it at.
const DESIGN_PLAYER_ASSET_SCALE = 1;
// Optical nudge for the progress bar: sitting exactly on the two dot centers
// it reads a touch late against the first circle, so it starts a couple of
// screen pixels earlier. In design px, so the shift holds at every scale.
const DESIGN_TRACK_NUDGE_X = -5;
// Field view isn't in the Figma frame yet; keeping the project circles at
// twice the largest ambient dot until there's a frame to measure.
const DESIGN_PROJECT_CIRCLE_R = DESIGN_CIRCLE_MAX_R * 2 * 1.25;
// How far past its mount the field's canvas reaches. A circle can be dragged
// up to 1.6 of its own radius from home and its far edge sits another radius
// beyond that, and the cursor and collisions nudge the lattice a little
// further, so this covers the most any of it can stray outside the box the
// grid itself occupies.
const DESIGN_FIELD_BLEED = 220;

// The scaled values the rest of the file works in. applyScale() refreshes
// them whenever the viewport changes.
let designScale = 1;
let CELL_SPACING = DESIGN_CELL_SPACING;
let CIRCLE_MAX_R = DESIGN_CIRCLE_MAX_R;
let PLAYER_ASSET_SCALE = DESIGN_PLAYER_ASSET_SCALE;
let PROJECT_CIRCLE_R = DESIGN_PROJECT_CIRCLE_R;
let FIELD_BLEED = DESIGN_FIELD_BLEED;

function applyScale() {
  // read rather than recomputed: app.js caps the scale on wide screens, and
  // the canvas has to land on the same number the DOM was laid out with
  designScale =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  CELL_SPACING = DESIGN_CELL_SPACING * designScale;
  CIRCLE_MAX_R = DESIGN_CIRCLE_MAX_R * designScale;
  FIELD_BLEED = DESIGN_FIELD_BLEED * designScale;
  PLAYER_ASSET_SCALE = DESIGN_PLAYER_ASSET_SCALE * designScale;
  PROJECT_CIRCLE_R = DESIGN_PROJECT_CIRCLE_R * designScale;
}

applyScale();

// Filled from PROJECT_SOURCE at boot — see reactiveField.setProjects. The
// page can swap the set later (the contacts section puts platform icons in
// the same grid), which is what fieldMountId and the cache below are for.
const PROJECT_IMAGES = [];
let fieldMountId = "fieldMount";
const fieldBlobCache = new Map();

// How many device pixels the canvas gets per CSS pixel.
//
// This used to be a flat cap of 2, which is the right ceiling for a desktop —
// past it a full-viewport canvas costs more to fill every frame than the
// sharpness is worth. On a phone it was the wrong answer twice over: the
// screen is usually 3x, and the canvas is a fraction of the size, so the cap
// threw away a third of the resolution the device had while the pixels it
// refused were cheaper than the ones a desktop pays for happily. Every
// outline on the small screen came out chewed.
//
// So the ceiling follows the size of the surface instead of being fixed: how
// many pixels there are to fill is the thing that actually costs, not the
// ratio. Under the budget the screen gets what it asks for, up to 3; over it
// the answer is 2, which is where it has always been, so nothing that works
// today gets slower. A phone at 375x812 comes out at 3, a laptop at 1440x900
// and a 4K desktop both at 2.
const DPR_PIXEL_BUDGET = 3.5e6; // device px per canvas
const DPR_MAX = 3;
const DPR_FLOOR = 2; // the cap before this existed — never go below it

function pixelRatioForViewport() {
  const want = window.devicePixelRatio || 1;
  const area = Math.max(1, window.innerWidth * window.innerHeight);
  const affordable = Math.sqrt(DPR_PIXEL_BUDGET / area);
  return Math.min(want, Math.max(DPR_FLOOR, Math.min(DPR_MAX, affordable)));
}

let dpr = pixelRatioForViewport();
let width = 0;
let pageLeft = 0; // document x of the page's left edge — 0 until the scale caps
let height = 0; // canvas height — the viewport's, since the canvas is fixed to it
let playerWidth = 0;
let playerHeight = 0; // the player band's own box, in CSS px
let viewportHeight = 0; // window.innerHeight — layout math (margins, how many rows fit) uses this too

// Writing to canvas.width/height clears the bitmap — even when assigning the
// value it already has. Relayouts happen for reasons that don't change the
// canvas at all (a project expanding, a scrollbar appearing), and each one
// blanked the canvas for a frame, which is what the flicker was.
function sizeSurface(el, context, w, h) {
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (el.width === bw && el.height === bh) return;
  el.width = bw;
  el.height = bh;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Put the canvas over the field's mount, with the bleed around it, and record
// where that box sits in the document so drawField can offset into it.
//
// The bleed is free on three sides: the document does not scroll above its own
// top, and the body clips horizontally. Below, it would be scrollable height
// the page itself does not have — and the field is pinned to the bottom of the
// page precisely so there is none — so the box stops where the page stops.
function applyFieldBox(mount) {
  const left = mount.left - FIELD_BLEED;
  const top = mount.top - FIELD_BLEED;
  const w = mount.width + FIELD_BLEED * 2;
  const pageBottom = pageEl
    ? pageEl.getBoundingClientRect().bottom + window.scrollY
    : Number.POSITIVE_INFINITY;
  const h = Math.max(mount.height, Math.min(top + mount.height + FIELD_BLEED * 2, pageBottom) - top);
  fieldBox.left = left;
  fieldBox.top = top;
  fieldBox.width = w;
  fieldBox.height = h;
  canvas.style.left = left + "px";
  canvas.style.top = top + "px";
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  sizeSurface(canvas, fieldCtx, w, h);
}

function applyCanvasSize() {

  // the player's band takes its size from the stylesheet (110rem tall), so
  // it scales with everything else
  if (playerCanvas) {
    playerWidth = playerCanvas.clientWidth || width;
    playerHeight = playerCanvas.clientHeight || 0;
    // Where the page's left edge is. Past the scale cap the page stops
    // growing and sits centred, so the player's canvas no longer starts at
    // the document's own 0 — everything is measured off getBoundingClientRect
    // in document space, and this is what puts it back into the canvas's.
    pageLeft = playerCanvas.getBoundingClientRect().left + window.scrollX;
    sizeSurface(playerCanvas, playerCtx, playerWidth, playerHeight);
  }
}

// The player's canvas covers the width of the page; the field's covers its own
// mount and is sized in applyFieldBox, which buildField calls once the mount's
// final height is known.
function resize() {
  width = window.innerWidth;
  viewportHeight = window.innerHeight;
  height = viewportHeight;
  // Rotating a phone, or dragging a window between screens of different
  // densities, changes the answer — and sizeSurface only rewrites the backing
  // store when the numbers actually differ, so asking every time is free.
  dpr = pixelRatioForViewport();
  applyCanvasSize();
}
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

// ---------------------------------------------------------------------------
// Wobbly contours
//
// Every shape on the page is the same kind of Figma export: a path carrying a
// feTurbulence/feDisplacementMap filter, which is what gives all of them their
// hand-drawn edge. Browsers get two things wrong with those exports, and the
// repairs below fix both in the SVG text on the way to the rasterizer, rather
// than by hand-editing files that would be overwritten the next time a shape
// is re-exported from Figma. (A third problem, pixel-snapped displacement, is
// fixed at rasterization time instead — see supersampleFor.)
//
// This is opt-in and, for now, only the progress bar asks for it: it is the
// one shape thin enough for the browser's shortcomings to be plainly visible.
// The same treatment would apply unchanged to the circles and the icons.
// ---------------------------------------------------------------------------

// Figma's noise and SVG's feTurbulence are not the same function: fractalNoise
// returns values clustered near mid-channel, so an exported `scale` displaces
// the edge roughly a third as far as Figma draws it and the contour comes out
// nearly geometric. Measured on the progress bar — where Figma shows about 3
// units of undulation against the export's 1 — this is what restores it.
const WOBBLE_GAIN = 3.1;

function amplifyWobble(svgText) {
  return svgText.replace(
    /(<feDisplacementMap\b[^>]*?\bscale=")([\d.eE+-]+)(")/g,
    (_, before, value, after) => before + (parseFloat(value) * WOBBLE_GAIN).toFixed(4) + after,
  );
}

// Figma writes width="100%" height="100%" onto the feDisplacementMap. Those
// percentages resolve against the *viewport*, not the filter region, while the
// subregion's x still defaults to the region's — so the primitive ends up
// covering [regionX, regionX + viewportWidth] and everything past that is cut
// off square. It goes unnoticed while the region starts at ~0, but widening a
// region (as the margin below does) drags the cut inwards with it: at
// x="-8" the bar's rounded right cap came out as a flat wall 8 units early.
// Dropping the attributes lets the subregion default to the filter region,
// which is what the export meant in the first place.
function unclipDisplacement(svgText) {
  return svgText.replace(/(<feDisplacementMap\b[^>]*?)\s*width="100%"\s*height="100%"/g, "$1");
}

// The regions are trimmed tight around the *undisplaced* shape, so a bigger
// displacement runs straight into them. Each is grown by the largest offset its
// own filter could now apply — a displacement map moves a pixel by at most
// scale/2, since the channel it reads spans ±0.5 around mid.
function openFilterRegions(svgText) {
  const scales = [...svgText.matchAll(/<feDisplacementMap\b[^>]*?\bscale="([\d.eE+-]+)"/g)].map((m) =>
    parseFloat(m[1]),
  );
  const margin = (Math.max(0, ...scales) / 2) * 1.2; // a fifth over the worst case
  if (!margin) return svgText;
  return svgText.replace(/<filter\b[^>]*>/g, (tag) =>
    [
      ["x", -margin],
      ["y", -margin],
      ["width", margin * 2],
      ["height", margin * 2],
    ].reduce(
      (out, [attr, by]) =>
        out.replace(new RegExp(`\\b${attr}="([\\d.eE+-]+)"`), (_, v) => `${attr}="${parseFloat(v) + by}"`),
      tag,
    ),
  );
}

// Figma wraps the artwork in a clipPath trimmed to the artboard, which crops
// the wobble flat along whichever edge the shape sits against.
function dropArtboardClips(svgText) {
  return svgText.replace(/\s*clip-path="url\(#[^"]*\)"/g, "");
}

function repairWobble(svgText) {
  return openFilterRegions(unclipDisplacement(amplifyWobble(dropArtboardClips(svgText))));
}

// Opening the filter region only stops the *filter* from cropping; the SVG
// viewport still does, and these exports are trimmed to the undisplaced shape.
// The bar is 11 units of rect in a 15-unit box, so a wobble reaching 1.5 units
// flattens against the top and bottom edges without this. Only the height is
// grown: the bar's drawn width is fixed by the dot row rather than by the
// asset, so the extra vertical room comes through the aspect ratio and the bar
// is drawn at exactly the same thickness in exactly the same place, with
// clear space above and below it. Growing the width would instead rescale it
// and pull its ends off the circles.
function padSvgBox(svgText, padX, padY) {
  const { w, h } = parseSvgSize(svgText);
  const box = svgText.match(/viewBox="([^"]+)"/);
  const [x, y, vw, vh] = box ? box[1].trim().split(/[\s,]+/).map(Number) : [0, 0, w, h];
  return svgText
    .replace(/viewBox="[^"]*"/, `viewBox="${x - padX} ${y - padY} ${vw + padX * 2} ${vh + padY * 2}"`)
    .replace(`width="${w}"`, `width="${w + padX * 2}"`)
    .replace(`height="${h}"`, `height="${h + padY * 2}"`);
}

// How much bigger than its kept size a shape is rendered before being averaged
// down. Browsers snap feDisplacementMap to whole pixels of the raster, so
// without this the restored wobble arrives as hard stair-steps instead of a
// curve — measured on the bar, the edge had five discrete heights. The factor
// is chosen per asset to keep the intermediate render inside what canvas and
// image decoders will take; the shapes already rasterized very large (the
// list's bar) resolve the displacement finely enough on their own.
const SUPERSAMPLE_MAX_PX = 8192;

function supersampleFor(targetW, targetH) {
  return Math.max(1, Math.min(8, Math.floor(SUPERSAMPLE_MAX_PX / Math.max(targetW, targetH))));
}

// Renders an SVG (optionally recoloring its fill) to an offscreen canvas at
// `scale`x its native size. The returned canvas keeps the SVG's own aspect
// ratio, so square assets (the blob) and non-square ones (the icons) both
// just work.
async function rasterizeSvg(
  svgText,
  {
    fillFrom = null,
    fillTo = null,
    scale = 1,
    targetSize = null,
    repair = false,
    padX = 0,
    padY = 0,
  } = {},
) {
  let text = svgText;
  if (fillFrom && fillTo) {
    text = text.replaceAll(fillFrom, fillTo);
  }
  if (repair) text = repairWobble(text);
  if (padX || padY) text = padSvgBox(text, padX, padY);
  const { w, h } = parseSvgSize(text);
  // targetSize rasterizes to that size regardless of the source's own native
  // dimensions, so variants with different viewBoxes still come out equally crisp.
  const effectiveScale = targetSize ? targetSize / Math.max(w, h) : scale;
  const targetW = Math.round(w * effectiveScale);
  const targetH = Math.round(h * effectiveScale);
  // Rendered bigger than the canvas that's kept, then averaged back down.
  const superSample = repair ? supersampleFor(targetW, targetH) : 1;
  const renderW = targetW * superSample;
  const renderH = targetH * superSample;
  text = text.replace(`width="${w}"`, `width="${renderW}"`).replace(`height="${h}"`, `height="${renderH}"`);

  const img = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(text))));
  const off = document.createElement("canvas");
  off.width = targetW;
  off.height = targetH;
  const ctx = off.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  if (superSample === 1) {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return off;
  }

  // Halved one step at a time: asked to shrink by more than 2x in a single
  // draw, canvas smoothing samples the source rather than averaging all of
  // it, which would put the steps straight back.
  let src = img;
  let srcW = renderW;
  let srcH = renderH;
  while (srcW > targetW * 2) {
    srcW = Math.max(targetW, Math.round(srcW / 2));
    srcH = Math.max(targetH, Math.round(srcH / 2));
    const step = document.createElement("canvas");
    step.width = srcW;
    step.height = srcH;
    const stepCtx = step.getContext("2d");
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(src, 0, 0, srcW, srcH);
    src = step;
  }
  ctx.drawImage(src, 0, 0, targetW, targetH);
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

// Figma inner shadow on the preview circles: X 0, Y 0, blur 13.5, spread 0,
// #000000 at 50% — the same one app.js bakes into the artwork in the lists,
// repeated here because the field draws its circles as bitmaps of its own.
// Figma states a blur radius of 2 sigma (as CSS drop-shadow does), so the
// Gaussian is half of it, and it's scaled by however much larger the bake is
// than the circle's design diameter.
const INNER_SHADOW = { blur: 13.5 / 2, alpha: 0.5, color: "#000000" };

// The blurred complement of the outline, clipped back to it — an inset
// box-shadow would be cast from the square, not the blob. Padded, so the
// blur at the frame's edge doesn't sample the transparency beyond it and
// thin the shadow where the blob runs out to meet it.
function drawBlobInnerShadow(ctx, mask, size, blur) {
  const pad = Math.ceil(blur * 3);
  const full = size + pad * 2;

  const cut = document.createElement("canvas");
  cut.width = full;
  cut.height = full;
  const cutCtx = cut.getContext("2d");
  cutCtx.fillStyle = INNER_SHADOW.color;
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
  ctx.globalAlpha = INNER_SHADOW.alpha;
  ctx.drawImage(shade, -pad, -pad);
  ctx.globalAlpha = 1;
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
  drawBlobInnerShadow(c, maskCanvas, size, INNER_SHADOW.blur * (size / (DESIGN_PROJECT_CIRCLE_R * 2)));
  return off;
}

// ---------------------------------------------------------------------------
// Audio: a single <audio> element run through an AnalyserNode. Each circle
// samples one FFT bin (picked from a stable hash of its index) so the field
// doesn't just pulse as one uniform blob.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The deck
//
// This was an <audio> element until Safari was actually measured. Safari does
// not honour playbackRate on a media element: asked for 0.5 the playhead
// advanced at 0.215, asked for 0.125 or 0.09 it floored at 0.16 and refused to
// go slower, and the output collapsed from a level of 10.7 to 1.15 — near
// silence. No error, no warning; it reports back whatever rate you set,
// including 17. So the wind-down came out there as a stuttering fade instead
// of a drop in pitch. Chrome does it perfectly, which is how it got shipped.
//
// AudioBufferSourceNode.playbackRate is a different thing entirely: a real
// AudioParam that resamples, so pitch follows speed exactly as a record's
// does, sample-accurately and identically in every browser. Measured in the
// same Safari: a 2s sweep ran 1 → 0.88 → 0.75 → 0.62 → 0.49 → 0.36 → 0.24 →
// 0.11 without a stumble, audible the whole way (quietest 6.9 against 25.7 at
// full speed), with the spectral centroid falling 15.9 → 2.8 alongside it.
//
// The cost is that a buffer source is not a media element: it has no
// currentTime, no duration, no pause, and it can only be started once. So the
// deck below puts that surface back — the same properties, methods and events
// the rest of the player already speaks to — with Web Audio underneath. That
// way one file changes rather than sixty-four call sites.
// ---------------------------------------------------------------------------

let audioCtx = null;
let analyser = null;
let freqData = null;
let gainNode = null;

// Per-frame rate writes are glided over this long rather than stepped, so the
// resampling ratio never jumps between one frame and the next.
const RATE_GLIDE = 0.03;

// How long a jump of the playhead is held "in flight". The jump itself is
// instant now, but the sound is ducked across it, and this is what gives that
// duck room — see the currentTime setter.
const SEEK_SETTLE_MS = 25;

// How much of a track has to have arrived before it starts playing. An mp3 is
// a plain run of frames, so a prefix of the bytes decodes to exactly that
// prefix of the music — measured in both browsers, 30% of the file gives 30%
// of the track to within a tenth of a second. The rest keeps downloading
// underneath and is handed over to seamlessly when it lands.
const PROGRESSIVE_AT = 0.3;
// Below this a file is small enough that waiting for all of it costs nothing,
// and a prefix of it may be too short to decode at all.
const PROGRESSIVE_MIN_BYTES = 512 * 1024;
// How far ahead the handover from prefix to whole is scheduled — long enough
// for the audio thread to have both sources ready, short enough to be no
// delay at all.
const HANDOVER_LEAD = 0.05;

function makeDeck() {
  const listeners = new Map();
  let src = null;
  let buffer = null;
  let node = null;
  let position = 0; // seconds into the buffer
  let clock = 0; // audio-clock time the position was last brought up to date
  let running = false; // a node is sounding
  let wantRate = 1;
  let loadToken = 0;
  let loading = false;
  let loaded = 0; // 0..1 of the track being fetched, for the progress readout
  let partial = false; // playing a prefix while the rest is still arriving
  // What the whole track runs to, told to us rather than guessed. It cannot be
  // worked out from the prefix: these files are variable-bitrate, so a share of
  // the bytes is not the same share of the time — measured, 30% of one file
  // decoded to 15% of its music. The library already stores every duration.
  let expected = 0;
  let ended = false;
  let stopping = false; // a stop we asked for, so onended isn't the track ending
  let seekingUntil = 0;

  const emit = (type) => {
    for (const fn of listeners.get(type) || []) fn({ type });
  };

  // Everything that reads the playhead comes through here, so the position is
  // integrated against the audio clock at whatever rate is actually in force —
  // during a sweep that is a moving target, which is why it can't simply be
  // "started at T, so it must be at now - T".
  const advance = () => {
    const now = audioCtx ? audioCtx.currentTime : 0;
    if (running && node) {
      position += (now - clock) * node.playbackRate.value;
      if (buffer && position >= buffer.duration) position = buffer.duration;
    }
    clock = now;
  };

  const detach = () => {
    if (!node) return;
    stopping = true;
    node.onended = null;
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
    node.disconnect();
    node = null;
    stopping = false;
  };

  const attach = (offset) => {
    if (!buffer || !audioCtx) return;
    detach();
    node = audioCtx.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = wantRate;
    node.connect(gainNode);
    node.onended = () => {
      if (stopping) return;
      // the buffer ran out — the element's own order is pause, then ended, and
      // the queue's advance leans on that
      running = false;
      ended = true;
      deck.dispatch("pause");
      deck.dispatch("ended");
    };
    clock = audioCtx.currentTime;
    node.start(0, Math.max(0, Math.min(offset, buffer.duration - 0.01)));
    running = true;
    ended = false;
  };

  // Decoded tracks, keyed by URL. Small on purpose: a three-minute track is
  // around 60MB of float32, so this holds the one playing and the one queued
  // up behind it and nothing else.
  const decoded = new Map();
  const CACHE_MAX = 2;

  const remember = (url, audio) => {
    decoded.set(url, audio);
    while (decoded.size > CACHE_MAX) decoded.delete(decoded.keys().next().value);
  };

  // Read through the body rather than taking it in one piece, so how much has
  // arrived can be reported while it arrives. Only the track being played asks
  // for that; a prefetch passes no reporter and takes the simple path.
  // Safari only reliably takes the callback form of decodeAudioData.
  const decodeBytes = (bytes) =>
    new Promise((resolve, reject) => {
      const maybe = audioCtx.decodeAudioData(bytes, resolve, reject);
      if (maybe && maybe.then) maybe.then(resolve, reject);
    });

  const fetchAndDecode = async (url, onProgress, onEnough) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get("content-length")) || 0;
    let bytes;
    // A body with no declared length can't be turned into a percentage, and
    // nor can one the browser won't hand over as a stream — both fall back to
    // reading it whole, and the indicator simply doesn't appear.
    if (onProgress && total && response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      let offered = false;
      const join = () => {
        const joined = new Uint8Array(received);
        let at = 0;
        for (const chunk of chunks) {
          joined.set(chunk, at);
          at += chunk.length;
        }
        return joined;
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const fraction = Math.min(1, received / total);
        onProgress(fraction);
        // Offered once, as soon as there is enough of it — and on a copy,
        // because decodeAudioData takes the buffer away from us and the rest
        // of the file still has to be assembled from these same chunks.
        if (onEnough && !offered && fraction >= PROGRESSIVE_AT && total >= PROGRESSIVE_MIN_BYTES) {
          offered = true;
          await onEnough(join().buffer, fraction);
        }
      }
      bytes = join().buffer;
    } else {
      bytes = await response.arrayBuffer();
      if (onProgress) onProgress(1);
    }
    return decodeBytes(bytes);
  };

  const load = async (url) => {
    const token = ++loadToken;
    position = 0;
    ended = false;
    // Already decoded — the change of record can land on the beat it was
    // timed for instead of waiting on the network and the decoder.
    if (decoded.has(url)) {
      buffer = decoded.get(url);
      loading = false;
      deck.dispatch("loadstart");
      deck.dispatch("loadeddata");
      if (running) {
        attach(position);
        deck.dispatch("playing");
      }
      return;
    }
    loading = true;
    loaded = 0;
    buffer = null;
    partial = false;
    deck.dispatch("loadstart");
    try {
      const audio = await fetchAndDecode(
        url,
        (fraction) => {
          // a newer track was asked for meanwhile — its own load owns the readout
          if (token === loadToken) loaded = fraction;
        },
        // Enough has arrived to start on: an mp3 is a plain run of frames, so
        // a prefix of the bytes decodes to exactly that prefix of the music —
        // measured, 30% of the file gives 30% of the track, to a tenth of a
        // second. Playing begins there and the rest keeps coming.
        async (prefix) => {
          if (token !== loadToken || buffer || !running) return;
          let head;
          try {
            head = await decodeBytes(prefix);
          } catch {
            return; // not enough to make sense of yet; the next chunk will try
          }
          if (token !== loadToken || buffer) return;
          buffer = head;
          partial = true;
          deck.dispatch("loadeddata");
          attach(position);
          deck.dispatch("playing");
        },
      );
      if (token !== loadToken) return; // a newer track was asked for meanwhile
      remember(url, audio);
      const wasPartial = partial;
      const soundingOnPrefix = wasPartial && running && node;
      partial = false;
      loading = false;
      if (soundingOnPrefix) {
        // Hand over from the prefix to the whole thing without a seam: the new
        // source is scheduled to begin at the very instant the old one is cut,
        // at the offset the playhead will have reached by then.
        handOver(audio);
      } else {
        buffer = audio;
        deck.dispatch("loadeddata");
        // play() was pressed while this was still loading — start it now, and
        // say so: "playing" is what brings the sound back up out of the duck
        // the swap went into, and without it the new track ran on in silence.
        if (running) {
          attach(position);
          deck.dispatch("playing");
        }
      }
    } catch {
      if (token !== loadToken) return;
      loading = false;
      partial = false;
      deck.dispatch("error");
    }
  };

  // Swap the prefix for the complete track mid-flight. Scheduled rather than
  // done on the spot: stopping one source and starting another from JS leaves
  // a millisecond of nothing, while giving both the same audio-clock instant
  // joins them sample to sample.
  const handOver = (whole) => {
    const old = node;
    buffer = whole;
    if (!old || !audioCtx) {
      if (running) attach(position);
      return;
    }
    advance();
    const at = audioCtx.currentTime + HANDOVER_LEAD;
    const rate = old.playbackRate.value;
    const offset = Math.min(position + (at - clock) * rate, whole.duration - 0.01);
    const next = audioCtx.createBufferSource();
    next.buffer = whole;
    next.playbackRate.value = rate;
    next.connect(gainNode);
    // the old one's ending is our doing, not the track's
    old.onended = null;
    old.stop(at);
    next.onended = () => {
      if (stopping) return;
      running = false;
      ended = true;
      deck.dispatch("pause");
      deck.dispatch("ended");
    };
    next.start(at, Math.max(0, offset));
    node = next;
    // the position is now measured from the instant the new source begins
    position = Math.max(0, offset);
    clock = at;
  };

  const deck = {
    // --- the element's surface -------------------------------------------
    get src() {
      return src;
    },
    set src(value) {
      const url = new URL(value, location.href).href;
      if (url === src) return;
      src = url;
      detach();
      running = false;
      partial = false;
      ensureAudioGraph();
      load(url);
    },
    get currentTime() {
      advance();
      return position;
    },
    set currentTime(seconds) {
      advance();
      position = Math.max(0, Math.min(seconds, buffer ? buffer.duration : seconds));
      ended = false;
      if (running) attach(position);
      // A media element reports `seeking` until the jump lands and only then
      // fires `seeked`. Here it is instant — but the click suppression around
      // it needs the sound to be down *over* the jump, so the same shape is
      // kept and the landing is held off long enough for the duck to take.
      seekingUntil = performance.now() + SEEK_SETTLE_MS;
      setTimeout(() => deck.dispatch("seeked"), SEEK_SETTLE_MS);
    },
    get duration() {
      // While a prefix is playing this is what the whole track runs to, not
      // what is decoded — otherwise the bar would scale itself to the part and
      // jump when the rest arrived.
      if (partial && expected) return expected;
      return buffer ? buffer.duration : NaN;
    },
    get paused() {
      return !running;
    },
    get ended() {
      return ended;
    },
    get seeking() {
      return performance.now() < seekingUntil;
    },
    // 4 = HAVE_ENOUGH_DATA, 1 = HAVE_METADATA-ish while it loads, 0 = nothing
    get readyState() {
      return buffer ? 4 : loading ? 1 : 0;
    },
    // How much of the current track has arrived, 0..1 — null whenever nothing
    // is being fetched, which includes a track that was already prefetched and
    // so never has a readout at all.
    get loadProgress() {
      return loading ? loaded : null;
    },
    get playbackRate() {
      return node ? node.playbackRate.value : wantRate;
    },
    set playbackRate(rate) {
      wantRate = rate;
      if (!node || !audioCtx) return;
      advance(); // bank the position at the old rate before changing it
      const p = node.playbackRate;
      const t = audioCtx.currentTime;
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(rate, t + RATE_GLIDE);
    },
    // The track's real length, from the library, so the bar is right from the
    // first moment even while only a prefix has been decoded.
    set expectedDuration(seconds) {
      expected = Number(seconds) > 0 ? Number(seconds) : 0;
    },
    // resampling always carries the pitch with it — that is the whole point —
    // so these exist only so the callers that set them keep working
    preservesPitch: false,
    preload: "auto",
    loop: false,
    volume: 1,

    play() {
      ensureAudioGraph();
      resumeAudio();
      if (!running) {
        running = true;
        deck.dispatch("play");
        if (buffer) {
          attach(position);
          deck.dispatch("playing");
        }
        // still loading: attach() runs from load() the moment it lands
      }
      return Promise.resolve();
    },
    pause() {
      if (!running) return;
      advance();
      detach();
      running = false;
      deck.dispatch("pause");
    },

    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch: emit,

    // --- what only the deck can answer ------------------------------------
    // the loop calls this so the playhead stays current even when nothing has
    // read currentTime this frame
    tick: advance,

    // Warm a track that is likely to be asked for next, so the change of
    // record lands on the beat it was timed for. Quietly does nothing if it
    // is already in hand or the graph isn't up yet.
    prefetch(url) {
      if (!url || !audioCtx) return;
      const absolute = new URL(url, location.href).href;
      if (decoded.has(absolute)) return;
      fetchAndDecode(absolute).then(
        (audio) => remember(absolute, audio),
        () => {}, // a track that won't load is the error handler's problem, not this one's
      );
    },
  };

  return deck;
}

const audioEl = makeDeck();

// A media element cut off mid-waveform pops, and so does one that starts
// mid-waveform — the jump from silence to wherever the signal happens to be
// is a step, and a step is a click. Every start, stop and change of track is
// taken through a short ramp on a gain node instead: long enough to swallow
// the discontinuity, far too short to hear as a fade.
const FADE_MS = 35;

// The far end of the graph, built once. Each track's buffer source is created
// per play and connects into gainNode, so there is no permanent source node
// any more — the deck owns that end.
function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0; // brought up by the "playing" handler below
  // the element's own 0.6 used to live on `volume`; with nothing but the graph
  // left it belongs here, folded into the same node the fades ride on
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  // ahead of the analyser, so the circles see the same fade the ears do
  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  watchAudioState();
}

// What "full volume" means for the fades — the level the element carried on
// `volume` before, now the top of every gain ramp.
const FULL_GAIN = 0.6;

// `to` is 0..1 — callers ask for silence or for full, and full is FULL_GAIN.
// Safari parks a context at "interrupted" as well as "suspended" — another
// app took the audio session, or the tab spent time in the background — and
// it only ever leaves that state on being asked. Testing for "suspended"
// alone was enough in Chrome, which has no such state, and silently was not
// here: the graph stayed frozen, so a press produced a spin-up with no sound
// behind it. Anything that isn't running gets asked.
function resumeAudio() {
  if (!audioCtx) return;
  if (audioCtx.state !== "running") audioCtx.resume();
}

// ...and it can be interrupted again at any point, so it is asked once more
// whenever it drifts while something is meant to be sounding.
function watchAudioState() {
  if (!audioCtx || !audioCtx.addEventListener) return;
  audioCtx.addEventListener("statechange", () => {
    if (transportOn && audioCtx.state !== "running") audioCtx.resume();
  });
}

function fadeGain(to, ms = FADE_MS) {
  if (!gainNode) return;
  const now = audioCtx.currentTime;
  const level = gainNode.gain;
  // from wherever a ramp already in flight has got to, rather than from the
  // value it was last set to
  level.cancelScheduledValues(now);
  level.setValueAtTime(level.value, now);
  level.linearRampToValueAtTime(to * FULL_GAIN, now + ms / 1000);
}

// Sound is only ever brought up once it is genuinely running: "play" fires the
// moment the button is pressed, while the element may still be fetching, and
// ramping up then would leave the fade spent by the time the first sample
// arrives. "playing" is the one that means audible.
// ...except while the bar is being dragged: every seek along it re-buffers,
// and each of those fires "playing" again, which would pull the sound back up
// between jumps and hand back the very clicks the drag is being held quiet to
// avoid. The release puts it back — see restoreAfterSeek.
audioEl.addEventListener("playing", () => {
  if (!draggingProgress) fadeGain(1);
});
// ...and taken down as a new track starts loading, so the old one is not
// simply chopped off when its source is replaced.
audioEl.addEventListener("loadstart", () => fadeGain(0));

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
  constructor({ x, y, r, kind, blob, seed, title, projectId = null, leash = 0, row = 0, col = 0, rotation = 0 }) {
    this.projectId = projectId; // set on 'project' circles — clicking one opens that project
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

// Document-space rect of a layout mount, or null if it isn't in the page.
function mountRect(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 1 && r.height < 1) return null; // hidden view
  return { el, left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
}

function buildField() {
  const mount = mountRect(fieldMountId);
  if (!mount) {
    field.cols = 0;
    field.rows = 0;
    return;
  }

  const cellSize = CELL_SPACING;
  // The grid fills whatever box CSS gave the mount, but never gets shorter
  // than MIN_FIELD_ROWS — when that's taller than the box, the mount is
  // grown to match and the page scrolls, rather than the grid shrinking.
  const cols = Math.max(3, Math.floor((mount.width - CIRCLE_MAX_R * 2) / cellSize) + 1);
  const fitRows = Math.max(1, Math.floor((mount.height - CIRCLE_MAX_R * 2) / cellSize) + 1);
  const rows = Math.max(MIN_FIELD_ROWS, fitRows);

  // The box ends exactly where the bottom row's circles do. The top row is
  // smaller than the cap (the size gradient is anchored at the bottom), so
  // reserving a cap radius at both ends left a strip of dead space under the
  // last row — and the page with it.
  const topRowGradient = Math.hypot(rows - 1, 0) / (Math.hypot(rows - 1, (cols - 1) / 2) || 1);
  const topRowRadius = CIRCLE_MAX_R * (1 - Math.min(1, topRowGradient) * (1 - FIELD_GRADIENT_MIN));
  const neededHeight = topRowRadius + (rows - 1) * cellSize + CIRCLE_MAX_R;
  if (Math.abs(mount.height - neededHeight) > 1) {
    mount.el.style.height = neededHeight + "px";
    mount.height = neededHeight;
  }

  // The canvas goes where the grid is about to be, at the height just settled
  // on rather than the one CSS happened to give the box.
  applyFieldBox(mount);

  // Same story as buildPlayer: a relayout is usually nothing to do with the
  // field (a project expanded, a scrollbar appeared), and rebuilding would
  // re-roll every outline and rotation and re-shuffle where the project
  // circles sit. When the grid's dimensions haven't changed, the existing
  // circles are just moved.
  const sameGrid = field.circles.length > 0 && field.rows === rows && field.cols === cols;

  const marginX = mount.left + (mount.width - (cols - 1) * cellSize) / 2;
  // Offset the first row by the radius its own biggest dot will get, not by
  // CIRCLE_MAX_R: the size gradient is anchored at the bottom, so the top row
  // is smaller than the cap and using the cap would leave a few px of dead
  // space above the field. This way the topmost dot's edge sits exactly on
  // the mount, and whatever gap CSS gives the mount is the gap you see.
  const topRowDist = Math.hypot(rows - 1, 0); // (row 0, centre col) to the bottom-centre anchor
  const gradientSpan = Math.hypot(rows - 1, (cols - 1) / 2) || 1;
  const topRowMaxR =
    CIRCLE_MAX_R * (1 - Math.min(1, topRowDist / gradientSpan) * (1 - FIELD_GRADIENT_MIN));
  const marginY = mount.top + topRowMaxR;

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

  if (sameGrid) {
    for (const c of field.circles) {
      const hx = marginX + c.col * cellSize;
      const hy = marginY + c.row * cellSize;
      const dx = hx - c.homeX;
      const dy = hy - c.homeY;
      c.homeX = hx;
      c.homeY = hy;
      if (!c.dragging) {
        // move with home, keeping any cursor push or collision offset
        c.x += dx;
        c.y += dy;
      }
      // project circles keep their fixed size; ambient ones sit on the
      // gradient, which moves with the scale
      if (c.kind === "project") {
        const ratio = c.baseR > 0.001 ? PROJECT_CIRCLE_R / c.baseR : 1;
        c.baseR = PROJECT_CIRCLE_R;
        c.r *= ratio;
        c.leash = PROJECT_CIRCLE_R * 1.6;
      } else {
        const dist = Math.hypot(c.row - (rows - 1), c.col - field.centerCol);
        const span = Math.hypot(rows - 1, field.centerCol) || 1;
        const restR = CIRCLE_MAX_R * (1 - Math.min(1, dist / span) * (1 - FIELD_GRADIENT_MIN));
        const ratio = c.baseR > 0.001 ? restR / c.baseR : 1;
        c.baseR = restR;
        c.r *= ratio;
      }
    }
    return;
  }

  field.circles = [];

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

  // however many blobs are actually built: swapping the field's set is
  // asynchronous, and a relayout landing mid-swap must not ask for art that
  // isn't there yet
  const projectCount = Math.min(PROJECT_IMAGES.length, blobs.projects.length);
  // Farthest-point rather than "shuffle until nothing is too close": a random
  // placement that merely clears a minimum gap still bunches — three circles
  // in one corner and an empty half — because the gap says nothing about how
  // the rest of the field is used. Each pick here is the cell furthest from
  // everything already placed, so they end up spread over the whole grid; the
  // first pick is random, so it isn't the same arrangement every load.
  const projectCells = maximizeSpreadPlacement(innerCells, projectCount);

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
            projectId: proj.id,
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

const DESIGN_AMBIENT_PADDING = 4;
const DESIGN_PROJECT_PADDING = 8; // wider clearance kept around project circles specifically
let AMBIENT_PADDING = DESIGN_AMBIENT_PADDING * designScale;
let PROJECT_PADDING = DESIGN_PROJECT_PADDING * designScale;

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

        // Project circles are stationary anchors *to the ambient dots*: they
        // push those out of the way and are never nudged by them. Against
        // each other they behave like everything else, so two of them meeting
        // share the push and come apart — their leashes then walk them back
        // toward home.
        const bothProjects = a.kind === "project" && b.kind === "project";
        const aFixed = a.dragging || (a.kind === "project" && !bothProjects);
        const bFixed = b.dragging || (b.kind === "project" && !bothProjects);
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

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------
// The three numbers above were tuned by eye, in milliseconds, against nothing
// in particular. When the track that's playing knows its own tempo they are
// rounded to a whole number of beats instead, so the wave leaves on the beat
// and keeps leaving on it rather than drifting against the music.
//
// Only the grid changes, not the shape: the travel time moves to the nearest
// whole beat and the dip keeps its exact proportion of it, so what was tuned
// still looks the way it was tuned. At 100bpm — the library's median — six
// beats come to 3600ms, which is the hand-set value to the millisecond.
//
// A track with no bpm (the "-" case) keeps the fixed timings and runs free.
const WAVE_POP_RATIO = WAVE_POP_MS / WAVE_TRAVEL_MS;
const FREE_TIMING = { travel: WAVE_TRAVEL_MS, pop: WAVE_POP_MS, launch: WAVE_LAUNCH_INTERVAL, beats: 0 };

let waveTiming = FREE_TIMING;

function timingForTempo(bpm) {
  const tempo = Number(bpm);
  if (!Number.isFinite(tempo) || tempo <= 0) return FREE_TIMING;
  const beat = 60000 / tempo;
  const beats = Math.max(1, Math.round(WAVE_TRAVEL_MS / beat));
  const travel = beats * beat;
  return { travel, pop: travel * WAVE_POP_RATIO, launch: travel, beats };
}

// Every track that starts gets one of the shapes above, drawn from a shuffle
// bag rather than picked at random each time: the bag holds one of each, so
// all of them are used before any comes round again, and a refilled bag never
// opens with the shape that just played. That's "random, no repeats" — you
// never see the same wave two tracks running, and you never sit through a run
// of one variant while another goes unseen.
const waveBag = [];

function nextWaveVariant() {
  if (!waveBag.length) {
    waveBag.push(...Object.keys(WAVE_VARIANTS));
    for (let i = waveBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [waveBag[i], waveBag[j]] = [waveBag[j], waveBag[i]];
    }
    // the seam between two bags is the one place a repeat can slip through
    if (waveBag.length > 1 && waveBag[0] === wave.variant) {
      [waveBag[0], waveBag[1]] = [waveBag[1], waveBag[0]];
    }
  }
  return waveBag.shift();
}

// A *new* track is what re-rolls the wave — resuming the one that's already
// loaded keeps the shape it was given (and the wave runs off the track's own
// currentTime, so it picks up exactly where the pause left it).
let waveRolledFor = null;

audioEl.addEventListener("play", () => {
  if (audioEl.src === waveRolledFor) return;
  waveRolledFor = audioEl.src;
  wave.variant = nextWaveVariant();
});

// The HUD "replay" button previews a variant even while audio is paused
// (covers just over one launch interval, using wall-clock time instead of
// the track's currentTime).
function previewFieldWave(variantName) {
  if (!WAVE_VARIANTS[variantName]) return;
  wave.variant = variantName;
  wave.previewStart = performance.now();
  wave.previewUntil = wave.previewStart + waveTiming.launch + waveTiming.pop;
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

  const { travel, pop, launch } = waveTiming;
  const delay = WAVE_VARIANTS[wave.variant](c, grid) * travel;
  const raw = elapsedMs - delay;
  const localPhase = ((raw % launch) + launch) % launch;
  if (localPhase > pop) return 0;
  const localT = localPhase / pop;
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

// Dots immediately beside the center (distance 1) are the biggest — CIRCLE_MAX_R
// — and taper to nothing at the corner cells. Measured off the Figma frame:
// the falloff is plain linear in the distance from the center cell, e.g. at
// 97.85px spacing r goes 29.65 (d=1) → 25.99 (d=√2) → 20.70 (d=2) →
// 11.76 (d=3) → ~0 (d=√18), which is exactly this line.
const PLAYER_CENTER_INDEX = Math.floor(PLAYER_GRID / 2);
const PLAYER_CORNER_DIST = Math.hypot(PLAYER_CENTER_INDEX, PLAYER_CENTER_INDEX);

function satelliteRadius(distFromCenter) {
  const t = Math.max(0, Math.min(1, (distFromCenter - 1) / (PLAYER_CORNER_DIST - 1)));
  return CIRCLE_MAX_R * (1 - t);
}

function buildPlayer() {
  const cellSize = CELL_SPACING;
  const totalSize = cellSize * player.cols;
  player.cellSize = cellSize;

  // Anchored to its DOM mount (document coords) so CSS decides where the
  // cluster sits; falls back to the old top-right corner if the mount is
  // missing for any reason.
  const mount = mountRect("playerMount");
  if (mount) {
    player.originX = mount.left + (mount.width - totalSize) / 2;
    player.originY = mount.top + (mount.height - totalSize) / 2;
  } else {
    player.originX = width - totalSize - 44;
    player.originY = 44;
  }

  const centerRow = Math.floor(player.rows / 2);
  const centerCol = Math.floor(player.cols / 2);
  player.centerX = player.originX + centerCol * cellSize + cellSize / 2;
  player.centerY = player.originY + centerRow * cellSize + cellSize / 2;
  player.centerR = CIRCLE_MAX_R * 1.3; // click-target radius; no visible disc is drawn
  // what WAVE_VARIANTS needs to run a wave through this cluster
  player.centerRow = centerRow;
  player.centerCol = centerCol;
  player.maxDist = Math.hypot(centerRow, centerCol) || 1;
  player.maxChebyshev = Math.max(centerRow, centerCol) || 1;

  const lastRow = player.rows - 1;
  const lastCol = player.cols - 1;

  // Relayouts happen for reasons that have nothing to do with the cluster —
  // a project expanding, a scrollbar appearing — and rebuilding the
  // satellites on each one would hand every dot a fresh random outline and
  // rotation and reset its size, which reads as the whole cluster blinking.
  // So when the grid is unchanged, only the geometry is refreshed and every
  // dot keeps its identity and its place in the animation.
  const reposition = player.satellites.length > 0;
  if (reposition) {
    for (const s of player.satellites) {
      const prevHomeX = s.homeX;
      const prevHomeY = s.homeY;
      s.homeX = player.originX + s.col * cellSize + cellSize / 2;
      s.homeY = player.originY + s.row * cellSize + cellSize / 2;
      const restR = satelliteRadius(Math.hypot(s.col - centerCol, s.row - centerRow));
      // carry the current radius across a rescale in proportion, so the wave
      // doesn't jump mid-dip
      const ratio = s.r > 0.001 ? restR / s.r : 1;
      s.r = restR;
      s.baseR = restR;
      s.baseFrom = restR;
      s.baseTo = restR;
      s.drawR *= ratio;
      s.drawVel *= ratio;
      // carry whatever offset the dot currently has (cursor push, settle
      // tween) over to the new home, rather than snapping it back
      s.x += s.homeX - prevHomeX;
      s.y += s.homeY - prevHomeY;
    }
  }

  if (!reposition) {
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

  // The bar is the bottom row: it begins on the first of those dots and ends
  // on the last, so its ends sit inside a circle instead of overhanging the
  // cluster. Only the width is measured from the lattice — the thickness
  // follows from the SVG's own proportions, so the rounded caps and the noise
  // along the edge stay undistorted rather than being stretched to fit.
  const trackAspect = playerBar.trackGold.height / playerBar.trackGold.width;
  player.trackWidth = (player.bottomRowLastCol - player.bottomRowFirstCol) * cellSize;
  player.trackHeight = player.trackWidth * trackAspect;
  player.trackX =
    player.originX +
    player.bottomRowFirstCol * cellSize +
    cellSize / 2 +
    DESIGN_TRACK_NUDGE_X * designScale;
  player.trackY = player.originY + lastRow * cellSize + cellSize / 2;
}

// Both scale with the design (see applyScale/scaleDerived) so the cursor
// nudge feels the same at every viewport width.
const DESIGN_CURSOR_PUSH = 6; // small nudge only — every circle stays hoverable
// per-frame fraction of the way to the retreat position; shared with the DOM
// halo dots through cursorParams()
const CURSOR_APPROACH = 0.18;
let CURSOR_INFLUENCE = CELL_SPACING * 6; // pushes circles up to 6 grid-steps away
let CURSOR_PUSH = DESIGN_CURSOR_PUSH * designScale;

// The metrics above derive from CELL_SPACING/designScale, which applyScale()
// refreshes — but they're declared further down the file than applyScale is,
// so they get their own pass rather than a forward reference into it.
function scaleDerived() {
  CURSOR_INFLUENCE = CELL_SPACING * 6;
  CURSOR_PUSH = DESIGN_CURSOR_PUSH * designScale;
  AMBIENT_PADDING = DESIGN_AMBIENT_PADDING * designScale;
  PROJECT_PADDING = DESIGN_PROJECT_PADDING * designScale;
}

const SATELLITE_RANDOM_MIN = 0.1; // random floor, as a fraction of CIRCLE_MAX_R (the same ceiling every dot shares)
const PLAYER_AUDIO_PULSE = 0.35; // same strength as the field's ambient audio pulse

// Experiment: instead of rolling a fresh random size for every satellite when
// playback starts (which just leaves the cluster resized), the satellites run
// the field's travelling wave, so they animate on their resting gradient the
// way the field's circles do. Flip to false to get the old pattern back.
const PLAYER_RUNS_FIELD_WAVE = true;

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

    // Audio pulse, the field's travelling wave passing through the cluster,
    // and the one-shot launch ripple across the bottom row when play is
    // pressed (see bottomWaveBoost). The wave and the pulse both ride on
    // `intensity`, so they ease in and out with playback instead of snapping.
    const intensity = currentFieldIntensity(now);
    const level = audioOn ? sampleBand(hash(s.seed)) : 0;
    let boost = level * PLAYER_AUDIO_PULSE * intensity;
    if (PLAYER_RUNS_FIELD_WAVE) {
      boost += waveBoostFor(s, now, player) * intensity;
    }
    if (s.row === player.rows - 1) {
      boost += bottomWaveBoost(s, now);
    }

    // Never grow past this dot's own resting size — the wave and the pulse
    // only ever take size away, exactly as stepField caps the field's
    // circles. (Capping at CIRCLE_MAX_R instead would let the smaller dots
    // in the gradient swell above the size the design gives them.)
    const drawTarget = Math.min(s.baseR * (1 + boost), s.baseR);
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

    s.x += (targetX - s.x) * CURSOR_APPROACH;
    s.y += (targetY - s.y) * CURSOR_APPROACH;
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
    // off = the accent, on = cream, same as the rest of the transport
    const art = shuffleOn ? icons.shuffle : icons.shuffleOff;
    drawAtNativeScale(art, ICON_UPSCALE, player.shuffleSat.homeX, player.shuffleSat.homeY, scaleMul);
  }
}

// Draws just the gold backing (no cream, no thumb) and returns the playback
// progress, so callers can clip *this* to the reveal wipe while still
// drawing the cream fill and thumb unclipped afterwards — both stick out
// past (or need to fade independently of) the backing's own reveal.
// Changing the record puts the playhead back to nothing in one step, and the
// bar snapping from wherever it was to empty is the one part of the change
// that doesn't move with the rest of it. So across the drop it is eased back
// instead — the tonearm returning rather than blinking home. Only then: a
// seek is meant to be instant, and lagging it would put the thumb behind the
// finger dragging it.
let progressFrom = 0;
let progressReturnUntil = 0;

function beginProgressReturn(from) {
  progressFrom = from;
  progressReturnUntil = performance.now() + SWAP_DROP_MS;
}

function shownProgress(played) {
  const now = performance.now();
  if (now >= progressReturnUntil) return played;
  const t = 1 - (progressReturnUntil - now) / SWAP_DROP_MS;
  return progressFrom + (played - progressFrom) * easeInOutCubic(t);
}

function drawProgressBarBacking() {
  const { trackX, trackY, trackWidth, trackHeight } = player;
  const destY = trackY - trackHeight / 2;
  const duration = audioEl.duration;
  const played = duration && isFinite(duration) ? Math.max(0, Math.min(1, audioEl.currentTime / duration)) : 0;
  const progress = shownProgress(played);

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

  // Center play/pause button — just the icon, no backing disc, always shown.
  // It follows the press rather than `paused`, which only turns true two
  // seconds later once the record has actually wound down.
  const iconBox = CIRCLE_MAX_R * 2.3; // just a touch bigger than the largest dot's diameter

  // ...unless the track is still arriving, in which case the button is the
  // spinner instead, turning clockwise until there is enough of the file to
  // play. Same box as the icons it stands in for, so nothing jumps size.
  if (isBuffering() && icons.loading) {
    ctx.save();
    ctx.translate(player.centerX, player.centerY);
    // y grows downward, so a rising angle turns clockwise
    ctx.rotate(((performance.now() % LOADING_SPIN_MS) / LOADING_SPIN_MS) * Math.PI * 2);
    containDraw(ctx, icons.loading, 0, 0, iconBox, iconBox);
    ctx.restore();
    return;
  }

  const icon = transportOn ? icons.pause : icons.play;
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

// Moving the playhead drops the waveform somewhere unrelated to where it was,
// which is a step, which is a click — and scrubbing along the bar is a great
// many of them in a row. So the sound goes down for the jump and comes back
// once it has landed, the same treatment starting and stopping get. While a
// drag is in progress it simply stays down: seeked fires for every one of
// them, and pumping the gain up and down between them would be worse than
// the clicks.
const SEEK_FADE_MS = 18;
let seekRestoreTimer = null;

function restoreAfterSeek() {
  if (draggingProgress || audioEl.paused) return;
  // A jump still in flight will announce itself when it lands. Restoring now
  // would put the sound back before it has happened, which is what releasing
  // a click did: mousedown ducks and seeks, mouseup arrives a frame later and
  // brought the gain straight back up over the jump it was covering.
  if (audioEl.seeking) return;
  if (seekRestoreTimer !== null) clearTimeout(seekRestoreTimer);
  seekRestoreTimer = null;
  fadeGain(1, SEEK_FADE_MS);
}

audioEl.addEventListener("seeked", restoreAfterSeek);

function seekAudioTo(seconds) {
  const duration = audioEl.duration;
  if (!duration || !isFinite(duration)) return;
  if (!audioEl.paused) {
    fadeGain(0, SEEK_FADE_MS);
    // Last resort, and deliberately not subject to the checks above: a seek
    // to where the playhead already is fires no "seeked" at all, and without
    // this the sound would stay down for good.
    if (seekRestoreTimer !== null) clearTimeout(seekRestoreTimer);
    seekRestoreTimer = setTimeout(() => {
      seekRestoreTimer = null;
      if (!draggingProgress && !audioEl.paused) fadeGain(1, SEEK_FADE_MS);
    }, 400);
  }
  audioEl.currentTime = Math.max(0, Math.min(1, seconds / duration)) * duration;
}

function seekProgressBarTo(x) {
  const duration = audioEl.duration;
  if (!duration || !isFinite(duration)) return;
  const t = Math.max(0, Math.min(1, (x - player.trackX) / player.trackWidth));
  seekAudioTo(t * duration);
}

// ---------------------------------------------------------------------------
// Mouse / drag handling
// ---------------------------------------------------------------------------

const mouse = { x: -9999, y: -9999 };
let draggedCircle = null;
let draggingProgress = false;
let dragStart = null;
const CLICK_SLOP = 6; // px of travel still counted as a click rather than a drag

// Document coordinates, to match how the circles are laid out (the canvas
// itself is pinned to the viewport — see loop()).
function pointerPos(e) {
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX + window.scrollX, y: t.clientY + window.scrollY };
}

// One tap on a touchscreen is two presses as far as these handlers are
// concerned: the browser sends touchstart, and then — for the benefit of
// pages written before touch existed — synthesises a whole mouse sequence
// from the same tap. Both were wired to this function, so every tap ran it
// twice. On the play button that meant press, and un-press: the record
// started winding down and then came straight back up, which read as the
// stop animation half-playing and nothing else happening.
//
// A touch wins, and mouse events are ignored for a moment afterwards. The
// window is generous because the synthesised sequence can arrive a good
// fraction of a second after the finger leaves.
const MOUSE_AFTER_TOUCH_MS = 700;
let lastTouchAt = -Infinity;

function fromSynthesizedMouse(e) {
  if (e.type.startsWith("touch")) {
    lastTouchAt = performance.now();
    return false;
  }
  return performance.now() - lastTouchAt < MOUSE_AFTER_TOUCH_MS;
}

function onPointerDown(e) {
  if (fromSynthesizedMouse(e)) return;
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

  // topmost project circle under the cursor wins — but only while the field
  // is actually the view on screen, so circles left over from it can't be
  // clicked through the list (or caught mid-fade)
  if (viewMode !== "field") return;
  for (let i = field.circles.length - 1; i >= 0; i--) {
    const c = field.circles[i];
    if (c.kind !== "project") continue;
    if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r) {
      draggedCircle = c;
      dragStart = { x: p.x, y: p.y };
      c.dragging = true;
      c.dragOffsetX = p.x - c.x;
      c.dragOffsetY = p.y - c.y;
      break;
    }
  }
}

function onPointerMove(e) {
  if (fromSynthesizedMouse(e)) return;
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  if (draggingProgress) seekProgressBarTo(p.x);
}

function onPointerUp(e) {
  if (e && fromSynthesizedMouse(e)) return;
  const wasScrubbing = draggingProgress;
  draggingProgress = false;
  // held down through the drag, brought back on release — the last seek of a
  // scrub may already have landed, so this can't be left to "seeked" alone
  if (wasScrubbing) restoreAfterSeek();
  if (draggedCircle) {
    // released roughly where it was grabbed — that's a click on the project,
    // not a drag, so open it instead of just letting it spring back
    const moved = dragStart ? Math.hypot(mouse.x - dragStart.x, mouse.y - dragStart.y) : 0;
    if (moved < CLICK_SLOP && projectOpenHandler && draggedCircle.projectId) {
      projectOpenHandler(draggedCircle.projectId);
    }
    draggedCircle.dragging = false;
    draggedCircle = null;
    dragStart = null;
  }
}

// The canvas is pointer-events:none so the page's own UI stays clickable, so
// these listen on the window and simply find nothing when a click lands
// somewhere the circles aren't.
window.addEventListener("mousedown", onPointerDown);
window.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);
window.addEventListener("touchstart", onPointerDown, { passive: true });
window.addEventListener("touchmove", onPointerMove, { passive: true });
window.addEventListener("touchend", onPointerUp);
// A scroll taking the gesture over ends it without a touchend, which used to
// leave a dragged circle stuck to the finger.
window.addEventListener("touchcancel", onPointerUp);

// ---------------------------------------------------------------------------
// Audio controls
// ---------------------------------------------------------------------------

// The playground's <select> is gone — the page hands over a playlist instead
// (see reactiveField.setPlaylist) and gets told what's playing via the
// 'trackchange' callback, so it can render its own now-playing strip.
let playlist = [];
let trackIndex = 0;
let trackChangeHandler = null;

// Set when something outside the playlist is played (see playEntry), so the
// now-playing block reports the track that's actually sounding.
let externalTrack = null;
let progressHandler = null;

function currentTrack() {
  if (externalTrack) return externalTrack;
  return playlist[trackIndex] || null;
}

function announceTrack() {
  const entry = currentTrack();
  audioEl.expectedDuration = (entry && entry.duration) || 0;
  if (trackChangeHandler) trackChangeHandler(entry, trackIndex);
}

// play() hands back a promise that rejects with AbortError whenever a new
// src is loaded before the old one got going — which is exactly what pressing
// next twice quickly does, and with 86 tracks in the queue that happens. The
// audio is fine either way; only the unhandled rejection is a problem, since
// it buries anything real in the console.
function startAudio() {
  const started = audioEl.play();
  if (started && typeof started.catch === "function") {
    started.catch((error) => {
      // NotSupportedError is a source that wouldn't load; the "error" handler
      // below deals with that by moving on, so it isn't a fault to raise here
      if (error && error.name !== "AbortError" && error.name !== "NotSupportedError") throw error;
    });
  }
}

// A track whose file has gone missing must not strand the player — now that
// the first one is loaded at boot, before anyone has pressed anything, a
// single bad path would otherwise mean opening the site to a dead transport.
// It steps on instead, and only a few times in a row, so a whole folder gone
// astray can't send it spinning through the library.
const MAX_LOAD_FAILURES = 3;
let loadFailures = 0;

audioEl.addEventListener("playing", () => {
  loadFailures = 0;
  warmNextTrack();
});

// One turn of the buffering spinner.
const LOADING_SPIN_MS = 900;

// Meant to be playing, but the element hasn't enough of the file to do it —
// pressed play on a track still arriving, or stalled part-way through one.
// Read off readyState rather than tracked through waiting/playing events, so
// it can't be left stuck on by an event that didn't arrive.
function isBuffering() {
  return transportOn && audioEl.readyState < 3; // HAVE_FUTURE_DATA
}
audioEl.addEventListener("error", () => {
  if (!transportOn || playlist.length < 2) return;
  if (++loadFailures > MAX_LOAD_FAILURES) {
    setTransport(false);
    return;
  }
  playAdjacentTrack(1);
});

// ---------------------------------------------------------------------------
// Turntable
//
// Sound doesn't cut in and out, it spins up and winds down. playbackRate is
// eased between a near standstill and full speed with preservesPitch switched
// off, so the pitch rides along with the speed exactly as a record's does
// rather than being held straight by the browser's time-stretcher.
//
// Only starting and stopping does this. Stepping to the next track, or
// picking another one out of the list while something is already sounding,
// leaves the platter turning — it is the same record under a different
// needle.
// ---------------------------------------------------------------------------

// The media element accepts 0.0625 to 16 and throws NotSupportedError outside
// that; measured, it is still perfectly audible at the bottom, just two
// octaves down. The floor sits a little above it so the ends of the sweep
// read as a platter losing its grip rather than as a glitch.
const TURNTABLE_MIN = 0.0625;
const TURNTABLE_FLOOR = 0.09;
// The record takes exactly as long as the player does to fold itself out and
// away (PLAYER_ACTIVE_TWEEN_MS), so pressing play is one movement — the cover
// growing, the transport unfolding and the sound coming up to speed all on
// the same clock — rather than a sequence of separate ones.
const SPIN_UP_MS = PLAYER_ACTIVE_TWEEN_MS;
const SPIN_DOWN_MS = PLAYER_ACTIVE_TWEEN_MS;

// The motor is strongest against a stopped platter, so it comes up quickly
// and eases into its final revolutions...
const spinUpEase = (t) => 1 - Math.pow(1 - t, 3);
// ...and on the way out it holds its speed for a moment and then falls away.
// Squared rather than cubed: cubing kept the record at almost full pitch for
// the first 200ms and then put the whole drop into the last 30, so the low
// end went by too fast to hear. This still answers the click straight away
// and spends most of the sweep somewhere you can follow.
const spinDownEase = (t) => t * t;

let spinFrame = null;
let spinStopTimer = null;
let windingDown = false;

// Everything on screen answers the press, not the platter. Only the sound
// itself has to wait out the wind-down; the transport icon, the logo, the
// palette and the player's own reveal all start their two seconds the moment
// the button goes down, so the record slowing and the player packing itself
// away are one movement rather than two queued back to back. `paused` alone
// can't express that — it doesn't turn true until the record has stopped.
let transportOn = false;
const transportHandlers = [];

function setTransport(on) {
  if (transportOn === on) return;
  transportOn = on;
  for (const handler of transportHandlers) handler(on);
}

function onTransport(handler) {
  transportHandlers.push(handler);
  handler(transportOn);
}

// Backstops, for anything that starts or stops the element without going
// through the two below — both are no-ops when the state already agrees.
audioEl.addEventListener("play", () => setTransport(true));
audioEl.addEventListener("pause", () => {
  // Reaching the end of a track fires `pause` — with `paused` already true —
  // a moment before `ended`. That is the run-out, not a stop: the queue is
  // about to roll on into the next track, and the transport must not go dark
  // in between. `ended` is only set on that path, which is what tells them
  // apart.
  if (audioEl.ended) return;
  setTransport(false);
});

let spinRate = 1; // what the platter is meant to be doing right now

function applyRate(rate) {
  spinRate = Math.max(TURNTABLE_MIN, Math.min(1, rate));
  audioEl.preservesPitch = false;
  audioEl.playbackRate = spinRate;
}

// Loading a source resets playbackRate to defaultPlaybackRate and turns
// preservesPitch back on, which would drop a spin-up back to full speed
// halfway through — so both are put back as the new track arrives rather than
// being set once at startup.
const restoreRate = () => {
  audioEl.preservesPitch = false;
  if (audioEl.playbackRate !== spinRate) audioEl.playbackRate = spinRate;
};
audioEl.addEventListener("loadeddata", restoreRate);
audioEl.addEventListener("play", restoreRate);

function stopSpin() {
  if (spinFrame !== null) cancelAnimationFrame(spinFrame);
  spinFrame = null;
  // the pause a finished wind-down is waiting on — catching the record before
  // it lands has to call that off too
  if (spinStopTimer !== null) clearTimeout(spinStopTimer);
  spinStopTimer = null;
  pendingSpin = null;
}

// A track that isn't in hand yet has nothing to spin: the buffer source only
// exists once the file has arrived, so a sweep started at the press just runs
// the rate up against no sound at all and is spent by the time the first
// sample plays — which is exactly how a track loaded from cold ended up
// starting at full speed with no effect on it. Held here instead and let go
// the moment the sound is actually running.
let pendingSpin = null;

function spinWhenSounding(to, ms, ease, then, onStart) {
  if (soundIsRunning()) {
    if (onStart) onStart();
    spin(to, ms, ease, then);
    return;
  }
  stopSpin();
  pendingSpin = { to, ms, ease, then, onStart };
}

// Sounding, not merely meant to be: the deck reports `paused` false from the
// moment play is pressed, while the file may still be on its way.
function soundIsRunning() {
  return !audioEl.paused && audioEl.readyState >= 3;
}

audioEl.addEventListener("playing", () => {
  if (!pendingSpin) return;
  const held = pendingSpin;
  pendingSpin = null;
  if (held.onStart) held.onStart();
  spin(held.to, held.ms, held.ease, held.then);
});

function spin(to, ms, ease, then) {
  stopSpin();
  const from = audioEl.playbackRate;
  const start = performance.now();
  if (ms <= 0 || Math.abs(to - from) < 0.001) {
    applyRate(to);
    if (then) then();
    return;
  }
  const tick = (now) => {
    const t = Math.min((now - start) / ms, 1);
    applyRate(from + (to - from) * ease(t));
    if (t < 1) {
      spinFrame = requestAnimationFrame(tick);
      return;
    }
    spinFrame = null;
    if (then) then();
  };
  spinFrame = requestAnimationFrame(tick);
}

function spinUp() {
  // Catching a record that is still winding down picks it up from wherever it
  // has got to, over however much of the sweep is left, instead of dropping
  // it back to a standstill first.
  const caught = !audioEl.paused && windingDown;
  stopSwap(); // starting outright takes over from a change of record
  windingDown = false;
  if (!caught) applyRate(TURNTABLE_FLOOR);
  // A caught record never stopped, so "playing" won't fire to bring the sound
  // back up — and it may have been mid-fade when it was caught.
  if (caught) fadeGain(1);
  setTransport(true);
  startAudio();
  const ms = SPIN_UP_MS * ((1 - audioEl.playbackRate) / (1 - TURNTABLE_FLOOR));
  spinWhenSounding(1, ms, spinUpEase);
}

// The element is only actually paused once the sweep has run — but the press
// is answered at once through setTransport, so nothing on screen waits for it.
function spinDown() {
  if (audioEl.paused) return;
  stopSwap(); // ...and so does stopping
  windingDown = true;
  setTransport(false);
  spin(TURNTABLE_FLOOR, SPIN_DOWN_MS, spinDownEase, () => {
    // the last thing a record does is stop, and stopping a waveform dead is
    // the loudest click of the lot — so it goes out under a ramp
    fadeGain(0);
    spinStopTimer = setTimeout(() => {
      spinStopTimer = null;
      windingDown = false;
      audioEl.pause();
      applyRate(1);
    }, FADE_MS);
  });
}

// Whatever is sounding goes on sounding, at speed — for a track change rather
// than a stop.
function keepSpinning() {
  stopSpin();
  stopSwap();
  windingDown = false;
  applyRate(1);
}

// ---------------------------------------------------------------------------
// Changing the record
//
// The same gesture starting and stopping use, in miniature: the platter is
// lifted — pitch falling away under it — the record is changed at the bottom,
// and the new one is dropped onto a stopped platter and comes up to speed.
// Everything already keyed to the rate follows on its own: the cover slows,
// halts and spins back up, and the wave goes with the level.
//
// It is asymmetric because the movement is: a record is taken off briskly and
// set down more gently. And the sound is deliberately *not* cut during the
// lift — the falling pitch is the whole point — so the duck happens only at
// the join, where the two tracks would otherwise meet mid-waveform.
const SWAP_LIFT_MS = 300;
const SWAP_DROP_MS = 450;
const SWAP_CUT_MS = 45; // silence across the join itself

let swapping = false;
let swapTimer = null;

function stopSwap() {
  if (swapTimer !== null) clearTimeout(swapTimer);
  swapTimer = null;
  swapping = false;
}

// `apply` is whatever actually changes the record — it runs at the bottom of
// the lift, so the title, the artwork and the palette all land on the same
// beat as the sound rather than ahead of it.
function swapRecord(apply) {
  stopSwap();
  // nothing sounding: no platter to lift, just put the record on
  if (!transportOn) {
    keepSpinning();
    apply();
    return;
  }
  spin(TURNTABLE_FLOOR, SWAP_LIFT_MS, spinDownEase, () => {
    fadeGain(0, SWAP_CUT_MS);
    swapTimer = setTimeout(() => {
      swapTimer = null;
      const duration = audioEl.duration;
      const wasAt = duration && isFinite(duration) ? audioEl.currentTime / duration : 0;
      apply();
      beginProgressReturn(Math.max(0, Math.min(1, wasAt)));
      // the new record goes on at the standstill the old one was lifted at,
      // and "playing" brings the sound back as soon as it is actually running
      applyRate(TURNTABLE_FLOOR);
      startAudio();
      // The record is on the platter now, so it comes back into view now —
      // even if it has not finished arriving. Held until the drop instead, a
      // track that had to be fetched left an empty ring under the logo for the
      // whole download. It simply doesn't turn yet: the rotation follows the
      // sound rather than this, and there is none until the file is playable.
      swapping = false;
      spinWhenSounding(1, SWAP_DROP_MS, spinUpEase);
    }, SWAP_CUT_MS);
  });
  // after spin(), which cancels whatever ran before it
  swapping = true;
}

function toggleAudio() {
  if (!playlist.length) return;
  ensureAudioGraph();
  resumeAudio();

  if (!transportOn) {
    if (!audioEl.src) {
      audioEl.src = currentTrack().src;
      announceTrack();
    }
    spinUp();
  } else {
    spinDown();
  }
}

// On by default: the queue is the whole library now, and stepping through
// 86 tracks in stored order would mean six albums of kletka before anything
// else. The button turns it off.
let shuffleOn = true;

// Where prev goes. A shuffled order only exists as it happens, so unless it
// is written down "the one before" has no answer — which is why prev used to
// step to trackIndex - 1, a track that had nothing to do with what had just
// played. `playedBack` is what has been heard, most recent last; and since
// prev leaves a trail of its own, `playedForward` holds what it stepped away
// from, so next retraces that path instead of rolling a fresh pick.
const HISTORY_MAX = 200;
let playedBack = [];
let playedForward = [];

function rememberPlayed(stack, index) {
  if (index < 0 || index >= playlist.length) return;
  if (stack[stack.length - 1] === index) return; // no runs of the same track
  stack.push(index);
  if (stack.length > HISTORY_MAX) stack.shift();
}

function forgetHistory() {
  playedBack = [];
  playedForward = [];
}

// `history` says what the move means to the trail: "push" is an ordinary
// move onwards (next, the end of a track, a click in the list) and abandons
// any retraced path; "back" and "forward" are prev and next walking that
// path, each handing the track it leaves to the other side.
function switchToTrackIndex(index, history = "push") {
  externalTrack = null; // back under the playlist's control
  const n = playlist.length;
  if (!n) return;
  const from = trackIndex;
  trackIndex = ((index % n) + n) % n;
  if (trackIndex !== from) {
    if (history === "back") {
      rememberPlayed(playedForward, from);
    } else {
      rememberPlayed(playedBack, from);
      if (history === "push") playedForward = [];
    }
  }
  // however it was reached — prev, a click in the list, the end of a track —
  // it counts as heard, so the bag must not offer it again this pass
  const spent = shuffleBag.indexOf(trackIndex);
  if (spent !== -1) shuffleBag.splice(spent, 1);
  // The transport's own state, not `paused`: at the end of a track the
  // element has already paused itself by the time this runs, and a record
  // still winding down is on its way to a stop even though it is not paused
  // yet. Neither is answered by asking the element.
  // prev/next and the end of a track are not a stop — they are a change of
  // record, and swapRecord does the lift, the change and the drop.
  swapRecord(() => {
    audioEl.src = currentTrack().src;
    announceTrack();
  });
}

// A shuffle pick that honours the weight each entry carries — the page sets
// it from the track's `pick`, and anything at zero is not in the queue in the
// first place. Entries without one count as an ordinary 1.
// Shuffle deals a bag rather than rolling a fresh pick each time. Rolling
// meant a track could come round again while most of the queue had not been
// heard at all — with 86 tracks the odds of a repeat inside the first dozen
// are better than even. Dealt, every track is heard once before any is heard
// twice, and the weights decide the *order* within the pass instead of the
// odds of each draw: a heavier track tends to land early, a weight of 0 is
// left out of the bag entirely.
let shuffleBag = [];

function dealShuffleBag(exclude) {
  const left = [];
  for (let i = 0; i < playlist.length; i++) {
    // Whatever is playing as the bag is dealt has been heard this pass and
    // belongs to the next one. Leaving it in was how the very first track kept
    // coming back around: it is set straight onto the deck at startup, never
    // passing through the removal that every later track goes through.
    if (i !== exclude && (playlist[i].weight ?? 1) > 0) left.push(i);
  }
  const bag = [];
  while (left.length) {
    let total = 0;
    for (const i of left) total += playlist[i].weight ?? 1;
    let roll = Math.random() * total;
    let at = 0;
    for (; at < left.length - 1; at++) {
      roll -= playlist[left[at]].weight ?? 1;
      if (roll <= 0) break;
    }
    bag.push(left.splice(at, 1)[0]);
  }
  return bag;
}

function takeFromBag() {
  if (!shuffleBag.length) shuffleBag = dealShuffleBag(trackIndex);
  const next = shuffleBag.shift();
  return next === undefined ? -1 : next;
}

// Which track comes after this one. On shuffle it used to be rolled at the
// moment next was pressed, which left nothing to warm up in advance — so the
// roll happens when the current track starts instead, and the answer is kept.
// The shuffle is no less random for being decided a few minutes early.
let queuedNext = -1;

function decideNext() {
  const n = playlist.length;
  if (!n) return -1;
  if (!shuffleOn || n < 2) return (trackIndex + 1) % n;
  const pick = takeFromBag();
  return pick >= 0 ? pick : (trackIndex + 1) % n;
}

// Decode the one that's coming while the current one plays, so changing the
// record doesn't have to wait on the network and the decoder mid-gesture.
function warmNextTrack() {
  // Standing on a retraced path, what comes next is already known — and
  // drawing from the bag for it would spend a track that never gets played.
  const ahead = playedForward.length ? playedForward[playedForward.length - 1] : -1;
  if (ahead >= 0 && ahead !== trackIndex) {
    queuedNext = -1;
    const waiting = playlist[ahead];
    if (waiting && waiting.src) audioEl.prefetch(waiting.src);
    return;
  }
  // Only when there isn't already one waiting. "playing" fires on every
  // resume, not just on a new track, and decideNext() takes a position out of
  // the shuffle bag — so drawing on each one quietly emptied the bag faster
  // than tracks were actually played, and a pass stopped covering the queue.
  if (queuedNext < 0) queuedNext = decideNext();
  // ...and it must not point at the track now playing, which prev or a jump
  // can leave it doing.
  if (queuedNext === trackIndex) queuedNext = -1;
  const entry = playlist[queuedNext];
  if (entry && entry.src) audioEl.prefetch(entry.src);
}

function playAdjacentTrack(direction) {
  const n = playlist.length;
  if (!n) return;
  if (direction < 0) {
    // On shuffle the trail is the only record of the order; in stored order
    // the list itself is, and the neighbour above is what prev should mean.
    if (shuffleOn && n > 1 && playedBack.length) {
      switchToTrackIndex(playedBack.pop(), "back");
    } else {
      switchToTrackIndex(trackIndex - 1);
    }
    return;
  }
  if (playedForward.length) {
    const ahead = playedForward.pop();
    if (queuedNext === ahead) queuedNext = -1;
    switchToTrackIndex(ahead, "forward");
    return;
  }
  if (queuedNext >= 0) {
    const next = queuedNext;
    queuedNext = -1; // spent; the new track decides its own successor
    switchToTrackIndex(next);
    return;
  }
  if (shuffleOn && n > 1) {
    switchToTrackIndex(decideNext());
  } else {
    switchToTrackIndex(trackIndex + 1);
  }
}

function toggleShuffle() {
  shuffleOn = !shuffleOn;
}

if (!PLAYER_RUNS_FIELD_WAVE) {
  onTransport((on) => (on ? randomizeSatelliteScales() : resetSatelliteScales()));
}
onTransport((on) => setFieldIntensityTarget(on ? 1 : 0));
onTransport((on) => {
  if (!on) {
    specialSettle = null; // no settle-out needed — these dots just unlock once the bar fully retracts
    setPlayerActiveTarget(0);
    return;
  }
  specialLocked = true;
  specialSettle = {
    start: performance.now(),
    map: new Map([...player.specialSats].map((s) => [s, { x: s.x, y: s.y }])),
  };
  bottomWaveStart = performance.now();
  // setPlayerActiveTarget(1) fires once the settle tween lands everything home — see stepPlayer
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const blobs = { goldVariants: [], maskVariants: [], projects: [] };
const icons = { play: null, pause: null, prev: null, next: null, shuffle: null, loading: null, shuffleOff: null };
const iconMasks = { play: null, pause: null, prev: null, next: null, shuffle: null, loading: null };
const playerBar = {
  trackGold: null,
  trackMask: null,
  trackCream: null,
  thumb: null,
  thumbMask: null,
};

// Flat-fills `maskCanvas`'s alpha shape with `color` — used to derive the
// progress bar's lighter fill from the exact same wobbly silhouette as its
// gold background, instead of a plain rectangle.
function tintMaskedInto(dest, maskCanvas, color) {
  dest.width = maskCanvas.width;
  dest.height = maskCanvas.height;
  const c = dest.getContext("2d");
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, dest.width, dest.height);
  c.fillStyle = color;
  c.fillRect(0, 0, dest.width, dest.height);
  c.globalCompositeOperation = "destination-in";
  c.drawImage(maskCanvas, 0, 0);
  c.globalCompositeOperation = "source-over";
  return dest;
}

function tintMasked(maskCanvas, color) {
  return tintMaskedInto(document.createElement("canvas"), maskCanvas, color);
}

// ---------------------------------------------------------------------------
// Live palette
// ---------------------------------------------------------------------------
// The canvas can't use the stylesheet's colours directly — its art is
// bitmaps. But every one of those bitmaps is a flat fill of an alpha mask, so
// recolouring is just re-tinting from the masks we already keep. The tint is
// written back into the *same* canvas objects, so every circle and satellite
// already holding a reference picks the new colour up on the next frame.
//
// The source of truth stays the stylesheet: --gold and --cream are sampled
// off :root, which means a palette change made anywhere — setPalette(), a
// stylesheet edit, devtools — reaches the canvas, and while the tokens are
// mid-transition this follows them frame by frame.
// Sampling the tokens costs a getComputedStyle, which forces a style recalc
// whenever anything on the page has just written a style — the halo dots do,
// every frame. So it's only sampled every other frame while a palette change
// is actually in flight (app.js marks that on the root for the length of the
// fade); otherwise a slow poll is enough to pick up an edit made in devtools
// or the stylesheet, and the scroll keeps the main thread to itself.
const PALETTE_POLL_FADING = 2; // frames, while a palette change is running
const PALETTE_POLL_IDLE = 30; // frames, otherwise
let canvasGold = null;
let canvasCream = null;
let canvasMuted = null;
let canvasDots = null;

// How many dot colours a palette can hand over — matches --dot-1..--dot-5 in
// the stylesheet, and the number of tinted copies kept of each outline.
const CANVAS_DOT_SLOTS = 5;
let paletteFrame = 0;

function applyCanvasPalette(gold, cream, muted, dots) {
  if (!blobs.maskVariants.length) return;
  const dotKey = dots.join();
  if (gold === canvasGold && cream === canvasCream && muted === canvasMuted && dotKey === canvasDots)
    return;
  canvasGold = gold;
  canvasCream = cream;
  canvasMuted = muted;
  canvasDots = dotKey;

  // One tinted copy of every outline in every dot colour. randomBlobVariant
  // draws from the flat list, so a circle picking a shape also picks a
  // colour — and when the palette holds one accent, all the copies are the
  // same colour and it comes out exactly as it did before there were five.
  blobs.maskVariants.forEach((mask, i) => {
    dots.forEach((color, d) => {
      const at = d * blobs.maskVariants.length + i;
      if (blobs.goldVariants[at]) tintMaskedInto(blobs.goldVariants[at], mask, color);
    });
  });
  for (const key of Object.keys(iconMasks)) {
    if (iconMasks[key] && icons[key]) tintMaskedInto(icons[key], iconMasks[key], cream);
  }
  // shuffle keeps a second copy of itself in the accent, for when it's off
  if (iconMasks.shuffle && icons.shuffleOff) {
    tintMaskedInto(icons.shuffleOff, iconMasks.shuffle, gold);
  }
  if (playerBar.trackMask) {
    tintMaskedInto(playerBar.trackGold, playerBar.trackMask, gold);
    tintMaskedInto(playerBar.trackCream, playerBar.trackMask, cream);
  }
  if (playerBar.thumbMask) tintMaskedInto(playerBar.thumb, playerBar.thumbMask, cream);
}

// --muted is derived in the stylesheet with relative colour syntax, so it
// comes back as an oklch() string rather than the rgb() the other tokens
// give. Canvas takes that fine wherever oklch() is supported at all — but
// where it isn't, fillStyle silently keeps its old value instead of
// throwing, which would leave the shuffle icon painted in whatever colour
// happened to be loaded. One probe catches that and falls back.
const colorProbe = document.createElement("canvas").getContext("2d");

function canvasColor(value, fallback) {
  if (!value) return fallback;
  colorProbe.fillStyle = "#000000";
  colorProbe.fillStyle = value;
  return colorProbe.fillStyle === "#000000" ? fallback : value;
}

function syncPaletteFromCss() {
  const style = getComputedStyle(document.documentElement);
  const gold = style.getPropertyValue("--gold").trim();
  const cream = style.getPropertyValue("--cream").trim();
  const muted = canvasColor(style.getPropertyValue("--muted").trim(), MUTED);
  const dots = [];
  for (let i = 1; i <= CANVAS_DOT_SLOTS; i++) {
    dots.push(style.getPropertyValue(`--dot-${i}`).trim() || gold);
  }
  if (gold && cream) applyCanvasPalette(gold, cream, muted, dots);
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

// A circle's art: a photo cut to a blob outline, or — for the contacts
// grid — a platform icon that already carries its own shape and colour.
// Cached by source, so switching sections back and forth costs nothing.
async function makeFieldBlob(item, maskCanvas, size) {
  const key = item.icon || item.src;
  if (fieldBlobCache.has(key)) return fieldBlobCache.get(key);

  const build = item.icon
    ? (async () => {
        const svg = await fetch(item.icon).then((response) => response.text());
        const raster = await rasterizeSvg(svg, { targetSize: size });
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        containDraw(off.getContext("2d"), raster, size / 2, size / 2, size, size);
        return off;
      })()
    : makeProjectBlob(maskCanvas, item.src, size);
  fieldBlobCache.set(key, build);
  return build;
}

// Each item gets its own distinct mask variant — a shuffle-and-take rather
// than independent random picks, so two never happen to land on the same
// shape the way independent Math.random() calls could.
async function loadFieldItems(items) {
  const order = shuffledIndices(blobs.maskVariants.length);
  blobs.projects = await Promise.all(
    items.map(async (item, i) => ({
      id: item.id,
      title: item.title,
      canvas: await makeFieldBlob(
        item,
        blobs.maskVariants[order[i % order.length]],
        BLOB_RASTER_SIZE,
      ),
    })),
  );
}

// Fills the blob cache for a set the field isn't showing yet, so switching to
// it is instant rather than fetching and rasterizing on the way in — the
// contacts icons were the last thing on the page still arriving late.
//
// Deliberately not loadFieldItems: that also replaces blobs.projects, which is
// the set being drawn right now. And only items carrying an `icon`, because
// those are cut to their own shape and so cache independently of the outline
// they are handed; a `src` item's cache key doesn't include its mask, so
// warming one with the wrong outline would poison it.
async function warmFieldItems(items) {
  await Promise.all(
    items.filter((item) => item.icon).map((item) => makeFieldBlob(item, null, BLOB_RASTER_SIZE)),
  );
}

function domReady() {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
}

// Resolved once the canvas layer has everything it draws with — the page's
// cover waits on this so nothing appears while it is still being assembled.
let bootDone;
const bootReady = new Promise((resolve) => {
  bootDone = resolve;
});

async function boot() {
  await domReady(); // the mounts have to exist before anything can be measured
  PROJECT_IMAGES.push(...PROJECT_SOURCE);

  const [blobSvgs, playSvg, pauseSvg, prevSvg, nextSvg, shuffleSvg, loadingSvg, trackSvg, thumbSvg] =
    await Promise.all([
    Promise.all(BLOB_SVG_URLS.map((url) => fetch(url).then((r) => r.text()))),
    fetch(PLAY_ICON_URL).then((r) => r.text()),
    fetch(PAUSE_ICON_URL).then((r) => r.text()),
    fetch(PREV_ICON_URL).then((r) => r.text()),
    fetch(NEXT_ICON_URL).then((r) => r.text()),
    fetch(SHUFFLE_ICON_URL).then((r) => r.text()),
    fetch(LOADING_ICON_URL).then((r) => r.text()),
    fetch(PLAYER_TRACK_URL).then((r) => r.text()),
    fetch(PLAYER_THUMB_URL).then((r) => r.text()),
  ]);

  // Only the masks are rasterized from the SVGs; every visible colour is
  // tinted from them afterwards by applyCanvasPalette, so the palette is
  // never baked into an asset.
  const iconScale = { scale: ICON_UPSCALE, fillFrom: SVG_SOURCE_CREAM, fillTo: MASK_OPAQUE };
  const [maskVariants, playMask, pauseMask, prevMask, nextMask, shuffleMask, loadingMask, trackMask, thumbMask] =
    await Promise.all([
      Promise.all(
        blobSvgs.map((svg) =>
          rasterizeSvg(svg, {
            fillFrom: SVG_SOURCE_GOLD,
            fillTo: MASK_OPAQUE,
            targetSize: BLOB_RASTER_SIZE,
          }),
        ),
      ),
      rasterizeSvg(playSvg, iconScale),
      rasterizeSvg(pauseSvg, iconScale),
      rasterizeSvg(prevSvg, iconScale),
      rasterizeSvg(nextSvg, iconScale),
      rasterizeSvg(shuffleSvg, iconScale),
      rasterizeSvg(loadingSvg, iconScale),
      rasterizeSvg(trackSvg, {
        fillFrom: SVG_SOURCE_GOLD,
        fillTo: MASK_OPAQUE,
        scale: PLAYER_TRACK_RASTER_SCALE,
        repair: true,
        padY: PLAYER_TRACK_PAD_Y,
      }),
      rasterizeSvg(thumbSvg, { fillFrom: SVG_SOURCE_CREAM, fillTo: MASK_OPAQUE, scale: ICON_UPSCALE }),
    ]);

  blobs.maskVariants = maskVariants;
  // every outline once per dot slot: [slot 0's shapes..., slot 1's shapes...]
  blobs.goldVariants = Array.from({ length: maskVariants.length * CANVAS_DOT_SLOTS }, () =>
    document.createElement("canvas"),
  );
  iconMasks.play = playMask;
  iconMasks.pause = pauseMask;
  iconMasks.prev = prevMask;
  iconMasks.next = nextMask;
  iconMasks.shuffle = shuffleMask;
  iconMasks.loading = loadingMask;
  for (const key of Object.keys(iconMasks)) icons[key] = document.createElement("canvas");
  icons.shuffleOff = document.createElement("canvas"); // same mask, accent tone
  playerBar.trackMask = trackMask;
  playerBar.thumbMask = thumbMask;
  playerBar.trackGold = document.createElement("canvas");
  playerBar.trackCream = document.createElement("canvas");
  playerBar.thumb = document.createElement("canvas");
  // first fill, from whatever the stylesheet currently says
  syncPaletteFromCss();
  applyCanvasPalette(
    canvasGold || GOLD,
    canvasCream || CREAM,
    canvasMuted || MUTED,
    new Array(CANVAS_DOT_SLOTS).fill(canvasGold || GOLD),
  );

  await loadFieldItems(PROJECT_IMAGES);

  applyScale(); // the viewport can settle after this script first ran — read it fresh
  scaleDerived();
  resize();
  buildPlayer();
  buildField();
  bootDone();
  requestAnimationFrame(loop);
}

function loop() {
  // follow the stylesheet's palette, including while it's mid-transition
  const paletteEvery = document.documentElement.classList.contains("is-repainting")
    ? PALETTE_POLL_FADING
    : PALETTE_POLL_IDLE;
  if (++paletteFrame % paletteEvery === 0) syncPaletteFromCss();

  if (progressHandler) {
    progressHandler({
      src: audioEl.src || null,
      currentTime: audioEl.currentTime,
      duration: isFinite(audioEl.duration) ? audioEl.duration : 0,
      // what the buttons show: the press, answered at once
      playing: transportOn,
      // whether the record is still turning, and how fast — a wind-down is
      // still sounding for two seconds after the press, and the covers turn
      // on this rather than on a fixed clock
      // Both of these mean "the record is turning", which a track still on its
      // way is not — so the covers stay still until it has actually arrived
      // rather than spinning up against silence.
      sounding: soundIsRunning(),
      rate: soundIsRunning() ? spinRate : 0,
      // mid-change of record, so the cover can be taken off and put back on
      // the same beat as the sound — see renderRecordSwap
      swapping,
      // how much of the track has arrived, for the readout beside the title
      loadProgress: audioEl.loadProgress,
    });
  }

  // advance the view fade on the stylesheet's clock (read once, not per
  // frame — getComputedStyle in the loop is a style recalc every frame)
  const now = performance.now();
  const step = viewFadeAt ? (now - viewFadeAt) / viewFadeMs : 1;
  viewFadeAt = now;
  const fadeTarget = viewMode === "field" ? 1 : 0;
  if (viewFade !== fadeTarget) {
    viewFade += Math.sign(fadeTarget - viewFade) * step;
    viewFade = Math.max(0, Math.min(1, viewFade));
  }

  if (viewFade > 0) stepField(mouse);
  stepPlayer(mouse);

  // The field: laid out in document coordinates, on a canvas that sits in the
  // document over its own mount. The browser scrolls the surface, so all that
  // is taken out here is where that box begins.
  //
  // It used to be pinned to the viewport with the scroll offset applied per
  // frame, which is the same mistake the player was built on: the compositor
  // moves the page, this thread learns the new scroll position a frame later,
  // and the circles lag and spring against the text they belong beside.
  ctx = fieldCtx;
  ctx.clearRect(0, 0, fieldBox.width, fieldBox.height);
  if (viewFade > 0) {
    ctx.save();
    ctx.translate(-fieldBox.left, -fieldBox.top);
    ctx.globalAlpha = viewFade;
    drawField();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // The player: its canvas is in the document's flow, so there's no scroll
  // offset to apply — the browser moves the whole surface. Only its left
  // edge has to be taken out, for the wide screens where the page is
  // narrower than the window and sits centred in it.
  ctx = playerCtx;
  ctx.clearRect(0, 0, playerWidth, playerHeight);
  ctx.save();
  ctx.translate(-pageLeft, 0);
  drawPlayer();
  ctx.restore();
  ctx = fieldCtx;

  requestAnimationFrame(loop);
}

// Anything that moves the page's layout (a resize, switching views, a project
// expanding) shifts the mounts, so the circles have to be laid out again.
function relayout() {
  if (!blobs.goldVariants.length) return; // assets not ready yet, boot() lays things out once they are
  applyScale();
  scaleDerived();
  resize();
  buildPlayer();
  buildField();
}

window.addEventListener("resize", relayout);

audioEl.addEventListener("ended", () => playAdjacentTrack(1));

// ---------------------------------------------------------------------------
// Public API — everything the page (app.js) is allowed to drive.
// ---------------------------------------------------------------------------

window.reactiveField = {
  // Must be called before boot finishes; each entry needs { id, title, src }.
  setProjects(projects) {
    PROJECT_SOURCE = projects;
  },
  // Each entry needs { title, album, art, src }.
  // The queue arrives already shuffled, so its first entry is what play will
  // start — decided here, at load, rather than at the press. Only decided,
  // though: fetching it is warmFirstTrack's job and waits for the page.
  setPlaylist(tracks) {
    playlist = tracks;
    trackIndex = 0;
    shuffleBag = [];
    forgetHistory();
    announceTrack();
  },
  // Start fetching the track the play button would begin with.
  //
  // Held back until the page is actually on screen. A track is a couple of
  // megabytes and it was being fetched from the first moment, sharing one
  // connection with every image and outline the page itself is waiting on.
  // Measured on a slow line it took thirty seconds of a seventy-second load
  // and pushed the canvas layer — the big player, the field — out past the
  // point where the loading screen gave up and uncovered a page that had no
  // player on it yet. Nothing needs the audio until something is pressed.
  warmFirstTrack() {
    const first = currentTrack();
    if (first && first.src && !audioEl.src) {
      audioEl.preload = "auto"; // the whole file, not just its metadata
      audioEl.src = first.src;
    }
  },
  // Point the grid at a different mount and a different set of circles —
  // the contacts section is the projects field with platform icons in it.
  // Each item is { id, title } plus either `src` (a photo to cut to a blob)
  // or `icon` (an SVG that already carries its own shape).
  // Warm a set the field will want later — see warmFieldItems.
  warmFieldItems(items) {
    return warmFieldItems(items);
  },
  async setFieldItems(items, mountId) {
    fieldMountId = mountId || "fieldMount";
    PROJECT_IMAGES.length = 0;
    PROJECT_IMAGES.push(...items);
    if (!blobs.maskVariants.length) return; // boot will pick these up
    await loadFieldItems(items);
    // A grid of the same size is normally just repositioned, outlines and
    // all — which would keep drawing the old set's art. Dropping the circles
    // forces the full rebuild this needs.
    field.circles.length = 0;
    buildField();
  },
  // 'field' shows the project grid, 'list' leaves only the player cluster.
  setView(mode) {
    if (mode === viewMode) return;
    viewMode = mode;
    viewFadeMs =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tab-fade")) || 260;
    relayout();
  },
  // How far through its fade the field is (0 = gone, 1 = fully up). The
  // canvas is the field's visible half, so this is what "the field is
  // fading" actually means.
  fieldFade() {
    return viewFade;
  },
  getView() {
    return viewMode;
  },
  // Called with a project id when one of the field's project circles is
  // clicked (as opposed to dragged).
  onProjectOpen(handler) {
    projectOpenHandler = handler;
  },
  // Called with (track, index) whenever the playing track changes.
  onTrackChange(handler) {
    trackChangeHandler = handler;
    announceTrack();
  },
  // Called with true/false whenever playback starts or stops.
  onPlayStateChange(handler) {
    // the press, not the platter — see setTransport
    onTransport(handler);
  },
  isPlaying() {
    return transportOn;
  },
  // Whether a track is genuinely sounding, as opposed to merely meant to be:
  // between the press and the file arriving, isPlaying() is already true and
  // this is not. Anything that should wait for the sound itself — the record's
  // spin, the covers turning, the palette — asks this one.
  isSounding() {
    return soundIsRunning();
  },
  // How long the transport UI (progress bar, icons) takes to reveal itself,
  // so the page can time its own transitions to the same beat.
  revealDurationMs() {
    return PLAYER_ACTIVE_TWEEN_MS;
  },
  // ...and how long the bits that only show up *after* that reveal has
  // finished take (the slider thumb, the played fill).
  postRevealDurationMs() {
    return POST_REVEAL_MS;
  },
  // The two halves of a change of record, so the cover can be taken off and
  // put back on exactly as fast as the sound falls and comes back.
  // Settles once the canvas layer is fully built; see bootReady.
  ready() {
    return bootReady;
  },
  swapDurationsMs() {
    return { lift: SWAP_LIFT_MS, drop: SWAP_DROP_MS };
  },
  // Hands over a whole new queue and starts it from the top — what a genre
  // or a vibe does when it's picked. Unlike playEntry this leaves the player
  // in charge of the list, so next and previous walk the selection.
  playPlaylist(tracks) {
    if (!tracks || !tracks.length) return;
    ensureAudioGraph();
    resumeAudio();
    // as with playEntry: a new selection while something is already sounding
    // is a change of record, not a start
    const running = transportOn;
    playlist = tracks;
    trackIndex = 0;
    externalTrack = null;
    shuffleBag = [];
    forgetHistory(); // a different queue — the old trail points at other tracks
    if (running) {
      swapRecord(() => {
        audioEl.src = tracks[0].src;
        announceTrack();
      });
    } else {
      audioEl.src = tracks[0].src;
      announceTrack();
      spinUp();
    }
  },
  // The tempo of whatever is playing, so the wave can sit on the beat. Pass
  // a falsy value for a track that has none and it goes back to the fixed
  // timings.
  setTempo(bpm) {
    waveTiming = timingForTempo(bpm);
    return waveTiming;
  },
  // The field's travelling wave, sampled for any cell on any grid — so DOM
  // decoration can run the exact same animation the canvas circles do,
  // including whichever variant is currently selected. `cell` needs
  // {row, col}; `grid` needs the shape WAVE_VARIANTS expects (rows, cols,
  // centerRow, centerCol, maxDist, maxChebyshev). Returns a negative boost,
  // i.e. how far this cell is currently dipped below its resting size.
  waveBoostAt(cell, grid) {
    return waveBoostFor(cell, performance.now(), grid);
  },
  waveVariants() {
    return Object.keys(WAVE_VARIANTS);
  },
  waveVariant() {
    return wave.variant;
  },
  setWaveVariant(name) {
    if (WAVE_VARIANTS[name]) wave.variant = name;
  },
  // Replays one pass of a variant with the audio paused, the way the
  // prototype's preview button did.
  previewWave(name) {
    previewFieldWave(name || wave.variant);
  },
  // How far the audio reaction is currently ramped in (0 at rest, 1 while
  // playing), eased over the same window the field uses so DOM and canvas
  // fade in and out together instead of snapping.
  audioIntensity() {
    return currentFieldIntensity(performance.now());
  },
  play(index) {
    if (typeof index === "number") switchToTrackIndex(index);
    ensureAudioGraph();
    resumeAudio();
    if (!audioEl.src && currentTrack()) {
      audioEl.src = currentTrack().src;
      announceTrack();
    }
    spinUp();
  },
  pause() {
    spinDown();
  },
  // Resume whatever is already loaded, without disturbing the queue.
  play() {
    if (!audioEl.src) return toggleAudio();
    ensureAudioGraph();
    resumeAudio();
    spinUp();
  },
  // Play something that isn't in the playlist — a track picked straight out
  // of the all-music list. `entry` needs { track, album, art, src }; it also
  // becomes what the now-playing block shows.
  playEntry(entry) {
    ensureAudioGraph();
    resumeAudio();
    // picking another track out of the list is a track change, not a start —
    // unless nothing was sounding, in which case it is one
    const running = transportOn;
    const load = () => {
      if (audioEl.src !== new URL(entry.src, location.href).href) audioEl.src = entry.src;
      externalTrack = entry;
      announceTrack();
    };
    if (running) {
      swapRecord(load);
    } else {
      load();
      spinUp();
    }
  },
  // What's loaded right now, resolved to an absolute URL so callers can
  // match it against their own entries.
  currentSrc() {
    return audioEl.src || null;
  },
  // Called every frame with the playing position, for anything that draws its
  // own progress (the all-music rows each have their own bar).
  onProgress(handler) {
    progressHandler = handler;
  },
  // Jump to a fraction (0..1) of the current track — the bars in the all-music
  // list seek through here, and get the same fade over the jump.
  seek(fraction) {
    const duration = audioEl.duration;
    if (!duration || !isFinite(duration)) return;
    seekAudioTo(Math.max(0, Math.min(1, fraction)) * duration);
  },
  // The cursor-repulsion numbers, so anything outside the canvas (the DOM
  // halo dots around each project) retreats on exactly the same terms as the
  // circles in here. Distances are scaled design pixels, `approach` is the
  // per-frame fraction of the way to the target.
  cursorParams() {
    return { influence: CURSOR_INFLUENCE, push: CURSOR_PUSH, approach: CURSOR_APPROACH };
  },
  // Where the cursor is, in document coordinates.
  pointer() {
    return { x: mouse.x, y: mouse.y };
  },
  relayout,
};

boot();
