// ============================================================================
// all music — content carried over from the live site: the track library out
// of script.js (audioLibrary) and the genre tags out of index.html, generated
// rather than retyped so the two can't drift apart.
//
// Each item is one accordion row. `categories` are the submenu entries that
// appear once a row is expanded; a category either lists tracks or carries a
// short blurb with a link (sound design, mastering, tape mix).
//
// `colors` is the project's own pair — accent first, background second. The
// whole page fades to it while any track of that project is sounding (see
// paletteForEntry in app.js); the hover shade is derived from the accent, so
// only these two need writing down. A project without a `colors` block plays
// in the site's own default palette.
//
// `note` is optional: a short parenthetical set after the title in the muted
// tone, the way `wip` marks a work in progress. Give it an `href` and it
// becomes a link — kylskap's credit to taburett is one.
//
// `pick` is how often a track is allowed to come up when the player chooses
// at random: 0 never (it stays in the list and plays if you press it, but the
// shuffle passes it over), 1 the default, 2 more often, 3 more often and
// allowed to be the track the main player opens with. Absent means 1.
//
// A track carries `title`, `detail`, `src` and `duration`, and optionally
// `genres`, `vibes` and `bpm`. The first two are lists — genre and mood, the
// pair the submenu will be built from — drawn from the vocabularies in
// admin/admin.js. `bpm` is a number, and its absence is the "-" case: an
// animation with nothing to lock onto runs free of the tempo. All three are
// written only when set, so a track without them stays four lines long.
//
// `dots` is optional: up to five colours for the circles and the track bars
// instead of the one accent. Each dot and each bar is dealt one of them when
// it's built, so the field, the halos and the lists come out speckled — see
// wabi sabi. Leave it out and everything wears the accent, as before.
// ============================================================================

