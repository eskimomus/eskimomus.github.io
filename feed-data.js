// ============================================================================
// feed — the posts. Front only for now: this is the shape an admin/back end
// would fill in later, so nothing else in the page has to change when it does.
//
//   title  short heading, ZCOOL 60
//   date   already formatted for display; the back end can send it as-is
//   body   plain text; whether a post is "long" is decided by how many lines
//          this comes out to once rendered (over 3 -> the long layout), not by
//          anything stored here
//   image  the circle on the right. null leaves the empty slot the board shows
//   links  up to two; anything past the second is ignored
// ============================================================================

const FEED = [
  {
    "id": "post-1",
    "title": "best sound award!",
    "date": "21 august 2026",
    "body": "\"a completely fictional story about a city inside a whale\" won best sound at the Lilac Spark Award!",
    "image": "./previews/post-1.jpg",
    "links": [
      {
        "label": "this thing won it <-",
        "href": "#all-music/soundtracks/fictional-story"
      }
    ]
  },
  {
    "id": "post-4",
    "title": "indie tracker",
    "date": "05 august 2026",
    "body": "i've finally got my indie tracker to a usable enough state to upload it here! what it does: the site parses indie trailers from YouTube and gets all the devs' contacts it can. useful if you're looking for work in game dev. feel free to use it!",
    "image": "./previews/post-4.jpg",
    "links": [
      {
        "label": "indie tracker",
        "href": "https://indietracker.site"
      }
    ]
  },
  {
    "id": "post-3",
    "title": "tickstack",
    "date": "26 july 2026",
    "body": "TICKSTACK is a game where you have to climb as high as possible by stacking blocks into platforms. every block costs time.\n\nmade by ln404 for GMTK game jam 2026 with my track playing during gameplay.",
    "image": "./previews/post-3.jpg",
    "links": [
      {
        "label": "play on itch",
        "href": "https://ln404.itch.io/tickstack"
      }
    ]
  },
  {
    "id": "post-2",
    "title": "very serious fish spin simulator",
    "date": "19 july 2026",
    "body": "\"very serious fish spin simulator\" by ln404 with my track \"a school of fish\" is out on itch.io!\nmy rating: 100/100",
    "image": "./previews/post-2.jpg",
    "links": [
      {
        "label": "play on itch",
        "href": "https://ln404.itch.io/fish-spin-simulator"
      }
    ]
  }
];
