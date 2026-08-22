# Making and porting themes

A Platter theme is a folder. Inside it: a `theme.json` saying where things go,
and the images it refers to. That is the whole format.

```
my-theme/
├── theme.json
├── background.png
├── play.png  pause.png
└── thumbnail.jpg      (optional, shown in the theme picker)
```

Drop that folder in `~/.local/share/platter/themes/` and it appears in
Platter's preferences. There is no build step, no packaging, and no install
command — the folder *is* the theme.

If you are looking for the reasoning behind the format rather than how to use
it, that is [theme-format-v0.md](theme-format-v0.md). This page is the
practical one.

## The quickest route: convert one that exists

If you already have a CoverGloobus or NowPlaying theme, don't rewrite it.

**Preferences → Theme → Add a theme → Folder… or Archive…**, or:

```
extension/tools/platter-port ~/Downloads/that-theme.zip
```

It reads the original `skin.xml`, converts it, copies the artwork, and installs
the result. Then open the converted `theme.json` and edit from there — starting
from a real theme is far easier than starting from an empty file.

Every conversion writes a `port.json` next to the theme saying what it
repaired, what sizes it measured off your images, what it had to guess, and
what it could not carry across. **If a converted theme looks wrong, read that
file first.** It is usually already told you why.

## Writing one by hand

The smallest theme that works:

```json
{
  "format": "platter-theme/0",
  "id": "my-theme",
  "name": "My Theme",
  "canvas": { "width": 300, "height": 120 },
  "attribution": {
    "author": "Your Name",
    "license": "CC BY-SA 4.0",
    "distribution": "free"
  },
  "layers": [
    { "type": "image", "src": "background.png", "x": 0, "y": 0,
      "width": 300, "height": 120 },
    { "type": "artwork", "x": 10, "y": 10, "width": 100, "height": 100 },
    { "type": "text", "bind": "title", "x": 120, "y": 20, "width": 170,
      "color": "#ffffffff",
      "font": { "family": "Cantarell", "size": 12, "weight": "bold" } },
    { "type": "text", "bind": "artist", "x": 120, "y": 42, "width": 170,
      "color": "#ccccccff",
      "font": { "family": "Cantarell", "size": 10 } }
  ]
}
```

Things worth knowing before you start:

- **`canvas` is a fixed pixel canvas** and every layer is positioned absolutely
  inside it, origin top-left. There is no flow layout and no relative sizing.
  Platter scales the whole canvas as one, so design at whatever size is
  comfortable.
- **Layers draw in the order they appear.** Later layers sit on top.
- **Colours are `#RRGGBBAA`** — eight digits, alpha included. Six will be
  rejected.
- **`id` should match the folder name.** If it doesn't, Platter uses the folder.
- **Fonts are named, never bundled.** Say the family; the user installs it.
  Shipping a font file inside a theme is almost never something you have the
  right to do — see [fonts.md](fonts.md).

## The layers

### `image` — any picture
```json
{ "type": "image", "src": "case.png", "x": 0, "y": 0, "width": 220, "height": 288,
  "round": 20, "opacity": 0.6, "visible": "stopped" }
```
Leave out `width`/`height` and Platter reads them off the file. `round` gives
rounded corners in pixels. `visible` is `always` (default), `playing`, or
`stopped` — which is how you show a placeholder only when nothing is on.

### `artwork` — the album cover
```json
{ "type": "artwork", "x": 15, "y": 15, "width": 100, "height": 100, "round": 6 }
```
Same as `image` without `src`; Platter supplies the picture. **`width` and
`height` are required here** — there is no file to measure. Put a placeholder
`image` underneath with `"visible": "stopped"` for when nothing is playing.

### `text` — track information
```json
{ "type": "text", "bind": "title", "x": 21, "y": 218, "width": 180,
  "font": { "family": "Cantarell", "size": 11, "weight": "bold", "style": "normal" },
  "color": "#e6e6e6ff", "align": "left", "wrap": false,
  "overflow": { "mode": "ellipsize-char", "maxchars": 25 } }
```
`bind` is one of `title`, `artist`, `album`, `genre`, `track`, `year`,
`length`, `position`, `player`.