const SOUNDTRACKS = [
  {
    "id": "kletka",
    "colors": {
      "accent": "#e35858",
      "bg": "#1d0d0d"
    },
    "title": "kletka",
    "tags": "horror • melancholic • ambient • triphop • idm • edm • dnb • acid techno",
    "image": "./previews/kletka.webp",
    "categories": [
      {
        "id": "ambient",
        "title": "ambient",
        "tracks": [
          {
            "title": "ammonia",
            "detail": "research institute floor music, trailer music",
            "src": "./assets/audio/kletka/ammonia.mp3",
            "duration": 182.439175,
            "bpm": 76,
            "genres": [
              "ambient",
              "idm"
            ],
            "vibes": [
              "melancholic",
              "eerie",
              "calm",
              "beautiful"
            ],
            "pick": 3
          },
          {
            "title": "strelka",
            "detail": "antigravity floor music",
            "src": "./assets/audio/kletka/strelka.mp3",
            "duration": 210.0506,
            "bpm": 112,
            "vibes": [
              "melancholic",
              "eerie",
              "calm",
              "beautiful"
            ],
            "genres": [
              "ambient",
              "idm"
            ]
          },
          {
            "title": "afalina",
            "detail": "flood floor music",
            "src": "./assets/audio/kletka/afalina.mp3",
            "duration": 104.0457,
            "bpm": 121,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "kondensat",
            "detail": "mist floor music",
            "src": "./assets/audio/kletka/kondensat.mp3",
            "duration": 80.039175,
            "bpm": 156,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "radiotrophika iii",
            "detail": "greenhouse floor music",
            "src": "./assets/audio/kletka/radiotrophika-iii.mp3",
            "duration": 128.0261,
            "bpm": 150,
            "genres": [
              "trip hop",
              "idm"
            ],
            "vibes": [
              "dynamic",
              "industrial",
              "melancholic",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "anguta",
            "detail": "schisophasia floor music",
            "src": "./assets/audio/kletka/anguta.mp3",
            "duration": 138.031,
            "bpm": 119,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "eerie"
            ]
          },
          {
            "title": "assembly error #7 ambience",
            "detail": "giant robo-fly boss floor",
            "src": "./assets/audio/kletka/assembly-error-7-ambience.mp3",
            "duration": 106.7102,
            "bpm": 90,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "eerie"
            ],
            "pick": 0
          }
        ],
        "content": null
      },
      {
        "id": "bossfight",
        "title": "bossfight music",
        "tracks": [
          {
            "title": "assembly error #7 phase 1",
            "detail": "giant robo-fly boss",
            "src": "./assets/audio/kletka/bossfight/assembly-error-7-phase-1.mp3",
            "duration": 74.7102,
            "bpm": 90,
            "genres": [
              "edm",
              "boss fight"
            ],
            "vibes": [
              "industrial",
              "dynamic",
              "eerie"
            ],
            "pick": 0
          },
          {
            "title": "assembly error #7 phase 2",
            "detail": "giant robo-fly boss, trailer music",
            "src": "./assets/audio/kletka/bossfight/assembly-error-7-phase-2.mp3",
            "duration": 91.1151,
            "bpm": 94,
            "vibes": [
              "industrial",
              "dynamic",
              "eerie"
            ],
            "genres": [
              "edm",
              "boss fight",
              "dnb"
            ],
            "pick": 0
          },
          {
            "title": "i got the pollen",
            "detail": "giant bee",
            "src": "./assets/audio/kletka/bossfight/i-got-the-pollen.mp3",
            "duration": 73.874275,
            "bpm": 130,
            "genres": [
              "edm",
              "boss fight",
              "acid techno"
            ],
            "vibes": [
              "dynamic",
              "eerie",
              "industrial"
            ]
          },
          {
            "title": "kashpirovsky’s room",
            "detail": "",
            "src": "./assets/audio/kletka/bossfight/kashpirovskys-room.mp3",
            "duration": 67.78775,
            "bpm": 85,
            "genres": [
              "post punk",
              "boss fight"
            ],
            "vibes": [
              "dynamic",
              "melancholic"
            ]
          }
        ],
        "content": null
      },
      {
        "id": "trailer",
        "title": "trailer music",
        "tracks": [
          {
            "title": "kletka official launch trailer music",
            "detail": "i hate this track",
            "src": "./assets/audio/kletka/trailer/kletka-official-launch-trailer-music.mp3",
            "duration": 84.0359,
            "bpm": 100,
            "pick": 0
          }
        ],
        "content": null
      },
      {
        "id": "sound-design",
        "title": "sound design",
        "tracks": [],
        "content": {
          "text": "i’ve made a series of audio recordings for the game that tell the story of one of the prisoners of the kletka",
          "linkText": "-> TAKE A LISTEN HERE",
          "linkHref": "https://www.youtube.com/@prisoner412"
        }
      },
      {
        "id": "mastering",
        "title": "mastering",
        "tracks": [],
        "content": {
          "text": "i’ve mastered all of the kletka ost (135 tracks) for the streamings",
          "linkText": "-> TAKE A LISTEN HERE",
          "linkHref": "https://band.link/kletka_ost_2"
        }
      },
      {
        "id": "tape-mix",
        "title": "tape mix",
        "tracks": [],
        "content": {
          "text": "i’ve made an hour-long kletka ost mix with cool transitions",
          "linkText": "-> TAKE A LISTEN HERE",
          "linkHref": "https://youtu.be/FkekGW28JiM?si=-1byQHaw__e4q4SY"
        }
      }
    ]
  },
  {
    "id": "fictional-story",
    "colors": {
      "accent": "#c6d666",
      "bg": "#121808"
    },
    "title": "a completely fictional story about a city inside a whale",
    "tags": "adventure • cute • acoustic • chiptune",
    "image": "./previews/fictional-story.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "a completely real main theme",
            "detail": "main menu and trailer theme",
            "src": "./assets/audio/fictional-story/ingame/a-completely-real-main-theme.mp3",
            "duration": 147.408975,
            "bpm": 80,
            "genres": [
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "calm"
            ],
            "pick": 3
          },
          {
            "title": "junktown theme",
            "detail": "",
            "src": "./assets/audio/fictional-story/ingame/junktown-theme.mp3",
            "duration": 159.5559,
            "bpm": 82,
            "vibes": [
              "cute",
              "beautiful",
              "calm",
              "funky"
            ],
            "genres": [
              "acoustic"
            ],
            "pick": 3
          },
          {
            "title": "the first day inside a whale",
            "detail": "lobby theme",
            "src": "./assets/audio/fictional-story/ingame/the-first-day-inside-a-whale.mp3",
            "duration": 116.166525,
            "bpm": 82,
            "genres": [
              "acoustic",
              "ambient"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "calm"
            ]
          },
          {
            "title": "casino theme",
            "detail": "",
            "src": "./assets/audio/fictional-story/ingame/casino-theme.mp3",
            "duration": 28.47345,
            "bpm": 135,
            "genres": [
              "chiptune"
            ],
            "vibes": [
              "cute",
              "dynamic"
            ]
          },
          {
            "title": "arcade theme",
            "detail": "",
            "src": "./assets/audio/fictional-story/ingame/arcade-theme.mp3",
            "duration": 24.03265,
            "bpm": 70,
            "vibes": [
              "cute",
              "dynamic"
            ],
            "genres": [
              "chiptune"
            ]
          },
          {
            "title": "secret indev location theme",
            "detail": "",
            "src": "./assets/audio/fictional-story/ingame/secret-indev-location-theme.mp3",
            "duration": 24.03265,
            "bpm": 80
          }
        ],
        "content": null
      },
      {
        "id": "sfx",
        "title": "sfx",
        "tracks": [],
        "content": {
          "text": "i’ve made a few sounds for the game’s cutscenes",
          "linkText": "-> TAKE A LISTEN HERE",
          "linkHref": "#"
        }
      }
    ]
  },
  {
    "id": "downsouth",
    "colors": {
      "accent": "#8365de",
      "bg": "#1a0d1d",
      "dots": [
        "#8365de"
      ]
    },
    "wip": true,
    "title": "downsouth",
    "tags": "platformer/rpg • ambient • acoustic • instrumental hip-hop • big band jazz",
    "image": "./previews/downsouth.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "schroeder chase theme",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/schroeder-chase-theme.mp3",
            "duration": 124.6302,
            "bpm": 135,
            "genres": [
              "jazz"
            ],
            "vibes": [
              "dynamic",
              "funky"
            ],
            "pick": 3
          },
          {
            "title": "platamun",
            "detail": "greenhouse area music",
            "src": "./assets/audio/downsouth/ingame/platamun.mp3",
            "duration": 268.27755,
            "bpm": 102,
            "genres": [
              "acoustic",
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "dynamic",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "skadar",
            "detail": "motel area music",
            "src": "./assets/audio/downsouth/ingame/skadar.mp3",
            "duration": 136.0457,
            "bpm": 119,
            "genres": [
              "acoustic",
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ],
            "pick": 3
          },
          {
            "title": "schroeder’s theme",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/schroeders-theme.mp3",
            "duration": 115.6702,
            "bpm": 110,
            "genres": [
              "new jack swing"
            ],
            "vibes": [
              "funky",
              "dynamic"
            ]
          },
          {
            "title": "juice!",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/juice.mp3",
            "duration": 117.36815,
            "bpm": 90,
            "genres": [
              "hip-hop",
              "trip hop"
            ],
            "vibes": [
              "dynamic",
              "funky"
            ],
            "pick": 2
          },
          {
            "title": "demo ambience i",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/demo-ambience-i.mp3",
            "duration": 156.029375,
            "bpm": 81,
            "genres": [
              "acoustic",
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ]
          },
          {
            "title": "demo ambience ii",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/demo-ambience-ii.mp3",
            "duration": 192.0261,
            "bpm": 90,
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ],
            "genres": [
              "acoustic",
              "ambient"
            ]
          },
          {
            "title": "schroeder's motel theme",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/schroeders-motel-theme.mp3",
            "duration": 53.36815,
            "bpm": 90,
            "genres": [
              "jazz"
            ],
            "vibes": [
              "funky",
              "dynamic"
            ]
          },
          {
            "title": "violet nocturne",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/violet-nocturne.mp3",
            "duration": 134.791825,
            "bpm": 118,
            "genres": [
              "jazz"
            ],
            "vibes": [
              "calm",
              "beautiful"
            ],
            "pick": 3
          },
          {
            "title": "rattle snakes & the golfer",
            "detail": "",
            "src": "./assets/audio/downsouth/ingame/rattle-snakes-and-the-golfer.mp3",
            "duration": 123.036725,
            "bpm": 80,
            "genres": [
              "trip hop",
              "hip-hop"
            ],
            "vibes": [
              "eerie",
              "industrial"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "cute-cat-island-game",
    "colors": {
      "accent": "#7ac85e",
      "bg": "#201808"
    },
    "wip": true,
    "title": "cute cat island game",
    "tags": "colony sim • cute • japanese inspired • orchestral • acoustic",
    "image": "./previews/cute-cat-island-game.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "luka",
            "detail": "",
            "src": "./assets/audio/cute-cat-island-game/ingame/luka.mp3",
            "duration": 166.191,
            "bpm": 130,
            "genres": [
              "acoustic",
              "orchestral"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "calm"
            ],
            "pick": 3
          },
          {
            "title": "orchestral sketch #1",
            "detail": "",
            "src": "./assets/audio/cute-cat-island-game/ingame/orchestral-sketch-1.mp3",
            "duration": 68.414675,
            "genres": [
              "orchestral"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "seeds-of-sorrow",
    "colors": {
      "accent": "#858585",
      "bg": "#181818"
    },
    "wip": true,
    "title": "seeds of sorrow",
    "tags": "retro jrpg • melancholic • ambient • chiptune",
    "image": "./previews/seeds-of-sorrow.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "misty pier",
            "detail": "",
            "src": "./assets/audio/seeds-of-sorrow/ingame/misty-pier.mp3",
            "duration": 80.04,
            "bpm": 82,
            "genres": [
              "ambient",
              "idm",
              "acoustic"
            ],
            "vibes": [
              "melancholic",
              "eerie",
              "beautiful",
              "calm"
            ],
            "pick": 3
          },
          {
            "title": "the rainy gnome song",
            "detail": "",
            "src": "./assets/audio/seeds-of-sorrow/ingame/the-rainy-gnome-song.mp3",
            "duration": 96.024,
            "bpm": 75,
            "genres": [
              "chiptune"
            ],
            "vibes": [
              "melancholic"
            ]
          },
          {
            "title": "demo fight track",
            "detail": "",
            "src": "./assets/audio/seeds-of-sorrow/ingame/demo-fight-track.mp3",
            "duration": 134.426094,
            "bpm": 125,
            "genres": [
              "chiptune",
              "boss fight"
            ],
            "vibes": [
              "eerie"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "industrial-ambient",
    "colors": {
      "accent": "#a05e2c",
      "bg": "#291901"
    },
    "wip": true,
    "title": "untorra",
    "tags": "??? • melancholic • industrial • ambient",
    "image": "./previews/untorra.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "playing jazz in the metropolis",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/playing-jazz-in-the-metropolis.mp3",
            "duration": 174.024,
            "bpm": 83
          },
          {
            "title": "capital’s barbershop",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/capitals-barbershop.mp3",
            "duration": 85.368,
            "bpm": 61
          },
          {
            "title": "bion",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/bion.mp3",
            "duration": 96.024,
            "bpm": 85
          },
          {
            "title": "greenhouse floor 264",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/greenhouse-floor-264.mp3",
            "duration": 112.032,
            "bpm": 120
          },
          {
            "title": "city lights",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/city-lights.mp3",
            "duration": 130.944,
            "bpm": 75
          },
          {
            "title": "industrial ash",
            "detail": "",
            "src": "./assets/audio/industrial-ambient/ingame/industrial-ash.mp3",
            "duration": 124.704,
            "bpm": 77,
            "pick": 3
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "untitled-ost",
    "colors": {
      "accent": "#cc2325",
      "bg": "#0c0c0c"
    },
    "title": "untitled ost",
    "tags": "??? • melancholic • ambient",
    "image": "./previews/untitled-ost.webp",
    "categories": [
      {
        "id": "ingame",
        "title": "ingame music",
        "tracks": [
          {
            "title": "damaged data",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/damaged-data.mp3",
            "duration": 110.544,
            "bpm": 120,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "eerie",
              "melancholic",
              "calm",
              "beautiful"
            ],
            "pick": 3
          },
          {
            "title": "antenna",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/antenna.mp3",
            "duration": 112.968,
            "bpm": 144,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ]
          },
          {
            "title": "a kite with dad",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/a-kite-with-dad.mp3",
            "duration": 134.232,
            "bpm": 123,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "a hopeful transmission",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/a-hopeful-transmission.mp3",
            "duration": 112.032,
            "bpm": 82,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ]
          },
          {
            "title": "fever dream",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/fever-dream.mp3",
            "duration": 184.536,
            "bpm": 147,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ]
          },
          {
            "title": "infinity sign",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/infinity-sign.mp3",
            "duration": 146.28,
            "bpm": 144,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful"
            ]
          },
          {
            "title": "a burned pixel",
            "detail": "",
            "src": "./assets/audio/untitled-ost/ingame/a-burned-pixel.mp3",
            "duration": 256.032,
            "bpm": 121,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "eerie",
              "melancholic",
              "calm"
            ]
          }
        ],
        "content": null
      }
    ]
  }
];

