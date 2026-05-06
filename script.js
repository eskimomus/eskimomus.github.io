if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const whiteStripeHeights = {
  projects: [480, 480, 480, 480, 480, 480, 480, 480, 480],
  "all-music": [480, 414, 334, 242, 410, 480, 334, 242, 138],
  contact: [480, 546, 640, 752, 824, 928, 1012, 882, 660],
};

const body = document.body;if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const whiteStripeHeights = {
  projects: [480, 480, 480, 480, 480, 480, 480, 480, 480],
  "all-music": [480, 414, 334, 242, 410, 480, 334, 242, 138],
  contact: [480, 546, 640, 752, 824, 928, 1012, 882, 660],
};

const body = document.body;
const pagePreloader = document.querySelector(".page-preloader");
const stage = document.querySelector(".stage");
const titleLinks = [...document.querySelectorAll(".title-link")];
const whiteStripes = [...document.querySelectorAll(".stripe--white")];
const sectionContents = [...document.querySelectorAll(".section-content")];
const musicTabs = [...document.querySelectorAll(".music-tab")];
const musicPanels = [...document.querySelectorAll(".music-panel")];
const soundtrackToggles = [...document.querySelectorAll(".soundtrack-toggle")];
const projectListenLinks = [...document.querySelectorAll("[data-project-listen]")];
const miniPlayer = document.querySelector("[data-mini-player]");
const miniTitle = document.querySelector("[data-mini-title]");
const miniSource = document.querySelector("[data-mini-source]");
const miniTime = document.querySelector("[data-mini-time]");
const miniProgress = document.querySelector("[data-mini-progress]");
const miniProgressFill = document.querySelector("[data-mini-progress-fill]");
const miniProgressThumb = document.querySelector("[data-mini-progress-thumb]");
const miniShuffle = document.querySelector("[data-mini-shuffle]");
const miniPrevious = document.querySelector("[data-mini-previous]");
const miniToggle = document.querySelector("[data-mini-toggle]");
const miniNext = document.querySelector("[data-mini-next]");
const colorDuration = 300;
const stripeDuration = 780;
const contentFadeDuration = 520;
const musicMinHeight = 2860;
const musicBottomPadding = 290;
const contactMinHeight = 1830;
const footerHeight = 200;
const accordionScrollDuration = 950;
const scrollClampDuration = accordionScrollDuration + 40;
const projectTextGap = 90;
const audioFadeDuration = 0.005;
const audioLoadingDelay = 1000;
const designWidth = 1920;
const maxViewportScale = 0.5;
const defaultAccentColor = "#bf032c";
const audioAccentColors = {
  kletka: "#bf032c",
  "fictional-story": "#3f512e",
  downsouth: "#4d2f5a",
  "seeds-of-sorrow": "#515151",
  "industrial-ambient": "#232730",
  "untitled-ost": "#6e644c",
};
const ownMusicLinkColors = {
  "industrial-ambient": "#5a6173",
};
const miniIconSets = {
  default: {
    play: "./assets/icons/ffffff/play.webp",
    stop: "./assets/icons/ffffff/stop.webp",
    loading: "./assets/icons/ffffff/loading.gif",
    previous: "./assets/icons/ffffff/prev.webp",
    next: "./assets/icons/ffffff/next.webp",
    shuffleActive: "./assets/icons/ffffff/shuffle-active.webp",
    shufflePassive: "./assets/icons/c6c6c6/shuffle-passive.webp",
  },
  kletka: {
    play: "./assets/icons/bf032c/play.webp",
    stop: "./assets/icons/bf032c/stop.webp",
    loading: "./assets/icons/bf032c/loading.gif",
    previous: "./assets/icons/bf032c/prev.webp",
    next: "./assets/icons/bf032c/next.webp",
    shuffleActive: "./assets/icons/bf032c/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "fictional-story": {
    play: "./assets/icons/3f512e/play.webp",
    stop: "./assets/icons/3f512e/stop.webp",
    loading: "./assets/icons/3f512e/loading.gif",
    previous: "./assets/icons/3f512e/prev.webp",
    next: "./assets/icons/3f512e/next.webp",
    shuffleActive: "./assets/icons/3f512e/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  downsouth: {
    play: "./assets/icons/4d2f5a/play.webp",
    stop: "./assets/icons/4d2f5a/stop.webp",
    loading: "./assets/icons/4d2f5a/loading.gif",
    previous: "./assets/icons/4d2f5a/prev.webp",
    next: "./assets/icons/4d2f5a/next.webp",
    shuffleActive: "./assets/icons/4d2f5a/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "seeds-of-sorrow": {
    play: "./assets/icons/515151/play.webp",
    stop: "./assets/icons/515151/stop.webp",
    loading: "./assets/icons/515151/loading.gif",
    previous: "./assets/icons/515151/prev.webp",
    next: "./assets/icons/515151/next.webp",
    shuffleActive: "./assets/icons/515151/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "industrial-ambient": {
    play: "./assets/icons/232730/play.webp",
    stop: "./assets/icons/232730/stop.webp",
    loading: "./assets/icons/232730/loading.gif",
    previous: "./assets/icons/232730/prev.webp",
    next: "./assets/icons/232730/next.webp",
    shuffleActive: "./assets/icons/232730/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "untitled-ost": {
    play: "./assets/icons/6e644c/play.webp",
    stop: "./assets/icons/6e644c/stop.webp",
    loading: "./assets/icons/6e644c/loading.gif",
    previous: "./assets/icons/6e644c/prev.webp",
    next: "./assets/icons/6e644c/next.webp",
    shuffleActive: "./assets/icons/6e644c/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
};

let currentSection = "projects";
let pendingSteps = [];
let stageHeightClampStep = null;
let soundtrackHeaderScrollFrame = null;
let viewportScale = 1;
let miniIconSetKey = "";

const projectImageOffsets = [
  {
    image: document.querySelector(".project-image--kletka"),
    anchor: document.querySelector('[data-image-anchor="kletka"]'),
    offset: 50,
  },
  {
    image: document.querySelector(".project-image--fictional"),
    anchor: document.querySelector('[data-image-anchor="fictional"]'),
    offset: 60,
  },
  {
    image: document.querySelector(".project-image--downsouth"),
    anchor: document.querySelector('[data-image-anchor="downsouth"]'),
    offset: 78,
  },
];

const projectTextFlow = [
  {
    anchor: document.querySelector('[data-image-anchor="kletka"]'),
    copy: document.querySelector(".project-copy--fictional"),
  },
  {
    anchor: document.querySelector('[data-image-anchor="fictional"]'),
    copy: document.querySelector(".project-copy--downsouth"),
  },
  {
    anchor: document.querySelector('[data-image-anchor="downsouth"]'),
    copy: document.querySelector(".project-copy--school"),
  },
];

const audioLibrary = {
  kletka: {
    title: "kletka",
    categories: [
      {
        id: "ambient",
        title: "ambient",
        tracks: [
          {
            title: "ammonia",
            detail: "research institute floor music, trailer music",
            src: "./assets/audio/kletka/ammonia.mp3",
            duration: 182.439175,
          },
          {
            title: "strelka",
            detail: "antigravity floor music",
            src: "./assets/audio/kletka/strelka.mp3",
            duration: 210.0506,
          },
          {
            title: "afalina",
            detail: "flood floor music",
            src: "./assets/audio/kletka/afalina.mp3",
            duration: 104.0457,
          },
          {
            title: "kondensat",
            detail: "mist floor music",
            src: "./assets/audio/kletka/kondensat.mp3",
            duration: 80.039175,
          },
          {
            title: "radiotrophika iii",
            detail: "greenhouse floor music",
            src: "./assets/audio/kletka/radiotrophika-iii.mp3",
            duration: 128.0261,
          },
          {
            title: "anguta",
            detail: "schisophasia floor music",
            src: "./assets/audio/kletka/anguta.mp3",
            duration: 138.031,
          },
          {
            title: "assembly error #7 ambience",
            detail: "giant robo-fly boss floor",
            src: "./assets/audio/kletka/assembly-error-7-ambience.mp3",
            duration: 106.7102,
          },
        ],
      },
      {
        id: "bossfight",
        title: "bossfight music",
        tracks: [
          {
            title: "assembly error #7 phase 1",
            detail: "giant robo-fly boss",
            src: "./assets/audio/kletka/bossfight/assembly-error-7-phase-1.mp3",
            duration: 74.7102,
          },
          {
            title: "assembly error #7 phase 2",
            detail: "giant robo-fly boss, trailer music",
            src: "./assets/audio/kletka/bossfight/assembly-error-7-phase-2.mp3",
            duration: 91.1151,
          },
          {
            title: "i got the pollen",
            detail: "giant bee",
            src: "./assets/audio/kletka/bossfight/i-got-the-pollen.mp3",
            duration: 73.874275,
          },
          {
            title: "kashpirovsky’s room",
            detail: "famous russian magician-fraudster from the 90s",
            src: "./assets/audio/kletka/bossfight/kashpirovskys-room.mp3",
            duration: 67.78775,
          },
        ],
      },
      {
        id: "trailer",
        title: "trailer music",
        tracks: [
          {
            title: "kletka official launch trailer music",
            detail: "i hate this track",
            src: "./assets/audio/kletka/trailer/kletka-official-launch-trailer-music.mp3",
            duration: 84.0359,
            excludeFromMiniPlayer: true,
          },
        ],
      },
      {
        id: "sound-design",
        title: "sound design",
        tracks: [],
        content: {
          text:
            "i’ve made a series of audio recordings for the game that tell the story of one of the prisoners of the kletka",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://www.youtube.com/@prisoner412",
        },
      },
      {
        id: "mastering",
        title: "mastering",
        tracks: [],
        content: {
          text: "i’ve mastered all of the kletka ost (135 tracks) for the streamings",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://band.link/kletka_ost_2",
        },
      },
      {
        id: "tape-mix",
        title: "tape mix",
        tracks: [],
        content: {
          text: "i’ve made an hour-long kletka ost mix with cool transitions",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://youtu.be/FkekGW28JiM?si=-1byQHaw__e4q4SY",
        },
      },
    ],
  },
  "fictional-story": {
    title: "a completely fictional story about a city inside a whale",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "a completely real main theme",
            detail: "main menu and trailer theme",
            src: "./assets/audio/fictional-story/ingame/a-completely-real-main-theme.mp3",
            duration: 147.408975,
          },
          {
            title: "junktown theme",
            detail: "yeah, junktown theme",
            src: "./assets/audio/fictional-story/ingame/junktown-theme.mp3",
            duration: 159.5559,
          },
          {
            title: "the first day inside a whale",
            detail: "lobby theme",
            src: "./assets/audio/fictional-story/ingame/the-first-day-inside-a-whale.mp3",
            duration: 116.166525,
          },
          {
            title: "casino theme",
            src: "./assets/audio/fictional-story/ingame/casino-theme.mp3",
            duration: 28.47345,
          },
          {
            title: "arcade theme",
            src: "./assets/audio/fictional-story/ingame/arcade-theme.mp3",
            duration: 24.03265,
          },
          {
            title: "secret indev location theme",
            src: "./assets/audio/fictional-story/ingame/secret-indev-location-theme.mp3",
            duration: 24.03265,
          },
        ],
      },
      {
        id: "sfx",
        title: "sfx",
        tracks: [],
        content: {
          text: "i’ve made a few sounds for the game’s cutscenes",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "#",
        },
      },
    ],
  },
  downsouth: {
    title: "downsouth",
    note: "work in progress",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "platamun",
            detail: "greenhouse area music",
            src: "./assets/audio/downsouth/ingame/platamun.mp3",
            duration: 268.27755,
          },
          {
            title: "skadar",
            detail: "motel area music",
            src: "./assets/audio/downsouth/ingame/skadar.mp3",
            duration: 136.0457,
          },
          {
            title: "schroeder’s theme",
            detail: "he’s so cool",
            src: "./assets/audio/downsouth/ingame/schroeders-theme.mp3",
            duration: 115.6702,
          },
          {
            title: "juice!",
            src: "./assets/audio/downsouth/ingame/juice.mp3",
            duration: 117.36815,
          },
          {
            title: "demo ambience i",
            src: "./assets/audio/downsouth/ingame/demo-ambience-i.mp3",
            duration: 156.029375,
          },
          {
            title: "demo ambience ii",
            src: "./assets/audio/downsouth/ingame/demo-ambience-ii.mp3",
            duration: 192.0261,
          },
        ],
      },
    ],
  },
  "seeds-of-sorrow": {
    title: "seeds of sorrow",
    note: "work in progress",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "misty pier",
            src: "./assets/audio/seeds-of-sorrow/ingame/misty-pier.mp3",
            duration: 80.04,
          },
          {
            title: "the rainy gnome song",
            src: "./assets/audio/seeds-of-sorrow/ingame/the-rainy-gnome-song.mp3",
            duration: 96.024,
          },
          {
            title: "demo fight track",
            src: "./assets/audio/seeds-of-sorrow/ingame/demo-fight-track.mp3",
            duration: 134.426094,
          },
        ],
      },
    ],
  },
  "industrial-ambient": {
    title: "industrial ambient",
    note: {
      text: "wip (i can’t say the name of this project)",
      modifier: "player-note--compact",
    },
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "playing jazz in the metropolis",
            src: "./assets/audio/industrial-ambient/ingame/playing-jazz-in-the-metropolis.mp3",
            duration: 174.024,
          },
          {
            title: "capital’s barbershop",
            src: "./assets/audio/industrial-ambient/ingame/capitals-barbershop.mp3",
            duration: 85.368,
          },
          {
            title: "bion",
            src: "./assets/audio/industrial-ambient/ingame/bion.mp3",
            duration: 96.024,
          },
          {
            title: "greenhouse floor 264",
            src: "./assets/audio/industrial-ambient/ingame/greenhouse-floor-264.mp3",
            duration: 112.032,
          },
          {
            title: "city lights",
            src: "./assets/audio/industrial-ambient/ingame/city-lights.mp3",
            duration: 130.944,
          },
          {
            title: "industrial ash",
            src: "./assets/audio/industrial-ambient/ingame/industrial-ash.mp3",
            duration: 124.704,
          },
        ],
      },
    ],
  },
  "untitled-ost": {
    title: "untitled ost",
    note: "unreleased project",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "damaged data",
            src: "./assets/audio/untitled-ost/ingame/damaged-data.mp3",
            duration: 110.544,
          },
          {
            title: "antenna",
            src: "./assets/audio/untitled-ost/ingame/antenna.mp3",
            duration: 112.968,
          },
          {
            title: "a kite with dad",
            src: "./assets/audio/untitled-ost/ingame/a-kite-with-dad.mp3",
            duration: 134.232,
          },
          {
            title: "a hopeful transmission",
            src: "./assets/audio/untitled-ost/ingame/a-hopeful-transmission.mp3",
            duration: 112.032,
          },
          {
            title: "fever dream",
            src: "./assets/audio/untitled-ost/ingame/fever-dream.mp3",
            duration: 184.536,
          },
          {
            title: "infinity sign",
            src: "./assets/audio/untitled-ost/ingame/infinity-sign.mp3",
            duration: 146.28,
          },
          {
            title: "a burned pixel",
            src: "./assets/audio/untitled-ost/ingame/a-burned-pixel.mp3",
            duration: 256.032,
          },
        ],
      },
    ],
  },
};

let activeAudio = null;
let activeTrack = null;
let progressFrame = null;
let audioContext = null;
let audioTrackEntries = [];
let isShuffleEnabled = false;
let shuffleEntries = [];
let shuffleIndex = -1;
let pendingAutoAdvanceEntry = null;
let autoAdvanceRetryTimer = null;
let autoAdvanceRetryAttempts = 0;

