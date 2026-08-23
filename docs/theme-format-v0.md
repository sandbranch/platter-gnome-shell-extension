# Platter theme format, v0

The canonical format every ported theme is converted into, and the only thing
the extension knows how to read. Grounded in 111 real `skin.xml` files and the
CoverGloobus **1.7** parser (`upstream/covergloobus-1.7/src/core/ui.py`), not
designed top-down.

JSON. One `theme.json` per theme, assets beside it in the same folder.

---

## 1. What the format must survive

Decisions below are answers to things real themes actually do.

**Themes fake effects by stacking.** arcanamoon's Teac draws the same `<time>`
seven times at one-pixel offsets in different alpha colours to get an outline,
and six `<albumcover>` elements to fake rounded-corner antialiasing. So the
format keeps **ordered layers, drawn in array order**, and the porter emits one
layer per source element. Collapsing a stack into a "stroke" property would be
tidier and would destroy those themes.

**Typos are load-bearing.** `widht` appears 11 times across the corpus,
`maxchqars` once, and upstream's own BadChoice2/3 ship `pause_hove`. The porter
repairs them and records each repair; the format itself is strict.

**Vector is normal.** jivebs' eCG carries 58 SVG assets against 24 PNG. Assets
are referenced by relative path and may be either.

**Fonts are usually missing, and often unshippable.** Monocle names Pushkin and
bundles nothing; Optic bundles Microsoft's Segoe UI, which nobody may
redistribute. Fonts are therefore **declared, never assumed**: `fonts[]` lists
what the theme wants and whether it travels with it.

**One archive can hold several themes.** jivebs' single zip contains four. Each
becomes its own bundle.

**NowPlaying is a near-dialect, not the same grammar.** 17 themes use
`play_pause` and 7 use `playername`, neither of which CoverGloobus reads. The
format carries both, so a NowPlaying frontend has somewhere to land.

---

## 2. Shape

```json
{
  "format": "platter-theme/0",
  "id": "box-of-tricks",
  "name": "Box Of Tricks",
  "canvas": { "width": 300, "height": 200 },
  "attribution": {
    "author": "d0od + Kshegyaj",
    "source_url": "https://...",
    "license": "attribution-required",
    "license_note": "free to distribute, mod and such as long as you accredit it back to ...",
    "original_app": "covergloobus",
    "upstream_author": null,
    "distribution": "free"
  },
  "fonts": [
    { "family": "Purisa", "bundled": true, "file": "Purisa.ttf" },
    { "family": "Segoe UI", "bundled": false, "reason": "not redistributable" }
  ],
  "layers": [ ... ]
}
```

`canvas` is a fixed pixel canvas; every layer is absolutely positioned within
it, origin top-left. The renderer scales the whole canvas as one, exactly as
1.7 did when a theme exceeded the screen.

`distribution` records what the theme's author permitted: `free` (redistribution
and modification both allowed), `free-nc` (both allowed, non-commercial only),
or `non-free` (anything less, including terms nobody ever stated; silence is
not permission). Only `free` themes are distributed with Platter.

It is a record, not a lock. A theme you converted yourself, from a file you
fetched from its author, is marked `non-free` because that is what is true of
it: yours to use, not yours to pass on. Platter draws it exactly like any
other.

## 3. Layers

Every layer has `type`, `x`, `y`, `width`, `height`, and optional
`visible`: `"always"` (default), `"playing"`, `"stopped"` (derived from
`display="on-playing" | "on-stopped"`).

That attribute is NowPlaying's, and eight themes in the corpus set it. It has
never once done anything: 1.6 parses it into every widget and then never draws
with it, and 1.7 dropped even the parsing. So Vinyl has always shown its
"no song" art and its jewel case stacked on top of each other, which is not
what its author wrote. Honouring it is a deliberate repair, recorded by the
porter, not a faithful reproduction.

### image
```json
{ "type": "image", "src": "case.png", "x": 0, "y": 0, "width": 220, "height": 288,
  "round": 20, "opacity": 0.6, "mask": "mask.png",
  "reflect": { "gap": 5, "height": 40, "alpha": 0.5, "resize": 1.0 } }
```
`reflect` comes from 1.7's `"gap-height-alpha-resize"` string: two pixel values
then two percentages, alpha defaulting to 50% and resize to 100%.

