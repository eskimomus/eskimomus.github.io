// ============================================================================
// Content for the projects tab. Copy carried over verbatim from the site
// this one replaced, so nothing published was lost in the rebuild.
//
// `mask` picks one of the six blob outlines in /assets, so every circle's
// wobble reads a little differently — the same trick the canvas field plays.
//
// The admin (admin/server.mjs) rewrites the arrays below in place. Everything
// outside them survives, so notes about the data belong up here rather than
// beside an entry: a comment between two entries is gone after the first save.
// ============================================================================

const PROJECTS = [
  {
    "id": "kletka",
    "title": "kletka",
    "image": "./previews/kletka.webp",
    "mask": 1,
    "paragraphs": [
      "kletka is a popular indie co-op horror set in a universe of samosbor, a russian internet myth about a world made up of one giant, endless panel high-rise building",
      "kletka received strong praise from players, reaching 6000+ steam reviews with a 90% positive rating, 400k copies sold and millions of views across youtube",
      "i composed 12 tracks for kletka in different styles, with four of them featured in the trailers. i also mastered the whole ost for streaming (135 tracks), created a 2-hour-long ost tape mix and made a series of in-game audio recordings that tell the story of one of kletka's prisoners"
    ],
    "links": [
      {
        "label": "youtube",
        "href": "https://youtu.be/ll1pGIob2wA?si=5NhaC0gOq6Zz-y3a"
      },
      {
        "label": "steam",
        "href": "https://store.steampowered.com/app/1699480/KLETKA/"
      },
      {
        "label": "take a listen",
        "href": "#all-music/soundtracks/kletka"
      }
    ]
  },
  {
    "id": "fictional-story",
    "title": "a completely fictional story about a city inside a whale",
    "image": "./previews/fictional-story.webp",
    "mask": 3,
    "paragraphs": [
      "super cute indie game about the world's first town inside a whale. it's friendly, a little odd and utterly charming. explore every corner of this peculiar place, help the locals - and maybe they'll help you find a way out. or... maybe you'll decide to stay",
      "i composed 5 tracks for acfsaaciaw (and i absolutely love them). one of them is playing in the release trailer"
    ],
    "links": [
      {
        "label": "youtube",
        "href": "https://youtu.be/aA933w1uwrM?si=n3vjRSHRAB29WEzQ"
      },
      {
        "label": "steam",
        "href": "https://store.steampowered.com/app/2445590/A_Completely_Fictional_Story_About_a_City_Inside_a_Whale/"
      },
      {
        "label": "take a listen",
        "href": "#all-music/soundtracks/fictional-story"
      }
    ]
  },
  {
    "id": "downsouth",
    "title": "downsouth",
    "image": "./previews/downsouth.webp",
    "mask": 5,
    "paragraphs": [
      "insanely beautiful platformer/RPG. play as South, a stimulant-fueled purple bean, and parkour, converse and fight your way through sprawling dystopian city-scapes. each choice affects your abilities, dialogue, and even your appearance... just know, survival comes at a moral cost",
      "\"The art here looks amazing. Very pretty in a zany and crazy way.\" ABC news",
      "i've already composed a lot of tracks for this game in every genre there is and don't plan to stop!"
    ],
    "links": [
      {
        "label": "youtube",
        "href": "https://youtu.be/fyQVqSIB92Y?si=mr0AgtGfDyJMPwnL"
      },
      {
        "label": "steam",
        "href": "https://store.steampowered.com/app/4133290/DownSouth/"
      },
      {
        "label": "take a listen",
        "href": "#all-music/soundtracks/downsouth"
      }
    ]
  },
  {
    "id": "untorra",
    "title": "untorra",
    "image": "./previews/untorra.webp",
    "mask": 4,
    "paragraphs": [
      "untorra is a tranquilly eerie soundtrack for a nineties-inspired point-and-click puzzle game.\ndeveloped, composed and written by Matt Swan and for the first time ever available on CDs via EmpyreanRecords.\nthe game itself is currently available only on physical media but will get released online in a couple of months."
    ],
    "links": [
      {
        "label": "take a listen",
        "href": "#all-music/soundtracks/untorra"
      },
      {
        "label": "buy CD",
        "href": "https://empyrean-records.myshopify.com/products/emp08-matt-swan-untorra?variant=58441317876056&fbclid=PAVERFWAUP-01wZG9mAmZkaWQWUOJ1nD-ZMF8bUdVJL1m4505smNTyAGV4dG4DYWVtAjEwAHNydGMGYXBwX2lkDzEyNDAyNDU3NDI4NzQxNAABp5m0VqzVoXrEwh6ff7j49Ht8EsjI4x8pQBNlyHNNkAdX3AuaTs4gkC5QjZdr_aem_-3HFpAclP3xkbL9aanGAGw"
      }
    ]
  },
  {
    "id": "indie-tracker",
    "title": "indie tracker",
    "image": "./previews/indie-tracker.jpg",
    "mask": 2,
    "paragraphs": [
      "i've finally got my indie tracker to a usable enough state to upload it here!\nwhat it does: the site parses indie trailers from YouTube and gets all the devs' contacts it can. useful if you're looking for work in game dev. feel free to use it!"
    ],
    "links": [
      {
        "label": "indie tracker",
        "href": "https://indietracker.site"
      }
    ]
  }
];

// ============================================================================
// contacts — the same field the projects use, with the platforms in it.
// `icon` is an SVG that already carries its own shape and brand colour, so it
// goes into the grid as-is rather than being cut to a blob outline.
// href: null means the circle is there but has nowhere to go yet — discord is
// still handle-only, as it was on the old site.
// ============================================================================

const CONTACTS = [
  {
    "id": "mail",
    "title": "email",
    "icon": "./assets/contacts/mail.svg",
    "href": "mailto:matt_swan@tuta.io"
  },
  {
    "id": "youtube",
    "title": "youtube",
    "icon": "./assets/contacts/yt.svg",
    "href": "https://www.youtube.com/@matthew_swan"
  },
  {
    "id": "telegram",
    "title": "telegram",
    "icon": "./assets/contacts/telegram.svg",
    "href": "https://t.me/matt_swan_music"
  },
  {
    "id": "instagram",
    "title": "instagram",
    "icon": "./assets/contacts/insta.svg",
    "href": "https://www.instagram.com/matt_swaan/"
  },
  {
    "id": "x",
    "title": "x",
    "icon": "./assets/contacts/x.svg",
    "href": "https://x.com/matt_swaan"
  },
  {
    "id": "discord",
    "title": "discord",
    "icon": "./assets/contacts/discord.svg",
    "href": null
  }
];