const audioNodes = new WeakMap();
const audioFadeTimers = new WeakMap();
const trackLoadingTimers = new WeakMap();
const audioEntries = new WeakMap();
const trackEntries = new WeakMap();

let shouldResetInitialScroll = true;

function resetInitialScroll() {
  if (!shouldResetInitialScroll) {
    return;
  }

  window.scrollTo(0, 0);
}

function clearStageHeightClamp() {
  if (!stageHeightClampStep) {
    return;
  }

  clearTimeout(stageHeightClampStep);
  stageHeightClampStep = null;
}

function getViewportScale() {
  const width = window.innerWidth || designWidth;
  return Math.min(Math.max(width / designWidth, 0.1), maxViewportScale);
}

function getStageHeight() {
  return Math.ceil(stage.offsetHeight);
}

function getMaxScrollForStageHeight(stageHeight) {
  return Math.max(0, Math.ceil(stageHeight * viewportScale - window.innerHeight));
}

function syncResponsiveFrame() {
  viewportScale = getViewportScale();

  const scaledWidth = Math.ceil(designWidth * viewportScale);
  const scaledHeight = Math.ceil(getStageHeight() * viewportScale);

  document.documentElement.style.setProperty("--site-scale", String(viewportScale));
  document.documentElement.style.setProperty("--scaled-site-width", `${scaledWidth}px`);
  document.documentElement.style.setProperty("--scaled-stage-height", `${scaledHeight}px`);
}

function setStageMinHeight(nextHeight, options = {}) {
  const { smoothScroll = true } = options;
  const numericHeight = Number(nextHeight);

  clearStageHeightClamp();

  if (!Number.isFinite(numericHeight)) {
    stage.style.minHeight = "";
    syncResponsiveFrame();
    return;
  }

  const currentHeight = getStageHeight();
  const targetScroll = getMaxScrollForStageHeight(numericHeight);
  const shouldSmoothScroll =
    smoothScroll && currentHeight > numericHeight && window.scrollY > targetScroll + 1;

  if (!shouldSmoothScroll) {
    stage.style.minHeight = `${numericHeight}px`;
    syncResponsiveFrame();
    return;
  }

  stage.style.minHeight = `${currentHeight}px`;
  syncResponsiveFrame();
  smoothScrollTo(targetScroll, accordionScrollDuration);

  stageHeightClampStep = setTimeout(() => {
    stageHeightClampStep = null;
    stage.style.minHeight = `${numericHeight}px`;
    syncResponsiveFrame();
    syncMiniPlayer();
  }, scrollClampDuration);
}

function applyTheme(section) {
  body.classList.remove("theme-projects", "theme-all-music", "theme-contact");
  body.classList.add(`theme-${section}`);
  syncMiniPlayer();
}