### artwork
The album cover. Same fields as `image` minus `src`; the renderer supplies the
image. A theme normally stacks a placeholder `image` underneath with
`visible: "stopped"`.

### text
```json
{ "type": "text", "bind": "title", "x": 21, "y": 218, "width": 180, "height": 14,
  "font": { "family": "BankGothic Md BT", "size": 8, "weight": "normal", "style": "normal" },
  "color": "#e6e6e6ff",
  "shadow": { "color": "#000000ff", "dx": 1, "dy": 1 },
  "align": "left", "valign": "top", "wrap": false,
  "overflow": { "mode": "scroll", "maxchars": 25 } }
```
`bind` is one of `title`, `artist`, `album`, `genre`, `track`, `year`,
`length`, `position`, `player`. The last two exist because 1.7 has `time` and
`length`, and NowPlaying has `playername`.

`overflow.mode` is `scroll`, `ellipsize-word`, `ellipsize-char` or `clip`;
`maxchars` is kept alongside because most themes only ever set that.

Colours are `#RRGGBBAA`, as in the source. Fonts are parsed out of Pango
description strings (`"Lucida Grande bold 11"`), so the renderer never has to
parse Pango.

### rating
```json
{ "type": "rating", "x": 20, "y": 60, "width": 15, "height": 15, "spacing": 3,
  "star": "star.png", "empty": "nostar.png", "hover": "star_hover.png",
  "direction": "horizontal" }
```

### button
```json
{ "type": "button", "action": "play_pause", "x": 113, "y": 152, "width": 16, "height": 16,
  "states": {
    "default": { "normal": "play.png", "hover": "play_hover.png", "pressed": null },
    "playing": { "normal": "pause.png", "hover": "pause_hover.png", "pressed": null }
  } }
```
`action` is `previous`, `play_pause`, `next`, `mute` or `quit`. The `playing`
state exists only for `play_pause`, matching 1.7's StateButton.

### seekbar
```json
{ "type": "seekbar", "x": 10, "y": 49, "width": 5, "height": 130,
  "orientation": "vertical", "back": "seekbar.png", "fill": "seek_top.png",
  "thumb": { "src": "seek.png", "width": 20, "height": 20,
             "slice": { "top": -2, "right": 0, "bottom": -10, "left": -5 } } }
```
`orientation` is derived the way 1.7 does it: wider than tall is horizontal.
The thumb's four offsets are kept as a `slice` because they are how themes
nudge the knob into alignment, and several are negative.

---

## 4. Deliberately not in v0

- **No scripting.** Bowtie themes are HTML/CSS/JS; when that frontend arrives,
  dynamic behaviour gets reported as lossy rather than executed.
- **No relative or flow layout.** Every theme in the corpus is a fixed canvas
  with absolute positions. Inventing layout would help no existing theme.
- **No theme-declared player bindings.** Players come from MPRIS2 now.

## 5. Porting report

Every converted bundle gets a `port.json` beside it, recording the `skin.xml`
it came from and four kinds of finding, kept apart because they carry different
weight:

- **`repairs`**: the source was wrong and the porter fixed it: `widht` →
  `width`, a six-digit colour padded to eight, a filename whose case doesn't
  match the file.
- **`derived`**: nothing was wrong; a width or height was simply absent and
  came off the asset's own pixel size, which is what 1.7's `Image` does. Most
  themes never size their buttons.
- **`lossy`**: something the source said and the format cannot: a bundled font
  left behind, a Pango weight of `Book` flattened to `normal`, an asset the
  theme references and does not contain.
- **`inferred`**: the porter had to guess geometry, which only happens with
  NowPlaying's control rows, where the positions are implied by a row anchor
  and a spacing rather than written down. A theme with anything inferred is
  worth looking at before trusting: the guess follows NowPlaying's own default
  skin, which is the only documentation that layout ever had.

A port that loses something must say so out loud: every conversion writes a
`port.json` recording what it repaired, measured, inferred, or dropped.
