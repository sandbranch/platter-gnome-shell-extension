# Changelog

## 0.1.0 — unreleased

First release.

- A desktop widget that follows any MPRIS2 player, drawn from a theme rather
  than a fixed design. Sits behind windows like the original CoverGloobus, or
  floats above them.
- Twenty-six restored CoverGloobus and NowPlaying themes, with their authors
  and licences recorded in `THEMES.md`, each with a preview in the theme
  picker.
- A theme converter, in the preferences window and on the command line, that
  reads original `skin.xml` themes — folders, archives, nested archives, and
  packs holding several themes at once — and installs them to
  `~/.local/share/platter/themes`. Themes already in Platter's format are
  copied rather than reconverted.
- An extra theme directory setting, so a collection kept elsewhere can be read
  where it sits.
- Preferences for placement, monitor, anchor corner, scale, opacity, and which
  player to follow.
- `docs/making-themes.md`, a guide to writing and porting themes.

### Known gaps

`rating` layers are positioned but draw no stars yet. `reflect`, `mask`, text
`shadow`, `valign`, scrolling text and button `pressed` states are carried
through conversion and stored, but not painted. `docs/making-themes.md` lists
them so nobody wastes an evening on one.

### Later

**Scale-aware rendering.** `scale` is currently a Clutter actor transform:
the widget is drawn at its native size and the result is stretched, so a scaled
theme is a resampled bitmap. SVG assets are already supported end to end — the
porter measures them with librsvg and six shipped themes use them — but they
gain nothing from it, because they are rasterised at native size before the
transform applies. Multiplying layer geometry by the scale and loading assets
at that size instead would make SVG themes genuinely resolution-independent,
and would resample raster themes once rather than twice.

**Other now-playing apps of the same era** — Bowtie, CD Art Display, Rainmeter —
whose skins were widely cross-ported with CoverGloobus's. The format was
designed not to preclude it.