function applyActiveTitle(section) {
  body.dataset.activeSection = section;

  titleLinks.forEach((link) => {
    const isActive = link.dataset.section === section;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function applyStripeHeights(section) {
  whiteStripes.forEach((stripe, index) => {
    stripe.style.height = `${whiteStripeHeights[section][index]}px`;
  });
}

function revealContent(content, instant = false) {
  if (!content) {
    return;
  }

  if (instant) {
    content.classList.add("is-visible");
    return;
  }

  requestAnimationFrame(() => {
    content.classList.add("is-visible");
  });
}

function applyContent(section, options = {}) {
  let activeContent = null;

  sectionContents.forEach((content) => {
    const isActive = content.dataset.content === section;

    content.classList.remove("is-visible");
    content.hidden = !isActive;

    if (isActive) {
      activeContent = content;
    }
  });

  if (section === "projects") {
    requestAnimationFrame(() => {
      syncProjectsLayout();
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
    });
  } else if (section === "all-music") {
    requestAnimationFrame(() => {
      syncMusicLayout();
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
      requestAnimationFrame(syncMiniPlayer);
    });
  } else {
    setStageMinHeight(contactMinHeight + footerHeight);
    requestAnimationFrame(() => {
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
    });
  }
}

function hideContent() {
  let hasVisibleContent = false;

  sectionContents.forEach((content) => {
    if (!content.hidden) {
      hasVisibleContent = true;
    }

    content.classList.remove("is-visible");
  });

  if (!hasVisibleContent) {
    syncMiniPlayer();
    return;
  }

  scheduleStep(() => {
    sectionContents.forEach((content) => {
      if (!content.classList.contains("is-visible")) {
        content.hidden = true;
      }
    });

    syncMiniPlayer();
  }, contentFadeDuration);
}

function clearPendingSteps() {
  pendingSteps.forEach((step) => clearTimeout(step));
  pendingSteps = [];
  clearStageHeightClamp();
}

function scheduleStep(callback, delay) {
  const step = setTimeout(callback, delay);
  pendingSteps.push(step);
}

function applyMusicTab(tab) {
  body.dataset.musicTab = tab;

  musicTabs.forEach((button) => {
    const isActive = button.dataset.musicTab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  musicPanels.forEach((panel) => {
    const isActive = panel.dataset.musicPanel === tab;

    if (isActive) {
      panel.hidden = false;

      requestAnimationFrame(() => {
        panel.classList.add("is-active");
        syncMusicLayout();
        syncMiniPlayer();
      });

      return;
    }

    panel.classList.remove("is-active");

    if (panel.hidden) {
      return;
    }

    scheduleStep(() => {
      if (!panel.classList.contains("is-active")) {
        panel.hidden = true;
      }

      syncMusicLayout();
      syncMiniPlayer();
    }, contentFadeDuration);
  });

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function getStageBottom(node) {
  const stageRect = stage.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  return (nodeRect.bottom - stageRect.top) / viewportScale;
}

function getStageTop(node) {
  const stageRect = stage.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  return (nodeRect.top - stageRect.top) / viewportScale;
}

function getImageHeight(image) {
  const renderedHeight = image.offsetHeight || image.getBoundingClientRect().height / viewportScale;

  if (renderedHeight > 0) {
    return renderedHeight;
  }

  const renderedWidth = image.offsetWidth || image.getBoundingClientRect().width / viewportScale;
  return (image.naturalHeight / image.naturalWidth) * renderedWidth;
}

function syncProjectsLayout() {
  if (!body.classList.contains("theme-projects")) {
    return;
  }

  projectTextFlow.forEach(({ anchor, copy }) => {
    if (!anchor || !copy) {
      return;
    }

    copy.style.top = `${Math.round(getStageBottom(anchor) + projectTextGap)}px`;
  });

  const schoolImage = document.querySelector(".project-image--school");
  const schoolCopy = document.querySelector(".project-copy--school");

  if (schoolImage && schoolCopy) {
    schoolImage.style.top = `${Math.round(getStageTop(schoolCopy))}px`;
  }

  projectImageOffsets.forEach(({ image, anchor, offset }) => {
    if (!image || !anchor) {
      return;
    }

    const imageHeight = getImageHeight(image);
    const top = getStageBottom(anchor) + offset - imageHeight;
    image.style.top = `${Math.round(top)}px`;
  });

  const pageEndAnchor = document.querySelector("[data-page-end-anchor]");

  if (pageEndAnchor) {
    setStageMinHeight(Math.ceil(getStageBottom(pageEndAnchor) + 700 + footerHeight));
  }
}

function getSoundtrackListTargetHeight(list) {
  const items = [...list.querySelectorAll(".soundtrack-item")];
  const rowGap = parseFloat(getComputedStyle(list).rowGap);
  const gap = Number.isFinite(rowGap) ? rowGap : 0;

  return items.reduce((total, item, index) => {
    const body = item.querySelector(".soundtrack-body");
    const itemHeight = item.getBoundingClientRect().height / viewportScale;
    const currentBodyHeight =
      body && !body.hidden ? body.getBoundingClientRect().height / viewportScale : 0;
    const targetBodyHeight = body
      ? item.classList.contains("is-open")
        ? body.scrollHeight
        : currentBodyHeight
      : 0;

    return total + itemHeight - currentBodyHeight + targetBodyHeight + (index ? gap : 0);
  }, 0);
}

function syncMusicLayout() {
  if (!body.classList.contains("theme-all-music")) {
    syncMiniPlayer();
    return;
  }

  const activePanel = document.querySelector(".music-panel.is-active");
  const activePanelHasFooter = activePanel?.dataset.musicPanel !== "soundtracks";
  const activeFooterHeight = activePanelHasFooter ? footerHeight : 0;
  const baseMusicHeight = musicMinHeight + activeFooterHeight;

  if (!activePanel || activePanel.hidden) {
    setStageMinHeight(baseMusicHeight);
    syncMiniPlayer();
    return;
  }

  const layoutTarget =
    activePanel.querySelector(".soundtrack-list") ||
    activePanel.querySelector(".own-music-list");

  if (!layoutTarget) {
    setStageMinHeight(baseMusicHeight);
    syncMiniPlayer();
    return;
  }

  const contentBottom = layoutTarget.classList.contains("soundtrack-list")
    ? getStageTop(layoutTarget) + getSoundtrackListTargetHeight(layoutTarget)
    : getStageBottom(layoutTarget);
  const contentHeight = Math.ceil(contentBottom + musicBottomPadding + activeFooterHeight);

  setStageMinHeight(Math.max(baseMusicHeight, contentHeight));
  syncMiniPlayer();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function syncAudioAccent(entry = null) {
  const nextColor = entry
    ? audioAccentColors[entry.playerKey] || defaultAccentColor
    : defaultAccentColor;
  const nextOwnMusicLinkColor = entry
    ? ownMusicLinkColors[entry.playerKey] || nextColor
    : defaultAccentColor;

  document.documentElement.style.setProperty("--red", nextColor);
  document.documentElement.style.setProperty("--own-music-link", nextOwnMusicLinkColor);
}

function toCssIconUrl(value) {
  return `url("${value}")`;
}

function preloadMiniIconSets() {
  const paths = new Set();

  Object.values(miniIconSets).forEach((iconSet) => {
    Object.values(iconSet).forEach((path) => paths.add(path));
  });

  paths.forEach((path) => {
    const image = new Image();
    image.src = path;
  });
}

function syncMiniIconSet(entry = null) {
  if (!miniPlayer) {
    return;
  }

  const isLightMiniPlayer =
    body.classList.contains("theme-all-music") || body.classList.contains("theme-contact");
  const iconKey = isLightMiniPlayer ? entry?.playerKey || "kletka" : "default";
  const iconSet = miniIconSets[iconKey] || miniIconSets.kletka;
  const setKey = `${isLightMiniPlayer ? "light" : "color"}|${iconKey}`;

  if (setKey === miniIconSetKey) {
    return;
  }

  miniIconSetKey = setKey;
  miniPlayer.style.setProperty("--mini-play-icon", toCssIconUrl(iconSet.play));
  miniPlayer.style.setProperty("--mini-stop-icon", toCssIconUrl(iconSet.stop));
  miniPlayer.style.setProperty("--mini-loading-icon", toCssIconUrl(iconSet.loading));
  miniPlayer.style.setProperty("--mini-prev-icon", toCssIconUrl(iconSet.previous));
  miniPlayer.style.setProperty("--mini-next-icon", toCssIconUrl(iconSet.next));
  miniPlayer.style.setProperty(
    "--mini-shuffle-active-icon",
    toCssIconUrl(iconSet.shuffleActive),
  );
  miniPlayer.style.setProperty(
    "--mini-shuffle-passive-icon",
    toCssIconUrl(iconSet.shufflePassive),
  );
}

function renderAudioPlayers() {
  audioTrackEntries = [];

  document.querySelectorAll("[data-audio-player]").forEach((root) => {
    const player = audioLibrary[root.dataset.audioPlayer];
    const itemTitle = root
      .closest(".soundtrack-item")
      ?.querySelector(".soundtrack-title")
      ?.innerText.replace(/\s+/g, " ")
      .trim();
    const playerTitle = player?.title || itemTitle || root.dataset.audioPlayer;

    if (!player) {
      return;
    }

    root.innerHTML = "";

    const categories = document.createElement("div");
    categories.className = "player-categories";

    player.categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.className = "player-category";
      button.type = "button";
      button.textContent = category.title;
      button.dataset.playerCategory = category.id;
      button.classList.toggle("is-active", index === 0);
      button.addEventListener("click", () => {
        categories.querySelectorAll(".player-category").forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });

        root.querySelectorAll(".player-track-list").forEach((list) => {
          const isActive = list.dataset.playerCategory === category.id;
          list.classList.toggle("is-active", isActive);
          list.hidden = !isActive;
        });

        const soundtrackItem = root.closest(".soundtrack-item");
        resizeOpenSoundtrackBody(soundtrackItem);
        requestAnimationFrame(() => resizeOpenSoundtrackBody(soundtrackItem));
      });
      categories.append(button);
    });

    player.categories.forEach((category, index) => {
      const trackList = document.createElement("div");
      trackList.className = "player-track-list";
      trackList.dataset.playerCategory = category.id;
      trackList.classList.toggle("is-active", index === 0);
      trackList.hidden = index !== 0;

      (category.tracks || []).forEach((track) => {
        trackList.append(createAudioTrack(track, root.dataset.audioPlayer, playerTitle));
      });

      if (category.content) {
        trackList.append(createPlayerTextBlock(category.content));
      }

      root.append(trackList);
    });

    if (player.note) {
      root.prepend(createPlayerNote(player.note), categories);
    } else {
      root.prepend(categories);
    }
  });
}

function createPlayerNote(noteContent) {
  const note = document.createElement("p");
  note.className = "player-note";

  if (typeof noteContent === "string") {
    note.textContent = noteContent;
  } else {
    note.textContent = noteContent.text;
    note.classList.add(noteContent.modifier);
  }

  return note;
}

function createPlayerTextBlock(content) {
  const block = document.createElement("div");
  block.className = "player-text-block";

  const text = document.createElement("p");
  text.className = "player-text";
  text.textContent = content.text;

  const link = document.createElement("a");
  link.className = "player-text-link";
  link.href = content.linkHref;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = content.linkText;

  block.append(text, link);

  return block;
}

function createAudioTrack(track, playerKey, playerTitle) {
  const trackElement = document.createElement("article");
  trackElement.className = "audio-track";
  trackElement.dataset.duration = String(track.duration);
  trackElement.dataset.player = playerKey;
  trackElement.dataset.playerTitle = playerTitle;
  trackElement.dataset.trackTitle = track.title;
  trackElement.dataset.trackDetail = track.detail || "";

  const title = document.createElement("h4");
  title.className = "audio-track-title";
  title.textContent = track.title;

  if (track.detail) {
    const detail = document.createElement("span");
    detail.className = "audio-track-detail";
    detail.textContent = ` (${track.detail})`;
    title.append(detail);
  }

  const controls = document.createElement("div");
  controls.className = "audio-track-controls";

  const playButton = document.createElement("button");
  playButton.className = "track-play";
  playButton.type = "button";
  playButton.setAttribute("aria-label", `play ${track.title}`);

  const playIcon = document.createElement("img");
  playIcon.className = "track-play-icon track-play-icon--play";
  playIcon.src = "./assets/icons/ffffff/play.webp";
  playIcon.alt = "";
  playIcon.loading = "eager";
  playIcon.decoding = "async";
  playIcon.setAttribute("aria-hidden", "true");

  const stopIcon = document.createElement("img");
  stopIcon.className = "track-play-icon track-play-icon--stop";
  stopIcon.src = "./assets/icons/ffffff/stop.webp";
  stopIcon.alt = "";
  stopIcon.loading = "eager";
  stopIcon.decoding = "async";
  stopIcon.setAttribute("aria-hidden", "true");

  const loadingIcon = document.createElement("img");
  loadingIcon.className = "track-loading-icon";
  loadingIcon.src = "./assets/icons/ffffff/loading.gif";
  loadingIcon.alt = "";
  loadingIcon.loading = "eager";
  loadingIcon.decoding = "async";
  loadingIcon.setAttribute("aria-hidden", "true");

  playButton.append(playIcon, stopIcon, loadingIcon);

  const progress = document.createElement("div");
  progress.className = "track-progress";
  progress.innerHTML = `
    <div class="track-progress-bar"></div>
    <div class="track-progress-fill"></div>
    <div class="track-progress-thumb"></div>
  `;

  const time = document.createElement("div");
  time.className = "track-time";
  time.textContent = `00:00 / ${formatTime(track.duration)}`;

  const audio = document.createElement("audio");
  audio.className = "audio-native";
  audio.preload = "none";
  audio.dataset.src = track.src;

  const entry = {
    audio,
    index: audioTrackEntries.length,
    playerKey,
    playerTitle,
    track,
    trackElement,
  };

  audioTrackEntries.push(entry);
  audioEntries.set(audio, entry);
  trackEntries.set(trackElement, entry);

  playButton.addEventListener("click", () => {
    toggleTrack(trackElement, audio);
  });

  progress.addEventListener("pointerdown", (event) => {
    seekTrackFromPointer(trackElement, audio, event, true);
    progress.setPointerCapture(event.pointerId);
  });

  progress.addEventListener("pointermove", (event) => {
    if (event.buttons !== 1 || progress.dataset.dragging !== "true") {
      return;
    }

    seekTrackFromPointer(trackElement, audio, event);
  });

  progress.addEventListener("pointerup", (event) => {
    progress.dataset.dragging = "false";
    progress.releasePointerCapture(event.pointerId);
  });

  progress.addEventListener("pointercancel", () => {
    progress.dataset.dragging = "false";
  });

  audio.addEventListener("timeupdate", () => {
    updateTrackProgress(trackElement, audio);
  });

  const scheduleLoadingIfActive = () => {
    if (isTrackAttemptingPlayback(trackElement, audio)) {
      setTrackLoading(trackElement, true);
    }
  };

  const refreshLoadingIfActive = () => {
    refreshTrackLoading(trackElement, audio);
  };

  audio.addEventListener("loadstart", refreshLoadingIfActive);
  audio.addEventListener("loadedmetadata", refreshLoadingIfActive);
  audio.addEventListener("loadeddata", refreshLoadingIfActive);
  audio.addEventListener("progress", refreshLoadingIfActive);
  audio.addEventListener("suspend", refreshLoadingIfActive);
  audio.addEventListener("canplay", refreshLoadingIfActive);
  audio.addEventListener("canplaythrough", refreshLoadingIfActive);
  audio.addEventListener("playing", refreshLoadingIfActive);
  audio.addEventListener("seeked", refreshLoadingIfActive);
  audio.addEventListener("seeking", scheduleLoadingIfActive);
  audio.addEventListener("waiting", scheduleLoadingIfActive);
  audio.addEventListener("stalled", scheduleLoadingIfActive);

  audio.addEventListener("pause", () => {
    setTrackLoading(trackElement, false);
  });

  audio.addEventListener("error", () => {
    setTrackLoading(trackElement, false);
  });

  audio.addEventListener("ended", () => {
    setTrackLoading(trackElement, false);
    trackElement.classList.remove("is-playing", "is-play-pending");
    updateTrackProgress(trackElement, audio);
    stopProgressLoop();

    if (activeAudio === audio) {
      playAdjacentTrack(1, entry, { autoAdvance: true });
    }
  });

  controls.append(playButton, progress, time);
  trackElement.append(title, controls, audio);

  return trackElement;
}

function isTrackAttemptingPlayback(trackElement, audio) {
  if (!trackElement || !audio || trackElement !== activeTrack || audio !== activeAudio) {
    return false;
  }

  return (
    trackElement.classList.contains("is-play-pending") ||
    trackElement.classList.contains("is-playing") ||
    !audio.paused
  );
}

function shouldShowTrackLoading(trackElement, audio) {
  if (!isTrackAttemptingPlayback(trackElement, audio) || audio.error || audio.ended) {
    return false;
  }

  return audio.seeking || audio.readyState < 3;
}

function refreshTrackLoading(trackElement, audio) {
  setTrackLoading(trackElement, shouldShowTrackLoading(trackElement, audio));
}

function setTrackLoading(trackElement, isLoading) {
  const playButton = trackElement?.querySelector(".track-play");

  if (!trackElement) {
    return;
  }

  if (isLoading) {
    if (trackElement.classList.contains("is-loading") || trackLoadingTimers.has(trackElement)) {
      return;
    }

    const timer = setTimeout(() => {
      trackLoadingTimers.delete(trackElement);

      const entry = trackEntries.get(trackElement);

      if (entry && !shouldShowTrackLoading(trackElement, entry.audio)) {
        return;
      }

      trackElement.classList.add("is-loading");
      playButton?.setAttribute("aria-busy", "true");

      if (trackElement === activeTrack) {
        syncMiniPlayer();
      }
    }, audioLoadingDelay);

    trackLoadingTimers.set(trackElement, timer);
    return;
  }

  const timer = trackLoadingTimers.get(trackElement);
  const wasLoading = trackElement.classList.contains("is-loading");
  const wasBusy = playButton?.hasAttribute("aria-busy");

  if (timer) {
    clearTimeout(timer);
    trackLoadingTimers.delete(trackElement);
  }

  if (!timer && !wasLoading && !wasBusy) {
    return;
  }

  trackElement.classList.remove("is-loading");
  playButton?.removeAttribute("aria-busy");

  if (trackElement === activeTrack) {
    syncMiniPlayer();
  }
}

function resetTrackProgress(trackElement, audio) {
  if (!trackElement || !audio) {
    return;
  }

  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers refuse seeking before metadata is ready; the displayed state still resets.
  }

  trackElement.classList.remove("has-progress");
  updateTrackProgress(trackElement, audio);
}

function ensureAudioSource(audio) {
  if (!audio || audio.getAttribute("src")) {
    return;
  }

  const source = audio.dataset.src;

  if (!source) {
    return;
  }

  audio.src = source;
  audio.load();
}

function preloadTrackEntry(entry) {
  if (!entry?.audio || entry.audio.getAttribute("src")) {
    return;
  }

  entry.audio.preload = "auto";
  ensureAudioSource(entry.audio);
}

function getAdjacentPreviewEntry(direction, fallbackEntry = null) {
  const playableEntries = getMiniPlayableEntries();

  if (!playableEntries.length) {
    return null;
  }

  const currentEntry = activeTrack ? trackEntries.get(activeTrack) : fallbackEntry;
  const currentEntryIsPlayable = currentEntry && playableEntries.includes(currentEntry);

  if (isShuffleEnabled) {
    if (shuffleEntries.length !== playableEntries.length) {
      createShuffleSequence(currentEntryIsPlayable ? currentEntry : null);
    }

    if (!shuffleEntries.length) {
      return null;
    }

    const currentShuffleIndex = currentEntryIsPlayable
      ? shuffleEntries.indexOf(currentEntry)
      : shuffleIndex;
    const safeIndex =
      currentShuffleIndex === -1
        ? direction < 0
          ? shuffleEntries.length
          : -1
        : currentShuffleIndex;
    const nextIndex =
      (safeIndex + direction + shuffleEntries.length) % shuffleEntries.length;

    return shuffleEntries[nextIndex];
  }

  const currentIndex = currentEntryIsPlayable ? playableEntries.indexOf(currentEntry) : -1;
  const safeIndex =
    currentIndex === -1 ? (direction < 0 ? playableEntries.length : -1) : currentIndex;
  const nextIndex = (safeIndex + direction + playableEntries.length) % playableEntries.length;

  return playableEntries[nextIndex];
}

function preloadAdjacentTrack(entry = null) {
  const nextEntry = getAdjacentPreviewEntry(1, entry);

  if (!nextEntry || nextEntry === entry) {
    return;
  }

  preloadTrackEntry(nextEntry);
}

function clearAutoAdvanceRetry() {
  if (!autoAdvanceRetryTimer) {
    return;
  }

  clearTimeout(autoAdvanceRetryTimer);
  autoAdvanceRetryTimer = null;
}

function retryPendingAutoAdvance() {
  if (!pendingAutoAdvanceEntry) {
    return;
  }

  const entry = pendingAutoAdvanceEntry;
  clearAutoAdvanceRetry();
  playTrackEntry(entry, { autoAdvance: true });
}

function scheduleAutoAdvanceRetry(entry) {
  if (pendingAutoAdvanceEntry !== entry) {
    autoAdvanceRetryAttempts = 0;
  }

  pendingAutoAdvanceEntry = entry;
  clearAutoAdvanceRetry();

  if (autoAdvanceRetryAttempts >= 3) {
    return;
  }

  autoAdvanceRetryAttempts += 1;
  autoAdvanceRetryTimer = setTimeout(() => {
    autoAdvanceRetryTimer = null;
    retryPendingAutoAdvance();
  }, 1000);
}

function toggleTrack(trackElement, audio, options = {}) {
  const {
    autoAdvance = false,
    forcePlay = false,
    resetNewTrack = true,
    startTime = null,
  } = options;

  if (!forcePlay && audio === activeAudio && !audio.paused) {
    fadeOutAndPause(audio, trackElement, false);
    return;
  }

  const isNewTrack = audio !== activeAudio;

  pauseActiveAudio(audio, isNewTrack);
  ensureAudioSource(audio);

  activeAudio = audio;
  activeTrack = trackElement;
  syncShufflePosition(trackEntries.get(trackElement));

  if (!autoAdvance) {
    pendingAutoAdvanceEntry = null;
    autoAdvanceRetryAttempts = 0;
    clearAutoAdvanceRetry();
  }

  if (isNewTrack && resetNewTrack) {
    resetTrackProgress(trackElement, audio);
  }

  if (Number.isFinite(startTime)) {
    try {
      audio.currentTime = startTime;
    } catch {
      audio.addEventListener(
        "loadedmetadata",
        () => {
          audio.currentTime = startTime;
          updateTrackProgress(trackElement, audio);
        },
        { once: true },
      );
    }

    trackElement.classList.toggle("has-progress", startTime > 0);
    updateTrackProgress(trackElement, audio);
  }

  trackElement.classList.add("is-play-pending");
  prepareAudioFadeIn(audio);
  setTrackLoading(trackElement, true);
  syncMiniPlayer();

  audio
    .play()
    .then(() => {
      if (activeAudio !== audio) {
        audio.pause();
        setTrackLoading(trackElement, false);
        trackElement.classList.remove("is-playing", "is-play-pending");
        syncMiniPlayer();
        return;
      }

      trackElement.classList.remove("is-play-pending");
      trackElement.classList.add("is-playing", "has-progress");
      refreshTrackLoading(trackElement, audio);
      fadeAudio(audio, 1);
      startProgressLoop();
      pendingAutoAdvanceEntry = null;
      autoAdvanceRetryAttempts = 0;
      clearAutoAdvanceRetry();
      preloadAdjacentTrack(trackEntries.get(trackElement));
      syncMiniPlayer();
    })
    .catch(() => {
      const entry = trackEntries.get(trackElement);

      setTrackLoading(trackElement, false);
      trackElement.classList.remove("is-playing", "is-play-pending");

      if (autoAdvance && entry) {
        scheduleAutoAdvanceRetry(entry);
        syncMiniPlayer();
        return;
      }

      if (activeAudio === audio) {
        activeAudio = null;
        activeTrack = null;
      }

      syncMiniPlayer();
    });
}

function pauseActiveAudio(exceptAudio = null, resetProgress = false) {
  if (!activeAudio || activeAudio === exceptAudio) {
    return;
  }

  fadeOutAndPause(activeAudio, activeTrack, true, resetProgress);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function getAudioNode(audio) {
  if (audioNodes.has(audio)) {
    return audioNodes.get(audio);
  }

  const context = getAudioContext();

  if (!context) {
    return null;
  }

  const source = context.createMediaElementSource(audio);
  const gain = context.createGain();

  source.connect(gain);
  gain.connect(context.destination);
  gain.gain.value = 1;

  const node = { context, gain };
  audioNodes.set(audio, node);

  return node;
}

function clearAudioFade(audio) {
  const timer = audioFadeTimers.get(audio);

  if (timer) {
    clearTimeout(timer);
    audioFadeTimers.delete(audio);
  }
}

function shouldUseDirectAudioFade() {
  return document.hidden && document.documentElement.classList.contains("is-webkit");
}

function prepareAudioFadeIn(audio) {
  clearAudioFade(audio);

  if (shouldUseDirectAudioFade()) {
    audio.volume = 1;
    return;
  }

  const node = getAudioNode(audio);

  if (!node) {
    audio.volume = 0;
    return;
  }

  if (node.context.state === "suspended") {
    node.context.resume();
  }

  const now = node.context.currentTime;
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.setValueAtTime(0, now);
}

function fadeAudio(audio, targetVolume, onComplete) {
  clearAudioFade(audio);

  if (shouldUseDirectAudioFade()) {
    audio.volume = targetVolume;
    onComplete?.();
    return;
  }

  const node = getAudioNode(audio);

  if (node) {
    if (node.context.state === "suspended") {
      node.context.resume();
    }

    const now = node.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
    node.gain.gain.linearRampToValueAtTime(targetVolume, now + audioFadeDuration);
  } else {
    audio.volume = targetVolume;
  }

  const timer = setTimeout(() => {
    audioFadeTimers.delete(audio);
    onComplete?.();
  }, audioFadeDuration * 1000);

  audioFadeTimers.set(audio, timer);
}

function fadeOutAndPause(audio, trackElement, clearActive = false, resetProgress = false) {
  if (!audio) {
    return;
  }

  setTrackLoading(trackElement, false);
  trackElement?.classList.remove("is-playing", "is-play-pending");
  syncMiniPlayer();

  if (audio === activeAudio) {
    stopProgressLoop();
  }

  fadeAudio(audio, 0, () => {
    audio.pause();

    if (resetProgress) {
      resetTrackProgress(trackElement, audio);
    }

    if (clearActive && activeAudio === audio) {
      activeAudio = null;
      activeTrack = null;
    }

    syncMiniPlayer();
  });
}

function stopProgressLoop() {
  if (progressFrame) {
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
  }
}

function startProgressLoop() {
  stopProgressLoop();

  const tick = () => {
    if (activeAudio && activeTrack && !activeAudio.paused) {
      updateTrackProgress(activeTrack, activeAudio);
      refreshTrackLoading(activeTrack, activeAudio);
      progressFrame = requestAnimationFrame(tick);
    }
  };

  progressFrame = requestAnimationFrame(tick);
}

function seekTrackFromPointer(trackElement, audio, event, playInactive = false) {
  const progress = trackElement.querySelector(".track-progress");
  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;

  if (!progress || !duration) {
    return;
  }

  ensureAudioSource(audio);
  progress.dataset.dragging = "true";

  const rect = progress.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const targetTime = ratio * duration;

  if (playInactive && (audio !== activeAudio || audio.paused)) {
    toggleTrack(trackElement, audio, {
      forcePlay: true,
      resetNewTrack: false,
      startTime: targetTime,
    });
    return;
  }

  try {
    audio.currentTime = targetTime;
  } catch {
    audio.addEventListener(
      "loadedmetadata",
      () => {
        audio.currentTime = targetTime;
        updateTrackProgress(trackElement, audio);
      },
      { once: true },
    );
  }

  trackElement.classList.add("has-progress");
  updateTrackProgress(trackElement, audio);
}

function updateTrackProgress(trackElement, audio) {
  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;
  const currentTime = audio.currentTime || 0;
  const ratio = duration ? Math.min(currentTime / duration, 1) : 0;
  const fill = trackElement.querySelector(".track-progress-fill");
  const thumb = trackElement.querySelector(".track-progress-thumb");
  const time = trackElement.querySelector(".track-time");
  const percent = `${ratio * 100}%`;

  if (fill) {
    fill.style.width = percent;
  }

  if (thumb) {
    thumb.style.left = percent;
  }

  if (time) {
    time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  if (trackElement === activeTrack && audio === activeAudio) {
    updateMiniProgress(trackElement, audio);
  }
}

function setMiniTitle(entry) {
  if (!miniTitle || !miniSource) {
    return;
  }

  miniTitle.replaceChildren();

  if (!entry) {
    miniSource.textContent = "";
    return;
  }

  miniTitle.append(document.createTextNode(entry.track.title));

  if (entry.track.detail) {
    const detail = document.createElement("span");
    detail.className = "mini-track-detail";
    detail.textContent = ` (${entry.track.detail})`;
    miniTitle.append(detail);
  }

  miniSource.textContent = entry.playerTitle;
}

function updateMiniProgress(trackElement, audio) {
  if (!miniProgressFill || !miniProgressThumb || !miniTime) {
    return;
  }

  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;
  const currentTime = audio.currentTime || 0;
  const ratio = duration ? Math.min(currentTime / duration, 1) : 0;
  const percent = `${ratio * 100}%`;

  miniProgressFill.style.width = percent;
  miniProgressThumb.style.left = percent;
  miniTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function isActiveSourceVisible() {
  if (!activeTrack || currentSection !== "all-music") {
    return false;
  }

  const musicContent = document.querySelector('[data-content="all-music"]');
  const item = activeTrack.closest(".soundtrack-item");

  if (
    activeTrack.offsetParent === null ||
    !musicContent ||
    musicContent.hidden ||
    !musicContent.classList.contains("is-visible") ||
    !item?.classList.contains("is-open")
  ) {
    return false;
  }

  const rect = item.getBoundingClientRect();
  const miniHeight = miniPlayer?.getBoundingClientRect().height || 130 * viewportScale;
  const visibleBottom = window.innerHeight - miniHeight;

  return rect.bottom > 0 && rect.top < visibleBottom;
}

function isActiveFooterTouchingViewportBottom() {
  const activeContent = sectionContents.find(
    (content) => content.dataset.content === currentSection && !content.hidden,
  );
  const footer = activeContent?.querySelector(".site-footer");

  if (!footer || getComputedStyle(footer).display === "none") {
    return false;
  }

  return footer.getBoundingClientRect().top <= window.innerHeight;
}

function syncMiniPlayer() {
  if (!miniPlayer) {
    return;
  }

  const entry = activeTrack ? trackEntries.get(activeTrack) : null;
  const hasTrack = Boolean(entry && activeAudio && activeTrack);

  syncAudioAccent(hasTrack ? entry : null);
  syncMiniIconSet(hasTrack ? entry : null);

  const isSuppressed =
    hasTrack && (isActiveSourceVisible() || isActiveFooterTouchingViewportBottom());
  const isVisible = hasTrack && !isSuppressed;
  const isPlaying =
    hasTrack &&
    (activeTrack.classList.contains("is-playing") ||
      activeTrack.classList.contains("is-play-pending"));

  miniPlayer.classList.toggle("is-visible", isVisible);
  miniPlayer.classList.toggle("is-playing", isPlaying);
  miniPlayer.classList.toggle(
    "is-loading",
    hasTrack && activeTrack.classList.contains("is-loading"),
  );
  miniPlayer.classList.toggle("is-shuffled", isShuffleEnabled);
  miniPlayer.setAttribute("aria-hidden", String(!isVisible));

  if (miniToggle) {
    miniToggle.setAttribute("aria-label", isPlaying ? "pause" : "play");
  }

  if (!hasTrack) {
    miniPlayer.removeAttribute("data-current-track");
    setMiniTitle(null);

    if (miniProgressFill && miniProgressThumb && miniTime) {
      miniProgressFill.style.width = "0%";
      miniProgressThumb.style.left = "0%";
      miniTime.textContent = "00:00 / 00:00";
    }

    return;
  }

  if (miniPlayer.dataset.currentTrack !== String(entry.index)) {
    miniPlayer.dataset.currentTrack = String(entry.index);
    setMiniTitle(entry);
  }

  updateMiniProgress(activeTrack, activeAudio);
}

function seekMiniFromPointer(event) {
  if (!miniProgress || !activeAudio || !activeTrack) {
    return;
  }

  const duration = Number(activeTrack.dataset.duration) || activeAudio.duration || 0;

  if (!duration) {
    return;
  }

  ensureAudioSource(activeAudio);
  miniProgress.dataset.dragging = "true";

  const rect = miniProgress.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const audio = activeAudio;
  const track = activeTrack;
  const targetTime = ratio * duration;

  try {
    audio.currentTime = targetTime;
  } catch {
    audio.addEventListener(
      "loadedmetadata",
      () => {
        audio.currentTime = targetTime;
        updateTrackProgress(track, audio);
      },
      { once: true },
    );
  }

  track.classList.add("has-progress");
  updateTrackProgress(track, audio);
}

function getMiniPlayableEntries() {
  return audioTrackEntries.filter((entry) => !entry.track.excludeFromMiniPlayer);
}

function createShuffleSequence(anchorEntry = null) {
  shuffleEntries = [...getMiniPlayableEntries()];

  for (let index = shuffleEntries.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffleEntries[index], shuffleEntries[randomIndex]] = [
      shuffleEntries[randomIndex],
      shuffleEntries[index],
    ];
  }

  shuffleIndex = -1;

  if (!anchorEntry) {
    return;
  }

  const anchorIndex = shuffleEntries.indexOf(anchorEntry);

  if (anchorIndex === -1) {
    return;
  }

  shuffleEntries.splice(anchorIndex, 1);
  shuffleEntries.unshift(anchorEntry);
  shuffleIndex = 0;
}

function setShuffleEnabled(isEnabled) {
  isShuffleEnabled = isEnabled;

  if (isShuffleEnabled) {
    createShuffleSequence(activeTrack ? trackEntries.get(activeTrack) : null);
  } else {
    shuffleEntries = [];
    shuffleIndex = -1;
  }

  miniShuffle?.setAttribute("aria-pressed", String(isShuffleEnabled));
  preloadAdjacentTrack(activeTrack ? trackEntries.get(activeTrack) : null);
  syncMiniPlayer();
}

function syncShufflePosition(entry) {
  if (!isShuffleEnabled || !entry) {
    return;
  }

  const playableEntries = getMiniPlayableEntries();

  if (shuffleEntries.length !== playableEntries.length) {
    createShuffleSequence(playableEntries.includes(entry) ? entry : null);
    return;
  }

  const entryIndex = shuffleEntries.indexOf(entry);

  if (entryIndex === -1) {
    createShuffleSequence(playableEntries.includes(entry) ? entry : null);
    return;
  }

  shuffleIndex = entryIndex;
}

function getAdjacentTrackEntry(direction, fallbackEntry = null) {
  const playableEntries = getMiniPlayableEntries();

  if (!playableEntries.length) {
    return null;
  }

  const currentEntry = activeTrack ? trackEntries.get(activeTrack) : fallbackEntry;
  const currentEntryIsPlayable = currentEntry && playableEntries.includes(currentEntry);

  if (isShuffleEnabled) {
    if (shuffleEntries.length !== playableEntries.length) {
      createShuffleSequence(currentEntryIsPlayable ? currentEntry : null);
    }

    if (currentEntryIsPlayable) {
      syncShufflePosition(currentEntry);
    }

    if (!shuffleEntries.length) {
      return null;
    }

    if (shuffleIndex === -1) {
      shuffleIndex = direction < 0 ? shuffleEntries.length - 1 : 0;
      return shuffleEntries[shuffleIndex];
    }

    shuffleIndex =
      (shuffleIndex + direction + shuffleEntries.length) % shuffleEntries.length;

    return shuffleEntries[shuffleIndex];
  }

  const currentIndex = currentEntryIsPlayable ? playableEntries.indexOf(currentEntry) : -1;

  if (currentIndex === -1) {
    return direction < 0 ? playableEntries[playableEntries.length - 1] : playableEntries[0];
  }

  const nextIndex =
    (currentIndex + direction + playableEntries.length) % playableEntries.length;

  return playableEntries[nextIndex];
}

function playTrackEntry(entry, options = {}) {
  if (!entry) {
    return;
  }

  if (entry.audio === activeAudio) {
    resetTrackProgress(entry.trackElement, entry.audio);

    if (entry.audio.paused) {
      toggleTrack(entry.trackElement, entry.audio, {
        autoAdvance: options.autoAdvance,
      });
    }

    return;
  }

  toggleTrack(entry.trackElement, entry.audio, {
    autoAdvance: options.autoAdvance,
  });
}

function playAdjacentTrack(direction, fallbackEntry = null, options = {}) {
  playTrackEntry(getAdjacentTrackEntry(direction, fallbackEntry), options);
}

function setDefaultAudioTrack() {
  const playableEntries = getMiniPlayableEntries();

  if (activeAudio || activeTrack || !playableEntries.length) {
    return;
  }

  const entry = playableEntries[0];
  activeAudio = entry.audio;
  activeTrack = entry.trackElement;
  resetTrackProgress(activeTrack, activeAudio);
  syncMiniPlayer();
}

function resizeOpenSoundtrackBody(item) {
  const body = item?.querySelector(".soundtrack-body");

  if (!body || body.hidden || !item?.classList.contains("is-open")) {
    return;
  }

  const previousHeight = body.getBoundingClientRect().height / viewportScale;

  body.style.height = "auto";
  const nextHeight = body.scrollHeight;

  body.style.height = `${previousHeight}px`;
  body.offsetHeight;
  body.style.height = `${nextHeight}px`;

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function setSoundtrackOpen(item, isOpen) {
  const toggle = item?.querySelector(".soundtrack-toggle");
  const body = item?.querySelector(".soundtrack-body");

  if (!item || !toggle || !body) {
    return;
  }

  item.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    body.hidden = false;
    body.style.height = "0px";
    body.offsetHeight;
    body.style.height = `${body.scrollHeight}px`;
    scheduleStep(() => resizeOpenSoundtrackBody(item), 430);
  } else {
    body.style.height = `${body.scrollHeight}px`;
    body.offsetHeight;
    body.style.height = "0px";
    scheduleStep(() => {
      if (!item.classList.contains("is-open")) {
        body.hidden = true;
      }

      syncMusicLayout();
      syncMiniPlayer();
    }, 430);
  }

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function getSectionTransitionDelay(targetSection) {
  if (currentSection === targetSection) {
    return 0;
  }

  if (currentSection === "projects") {
    return colorDuration + stripeDuration;
  }

  if (targetSection === "projects") {
    return stripeDuration;
  }

  return stripeDuration;
}

function scrollToSoundtrackItem(item) {
  const targetTop = window.scrollY + item.getBoundingClientRect().top - 80 * viewportScale;

  window.scrollTo({
    top: Math.max(0, Math.round(targetTop)),
    behavior: "smooth",
  });
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function smoothScrollTo(targetTop, duration = accordionScrollDuration) {
  if (soundtrackHeaderScrollFrame) {
    cancelAnimationFrame(soundtrackHeaderScrollFrame);
    soundtrackHeaderScrollFrame = null;
  }

  const startTop = window.scrollY;
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const clampedTarget = Math.min(maxScroll, Math.max(0, Math.round(targetTop)));
  const distance = clampedTarget - startTop;
  const startTime = performance.now();

  if (Math.abs(distance) < 1) {
    return;
  }

  const tick = (time) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startTop + distance * easedProgress);

    if (progress < 1) {
      soundtrackHeaderScrollFrame = requestAnimationFrame(tick);
      return;
    }

    soundtrackHeaderScrollFrame = null;
  };

  soundtrackHeaderScrollFrame = requestAnimationFrame(tick);
}

function scrollToSoundtrackHeader(item) {
  const toggle = item?.querySelector(".soundtrack-toggle");

  if (!toggle) {
    return;
  }

  const rect = toggle.getBoundingClientRect();
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const targetTop = window.scrollY + rect.top - 50;

  smoothScrollTo(Math.min(maxScroll, Math.max(0, Math.round(targetTop))));
}

function openLinkedSoundtrack(soundtrackId) {
  const item = document.querySelector(`[data-soundtrack-id="${soundtrackId}"]`);

  if (!item) {
    return;
  }

  applyMusicTab("soundtracks");

  if (!item.classList.contains("is-open")) {
    setSoundtrackOpen(item, true);
  }

  requestAnimationFrame(() => {
    scrollToSoundtrackItem(item);
  });
}

function setActiveSection(section) {
  if (section === currentSection) {
    return;
  }

  clearPendingSteps();
  const previousSection = currentSection;
  currentSection = section;

  applyActiveTitle(section);
  hideContent();
  syncMiniPlayer();

  if (previousSection === "projects") {
    applyTheme(section);
    scheduleStep(() => applyStripeHeights(section), colorDuration);
    scheduleStep(() => applyContent(section), colorDuration + stripeDuration);
    return;
  }

  if (section === "projects") {
    applyStripeHeights(section);
    scheduleStep(() => {
      applyTheme(section);
      applyContent(section);
    }, stripeDuration);
    return;
  }

  applyTheme(section);
  applyStripeHeights(section);
  scheduleStep(() => applyContent(section), stripeDuration);
}

titleLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveSection(link.dataset.section);
  });
});

projectListenLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const transitionDelay = getSectionTransitionDelay("all-music");

    setActiveSection("all-music");
    window.history.replaceState(null, "", link.getAttribute("href"));
    scheduleStep(() => {
      openLinkedSoundtrack(link.dataset.projectListen);
    }, transitionDelay + 40);
  });
});

musicTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    applyMusicTab(tab.dataset.musicTab);
  });
});

soundtrackToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const item = toggle.closest(".soundtrack-item");
    const isOpen = !item?.classList.contains("is-open");

    setSoundtrackOpen(item, isOpen);

    if (isOpen) {
      requestAnimationFrame(() => {
        scrollToSoundtrackHeader(item);
      });
    }
  });
});

miniShuffle?.addEventListener("click", () => {
  setShuffleEnabled(!isShuffleEnabled);
});

miniPrevious?.addEventListener("click", () => {
  playAdjacentTrack(-1);
});

miniToggle?.addEventListener("click", () => {
  if (activeTrack?.classList.contains("is-loading")) {
    return;
  }

  if (activeAudio && activeTrack) {
    toggleTrack(activeTrack, activeAudio);
  }
});

miniNext?.addEventListener("click", () => {
  playAdjacentTrack(1);
});

miniProgress?.addEventListener("pointerdown", (event) => {
  seekMiniFromPointer(event);
  miniProgress.setPointerCapture(event.pointerId);
});

miniProgress?.addEventListener("pointermove", (event) => {
  if (event.buttons !== 1 || miniProgress.dataset.dragging !== "true") {
    return;
  }

  seekMiniFromPointer(event);
});

miniProgress?.addEventListener("pointerup", (event) => {
  miniProgress.dataset.dragging = "false";
  miniProgress.releasePointerCapture(event.pointerId);
});

miniProgress?.addEventListener("pointercancel", () => {
  miniProgress.dataset.dragging = "false";
});

preloadMiniIconSets();
renderAudioPlayers();
setDefaultAudioTrack();
applyTheme("projects");
applyActiveTitle("projects");
applyStripeHeights("projects");
syncResponsiveFrame();
applyContent("projects", { instant: true });
applyMusicTab("soundtracks");
resetInitialScroll();

window.addEventListener("load", () => {
  resetInitialScroll();
  syncResponsiveFrame();
  syncProjectsLayout();
  syncMusicLayout();
  syncMiniPlayer();

  requestAnimationFrame(() => {
    resetInitialScroll();
    syncResponsiveFrame();
    syncMusicLayout();
    syncMiniPlayer();
    shouldResetInitialScroll = false;
  });
});

