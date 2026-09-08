# admin

Local editor for the site's content. Runs on this machine only.

```bash
npm run admin
```

Then open **http://127.0.0.1:5174/admin/** — the site itself is at
`/redesign/index.html` on the same port, so previews and audio load next to
the editor.

Publishing is still git:

```bash
git add -A && git commit -m "new post" && git push
```

GitHub Pages rebuilds within a minute or so.

## What it edits

| tab | file | what |
| --- | --- | --- |
| feed | `redesign/feed-data.js` | posts: title, date, body, artwork, up to two links |
| projects | `redesign/data.js` | the write-ups: title, outline, artwork, paragraphs, links |
| all music | `redesign/music-data.js` | soundtracks and side projects: tags, palette, categories, tracks |

Each track also carries `genres`, `vibes` and `bpm`. All three are optional
and only written when set — an empty box removes the key rather than storing a
blank. `bpm` takes a number; "-" or an empty box both mean no tempo, which is
what an animation reads as "run free of the beat".

The `+` beside genres and vibes offers the vocabulary for that field. Both
lists live in `VOCABULARY` at the top of `admin/admin.js` — edit them there.
Anything typed by hand that isn't in a list is still offered afterwards, so a
one-off word doesn't disappear on the next track.

Uploads land where the site already keeps things — `assets/audio/<project id>/`
for mp3s, `redesign/previews/` for artwork — under names slugged the same way
every existing file is (`törv pt. 2` → `torv-pt-2.mp3`). Several mp3s can go up
at once; they are added in file-name order, and each track's length is measured
from the file itself with `afinfo`.

Saving also bumps the `?v=` on the file it wrote in `redesign/index.html`, so a
returning visitor doesn't get yesterday's content out of a cache.

## Things worth knowing

- **No login, by design.** The server binds to `127.0.0.1` and is unreachable
  from anywhere else, which is the whole security model. Don't change the host
  to `0.0.0.0` without putting authentication in front of it first.
- **Nothing is written until you press save**, and save asks first, listing
  what changed and which files it is about to touch. Deleting something in the
  editor and then reloading the page gets it back.
- **A stale tab can't overwrite newer work.** Each file's content is
  fingerprinted when the editor loads it and checked again on save; if it has
  moved on since — another tab, or this one left open through an edit made
  elsewhere — the save is refused whole (never half) and the editor offers to
  reload.
- **Every save leaves a backup** in `admin/.backups/` (last 40, gitignored),
  and a file that wouldn't parse is refused before it can land.
- **Comments inside the arrays don't survive a save.** Everything outside them
  — the header blocks, the notes between two consts — comes through untouched,
  so explanations about the data belong up there.
- **Removing a track doesn't delete its mp3.** The file stays in
  `assets/audio/`; delete it by hand if you actually want it gone.
- The repo already carries 407 MB of audio and GitHub Pages starts complaining
  around 1 GB, so it's worth keeping an eye on what goes in.