`align` is `left`, `center` or `right`. `overflow.mode` is `ellipsize-word`,
`ellipsize-char`, `clip` or `scroll`, and `maxchars` cuts the text at a
character count.

### `button` — playback controls
```json
{ "type": "button", "action": "play_pause", "x": 113, "y": 152,
  "width": 16, "height": 16,
  "states": {
    "default": { "normal": "play.png", "hover": "play_hover.png" },
    "playing": { "normal": "pause.png", "hover": "pause_hover.png" }
  } }
```
`action` is `previous`, `play_pause`, `next`, `mute` or `quit`. Only
`play_pause` uses the `playing` state — that is the one that has to change
picture depending on what the player is doing.

### `seekbar` — track progress
```json
{ "type": "seekbar", "x": 10, "y": 49, "width": 200, "height": 6,
  "back": "seekbar.png", "fill": "seek_fill.png" }
```
`back` is the trough, `fill` is the part that grows. Orientation follows the
shape: wider than tall is horizontal.

### `rating` — star rating
```json
{ "type": "rating", "x": 20, "y": 60, "width": 15, "height": 15,
  "spacing": 3, "star": "star.png", "empty": "nostar.png" }
```

## What is not drawn yet

The format describes more than the renderer currently paints. These are
accepted, validated, and preserved when converting — a theme using them is not
broken and will improve on its own as they land — but they have no effect
today. Worth knowing before you spend an evening on a reflection.

| Field | Where | Status |
| --- | --- | --- |
| `rating` layers | — | Positioned but **no stars drawn yet** |
| `reflect` | `image`, `artwork` | Not drawn — no St equivalent |
| `mask` | `image` | Not drawn — no St equivalent |
| `shadow` | `text` | Not drawn |
| `valign` | `text` | Not applied; `align` works |
| `overflow.mode: "scroll"` | `text` | Falls back to no ellipsis |
| `pressed` state | `button` | Only `normal` and `hover` are used |

## Testing what you have made

Point Platter at your working folder rather than copying it back and forth:
**Preferences → Theme → Extra theme directory**. It is searched before the
bundled themes, so a theme there wins over one of the same name.

Then check the widget will actually draw what you wrote:

```
extension/tools/platter-port --verify ~/my-themes
```

It loads every theme the way the widget does and reports any whose layers it
would silently drop — which is the failure you most want to hear about, because
on screen it just looks like you positioned something badly.

Two settings make design work much less painful:

- **Stay visible with no player running** — keeps the widget on screen while
  nothing is playing, so you are not starting music to check a margin.
- **Floating above windows** — puts it above your editor instead of behind it.

Platter rereads the theme when you change the setting, but GNOME Shell caches
extension code for the life of a session: editing a **theme** takes effect
without a logout, editing the **extension** does not.

## Coming from another app

Platter reads CoverGloobus and NowPlaying themes today. Those two share a
lineage, which is why one converter handles both.

They were not the only ones. Bowtie, CD Art Display and Rainmeter all had
now-playing skins, and themes were cross-ported between all of them at the
time — the same artwork often exists in three formats. Support for reading
those directly is intended, and the format was deliberately designed not to
close the door: what it will not do is execute anything, so a Bowtie theme's
HTML and JavaScript will be reported as lost rather than run.

If you have themes in one of those formats, they are worth keeping hold of.

## Sharing it

Themes are just folders, so anything that moves a folder works — a git repo, a
zip, a synced drive. Platter's importer accepts a folder or an archive, and
reads themes already in Platter's format as readily as original `skin.xml`
ones, so whoever you send it to can import it the same way.

Set `attribution.license` to something that actually says what you allow.
`distribution` is `free` if others may both redistribute *and* modify it,
`free-nc` if that is limited to non-commercial use, `non-free` for anything
less. If you would like a theme considered for the ones Platter ships, open an
issue.