window.addEventListener("resize", () => {
  syncResponsiveFrame();
  syncProjectsLayout();
  syncMusicLayout();
  syncMiniPlayer();
});

window.addEventListener("scroll", syncMiniPlayer, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    retryPendingAutoAdvance();
  }
});

if (document.fonts) {
  document.fonts.ready.then(() => {
    syncResponsiveFrame();
    syncProjectsLayout();
    syncMusicLayout();
    syncMiniPlayer();
  });
}

projectImageOffsets.forEach(({ image }) => {
  image?.addEventListener("load", () => {
    syncResponsiveFrame();
    syncProjectsLayout();
  });
});

pagePreloader?.addEventListener(
  "animationend",
  () => {
    pagePreloader.classList.add("is-hidden");
  },
  { once: true },
);

const pagePreloader = document.querySelector(".page-preloader");
const stage = document.querySelector(".stage");
const titleLinks = [...document.querySelectorAll(".title-link")];
const whiteStripes = [...document.querySelectorAll(".stripe--white")];
const sectionContents = [...document.querySelectorAll(".section-content")];
const musicTabs = [...document.querySelectorAll(".music-tab")];
const musicPanels = [...document.querySelectorAll(".music-panel")];
const soundtrackToggles = [...document.querySelectorAll(".soundtrack-toggle")];
const projectListenLinks = [...document.querySelectorAll("[data-project-listen]")];
const miniPlayer = document.querySelector("[data-mini-player]");
const miniTitle = document.querySelector("[data-mini-title]");
const miniSource = document.querySelector("[data-mini-source]");
const miniTime = document.querySelector("[data-mini-time]");
const miniProgress = document.querySelector("[data-mini-progress]");
const miniProgressFill = document.querySelector("[data-mini-progress-fill]");
const miniProgressThumb = document.querySelector("[data-mini-progress-thumb]");
const miniShuffle = document.querySelector("[data-mini-shuffle]");
const miniPrevious = document.querySelector("[data-mini-previous]");
const miniToggle = document.querySelector("[data-mini-toggle]");
const miniNext = document.querySelector("[data-mini-next]");
const colorDuration = 300;
const stripeDuration = 780;
const contentFadeDuration = 520;
const musicMinHeight = 2860;
const musicBottomPadding = 290;
const contactMinHeight = 1830;
const footerHeight = 200;
const accordionScrollDuration = 950;
const scrollClampDuration = accordionScrollDuration + 40;
const projectTextGap = 90;
const audioFadeDuration = 0.005;
const audioLoadingDelay = 1000;
const designWidth = 1920;
const maxViewportScale = 0.5;
const defaultAccentColor = "#bf032c";
const audioAccentColors = {
  kletka: "#bf032c",
  "fictional-story": "#3f512e",
  downsouth: "#4d2f5a",
  "seeds-of-sorrow": "#515151",
  "industrial-ambient": "#232730",
  "untitled-ost": "#6e644c",
};
const ownMusicLinkColors = {
  "industrial-ambient": "#5a6173",
};
const miniIconSets = {
  default: {
    play: "./assets/icons/ffffff/play.webp",
    stop: "./assets/icons/ffffff/stop.webp",
    loading: "./assets/icons/ffffff/loading.gif",
    previous: "./assets/icons/ffffff/prev.webp",
    next: "./assets/icons/ffffff/next.webp",
    shuffleActive: "./assets/icons/ffffff/shuffle-active.webp",
    shufflePassive: "./assets/icons/c6c6c6/shuffle-passive.webp",
  },
  kletka: {
    play: "./assets/icons/bf032c/play.webp",
    stop: "./assets/icons/bf032c/stop.webp",
    loading: "./assets/icons/bf032c/loading.gif",
    previous: "./assets/icons/bf032c/prev.webp",
    next: "./assets/icons/bf032c/next.webp",
    shuffleActive: "./assets/icons/bf032c/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "fictional-story": {
    play: "./assets/icons/3f512e/play.webp",
    stop: "./assets/icons/3f512e/stop.webp",
    loading: "./assets/icons/3f512e/loading.gif",
    previous: "./assets/icons/3f512e/prev.webp",
    next: "./assets/icons/3f512e/next.webp",
    shuffleActive: "./assets/icons/3f512e/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  downsouth: {
    play: "./assets/icons/4d2f5a/play.webp",
    stop: "./assets/icons/4d2f5a/stop.webp",
    loading: "./assets/icons/4d2f5a/loading.gif",
    previous: "./assets/icons/4d2f5a/prev.webp",
    next: "./assets/icons/4d2f5a/next.webp",
    shuffleActive: "./assets/icons/4d2f5a/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "seeds-of-sorrow": {
    play: "./assets/icons/515151/play.webp",
    stop: "./assets/icons/515151/stop.webp",
    loading: "./assets/icons/515151/loading.gif",
    previous: "./assets/icons/515151/prev.webp",
    next: "./assets/icons/515151/next.webp",
    shuffleActive: "./assets/icons/515151/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "industrial-ambient": {
    play: "./assets/icons/232730/play.webp",
    stop: "./assets/icons/232730/stop.webp",
    loading: "./assets/icons/232730/loading.gif",
    previous: "./assets/icons/232730/prev.webp",
    next: "./assets/icons/232730/next.webp",
    shuffleActive: "./assets/icons/232730/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
  "untitled-ost": {
    play: "./assets/icons/6e644c/play.webp",
    stop: "./assets/icons/6e644c/stop.webp",
    loading: "./assets/icons/6e644c/loading.gif",
    previous: "./assets/icons/6e644c/prev.webp",
    next: "./assets/icons/6e644c/next.webp",
    shuffleActive: "./assets/icons/6e644c/shuffle-active.webp",
    shufflePassive: "./assets/icons/696969/shuffle-passive.webp",
  },
};

let currentSection = "projects";
let pendingSteps = [];
let stageHeightClampStep = null;
let soundtrackHeaderScrollFrame = null;
let viewportScale = 1;
let miniIconSetKey = "";

const projectImageOffsets = [
  {
    image: document.querySelector(".project-image--kletka"),
    anchor: document.querySelector('[data-image-anchor="kletka"]'),
    offset: 50,
  },
  {
    image: document.querySelector(".project-image--fictional"),
    anchor: document.querySelector('[data-image-anchor="fictional"]'),
    offset: 60,
  },
  {
    image: document.querySelector(".project-image--downsouth"),
    anchor: document.querySelector('[data-image-anchor="downsouth"]'),
    offset: 78,
  },
];

const projectTextFlow = [
  {
    anchor: document.querySelector('[data-image-anchor="kletka"]'),
    copy: document.querySelector(".project-copy--fictional"),
  },
  {
    anchor: document.querySelector('[data-image-anchor="fictional"]'),
    copy: document.querySelector(".project-copy--downsouth"),
  },
  {
    anchor: document.querySelector('[data-image-anchor="downsouth"]'),
    copy: document.querySelector(".project-copy--school"),
  },
];

const audioLibrary = {
  kletka: {
    title: "kletka",
    categories: [
      {
        id: "ambient",
        title: "ambient",
        tracks: [
          {
            title: "ammonia",
            detail: "research institute floor music, trailer music",
            src: "./assets/audio/kletka/ammonia.mp3",
            duration: 182.439175,
          },
          {
            title: "strelka",
            detail: "antigravity floor music",
            src: "./assets/audio/kletka/strelka.mp3",
            duration: 210.0506,
          },
          {
            title: "afalina",
            detail: "flood floor music",
            src: "./assets/audio/kletka/afalina.mp3",
            duration: 104.0457,
          },
          {
            title: "kondensat",
            detail: "mist floor music",
            src: "./assets/audio/kletka/kondensat.mp3",
            duration: 80.039175,
          },
          {
            title: "radiotrophika iii",
            detail: "greenhouse floor music",
            src: "./assets/audio/kletka/radiotrophika-iii.mp3",
            duration: 128.0261,
          },
          {
            title: "anguta",
            detail: "schisophasia floor music",
            src: "./assets/audio/kletka/anguta.mp3",
            duration: 138.031,
          },
          {
            title: "assembly error #7 ambience",
            detail: "giant robo-fly boss floor",
            src: "./assets/audio/kletka/assembly-error-7-ambience.mp3",
            duration: 106.7102,
          },
        ],
      },
      {
        id: "bossfight",
        title: "bossfight music",
        tracks: [
          {
            title: "assembly error #7 phase 1",
            detail: "giant robo-fly boss",
            src: "./assets/audio/kletka/bossfight/assembly-error-7-phase-1.mp3",
            duration: 74.7102,
          },
          {
            title: "assembly error #7 phase 2",
            detail: "giant robo-fly boss, trailer music",
            src: "./assets/audio/kletka/bossfight/assembly-error-7-phase-2.mp3",
            duration: 91.1151,
          },
          {
            title: "i got the pollen",
            detail: "giant bee",
            src: "./assets/audio/kletka/bossfight/i-got-the-pollen.mp3",
            duration: 73.874275,
          },
          {
            title: "kashpirovsky’s room",
            detail: "famous russian magician-fraudster from the 90s",
            src: "./assets/audio/kletka/bossfight/kashpirovskys-room.mp3",
            duration: 67.78775,
          },
        ],
      },
      {
        id: "trailer",
        title: "trailer music",
        tracks: [
          {
            title: "kletka official launch trailer music",
            detail: "i hate this track",
            src: "./assets/audio/kletka/trailer/kletka-official-launch-trailer-music.mp3",
            duration: 84.0359,
            excludeFromMiniPlayer: true,
          },
        ],
      },
      {
        id: "sound-design",
        title: "sound design",
        tracks: [],
        content: {
          text:
            "i’ve made a series of audio recordings for the game that tell the story of one of the prisoners of the kletka",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://www.youtube.com/@prisoner412",
        },
      },
      {
        id: "mastering",
        title: "mastering",
        tracks: [],
        content: {
          text: "i’ve mastered all of the kletka ost (135 tracks) for the streamings",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://band.link/kletka_ost_2",
        },
      },
      {
        id: "tape-mix",
        title: "tape mix",
        tracks: [],
        content: {
          text: "i’ve made an hour-long kletka ost mix with cool transitions",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "https://youtu.be/FkekGW28JiM?si=-1byQHaw__e4q4SY",
        },
      },
    ],
  },
  "fictional-story": {
    title: "a completely fictional story about a city inside a whale",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "a completely real main theme",
            detail: "main menu and trailer theme",
            src: "./assets/audio/fictional-story/ingame/a-completely-real-main-theme.mp3",
            duration: 147.408975,
          },
          {
            title: "junktown theme",
            detail: "yeah, junktown theme",
            src: "./assets/audio/fictional-story/ingame/junktown-theme.mp3",
            duration: 159.5559,
          },
          {
            title: "the first day inside a whale",
            detail: "lobby theme",
            src: "./assets/audio/fictional-story/ingame/the-first-day-inside-a-whale.mp3",
            duration: 116.166525,
          },
          {
            title: "casino theme",
            src: "./assets/audio/fictional-story/ingame/casino-theme.mp3",
            duration: 28.47345,
          },
          {
            title: "arcade theme",
            src: "./assets/audio/fictional-story/ingame/arcade-theme.mp3",
            duration: 24.03265,
          },
          {
            title: "secret indev location theme",
            src: "./assets/audio/fictional-story/ingame/secret-indev-location-theme.mp3",
            duration: 24.03265,
          },
        ],
      },
      {
        id: "sfx",
        title: "sfx",
        tracks: [],
        content: {
          text: "i’ve made a few sounds for the game’s cutscenes",
          linkText: "-> TAKE A LISTEN HERE",
          linkHref: "#",
        },
      },
    ],
  },
  downsouth: {
    title: "downsouth",
    note: "work in progress",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "platamun",
            detail: "greenhouse area music",
            src: "./assets/audio/downsouth/ingame/platamun.mp3",
            duration: 268.27755,
          },
          {
            title: "skadar",
            detail: "motel area music",
            src: "./assets/audio/downsouth/ingame/skadar.mp3",
            duration: 136.0457,
          },
          {
            title: "schroeder’s theme",
            detail: "he’s so cool",
            src: "./assets/audio/downsouth/ingame/schroeders-theme.mp3",
            duration: 115.6702,
          },
          {
            title: "juice!",
            src: "./assets/audio/downsouth/ingame/juice.mp3",
            duration: 117.36815,
          },
          {
            title: "demo ambience i",
            src: "./assets/audio/downsouth/ingame/demo-ambience-i.mp3",
            duration: 156.029375,
          },
          {
            title: "demo ambience ii",
            src: "./assets/audio/downsouth/ingame/demo-ambience-ii.mp3",
            duration: 192.0261,
          },
        ],
      },
    ],
  },
  "seeds-of-sorrow": {
    title: "seeds of sorrow",
    note: "work in progress",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "misty pier",
            src: "./assets/audio/seeds-of-sorrow/ingame/misty-pier.mp3",
            duration: 80.04,
          },
          {
            title: "the rainy gnome song",
            src: "./assets/audio/seeds-of-sorrow/ingame/the-rainy-gnome-song.mp3",
            duration: 96.024,
          },
          {
            title: "demo fight track",
            src: "./assets/audio/seeds-of-sorrow/ingame/demo-fight-track.mp3",
            duration: 134.426094,
          },
        ],
      },
    ],
  },
  "industrial-ambient": {
    title: "industrial ambient",
    note: {
      text: "wip (i can’t say the name of this project)",
      modifier: "player-note--compact",
    },
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "playing jazz in the metropolis",
            src: "./assets/audio/industrial-ambient/ingame/playing-jazz-in-the-metropolis.mp3",
            duration: 174.024,
          },
          {
            title: "capital’s barbershop",
            src: "./assets/audio/industrial-ambient/ingame/capitals-barbershop.mp3",
            duration: 85.368,
          },
          {
            title: "bion",
            src: "./assets/audio/industrial-ambient/ingame/bion.mp3",
            duration: 96.024,
          },
          {
            title: "greenhouse floor 264",
            src: "./assets/audio/industrial-ambient/ingame/greenhouse-floor-264.mp3",
            duration: 112.032,
          },
          {
            title: "city lights",
            src: "./assets/audio/industrial-ambient/ingame/city-lights.mp3",
            duration: 130.944,
          },
          {
            title: "industrial ash",
            src: "./assets/audio/industrial-ambient/ingame/industrial-ash.mp3",
            duration: 124.704,
          },
        ],
      },
    ],
  },
  "untitled-ost": {
    title: "untitled ost",
    note: "unreleased project",
    categories: [
      {
        id: "ingame",
        title: "ingame music",
        tracks: [
          {
            title: "damaged data",
            src: "./assets/audio/untitled-ost/ingame/damaged-data.mp3",
            duration: 110.544,
          },
          {
            title: "antenna",
            src: "./assets/audio/untitled-ost/ingame/antenna.mp3",
            duration: 112.968,
          },
          {
            title: "a kite with dad",
            src: "./assets/audio/untitled-ost/ingame/a-kite-with-dad.mp3",
            duration: 134.232,
          },
          {
            title: "a hopeful transmission",
            src: "./assets/audio/untitled-ost/ingame/a-hopeful-transmission.mp3",
            duration: 112.032,
          },
          {
            title: "fever dream",
            src: "./assets/audio/untitled-ost/ingame/fever-dream.mp3",
            duration: 184.536,
          },
          {
            title: "infinity sign",
            src: "./assets/audio/untitled-ost/ingame/infinity-sign.mp3",
            duration: 146.28,
          },
          {
            title: "a burned pixel",
            src: "./assets/audio/untitled-ost/ingame/a-burned-pixel.mp3",
            duration: 256.032,
          },
        ],
      },
    ],
  },
};

