# Fonts

22 themes in the corpus bundle a font file. None of them travel with the ported
bundle, and this is why — recorded once, with evidence, so it does not have to
be argued again per theme.

## The rule

The porter declares every font family a theme names, in `fonts[]`, with
`bundled: false` and a reason. It never copies the file. `port.json` names what
was left behind.

A font shipping inside a theme is not evidence its author had the right to ship
it. It is usually evidence of the opposite: the corpus contains Calibri, Segoe
UI, Lucida Grande and Helvetica — Microsoft's and Apple's, bundled by hobbyist
skin authors in 2011 who were not thinking about it.

## The case that proves it

arcanamoon's Titanium and Tungsten bundle **Rexlia** by Ray Larabie (Typodermic
Fonts), and Titanium's readme instructs the user to copy it into
`/usr/share/fonts`. Rexlia is free to download, which sounds like it settles the
question. It does the opposite. Typodermic's free desktop licence, shipped in
the download as *Typodermic Desktop EULA 2026.pdf* with a plain-language guide,
says:

> Do not give, sell, upload, sublicense, or otherwise share the font software.

> **Do not include the font in open-source or publicly available software where
> the font could be redistributed.**

> One person, one license. The included license is for one natural person... Do
> not place the working font on a shared server, shared network folder,
> cloud-font library, or digital asset system.

The second clause is exactly this repository, the moment it is public. So a
"free font" is free to *download and install*, and specifically not free to
*ship inside a theme*. The distinction is the whole point, and it is the reason
the rule is blanket rather than case-by-case: the licence that matters is never
the one in the filename. The file in those two themes is even called
`rexlia free.ttf`.

Note also what this makes of the readme. Telling users to install the bundled
font is the theme author redistributing it, not a licence for anyone to.

## What the user does instead

Install the fonts. That is the licensed use — "install and use the font on
computers under that person's control" — and it is how a theme is meant to look.
Drop the file in `~/.local/share/fonts` and run `fc-cache -f`.

Every theme names its fonts in `theme.json` under `fonts[]`, so what to go and
find is always written down:

    python3 -c "import json,glob,collections; \
      c=collections.Counter(f['family'] for p in glob.glob('themes/*/theme.json') \
      for f in json.load(open(p)).get('fonts',[])); \
      [print(f'{n:3}  {k}') for k,n in c.most_common()]"

## Where to get each one

Two of the families named across the 43 shipped themes are already covered on
any mainstream Linux desktop (`Sans` is a fontconfig alias, not a font;
`DejaVu Sans`/`DejaVu Sans Mono` ship everywhere) — no action needed for those.
Everything else below is a gap a theme will render into a fallback font unless
it's filled — and because
layer positions are tuned to the original font's own metrics, a fallback
doesn't just look different, it can visibly overlap, exactly the way `lunatic`
misplaces its track line without Bebas and DIRT2 DEATH installed.

Genuinely free — install and `fc-cache -f`:

| Font | Used by | Get it |
| --- | --- | --- |
| Bebas (Bebas Neue) | lunatic | [Google Fonts](https://fonts.google.com/specimen/Bebas+Neue) |
| DIRT2 DEATH | lunatic | [dafont.com](https://www.dafont.com/dirt2-death.font) — free for personal use; commercial use means asking the designer, per the listing |
| Vibrocentric | h-k-nowplaying, sweeth-bleu | [dafont.com](https://www.dafont.com/vibrocentric.font) — Typodermic Fonts; the install-and-use case is exactly what its licence permits, see above |
| Sansation | ics-1, ics-2 | [Font Squirrel](https://www.fontsquirrel.com/fonts/sansation) |
| Santana | ics-2 | [dafont.com](https://www.dafont.com/santana.font) |
| Droid Sans | box-of-tricks-by-d0od, faenza-alternate | [Font Squirrel](https://www.fontsquirrel.com/fonts/droid-sans) — Apache-2.0, from Google |
| Purisa | photo | Ubuntu/Debian: `sudo apt install fonts-tlwg-purisa` (Thai Linux Working Group; other distros package it as `thai-scalable-purisa` or similar) |
| Trebuchet MS | box-of-tricks-mod-by-d0od(-2) | Ubuntu/Debian: `sudo apt install ttf-mscorefonts-installer` — the [package](https://packages.ubuntu.com/ttf-mscorefonts-installer) fetches it under Microsoft's own EULA, which is the legitimate route, not a mirror |
| URW Gothic L | intrepid-ibex-mockup-by-d0od, t-tip | Ubuntu/Debian: `sudo apt install gsfonts` ([fonts-urw-base35](https://packages.debian.org/sid/fonts-urw-base35) on newer releases) |

No legitimate free source — these are proprietary faces bundled with a specific
OS or sold by their foundry. The corpus names them because that's what the
original skin author had installed, not because the font is available to
everyone; the mirror sites that offer them as a "free download" are the same
kind of unlicensed redistribution this project won't do for its own themes:

| Font | Used by | Where it actually comes from |
| --- | --- | --- |
| Tahoma | shiki-cd-case-1-2 | Microsoft — not even in `ttf-mscorefonts-installer`; only legitimately available if you already have a licensed Windows/Office install to copy it from |
| Gabriola | jesse | Microsoft, ships with Windows Vista and later / Office — same as above |
| Lucida Grande | badchoice, badchoice-2, badchoice-3, coversutra, dirty, lucid-dark, polaroid, postcard, postcard-2, simple-2 | Apple, ships with macOS — only available from a licensed Mac |
| Frutiger Linotype | aeroplay, lucid-dark-2, lucid-light, simpleone-dark, simpleone-v2, simpleone-v2-2, simpleone-v2-3 | Monotype/Linotype, sold commercially — no free tier |
| HandelGotDLig (Handel Gothic D Light) | 45-controls | Elsner+Flake, sold commercially — no free tier |

For any of these five, the theme still renders — St substitutes a system
default — it just won't match the original skin's exact letterforms the way
Bebas or DIRT2 DEATH will once installed. That's a smaller gap than `lunatic`'s,
because none of these five also had a fallback-metrics collision found in
testing.

## For the harness

`tools/nested-shell.sh` gives the throwaway shell a scratch `XDG_DATA_HOME`,
and fontconfig reads `$XDG_DATA_HOME/fonts` — so without help the harness hides
every font the user has installed and renders fallback type while looking
perfectly convincing. It links the real font directory in. If a screenshot from
it ever shows the wrong typeface, check that link before blaming the theme.
