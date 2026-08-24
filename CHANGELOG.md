# Changelog

## 0.1.0 (2026-08-24)

First release.

- A desktop widget that follows any MPRIS2 player, drawn from a theme rather
  than a fixed design. Sits behind windows like the original CoverGloobus, or
  floats above them.
- Twenty-six restored CoverGloobus and NowPlaying themes, with their authors
  and licences recorded in `THEMES.md`, each with a preview in the theme
  picker.
- A theme converter, in the preferences window and on the command line, that
  reads original `skin.xml` themes (folders, archives, nested archives, and
  packs holding several themes at once) and installs them to
  `~/.local/share/platter/themes`. Themes already in Platter's format are
  copied rather than reconverted.
- An extra theme directory setting, so a collection kept elsewhere can be read
  where it sits.
- Preferences for placement, monitor, anchor corner, scale, opacity, and which
  player to follow.
- `docs/making-themes.md`, a guide to writing and porting themes.
- Scale-aware rendering: layer geometry and font sizes are multiplied by
  `scale` and assets are rasterised at that target size (SVGs rendered
  directly via Rsvg/cairo instead of upscaled from a native-size raster, PNGs
  resampled once instead of twice) rather than stretching the whole widget
  as a Clutter actor transform.
- `rating` layers draw their stars, text `shadow` is painted, and button
  `pressed` states are used when a theme declares them.

### Known gaps

`reflect`, `mask`, `valign` and scrolling text are carried through conversion
and stored, but not painted. `docs/making-themes.md` lists them so nobody
wastes an evening on one.

### Later

**Other now-playing apps of the same era**: Bowtie, CD Art Display, Rainmeter,
whose skins were widely cross-ported with CoverGloobus's. The format was
designed not to preclude it.

**Clickable buttons in desktop placement.** `desktop` placement draws the
widget in `Main.layoutManager._backgroundGroup`, a layer modern Mutter/Shell
excludes from input routing entirely: buttons there are dead regardless of
whether anything covers the widget, confirmed empirically on Shell 50.1, and
there is no supported flag left to opt an actor back in (the old
`affectsInputRegion` chrome-tracking hook is gone). Desktop Icons NG works
around the same wall by not drawing inside the shell process at all: it
launches its own window and re-lowers it to the bottom of the stack every time
something tries to raise it, so it gets real input as a genuine client
surface rather than a shell actor. Giving desktop placement working buttons
would mean the same move (a windowed surface instead of a `_backgroundGroup`
actor, plus the raise-and-relower dance DING needs), which is a real
rearchitecture, not a tweak, so it stays a later idea rather than something
this release blocks on.

### Theme ideas

- **Torn newspaper clipping.** A scrap of newsprint pinned to the desktop:
  uneven torn edges, a drop shadow, faded text, and the album art run in as
  the photo.
- **Wooden CD shelf.** A wooden shelf holding a stack of CDs seen from the
  back, with one case tilted at an angle so its cover shows through, and a
  string of stars hanging above the shelf.
- **Realistic boombox.** A small, realistic boombox player. Look not decided
  yet.
- **Torn hole in the desktop.** A torn hole in the desktop wallpaper, with the
  album art visible through it and a shadow cast by the torn edges falling
  across the art.
- **Old-style LP player.** A record player with a wooden front, the album art
  on the spinning disk, and controls on the front.
- **Hanging photo note.** A polaroid-style photo note, showing the album art,
  hanging from a piece of string attached at the top of the screen.