let activeAudio = null;
let activeTrack = null;
let progressFrame = null;
let audioContext = null;
let audioTrackEntries = [];
let isShuffleEnabled = false;
let shuffleEntries = [];
let shuffleIndex = -1;
let pendingAutoAdvanceEntry = null;
let autoAdvanceRetryTimer = null;
let autoAdvanceRetryAttempts = 0;

const audioNodes = new WeakMap();
const audioFadeTimers = new WeakMap();
const trackLoadingTimers = new WeakMap();
const audioEntries = new WeakMap();
const trackEntries = new WeakMap();

let shouldResetInitialScroll = true;

function resetInitialScroll() {
  if (!shouldResetInitialScroll) {
    return;
  }

  window.scrollTo(0, 0);
}

function clearStageHeightClamp() {
  if (!stageHeightClampStep) {
    return;
  }

  clearTimeout(stageHeightClampStep);
  stageHeightClampStep = null;
}

function getViewportScale() {
  const width = window.innerWidth || designWidth;
  return Math.min(Math.max(width / designWidth, 0.1), maxViewportScale);
}

function getStageHeight() {
  return Math.ceil(stage.offsetHeight);
}

function getMaxScrollForStageHeight(stageHeight) {
  return Math.max(0, Math.ceil(stageHeight * viewportScale - window.innerHeight));
}

function syncResponsiveFrame() {
  viewportScale = getViewportScale();

  const scaledWidth = Math.ceil(designWidth * viewportScale);
  const scaledHeight = Math.ceil(getStageHeight() * viewportScale);

  document.documentElement.style.setProperty("--site-scale", String(viewportScale));
  document.documentElement.style.setProperty("--scaled-site-width", `${scaledWidth}px`);
  document.documentElement.style.setProperty("--scaled-stage-height", `${scaledHeight}px`);
}

function setStageMinHeight(nextHeight, options = {}) {
  const { smoothScroll = true } = options;
  const numericHeight = Number(nextHeight);

  clearStageHeightClamp();

  if (!Number.isFinite(numericHeight)) {
    stage.style.minHeight = "";
    syncResponsiveFrame();
    return;
  }

  const currentHeight = getStageHeight();
  const targetScroll = getMaxScrollForStageHeight(numericHeight);
  const shouldSmoothScroll =
    smoothScroll && currentHeight > numericHeight && window.scrollY > targetScroll + 1;

  if (!shouldSmoothScroll) {
    stage.style.minHeight = `${numericHeight}px`;
    syncResponsiveFrame();
    return;
  }

  stage.style.minHeight = `${currentHeight}px`;
  syncResponsiveFrame();
  smoothScrollTo(targetScroll, accordionScrollDuration);

  stageHeightClampStep = setTimeout(() => {
    stageHeightClampStep = null;
    stage.style.minHeight = `${numericHeight}px`;
    syncResponsiveFrame();
    syncMiniPlayer();
  }, scrollClampDuration);
}

function applyTheme(section) {
  body.classList.remove("theme-projects", "theme-all-music", "theme-contact");
  body.classList.add(`theme-${section}`);
  syncMiniPlayer();
}