const SIDE_PROJECTS = [
  {
    "id": "kylskap",
    "colors": {
      "accent": "#4d7fc4",
      "bg": "#26160a"
    },
    "note": {
      "text": "taburett collaboration project",
      "href": "https://www.youtube.com/@taburettaburetich"
    },
    "title": "kylskåp",
    "album": "kylskåp",
    "tags": "authentic 00s electronic psyop (tell no one) album",
    "image": "./previews/kylskap.webp",
    "categories": [
      {
        "id": "tracks",
        "title": "tracks",
        "tracks": [
          {
            "title": "fireflies",
            "detail": "",
            "src": "./assets/audio/kylskap/fireflies.mp3",
            "duration": 67.9445,
            "bpm": 97,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "calm",
              "beautiful",
              "melancholic"
            ]
          },
          {
            "title": "dusT",
            "detail": "",
            "src": "./assets/audio/kylskap/dust.mp3",
            "duration": 171.102,
            "bpm": 70,
            "genres": [
              "idm"
            ],
            "vibes": [
              "industrial",
              "dynamic"
            ]
          },
          {
            "title": "talking boxes",
            "detail": "",
            "src": "./assets/audio/kylskap/talking-boxes.mp3",
            "duration": 285.388,
            "bpm": 128,
            "vibes": [
              "industrial",
              "dynamic"
            ],
            "genres": [
              "downtempo",
              "house"
            ]
          },
          {
            "title": "Montenegro",
            "detail": "",
            "src": "./assets/audio/kylskap/montenegro.mp3",
            "duration": 112.013,
            "bpm": 123,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "calm",
              "beautiful",
              "melancholic"
            ],
            "pick": 0
          },
          {
            "title": "vivace",
            "detail": "",
            "src": "./assets/audio/kylskap/vivace.mp3",
            "duration": 203.233,
            "bpm": 90,
            "genres": [
              "downtempo"
            ],
            "vibes": [
              "funky",
              "beautiful",
              "dynamic"
            ],
            "pick": 3
          },
          {
            "title": "bubble butterfly",
            "detail": "",
            "src": "./assets/audio/kylskap/bubble-butterfly.mp3",
            "duration": 174.602,
            "bpm": 90,
            "genres": [
              "downtempo",
              "trip hop"
            ],
            "vibes": [
              "funky",
              "beautiful",
              "dynamic",
              "melancholic"
            ]
          },
          {
            "title": "rutnät",
            "detail": "",
            "src": "./assets/audio/kylskap/rutnat.mp3",
            "duration": 214.282,
            "bpm": 118,
            "genres": [
              "house"
            ],
            "vibes": [
              "dynamic",
              "funky"
            ]
          },
          {
            "title": "mothes",
            "detail": "",
            "src": "./assets/audio/kylskap/mothes.mp3",
            "duration": 78.1845,
            "bpm": 90,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "beautiful",
              "calm",
              "melancholic"
            ],
            "pick": 0
          },
          {
            "title": "dreamer",
            "detail": "",
            "src": "./assets/audio/kylskap/dreamer.mp3",
            "duration": 216.66,
            "bpm": 80,
            "genres": [
              "dnb",
              "idm"
            ],
            "vibes": [
              "dynamic",
              "funky"
            ]
          },
          {
            "title": "armless",
            "detail": "",
            "src": "./assets/audio/kylskap/armless.mp3",
            "duration": 121.835,
            "bpm": 90,
            "genres": [
              "ambient",
              "idm"
            ],
            "vibes": [
              "funky",
              "calm"
            ],
            "pick": 0
          },
          {
            "title": "törv pt. 1",
            "detail": "",
            "src": "./assets/audio/kylskap/torv-pt-1.mp3",
            "duration": 96.1306,
            "bpm": 93,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "funky",
              "calm"
            ],
            "pick": 0
          },
          {
            "title": "törv pt. 2",
            "detail": "",
            "src": "./assets/audio/kylskap/torv-pt-2.mp3",
            "duration": 173.923,
            "bpm": 135,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "calm"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "plumborx2008",
    "colors": {
      "accent": "#c80000",
      "bg": "#310800"
    },
    "title": "plumborx2008",
    "album": "plumborx2008",
    "tags": "lo-fi ambient techno project about mushrooms",
    "image": "./previews/plumborx2008.webp",
    "categories": [
      {
        "id": "tracks",
        "title": "tracks",
        "tracks": [
          {
            "title": "plicexx204821982",
            "detail": "",
            "src": "./assets/audio/plumborx2008/plicexx204821982.mp3",
            "duration": 98.6384,
            "bpm": 70,
            "genres": [
              "ambient techno",
              "idm"
            ],
            "vibes": [
              "eerie",
              "industrial"
            ]
          },
          {
            "title": "blodox",
            "detail": "",
            "src": "./assets/audio/plumborx2008/blodox.mp3",
            "duration": 74.4228,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "ambient",
              "idm"
            ],
            "vibes": [
              "eerie",
              "industrial"
            ]
          },
          {
            "title": "amortona",
            "detail": "",
            "src": "./assets/audio/plumborx2008/amortona.mp3",
            "duration": 160.131,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "idm"
            ],
            "vibes": [
              "eerie",
              "industrial",
              "melancholic"
            ]
          },
          {
            "title": "funi trak :D",
            "detail": "",
            "src": "./assets/audio/plumborx2008/funi-trak-d.mp3",
            "duration": 121.104,
            "bpm": 80,
            "genres": [
              "ambient techno",
              "idm",
              "downtempo"
            ],
            "vibes": [
              "eerie",
              "industrial",
              "melancholic",
              "beautiful"
            ],
            "pick": 2
          },
          {
            "title": "earaper",
            "detail": "",
            "src": "./assets/audio/plumborx2008/earaper.mp3",
            "duration": 99.9967,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "idm",
              "dnb"
            ],
            "vibes": [
              "eerie",
              "industrial",
              "melancholic",
              "beautiful"
            ]
          },
          {
            "title": "xxverter",
            "detail": "",
            "src": "./assets/audio/plumborx2008/xxverter.mp3",
            "duration": 10.449,
            "bpm": 107
          },
          {
            "title": "radiotrophika i",
            "detail": "",
            "src": "./assets/audio/plumborx2008/radiotrophika-i.mp3",
            "duration": 143.438,
            "bpm": 142,
            "genres": [
              "ambient"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful",
              "industrial"
            ]
          },
          {
            "title": "exxtoria",
            "detail": "",
            "src": "./assets/audio/plumborx2008/exxtoria.mp3",
            "duration": 118.7,
            "bpm": 130,
            "genres": [
              "ambient techno",
              "idm",
              "dnb",
              "acid techno"
            ],
            "vibes": [
              "industrial",
              "eerie"
            ]
          },
          {
            "title": "flixxer",
            "detail": "",
            "src": "./assets/audio/plumborx2008/flixxer.mp3",
            "duration": 96.0784,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "idm",
              "acid techno"
            ],
            "vibes": [
              "industrial",
              "eerie"
            ]
          },
          {
            "title": "kinetica",
            "detail": "",
            "src": "./assets/audio/plumborx2008/kinetica.mp3",
            "duration": 32.0522,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "idm",
              "acid techno"
            ],
            "vibes": [
              "industrial",
              "eerie"
            ]
          },
          {
            "title": "interatoria 8000",
            "detail": "",
            "src": "./assets/audio/plumborx2008/interatoria-8000.mp3",
            "duration": 76.8,
            "bpm": 100,
            "vibes": [
              "melancholic",
              "calm",
              "beautiful",
              "industrial"
            ],
            "genres": [
              "ambient",
              "idm"
            ]
          },
          {
            "title": "plicexx is your friend!!!",
            "detail": "",
            "src": "./assets/audio/plumborx2008/plicexx-is-your-friend.mp3",
            "duration": 52.5845,
            "bpm": 80,
            "genres": [
              "ambient",
              "idm"
            ],
            "vibes": [
              "melancholic",
              "calm",
              "beautiful",
              "industrial"
            ]
          },
          {
            "title": "ambulator",
            "detail": "",
            "src": "./assets/audio/plumborx2008/ambulator.mp3",
            "duration": 64.0261,
            "bpm": 120,
            "genres": [
              "ambient techno",
              "ambient"
            ],
            "vibes": [
              "eerie",
              "industrial",
              "calm",
              "melancholic"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "a-school-of-fish",
    "colors": {
      "accent": "#747474",
      "bg": "#0a0a0a"
    },
    "title": "a school of fish",
    "album": "a school of fish",
    "tags": "",
    "image": "./previews/a-school-of-fish.webp",
    "categories": [
      {
        "id": "tracks",
        "title": "tracks",
        "tracks": [
          {
            "title": "a school of fish",
            "detail": "",
            "src": "./assets/audio/a-school-of-fish/a-school-of-fish.mp3",
            "duration": 230.424,
            "bpm": 100,
            "genres": [
              "jazz",
              "idm"
            ],
            "vibes": [
              "melancholic",
              "dynamic"
            ],
            "pick": 2
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "luchin-060326",
    "colors": {
      "accent": "#984c00",
      "bg": "#200f01"
    },
    "title": "luchin/060326",
    "album": "luchin/060326",
    "tags": "idk what is this genre",
    "image": "./assets/luchin.webp",
    "categories": [
      {
        "id": "tracks",
        "title": "tracks",
        "tracks": [
          {
            "title": "luchin",
            "detail": "",
            "src": "./assets/audio/luchin-060326/luchin.mp3",
            "duration": 166.44,
            "bpm": 75,
            "genres": [
              "jazz"
            ],
            "vibes": [
              "calm",
              "melancholic",
              "beautiful"
            ],
            "pick": 3
          },
          {
            "title": "060326 untitled",
            "detail": "",
            "src": "./assets/audio/luchin-060326/060326-untitled.mp3",
            "duration": 222.024,
            "bpm": 60,
            "vibes": [
              "eerie",
              "melancholic",
              "industrial"
            ],
            "genres": [
              "jazz"
            ]
          }
        ],
        "content": null
      }
    ]
  },
  {
    "id": "wabi-sabi",
    "colors": {
      "accent": "#b18050",
      "bg": "#242228",
      "dots": [
        "#84b150",
        "#509eb1",
        "#5055b1",
        "#b1509e",
        "#b18050"
      ]
    },
    "title": "wabi sabi",
    "album": "wabi sabi",
    "tags": "a little cute lo-fi folktronica ep",
    "image": "./previews/wabi-sabi.webp",
    "categories": [
      {
        "id": "tracks",
        "title": "tracks",
        "tracks": [
          {
            "title": "drunk bees",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/drunk-bees.mp3",
            "duration": 152.496,
            "bpm": 82,
            "genres": [
              "acoustic",
              "lo-fi"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "calm"
            ],
            "pick": 3
          },
          {
            "title": "lost seals",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/lost-seals.mp3",
            "duration": 118.8,
            "bpm": 120,
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ],
            "genres": [
              "acoustic",
              "lo-fi",
              "ambient"
            ],
            "pick": 3
          },
          {
            "title": "luba and i went to park and talked to birds with a whistle",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/luba-and-i-went-to-park-and-talked-to-birds-with-a-whistle.mp3",
            "duration": 102.024,
            "bpm": 100,
            "genres": [
              "acoustic",
              "lo-fi"
            ],
            "vibes": [
              "cute",
              "beautiful"
            ]
          },
          {
            "title": "wabi sabi",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/wabi-sabi.mp3",
            "duration": 69.696,
            "bpm": 68,
            "genres": [
              "ambient",
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "calm down",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/calm-down.mp3",
            "duration": 106.296,
            "bpm": 140,
            "genres": [
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "calm"
            ]
          },
          {
            "title": "emerald, pink & profiterole memories",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/emerald-pink-and-profiterole-memories.mp3",
            "duration": 150.864,
            "bpm": 121,
            "genres": [
              "ambient",
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "guitarist boy",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/guitarist-boy.mp3",
            "duration": 137.208,
            "bpm": 100,
            "genres": [
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "tone change",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/tone-change.mp3",
            "duration": 85.632,
            "bpm": 95,
            "genres": [
              "hip-hop",
              "lo-fi"
            ],
            "vibes": [
              "cute",
              "funky"
            ]
          },
          {
            "title": "república de mily pesik",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/republica-de-mily-pesik.mp3",
            "duration": 110.208,
            "bpm": 120,
            "genres": [
              "bossa nova",
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "império de tolsty kot",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/imperio-de-tolsty-kot.mp3",
            "duration": 66.36,
            "bpm": 120,
            "genres": [
              "bossa nova",
              "lo-fi"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "hallelujah",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/hallelujah.mp3",
            "duration": 117.336,
            "bpm": 70,
            "genres": [
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          },
          {
            "title": "meant for joy",
            "detail": "",
            "src": "./assets/audio/wabi-sabi/meant-for-joy.mp3",
            "duration": 73.416,
            "bpm": 120,
            "genres": [
              "lo-fi",
              "acoustic"
            ],
            "vibes": [
              "cute",
              "beautiful",
              "melancholic",
              "calm"
            ]
          }
        ],
        "content": null
      }
    ]
  }
];