function applyActiveTitle(section) {
  body.dataset.activeSection = section;

  titleLinks.forEach((link) => {
    const isActive = link.dataset.section === section;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function applyStripeHeights(section) {
  whiteStripes.forEach((stripe, index) => {
    stripe.style.height = `${whiteStripeHeights[section][index]}px`;
  });
}

function revealContent(content, instant = false) {
  if (!content) {
    return;
  }

  if (instant) {
    content.classList.add("is-visible");
    return;
  }

  requestAnimationFrame(() => {
    content.classList.add("is-visible");
  });
}

function applyContent(section, options = {}) {
  let activeContent = null;

  sectionContents.forEach((content) => {
    const isActive = content.dataset.content === section;

    content.classList.remove("is-visible");
    content.hidden = !isActive;

    if (isActive) {
      activeContent = content;
    }
  });

  if (section === "projects") {
    requestAnimationFrame(() => {
      syncProjectsLayout();
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
    });
  } else if (section === "all-music") {
    requestAnimationFrame(() => {
      syncMusicLayout();
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
      requestAnimationFrame(syncMiniPlayer);
    });
  } else {
    setStageMinHeight(contactMinHeight + footerHeight);
    requestAnimationFrame(() => {
      revealContent(activeContent, options.instant);
      syncMiniPlayer();
    });
  }
}

function hideContent() {
  let hasVisibleContent = false;

  sectionContents.forEach((content) => {
    if (!content.hidden) {
      hasVisibleContent = true;
    }

    content.classList.remove("is-visible");
  });

  if (!hasVisibleContent) {
    syncMiniPlayer();
    return;
  }

  scheduleStep(() => {
    sectionContents.forEach((content) => {
      if (!content.classList.contains("is-visible")) {
        content.hidden = true;
      }
    });

    syncMiniPlayer();
  }, contentFadeDuration);
}

function clearPendingSteps() {
  pendingSteps.forEach((step) => clearTimeout(step));
  pendingSteps = [];
  clearStageHeightClamp();
}

function scheduleStep(callback, delay) {
  const step = setTimeout(callback, delay);
  pendingSteps.push(step);
}

function applyMusicTab(tab) {
  body.dataset.musicTab = tab;

  musicTabs.forEach((button) => {
    const isActive = button.dataset.musicTab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  musicPanels.forEach((panel) => {
    const isActive = panel.dataset.musicPanel === tab;

    if (isActive) {
      panel.hidden = false;

      requestAnimationFrame(() => {
        panel.classList.add("is-active");
        syncMusicLayout();
        syncMiniPlayer();
      });

      return;
    }

    panel.classList.remove("is-active");

    if (panel.hidden) {
      return;
    }

    scheduleStep(() => {
      if (!panel.classList.contains("is-active")) {
        panel.hidden = true;
      }

      syncMusicLayout();
      syncMiniPlayer();
    }, contentFadeDuration);
  });

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function getStageBottom(node) {
  const stageRect = stage.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  return (nodeRect.bottom - stageRect.top) / viewportScale;
}

function getStageTop(node) {
  const stageRect = stage.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();

  return (nodeRect.top - stageRect.top) / viewportScale;
}

function getImageHeight(image) {
  const renderedHeight = image.offsetHeight || image.getBoundingClientRect().height / viewportScale;

  if (renderedHeight > 0) {
    return renderedHeight;
  }

  const renderedWidth = image.offsetWidth || image.getBoundingClientRect().width / viewportScale;
  return (image.naturalHeight / image.naturalWidth) * renderedWidth;
}

function syncProjectsLayout() {
  if (!body.classList.contains("theme-projects")) {
    return;
  }

  projectTextFlow.forEach(({ anchor, copy }) => {
    if (!anchor || !copy) {
      return;
    }

    copy.style.top = `${Math.round(getStageBottom(anchor) + projectTextGap)}px`;
  });

  const schoolImage = document.querySelector(".project-image--school");
  const schoolCopy = document.querySelector(".project-copy--school");

  if (schoolImage && schoolCopy) {
    schoolImage.style.top = `${Math.round(getStageTop(schoolCopy))}px`;
  }

  projectImageOffsets.forEach(({ image, anchor, offset }) => {
    if (!image || !anchor) {
      return;
    }

    const imageHeight = getImageHeight(image);
    const top = getStageBottom(anchor) + offset - imageHeight;
    image.style.top = `${Math.round(top)}px`;
  });

  const pageEndAnchor = document.querySelector("[data-page-end-anchor]");

  if (pageEndAnchor) {
    setStageMinHeight(Math.ceil(getStageBottom(pageEndAnchor) + 700 + footerHeight));
  }
}

function getSoundtrackListTargetHeight(list) {
  const items = [...list.querySelectorAll(".soundtrack-item")];
  const rowGap = parseFloat(getComputedStyle(list).rowGap);
  const gap = Number.isFinite(rowGap) ? rowGap : 0;

  return items.reduce((total, item, index) => {
    const body = item.querySelector(".soundtrack-body");
    const itemHeight = item.getBoundingClientRect().height / viewportScale;
    const currentBodyHeight =
      body && !body.hidden ? body.getBoundingClientRect().height / viewportScale : 0;
    const targetBodyHeight = body
      ? item.classList.contains("is-open")
        ? body.scrollHeight
        : currentBodyHeight
      : 0;

    return total + itemHeight - currentBodyHeight + targetBodyHeight + (index ? gap : 0);
  }, 0);
}

function syncMusicLayout() {
  if (!body.classList.contains("theme-all-music")) {
    syncMiniPlayer();
    return;
  }

  const activePanel = document.querySelector(".music-panel.is-active");
  const activePanelHasFooter = activePanel?.dataset.musicPanel !== "soundtracks";
  const activeFooterHeight = activePanelHasFooter ? footerHeight : 0;
  const baseMusicHeight = musicMinHeight + activeFooterHeight;

  if (!activePanel || activePanel.hidden) {
    setStageMinHeight(baseMusicHeight);
    syncMiniPlayer();
    return;
  }

  const layoutTarget =
    activePanel.querySelector(".soundtrack-list") ||
    activePanel.querySelector(".own-music-list");

  if (!layoutTarget) {
    setStageMinHeight(baseMusicHeight);
    syncMiniPlayer();
    return;
  }

  const contentBottom = layoutTarget.classList.contains("soundtrack-list")
    ? getStageTop(layoutTarget) + getSoundtrackListTargetHeight(layoutTarget)
    : getStageBottom(layoutTarget);
  const contentHeight = Math.ceil(contentBottom + musicBottomPadding + activeFooterHeight);

  setStageMinHeight(Math.max(baseMusicHeight, contentHeight));
  syncMiniPlayer();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function syncAudioAccent(entry = null) {
  const nextColor = entry
    ? audioAccentColors[entry.playerKey] || defaultAccentColor
    : defaultAccentColor;
  const nextOwnMusicLinkColor = entry
    ? ownMusicLinkColors[entry.playerKey] || nextColor
    : defaultAccentColor;

  document.documentElement.style.setProperty("--red", nextColor);
  document.documentElement.style.setProperty("--own-music-link", nextOwnMusicLinkColor);
}

function toCssIconUrl(value) {
  return `url("${value}")`;
}

function preloadMiniIconSets() {
  const paths = new Set();

  Object.values(miniIconSets).forEach((iconSet) => {
    Object.values(iconSet).forEach((path) => paths.add(path));
  });

  paths.forEach((path) => {
    const image = new Image();
    image.src = path;
  });
}

function syncMiniIconSet(entry = null) {
  if (!miniPlayer) {
    return;
  }

  const isLightMiniPlayer =
    body.classList.contains("theme-all-music") || body.classList.contains("theme-contact");
  const iconKey = isLightMiniPlayer ? entry?.playerKey || "kletka" : "default";
  const iconSet = miniIconSets[iconKey] || miniIconSets.kletka;
  const setKey = `${isLightMiniPlayer ? "light" : "color"}|${iconKey}`;

  if (setKey === miniIconSetKey) {
    return;
  }

  miniIconSetKey = setKey;
  miniPlayer.style.setProperty("--mini-play-icon", toCssIconUrl(iconSet.play));
  miniPlayer.style.setProperty("--mini-stop-icon", toCssIconUrl(iconSet.stop));
  miniPlayer.style.setProperty("--mini-loading-icon", toCssIconUrl(iconSet.loading));
  miniPlayer.style.setProperty("--mini-prev-icon", toCssIconUrl(iconSet.previous));
  miniPlayer.style.setProperty("--mini-next-icon", toCssIconUrl(iconSet.next));
  miniPlayer.style.setProperty(
    "--mini-shuffle-active-icon",
    toCssIconUrl(iconSet.shuffleActive),
  );
  miniPlayer.style.setProperty(
    "--mini-shuffle-passive-icon",
    toCssIconUrl(iconSet.shufflePassive),
  );
}

function renderAudioPlayers() {
  audioTrackEntries = [];

  document.querySelectorAll("[data-audio-player]").forEach((root) => {
    const player = audioLibrary[root.dataset.audioPlayer];
    const itemTitle = root
      .closest(".soundtrack-item")
      ?.querySelector(".soundtrack-title")
      ?.innerText.replace(/\s+/g, " ")
      .trim();
    const playerTitle = player?.title || itemTitle || root.dataset.audioPlayer;

    if (!player) {
      return;
    }

    root.innerHTML = "";

    const categories = document.createElement("div");
    categories.className = "player-categories";

    player.categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.className = "player-category";
      button.type = "button";
      button.textContent = category.title;
      button.dataset.playerCategory = category.id;
      button.classList.toggle("is-active", index === 0);
      button.addEventListener("click", () => {
        categories.querySelectorAll(".player-category").forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });

        root.querySelectorAll(".player-track-list").forEach((list) => {
          const isActive = list.dataset.playerCategory === category.id;
          list.classList.toggle("is-active", isActive);
          list.hidden = !isActive;
        });

        const soundtrackItem = root.closest(".soundtrack-item");
        resizeOpenSoundtrackBody(soundtrackItem);
        requestAnimationFrame(() => resizeOpenSoundtrackBody(soundtrackItem));
      });
      categories.append(button);
    });

    player.categories.forEach((category, index) => {
      const trackList = document.createElement("div");
      trackList.className = "player-track-list";
      trackList.dataset.playerCategory = category.id;
      trackList.classList.toggle("is-active", index === 0);
      trackList.hidden = index !== 0;

      (category.tracks || []).forEach((track) => {
        trackList.append(createAudioTrack(track, root.dataset.audioPlayer, playerTitle));
      });

      if (category.content) {
        trackList.append(createPlayerTextBlock(category.content));
      }

      root.append(trackList);
    });

    if (player.note) {
      root.prepend(createPlayerNote(player.note), categories);
    } else {
      root.prepend(categories);
    }
  });
}

function createPlayerNote(noteContent) {
  const note = document.createElement("p");
  note.className = "player-note";

  if (typeof noteContent === "string") {
    note.textContent = noteContent;
  } else {
    note.textContent = noteContent.text;
    note.classList.add(noteContent.modifier);
  }

  return note;
}

function createPlayerTextBlock(content) {
  const block = document.createElement("div");
  block.className = "player-text-block";

  const text = document.createElement("p");
  text.className = "player-text";
  text.textContent = content.text;

  const link = document.createElement("a");
  link.className = "player-text-link";
  link.href = content.linkHref;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = content.linkText;

  block.append(text, link);

  return block;
}

function createAudioTrack(track, playerKey, playerTitle) {
  const trackElement = document.createElement("article");
  trackElement.className = "audio-track";
  trackElement.dataset.duration = String(track.duration);
  trackElement.dataset.player = playerKey;
  trackElement.dataset.playerTitle = playerTitle;
  trackElement.dataset.trackTitle = track.title;
  trackElement.dataset.trackDetail = track.detail || "";

  const title = document.createElement("h4");
  title.className = "audio-track-title";
  title.textContent = track.title;

  if (track.detail) {
    const detail = document.createElement("span");
    detail.className = "audio-track-detail";
    detail.textContent = ` (${track.detail})`;
    title.append(detail);
  }

  const controls = document.createElement("div");
  controls.className = "audio-track-controls";

  const playButton = document.createElement("button");
  playButton.className = "track-play";
  playButton.type = "button";
  playButton.setAttribute("aria-label", `play ${track.title}`);

  const playIcon = document.createElement("img");
  playIcon.className = "track-play-icon track-play-icon--play";
  playIcon.src = "./assets/icons/ffffff/play.webp";
  playIcon.alt = "";
  playIcon.loading = "eager";
  playIcon.decoding = "async";
  playIcon.setAttribute("aria-hidden", "true");

  const stopIcon = document.createElement("img");
  stopIcon.className = "track-play-icon track-play-icon--stop";
  stopIcon.src = "./assets/icons/ffffff/stop.webp";
  stopIcon.alt = "";
  stopIcon.loading = "eager";
  stopIcon.decoding = "async";
  stopIcon.setAttribute("aria-hidden", "true");

  const loadingIcon = document.createElement("img");
  loadingIcon.className = "track-loading-icon";
  loadingIcon.src = "./assets/icons/ffffff/loading.gif";
  loadingIcon.alt = "";
  loadingIcon.loading = "eager";
  loadingIcon.decoding = "async";
  loadingIcon.setAttribute("aria-hidden", "true");

  playButton.append(playIcon, stopIcon, loadingIcon);

  const progress = document.createElement("div");
  progress.className = "track-progress";
  progress.innerHTML = `
    <div class="track-progress-bar"></div>
    <div class="track-progress-fill"></div>
    <div class="track-progress-thumb"></div>
  `;

  const time = document.createElement("div");
  time.className = "track-time";
  time.textContent = `00:00 / ${formatTime(track.duration)}`;

  const audio = document.createElement("audio");
  audio.className = "audio-native";
  audio.preload = "none";
  audio.dataset.src = track.src;

  const entry = {
    audio,
    index: audioTrackEntries.length,
    playerKey,
    playerTitle,
    track,
    trackElement,
  };

  audioTrackEntries.push(entry);
  audioEntries.set(audio, entry);
  trackEntries.set(trackElement, entry);

  playButton.addEventListener("click", () => {
    toggleTrack(trackElement, audio);
  });

  progress.addEventListener("pointerdown", (event) => {
    seekTrackFromPointer(trackElement, audio, event, true);
    progress.setPointerCapture(event.pointerId);
  });

  progress.addEventListener("pointermove", (event) => {
    if (event.buttons !== 1 || progress.dataset.dragging !== "true") {
      return;
    }

    seekTrackFromPointer(trackElement, audio, event);
  });

  progress.addEventListener("pointerup", (event) => {
    progress.dataset.dragging = "false";
    progress.releasePointerCapture(event.pointerId);
  });

  progress.addEventListener("pointercancel", () => {
    progress.dataset.dragging = "false";
  });

  audio.addEventListener("timeupdate", () => {
    updateTrackProgress(trackElement, audio);
  });

  audio.addEventListener("waiting", () => {
    if (audio === activeAudio && !audio.paused) {
      setTrackLoading(trackElement, true);
    }
  });

  audio.addEventListener("stalled", () => {
    if (audio === activeAudio && !audio.paused) {
      setTrackLoading(trackElement, true);
    }
  });

  audio.addEventListener("playing", () => {
    setTrackLoading(trackElement, false);
  });

  audio.addEventListener("canplay", () => {
    if (audio === activeAudio && !audio.paused) {
      setTrackLoading(trackElement, false);
    }
  });

  audio.addEventListener("pause", () => {
    setTrackLoading(trackElement, false);
  });

  audio.addEventListener("error", () => {
    setTrackLoading(trackElement, false);
  });

  audio.addEventListener("ended", () => {
    setTrackLoading(trackElement, false);
    trackElement.classList.remove("is-playing", "is-play-pending");
    updateTrackProgress(trackElement, audio);
    stopProgressLoop();

    if (activeAudio === audio) {
      playAdjacentTrack(1, entry, { autoAdvance: true });
    }
  });

  controls.append(playButton, progress, time);
  trackElement.append(title, controls, audio);

  return trackElement;
}

function setTrackLoading(trackElement, isLoading) {
  const playButton = trackElement?.querySelector(".track-play");

  if (!trackElement) {
    return;
  }

  if (isLoading) {
    if (trackElement.classList.contains("is-loading") || trackLoadingTimers.has(trackElement)) {
      return;
    }

    const timer = setTimeout(() => {
      trackLoadingTimers.delete(trackElement);
      trackElement.classList.add("is-loading");
      playButton?.setAttribute("aria-busy", "true");

      if (trackElement === activeTrack) {
        syncMiniPlayer();
      }
    }, audioLoadingDelay);

    trackLoadingTimers.set(trackElement, timer);
    return;
  }

  const timer = trackLoadingTimers.get(trackElement);

  if (timer) {
    clearTimeout(timer);
    trackLoadingTimers.delete(trackElement);
  }

  trackElement.classList.remove("is-loading");
  playButton?.removeAttribute("aria-busy");

  if (trackElement === activeTrack) {
    syncMiniPlayer();
  }
}

function resetTrackProgress(trackElement, audio) {
  if (!trackElement || !audio) {
    return;
  }

  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers refuse seeking before metadata is ready; the displayed state still resets.
  }

  trackElement.classList.remove("has-progress");
  updateTrackProgress(trackElement, audio);
}

function ensureAudioSource(audio) {
  if (!audio || audio.getAttribute("src")) {
    return;
  }

  const source = audio.dataset.src;

  if (!source) {
    return;
  }

  audio.src = source;
  audio.load();
}

function preloadTrackEntry(entry) {
  if (!entry?.audio || entry.audio.getAttribute("src")) {
    return;
  }

  entry.audio.preload = "auto";
  ensureAudioSource(entry.audio);
}

function getAdjacentPreviewEntry(direction, fallbackEntry = null) {
  const playableEntries = getMiniPlayableEntries();

  if (!playableEntries.length) {
    return null;
  }

  const currentEntry = activeTrack ? trackEntries.get(activeTrack) : fallbackEntry;
  const currentEntryIsPlayable = currentEntry && playableEntries.includes(currentEntry);

  if (isShuffleEnabled) {
    if (shuffleEntries.length !== playableEntries.length) {
      createShuffleSequence(currentEntryIsPlayable ? currentEntry : null);
    }

    if (!shuffleEntries.length) {
      return null;
    }

    const currentShuffleIndex = currentEntryIsPlayable
      ? shuffleEntries.indexOf(currentEntry)
      : shuffleIndex;
    const safeIndex =
      currentShuffleIndex === -1
        ? direction < 0
          ? shuffleEntries.length
          : -1
        : currentShuffleIndex;
    const nextIndex =
      (safeIndex + direction + shuffleEntries.length) % shuffleEntries.length;

    return shuffleEntries[nextIndex];
  }

  const currentIndex = currentEntryIsPlayable ? playableEntries.indexOf(currentEntry) : -1;
  const safeIndex =
    currentIndex === -1 ? (direction < 0 ? playableEntries.length : -1) : currentIndex;
  const nextIndex = (safeIndex + direction + playableEntries.length) % playableEntries.length;

  return playableEntries[nextIndex];
}

function preloadAdjacentTrack(entry = null) {
  const nextEntry = getAdjacentPreviewEntry(1, entry);

  if (!nextEntry || nextEntry === entry) {
    return;
  }

  preloadTrackEntry(nextEntry);
}

function clearAutoAdvanceRetry() {
  if (!autoAdvanceRetryTimer) {
    return;
  }

  clearTimeout(autoAdvanceRetryTimer);
  autoAdvanceRetryTimer = null;
}

function retryPendingAutoAdvance() {
  if (!pendingAutoAdvanceEntry) {
    return;
  }

  const entry = pendingAutoAdvanceEntry;
  clearAutoAdvanceRetry();
  playTrackEntry(entry, { autoAdvance: true });
}

function scheduleAutoAdvanceRetry(entry) {
  if (pendingAutoAdvanceEntry !== entry) {
    autoAdvanceRetryAttempts = 0;
  }

  pendingAutoAdvanceEntry = entry;
  clearAutoAdvanceRetry();

  if (autoAdvanceRetryAttempts >= 3) {
    return;
  }

  autoAdvanceRetryAttempts += 1;
  autoAdvanceRetryTimer = setTimeout(() => {
    autoAdvanceRetryTimer = null;
    retryPendingAutoAdvance();
  }, 1000);
}

function toggleTrack(trackElement, audio, options = {}) {
  const {
    autoAdvance = false,
    forcePlay = false,
    resetNewTrack = true,
    startTime = null,
  } = options;

  if (!forcePlay && audio === activeAudio && !audio.paused) {
    fadeOutAndPause(audio, trackElement, false);
    return;
  }

  const isNewTrack = audio !== activeAudio;

  pauseActiveAudio(audio, isNewTrack);
  ensureAudioSource(audio);

  activeAudio = audio;
  activeTrack = trackElement;
  syncShufflePosition(trackEntries.get(trackElement));

  if (!autoAdvance) {
    pendingAutoAdvanceEntry = null;
    autoAdvanceRetryAttempts = 0;
    clearAutoAdvanceRetry();
  }

  if (isNewTrack && resetNewTrack) {
    resetTrackProgress(trackElement, audio);
  }

  if (Number.isFinite(startTime)) {
    try {
      audio.currentTime = startTime;
    } catch {
      audio.addEventListener(
        "loadedmetadata",
        () => {
          audio.currentTime = startTime;
          updateTrackProgress(trackElement, audio);
        },
        { once: true },
      );
    }

    trackElement.classList.toggle("has-progress", startTime > 0);
    updateTrackProgress(trackElement, audio);
  }

  trackElement.classList.add("is-play-pending");
  prepareAudioFadeIn(audio);
  setTrackLoading(trackElement, true);
  syncMiniPlayer();

  audio
    .play()
    .then(() => {
      if (activeAudio !== audio) {
        audio.pause();
        setTrackLoading(trackElement, false);
        trackElement.classList.remove("is-playing", "is-play-pending");
        syncMiniPlayer();
        return;
      }

      setTrackLoading(trackElement, false);
      trackElement.classList.remove("is-play-pending");
      trackElement.classList.add("is-playing", "has-progress");
      fadeAudio(audio, 1);
      startProgressLoop();
      pendingAutoAdvanceEntry = null;
      autoAdvanceRetryAttempts = 0;
      clearAutoAdvanceRetry();
      preloadAdjacentTrack(trackEntries.get(trackElement));
      syncMiniPlayer();
    })
    .catch(() => {
      const entry = trackEntries.get(trackElement);

      setTrackLoading(trackElement, false);
      trackElement.classList.remove("is-playing", "is-play-pending");

      if (autoAdvance && entry) {
        scheduleAutoAdvanceRetry(entry);
        syncMiniPlayer();
        return;
      }

      if (activeAudio === audio) {
        activeAudio = null;
        activeTrack = null;
      }

      syncMiniPlayer();
    });
}

function pauseActiveAudio(exceptAudio = null, resetProgress = false) {
  if (!activeAudio || activeAudio === exceptAudio) {
    return;
  }

  fadeOutAndPause(activeAudio, activeTrack, true, resetProgress);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function getAudioNode(audio) {
  if (audioNodes.has(audio)) {
    return audioNodes.get(audio);
  }

  const context = getAudioContext();

  if (!context) {
    return null;
  }

  const source = context.createMediaElementSource(audio);
  const gain = context.createGain();

  source.connect(gain);
  gain.connect(context.destination);
  gain.gain.value = 1;

  const node = { context, gain };
  audioNodes.set(audio, node);

  return node;
}

function clearAudioFade(audio) {
  const timer = audioFadeTimers.get(audio);

  if (timer) {
    clearTimeout(timer);
    audioFadeTimers.delete(audio);
  }
}

function shouldUseDirectAudioFade() {
  return document.hidden && document.documentElement.classList.contains("is-webkit");
}

function prepareAudioFadeIn(audio) {
  clearAudioFade(audio);

  if (shouldUseDirectAudioFade()) {
    audio.volume = 1;
    return;
  }

  const node = getAudioNode(audio);

  if (!node) {
    audio.volume = 0;
    return;
  }

  if (node.context.state === "suspended") {
    node.context.resume();
  }

  const now = node.context.currentTime;
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.setValueAtTime(0, now);
}

function fadeAudio(audio, targetVolume, onComplete) {
  clearAudioFade(audio);

  if (shouldUseDirectAudioFade()) {
    audio.volume = targetVolume;
    onComplete?.();
    return;
  }

  const node = getAudioNode(audio);

  if (node) {
    if (node.context.state === "suspended") {
      node.context.resume();
    }

    const now = node.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
    node.gain.gain.linearRampToValueAtTime(targetVolume, now + audioFadeDuration);
  } else {
    audio.volume = targetVolume;
  }

  const timer = setTimeout(() => {
    audioFadeTimers.delete(audio);
    onComplete?.();
  }, audioFadeDuration * 1000);

  audioFadeTimers.set(audio, timer);
}

function fadeOutAndPause(audio, trackElement, clearActive = false, resetProgress = false) {
  if (!audio) {
    return;
  }

  setTrackLoading(trackElement, false);
  trackElement?.classList.remove("is-playing", "is-play-pending");
  syncMiniPlayer();

  if (audio === activeAudio) {
    stopProgressLoop();
  }

  fadeAudio(audio, 0, () => {
    audio.pause();

    if (resetProgress) {
      resetTrackProgress(trackElement, audio);
    }

    if (clearActive && activeAudio === audio) {
      activeAudio = null;
      activeTrack = null;
    }

    syncMiniPlayer();
  });
}

function stopProgressLoop() {
  if (progressFrame) {
    cancelAnimationFrame(progressFrame);
    progressFrame = null;
  }
}

function startProgressLoop() {
  stopProgressLoop();

  const tick = () => {
    if (activeAudio && activeTrack && !activeAudio.paused) {
      updateTrackProgress(activeTrack, activeAudio);
      progressFrame = requestAnimationFrame(tick);
    }
  };

  progressFrame = requestAnimationFrame(tick);
}

function seekTrackFromPointer(trackElement, audio, event, playInactive = false) {
  const progress = trackElement.querySelector(".track-progress");
  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;

  if (!progress || !duration) {
    return;
  }

  ensureAudioSource(audio);
  progress.dataset.dragging = "true";

  const rect = progress.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const targetTime = ratio * duration;

  if (playInactive && (audio !== activeAudio || audio.paused)) {
    toggleTrack(trackElement, audio, {
      forcePlay: true,
      resetNewTrack: false,
      startTime: targetTime,
    });
    return;
  }

  try {
    audio.currentTime = targetTime;
  } catch {
    audio.addEventListener(
      "loadedmetadata",
      () => {
        audio.currentTime = targetTime;
        updateTrackProgress(trackElement, audio);
      },
      { once: true },
    );
  }

  trackElement.classList.add("has-progress");
  updateTrackProgress(trackElement, audio);
}

function updateTrackProgress(trackElement, audio) {
  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;
  const currentTime = audio.currentTime || 0;
  const ratio = duration ? Math.min(currentTime / duration, 1) : 0;
  const fill = trackElement.querySelector(".track-progress-fill");
  const thumb = trackElement.querySelector(".track-progress-thumb");
  const time = trackElement.querySelector(".track-time");
  const percent = `${ratio * 100}%`;

  if (fill) {
    fill.style.width = percent;
  }

  if (thumb) {
    thumb.style.left = percent;
  }

  if (time) {
    time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }

  if (trackElement === activeTrack && audio === activeAudio) {
    updateMiniProgress(trackElement, audio);
  }
}

function setMiniTitle(entry) {
  if (!miniTitle || !miniSource) {
    return;
  }

  miniTitle.replaceChildren();

  if (!entry) {
    miniSource.textContent = "";
    return;
  }

  miniTitle.append(document.createTextNode(entry.track.title));

  if (entry.track.detail) {
    const detail = document.createElement("span");
    detail.className = "mini-track-detail";
    detail.textContent = ` (${entry.track.detail})`;
    miniTitle.append(detail);
  }

  miniSource.textContent = entry.playerTitle;
}

function updateMiniProgress(trackElement, audio) {
  if (!miniProgressFill || !miniProgressThumb || !miniTime) {
    return;
  }

  const duration = Number(trackElement.dataset.duration) || audio.duration || 0;
  const currentTime = audio.currentTime || 0;
  const ratio = duration ? Math.min(currentTime / duration, 1) : 0;
  const percent = `${ratio * 100}%`;

  miniProgressFill.style.width = percent;
  miniProgressThumb.style.left = percent;
  miniTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function isActiveSourceVisible() {
  if (!activeTrack || currentSection !== "all-music") {
    return false;
  }

  const musicContent = document.querySelector('[data-content="all-music"]');
  const item = activeTrack.closest(".soundtrack-item");

  if (
    activeTrack.offsetParent === null ||
    !musicContent ||
    musicContent.hidden ||
    !musicContent.classList.contains("is-visible") ||
    !item?.classList.contains("is-open")
  ) {
    return false;
  }

  const rect = item.getBoundingClientRect();
  const miniHeight = miniPlayer?.getBoundingClientRect().height || 130 * viewportScale;
  const visibleBottom = window.innerHeight - miniHeight;

  return rect.bottom > 0 && rect.top < visibleBottom;
}

function isActiveFooterTouchingViewportBottom() {
  const activeContent = sectionContents.find(
    (content) => content.dataset.content === currentSection && !content.hidden,
  );
  const footer = activeContent?.querySelector(".site-footer");

  if (!footer || getComputedStyle(footer).display === "none") {
    return false;
  }

  return footer.getBoundingClientRect().top <= window.innerHeight;
}

function syncMiniPlayer() {
  if (!miniPlayer) {
    return;
  }

  const entry = activeTrack ? trackEntries.get(activeTrack) : null;
  const hasTrack = Boolean(entry && activeAudio && activeTrack);

  syncAudioAccent(hasTrack ? entry : null);
  syncMiniIconSet(hasTrack ? entry : null);

  const isSuppressed =
    hasTrack && (isActiveSourceVisible() || isActiveFooterTouchingViewportBottom());
  const isVisible = hasTrack && !isSuppressed;
  const isPlaying =
    hasTrack &&
    (activeTrack.classList.contains("is-playing") ||
      activeTrack.classList.contains("is-play-pending"));

  miniPlayer.classList.toggle("is-visible", isVisible);
  miniPlayer.classList.toggle("is-playing", isPlaying);
  miniPlayer.classList.toggle(
    "is-loading",
    hasTrack && activeTrack.classList.contains("is-loading"),
  );
  miniPlayer.classList.toggle("is-shuffled", isShuffleEnabled);
  miniPlayer.setAttribute("aria-hidden", String(!isVisible));

  if (miniToggle) {
    miniToggle.setAttribute("aria-label", isPlaying ? "pause" : "play");
  }

  if (!hasTrack) {
    miniPlayer.removeAttribute("data-current-track");
    setMiniTitle(null);

    if (miniProgressFill && miniProgressThumb && miniTime) {
      miniProgressFill.style.width = "0%";
      miniProgressThumb.style.left = "0%";
      miniTime.textContent = "00:00 / 00:00";
    }

    return;
  }

  if (miniPlayer.dataset.currentTrack !== String(entry.index)) {
    miniPlayer.dataset.currentTrack = String(entry.index);
    setMiniTitle(entry);
  }

  updateMiniProgress(activeTrack, activeAudio);
}

function seekMiniFromPointer(event) {
  if (!miniProgress || !activeAudio || !activeTrack) {
    return;
  }

  const duration = Number(activeTrack.dataset.duration) || activeAudio.duration || 0;

  if (!duration) {
    return;
  }

  ensureAudioSource(activeAudio);
  miniProgress.dataset.dragging = "true";

  const rect = miniProgress.getBoundingClientRect();
  const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  const audio = activeAudio;
  const track = activeTrack;
  const targetTime = ratio * duration;

  try {
    audio.currentTime = targetTime;
  } catch {
    audio.addEventListener(
      "loadedmetadata",
      () => {
        audio.currentTime = targetTime;
        updateTrackProgress(track, audio);
      },
      { once: true },
    );
  }

  track.classList.add("has-progress");
  updateTrackProgress(track, audio);
}

function getMiniPlayableEntries() {
  return audioTrackEntries.filter((entry) => !entry.track.excludeFromMiniPlayer);
}

function createShuffleSequence(anchorEntry = null) {
  shuffleEntries = [...getMiniPlayableEntries()];

  for (let index = shuffleEntries.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffleEntries[index], shuffleEntries[randomIndex]] = [
      shuffleEntries[randomIndex],
      shuffleEntries[index],
    ];
  }

  shuffleIndex = -1;

  if (!anchorEntry) {
    return;
  }

  const anchorIndex = shuffleEntries.indexOf(anchorEntry);

  if (anchorIndex === -1) {
    return;
  }

  shuffleEntries.splice(anchorIndex, 1);
  shuffleEntries.unshift(anchorEntry);
  shuffleIndex = 0;
}

function setShuffleEnabled(isEnabled) {
  isShuffleEnabled = isEnabled;

  if (isShuffleEnabled) {
    createShuffleSequence(activeTrack ? trackEntries.get(activeTrack) : null);
  } else {
    shuffleEntries = [];
    shuffleIndex = -1;
  }

  miniShuffle?.setAttribute("aria-pressed", String(isShuffleEnabled));
  preloadAdjacentTrack(activeTrack ? trackEntries.get(activeTrack) : null);
  syncMiniPlayer();
}

function syncShufflePosition(entry) {
  if (!isShuffleEnabled || !entry) {
    return;
  }

  const playableEntries = getMiniPlayableEntries();

  if (shuffleEntries.length !== playableEntries.length) {
    createShuffleSequence(playableEntries.includes(entry) ? entry : null);
    return;
  }

  const entryIndex = shuffleEntries.indexOf(entry);

  if (entryIndex === -1) {
    createShuffleSequence(playableEntries.includes(entry) ? entry : null);
    return;
  }

  shuffleIndex = entryIndex;
}

function getAdjacentTrackEntry(direction, fallbackEntry = null) {
  const playableEntries = getMiniPlayableEntries();

  if (!playableEntries.length) {
    return null;
  }

  const currentEntry = activeTrack ? trackEntries.get(activeTrack) : fallbackEntry;
  const currentEntryIsPlayable = currentEntry && playableEntries.includes(currentEntry);

  if (isShuffleEnabled) {
    if (shuffleEntries.length !== playableEntries.length) {
      createShuffleSequence(currentEntryIsPlayable ? currentEntry : null);
    }

    if (currentEntryIsPlayable) {
      syncShufflePosition(currentEntry);
    }

    if (!shuffleEntries.length) {
      return null;
    }

    if (shuffleIndex === -1) {
      shuffleIndex = direction < 0 ? shuffleEntries.length - 1 : 0;
      return shuffleEntries[shuffleIndex];
    }

    shuffleIndex =
      (shuffleIndex + direction + shuffleEntries.length) % shuffleEntries.length;

    return shuffleEntries[shuffleIndex];
  }

  const currentIndex = currentEntryIsPlayable ? playableEntries.indexOf(currentEntry) : -1;

  if (currentIndex === -1) {
    return direction < 0 ? playableEntries[playableEntries.length - 1] : playableEntries[0];
  }

  const nextIndex =
    (currentIndex + direction + playableEntries.length) % playableEntries.length;

  return playableEntries[nextIndex];
}

function playTrackEntry(entry, options = {}) {
  if (!entry) {
    return;
  }

  if (entry.audio === activeAudio) {
    resetTrackProgress(entry.trackElement, entry.audio);

    if (entry.audio.paused) {
      toggleTrack(entry.trackElement, entry.audio, {
        autoAdvance: options.autoAdvance,
      });
    }

    return;
  }

  toggleTrack(entry.trackElement, entry.audio, {
    autoAdvance: options.autoAdvance,
  });
}

function playAdjacentTrack(direction, fallbackEntry = null, options = {}) {
  playTrackEntry(getAdjacentTrackEntry(direction, fallbackEntry), options);
}

function setDefaultAudioTrack() {
  const playableEntries = getMiniPlayableEntries();

  if (activeAudio || activeTrack || !playableEntries.length) {
    return;
  }

  const entry = playableEntries[0];
  activeAudio = entry.audio;
  activeTrack = entry.trackElement;
  resetTrackProgress(activeTrack, activeAudio);
  syncMiniPlayer();
}

function resizeOpenSoundtrackBody(item) {
  const body = item?.querySelector(".soundtrack-body");

  if (!body || body.hidden || !item?.classList.contains("is-open")) {
    return;
  }

  const previousHeight = body.getBoundingClientRect().height / viewportScale;

  body.style.height = "auto";
  const nextHeight = body.scrollHeight;

  body.style.height = `${previousHeight}px`;
  body.offsetHeight;
  body.style.height = `${nextHeight}px`;

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function setSoundtrackOpen(item, isOpen) {
  const toggle = item?.querySelector(".soundtrack-toggle");
  const body = item?.querySelector(".soundtrack-body");

  if (!item || !toggle || !body) {
    return;
  }

  item.classList.toggle("is-open", isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    body.hidden = false;
    body.style.height = "0px";
    body.offsetHeight;
    body.style.height = `${body.scrollHeight}px`;
    scheduleStep(() => resizeOpenSoundtrackBody(item), 430);
  } else {
    body.style.height = `${body.scrollHeight}px`;
    body.offsetHeight;
    body.style.height = "0px";
    scheduleStep(() => {
      if (!item.classList.contains("is-open")) {
        body.hidden = true;
      }

      syncMusicLayout();
      syncMiniPlayer();
    }, 430);
  }

  requestAnimationFrame(() => {
    syncMusicLayout();
    syncMiniPlayer();
  });
}

function getSectionTransitionDelay(targetSection) {
  if (currentSection === targetSection) {
    return 0;
  }

  if (currentSection === "projects") {
    return colorDuration + stripeDuration;
  }

  if (targetSection === "projects") {
    return stripeDuration;
  }

  return stripeDuration;
}

function scrollToSoundtrackItem(item) {
  const targetTop = window.scrollY + item.getBoundingClientRect().top - 80 * viewportScale;

  window.scrollTo({
    top: Math.max(0, Math.round(targetTop)),
    behavior: "smooth",
  });
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function smoothScrollTo(targetTop, duration = accordionScrollDuration) {
  if (soundtrackHeaderScrollFrame) {
    cancelAnimationFrame(soundtrackHeaderScrollFrame);
    soundtrackHeaderScrollFrame = null;
  }

  const startTop = window.scrollY;
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const clampedTarget = Math.min(maxScroll, Math.max(0, Math.round(targetTop)));
  const distance = clampedTarget - startTop;
  const startTime = performance.now();

  if (Math.abs(distance) < 1) {
    return;
  }

  const tick = (time) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo(0, startTop + distance * easedProgress);

    if (progress < 1) {
      soundtrackHeaderScrollFrame = requestAnimationFrame(tick);
      return;
    }

    soundtrackHeaderScrollFrame = null;
  };

  soundtrackHeaderScrollFrame = requestAnimationFrame(tick);
}

function scrollToSoundtrackHeader(item) {
  const toggle = item?.querySelector(".soundtrack-toggle");

  if (!toggle) {
    return;
  }

  const rect = toggle.getBoundingClientRect();
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const targetTop = window.scrollY + rect.top - 50;

  smoothScrollTo(Math.min(maxScroll, Math.max(0, Math.round(targetTop))));
}

function openLinkedSoundtrack(soundtrackId) {
  const item = document.querySelector(`[data-soundtrack-id="${soundtrackId}"]`);

  if (!item) {
    return;
  }

  applyMusicTab("soundtracks");

  if (!item.classList.contains("is-open")) {
    setSoundtrackOpen(item, true);
  }

  requestAnimationFrame(() => {
    scrollToSoundtrackItem(item);
  });
}

function setActiveSection(section) {
  if (section === currentSection) {
    return;
  }

  clearPendingSteps();
  const previousSection = currentSection;
  currentSection = section;

  applyActiveTitle(section);
  hideContent();
  syncMiniPlayer();

  if (previousSection === "projects") {
    applyTheme(section);
    scheduleStep(() => applyStripeHeights(section), colorDuration);
    scheduleStep(() => applyContent(section), colorDuration + stripeDuration);
    return;
  }

  if (section === "projects") {
    applyStripeHeights(section);
    scheduleStep(() => {
      applyTheme(section);
      applyContent(section);
    }, stripeDuration);
    return;
  }

  applyTheme(section);
  applyStripeHeights(section);
  scheduleStep(() => applyContent(section), stripeDuration);
}

titleLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveSection(link.dataset.section);
  });
});

projectListenLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const transitionDelay = getSectionTransitionDelay("all-music");

    setActiveSection("all-music");
    window.history.replaceState(null, "", link.getAttribute("href"));
    scheduleStep(() => {
      openLinkedSoundtrack(link.dataset.projectListen);
    }, transitionDelay + 40);
  });
});

musicTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    applyMusicTab(tab.dataset.musicTab);
  });
});

soundtrackToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const item = toggle.closest(".soundtrack-item");
    const isOpen = !item?.classList.contains("is-open");

    setSoundtrackOpen(item, isOpen);

    if (isOpen) {
      requestAnimationFrame(() => {
        scrollToSoundtrackHeader(item);
      });
    }
  });
});

miniShuffle?.addEventListener("click", () => {
  setShuffleEnabled(!isShuffleEnabled);
});

miniPrevious?.addEventListener("click", () => {
  playAdjacentTrack(-1);
});

miniToggle?.addEventListener("click", () => {
  if (activeTrack?.classList.contains("is-loading")) {
    return;
  }

  if (activeAudio && activeTrack) {
    toggleTrack(activeTrack, activeAudio);
  }
});

miniNext?.addEventListener("click", () => {
  playAdjacentTrack(1);
});

miniProgress?.addEventListener("pointerdown", (event) => {
  seekMiniFromPointer(event);
  miniProgress.setPointerCapture(event.pointerId);
});

miniProgress?.addEventListener("pointermove", (event) => {
  if (event.buttons !== 1 || miniProgress.dataset.dragging !== "true") {
    return;
  }

  seekMiniFromPointer(event);
});

miniProgress?.addEventListener("pointerup", (event) => {
  miniProgress.dataset.dragging = "false";
  miniProgress.releasePointerCapture(event.pointerId);
});

miniProgress?.addEventListener("pointercancel", () => {
  miniProgress.dataset.dragging = "false";
});

preloadMiniIconSets();
renderAudioPlayers();
setDefaultAudioTrack();
applyTheme("projects");
applyActiveTitle("projects");
applyStripeHeights("projects");
syncResponsiveFrame();
applyContent("projects", { instant: true });
applyMusicTab("soundtracks");
resetInitialScroll();

window.addEventListener("load", () => {
  resetInitialScroll();
  syncResponsiveFrame();
  syncProjectsLayout();
  syncMusicLayout();
  syncMiniPlayer();

  requestAnimationFrame(() => {
    resetInitialScroll();
    syncResponsiveFrame();
    syncMusicLayout();
    syncMiniPlayer();
    shouldResetInitialScroll = false;
  });
});

window.addEventListener("resize", () => {
  syncResponsiveFrame();
  syncProjectsLayout();
  syncMusicLayout();
  syncMiniPlayer();
});

window.addEventListener("scroll", syncMiniPlayer, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    retryPendingAutoAdvance();
  }
});

if (document.fonts) {
  document.fonts.ready.then(() => {
    syncResponsiveFrame();
    syncProjectsLayout();
    syncMusicLayout();
    syncMiniPlayer();
  });
}

projectImageOffsets.forEach(({ image }) => {
  image?.addEventListener("load", () => {
    syncResponsiveFrame();
    syncProjectsLayout();
  });
});

pagePreloader?.addEventListener(
  "animationend",
  () => {
    pagePreloader.classList.add("is-hidden");
  },
  { once: true },
);
